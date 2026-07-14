from datetime import datetime
import math
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, File, UploadFile

from Auth.auth_handler import get_current_user
from core import ALLOWED_AUDIO_TYPES, save_upload
from database.mongo import reports_collection, users_collection
from steganography.audio_mask import prepare_audio_carrier
from steganography.metrics import calculate_audio_metrics, calculate_metrics


router = APIRouter()


@router.post("/metrics")
async def metrics_api(
    original_image: Optional[UploadFile] = File(None),
    stego_image: Optional[UploadFile] = File(None),
    original_audio: Optional[UploadFile] = File(None),
    stego_audio: Optional[UploadFile] = File(None),
    current_user: str = Depends(get_current_user),
):
    try:
        metric_values = {}
        # Check user role to record properly
        user_doc = users_collection.find_one({"username": current_user})
        role = user_doc.get("role") if user_doc else "doctor"

        report = {
            "type": "metrics",
            "username": current_user,
            "created_at": datetime.utcnow(),
        }

        if bool(original_image) != bool(stego_image):
            return {"error": "Upload both original and stego images for image metrics"}

        if bool(original_audio) != bool(stego_audio):
            return {"error": "Upload both original and stego audio files for audio metrics"}

        if not original_image and not original_audio:
            return {"error": "Upload an image pair or an audio pair to calculate metrics"}

        if original_image and stego_image:
            original_path = await save_upload(original_image, "uploads")
            stego_path = await save_upload(stego_image, "uploads")
            image_metrics = calculate_metrics(original_path, stego_path)
            metric_values.update(image_metrics)
            report.update({
                "original_image": original_image.filename,
                "stego_image": stego_image.filename,
                "PSNR": image_metrics["PSNR"],
                "SSIM": image_metrics["SSIM"],
            })

        if original_audio and stego_audio:
            original_audio_path = await save_upload(original_audio, "uploads")
            stego_audio_path = await save_upload(stego_audio, "uploads")
            original_audio_path = _prepare_metric_audio(original_audio, original_audio_path)
            stego_audio_path = _prepare_metric_audio(stego_audio, stego_audio_path)
            audio_metrics = calculate_audio_metrics(original_audio_path, stego_audio_path)
            metric_values.update(audio_metrics)
            report.update({
                "original_audio": original_audio.filename,
                "stego_audio": stego_audio.filename,
                "Audio_MSE": audio_metrics["Audio_MSE"],
                "Audio_SNR": audio_metrics["Audio_SNR"],
                "Audio_PSNR": audio_metrics["Audio_PSNR"],
                "Audio_Correlation": audio_metrics["Audio_Correlation"],
            })
        print("metrics")
        reports_collection.insert_one(report)

        return {
            "message": "Metrics Calculated",
            "metrics": _json_safe_metrics(metric_values),
        }
    except Exception as error:
        return {"error": str(error)}


def _prepare_metric_audio(upload, audio_path):
    audio_type = _audio_content_type(upload)
    if audio_type not in ALLOWED_AUDIO_TYPES:
        raise ValueError("Invalid audio format. Upload a MP3 or WAV file.")

    return prepare_audio_carrier(
        audio_path,
        audio_type,
        f"uploads/metric_audio_{uuid.uuid4()}.wav",
    )


def _audio_content_type(upload):
    extension = (upload.filename or "").rsplit(".", 1)[-1].lower()

    if extension == "wav":
        return "audio/wav"

    if extension == "mp3":
        return "audio/mpeg"

    if extension == "wan":
        return "audio/wan"

    return upload.content_type


def _json_safe_metrics(metrics):
    safe_metrics = {}

    for key, value in metrics.items():
        if isinstance(value, float) and not math.isfinite(value):
            safe_metrics[key] = "Infinity" if value > 0 else "-Infinity"
        else:
            safe_metrics[key] = value

    return safe_metrics
