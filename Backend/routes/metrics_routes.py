from datetime import datetime

from fastapi import APIRouter, Depends, File, UploadFile

from Auth.auth_handler import get_current_user
from core import save_upload
from database.audit import log_event
from database.mongo import reports_collection
from steganography.metrics import calculate_metrics, calculate_audio_metrics


router = APIRouter()


@router.post("/metrics")
async def metrics_api(
    original_image: UploadFile = File(...),
    stego_image: UploadFile = File(...),
    original_audio: UploadFile = File(None),
    stego_audio: UploadFile = File(None),
    current_user: str = Depends(get_current_user),
):
    try:
        original_image_path = await save_upload(original_image, "uploads")
        stego_image_path = await save_upload(stego_image, "uploads")
        log_event(
            "metrics_uploads_saved",
            username=current_user,
            original_filename=original_image.filename,
            original_path=original_image_path,
            stego_filename=stego_image.filename,
            stego_path=stego_image_path,
        )

        image_metrics = calculate_metrics(original_image_path, stego_image_path)
        log_event(
            "image_metrics_calculated",
            username=current_user,
            original_image=original_image.filename,
            stego_image=stego_image.filename,
            PSNR=image_metrics["PSNR"],
            SSIM=image_metrics["SSIM"],
        )

        metrics = {
            "image": image_metrics,
            "audio": None
        }

        if original_audio and stego_audio:
            original_audio_path = await save_upload(original_audio, "uploads")
            stego_audio_path = await save_upload(stego_audio, "uploads")
            log_event(
                "audio_uploads_saved",
                username=current_user,
                original_audio=original_audio.filename,
                stego_audio=stego_audio.filename,
            )

            audio_metrics = calculate_audio_metrics(original_audio_path, stego_audio_path)
            log_event(
                "audio_metrics_calculated",
                username=current_user,
                original_audio=original_audio.filename,
                stego_audio=stego_audio.filename,
                SNR=audio_metrics["SNR"],
                PSNR=audio_metrics["PSNR"],
                MSE=audio_metrics["MSE"],
                Correlation=audio_metrics["Correlation"],
            )

            metrics["audio"] = audio_metrics

            reports_collection.insert_one({
                "type": "metrics",
                "username": current_user,
                "original_image": original_image.filename,
                "stego_image": stego_image.filename,
                "original_audio": original_audio.filename,
                "stego_audio": stego_audio.filename,
                "image_psnr": image_metrics["PSNR"],
                "image_ssim": image_metrics["SSIM"],
                "audio_snr": audio_metrics["SNR"],
                "audio_psnr": audio_metrics["PSNR"],
                "audio_mse": audio_metrics["MSE"],
                "audio_correlation": audio_metrics["Correlation"],
                "created_at": datetime.utcnow(),
            })
        else:
            reports_collection.insert_one({
                "type": "metrics",
                "username": current_user,
                "original_image": original_image.filename,
                "stego_image": stego_image.filename,
                "image_psnr": image_metrics["PSNR"],
                "image_ssim": image_metrics["SSIM"],
                "created_at": datetime.utcnow(),
            })

        return {
            "message": "Metrics Calculated",
            "metrics": metrics,
        }
    except Exception as error:
        log_event("metrics", username=current_user, status="failed", error=str(error))
        return {"error": str(error)}
