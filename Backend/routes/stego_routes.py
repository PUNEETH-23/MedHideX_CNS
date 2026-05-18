import os
import time
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, UploadFile

from Auth.auth_handler import get_current_user
from core import ALLOWED_AUDIO_TYPES, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, save_upload
from database.audit import log_event
from database.mongo import reports_collection
from steganography.adaptive_embed import adaptive_embed
from steganography.adaptive_extract import adaptive_extract
from steganography.audio_mask import (
    embed_mask_png_in_wav,
    extract_mask_from_wav,
    prepare_audio_carrier,
)
from steganography.bit_utils import LENGTH_PREFIX_BITS, huffman_compress_text
from steganography.capacity import estimate_capacity
from steganography.mask_generator import save_mask_png
from steganography.video_util import (
    create_stego_video,
    embed_media_into_video,
    extract_first_frame,
    extract_media_from_video,
    mux_audio_into_video,
)


router = APIRouter()


@router.post("/embed")
async def embed_payload_api(
    image: UploadFile = File(...),
    audio: UploadFile = File(...),
    payload: str = Form(...),
    current_user: str = Depends(get_current_user),
):
    try:
        start_time = time.time()

        if image.content_type not in ALLOWED_IMAGE_TYPES:
            log_event(
                "embedding_validation",
                username=current_user,
                status="failed",
                reason="invalid_image_format",
                image_filename=image.filename,
                image_content_type=image.content_type,
            )
            return {"error": "Invalid image format"}

        audio_type = _audio_content_type(audio)
        if audio_type not in ALLOWED_AUDIO_TYPES:
            log_event(
                "embedding_validation",
                username=current_user,
                status="failed",
                reason="invalid_audio_format",
                audio_filename=audio.filename,
                audio_content_type=audio.content_type,
            )
            return {"error": "Invalid audio format. Upload a WAV or MP3 file."}

        image_path = await save_upload(image, "uploads")
        audio_path = await save_upload(audio, "uploads")
        log_event(
            "embedding_uploads_saved",
            username=current_user,
            image_filename=image.filename,
            image_content_type=image.content_type,
            image_path=image_path,
            audio_filename=audio.filename,
            audio_content_type=audio.content_type,
            normalized_audio_type=audio_type,
            audio_path=audio_path,
        )

        carrier_audio_path = prepare_audio_carrier(
            audio_path,
            audio_type,
            f"uploads/carrier_{uuid.uuid4()}.wav",
        )
        log_event(
            "carrier_audio_prepared",
            username=current_user,
            source_audio=audio_path,
            carrier_audio=carrier_audio_path,
            source_audio_type=audio_type,
        )

        capacity = estimate_capacity(image_path)
        log_event(
            "image_capacity_estimated",
            username=current_user,
            image_path=image_path,
            capacity_bits=capacity["bits"],
            capacity_bytes=capacity["bytes"],
        )

        payload_bits = LENGTH_PREFIX_BITS + len(huffman_compress_text(payload))
        log_event(
            "payload_compressed_for_embedding",
            username=current_user,
            payload_size=len(payload),
            payload_bits=payload_bits,
        )

        if payload_bits > capacity["bits"]:
            log_event(
                "embedding_capacity_check",
                username=current_user,
                status="failed",
                payload_bits=payload_bits,
                capacity_bits=capacity["bits"],
            )
            return {"error": "Payload exceeds image capacity"}

        output_path = f"stego/stego_{uuid.uuid4()}.png"
        mask_path = f"stego/mask_{uuid.uuid4()}.png"
        stego_audio_path = f"stego/audio_mask_{uuid.uuid4()}.wav"
        frame_video_path = f"stego/stego_frames_{uuid.uuid4()}.mp4"
        playable_video_path = f"stego/stego_playable_{uuid.uuid4()}.mp4"
        stego_video_path = f"stego/stego_video_{uuid.uuid4()}.mp4"

        result = adaptive_embed(
            image_path=image_path,
            payload=payload,
            output_path=output_path,
        )
        log_event(
            "image_payload_embedded",
            username=current_user,
            source_image=image_path,
            stego_image=output_path,
            embedded_bits=result["embedded_bits"],
            compressed_bits=result.get("compressed_bits"),
        )

        save_mask_png(result["mask"], mask_path)
        log_event(
            "mask_png_saved",
            username=current_user,
            mask_path=mask_path,
        )

        audio_result = embed_mask_png_in_wav(
            mask_png_path=mask_path,
            audio_path=carrier_audio_path,
            output_path=stego_audio_path,
        )
        log_event(
            "mask_embedded_in_audio",
            username=current_user,
            mask_path=mask_path,
            carrier_audio=carrier_audio_path,
            stego_audio=stego_audio_path,
            audio_mask_bits=audio_result["embedded_bits"],
            audio_duration=audio_result["duration"],
        )

        video_result = create_stego_video(
            image_path=output_path,
            output_path=frame_video_path,
            duration=audio_result["duration"],
            fps=30,
        )
        log_event(
            "video_frames_generated",
            username=current_user,
            stego_image=output_path,
            frame_video=frame_video_path,
            video_duration=video_result["duration"],
            video_frames=video_result["frames"],
            video_fps=video_result["fps"],
        )

        mux_audio_into_video(
            video_path=frame_video_path,
            audio_path=stego_audio_path,
            output_path=playable_video_path,
        )
        log_event(
            "playable_audio_muxed_into_video",
            username=current_user,
            frame_video=frame_video_path,
            stego_audio=stego_audio_path,
            playable_video=playable_video_path,
        )

        embed_media_into_video(
            video_path=playable_video_path,
            image_path=output_path,
            audio_path=stego_audio_path,
            output_path=stego_video_path,
        )
        log_event(
            "recovery_media_embedded_in_video",
            username=current_user,
            frame_video=frame_video_path,
            playable_video=playable_video_path,
            stego_image=output_path,
            stego_audio=stego_audio_path,
            stego_video=stego_video_path,
        )

        embedding_time = time.time() - start_time
        reports_collection.insert_one({
            "type": "embedding",
            "username": current_user,
            "uploaded_image": image.filename,
            "uploaded_audio": audio.filename,
            "stego_image": output_path,
            "stego_audio": stego_audio_path,
            "stego_video": stego_video_path,
            "embedded_bits": result["embedded_bits"],
            "audio_mask_bits": audio_result["embedded_bits"],
            "video_duration": video_result["duration"],
            "embedding_time": embedding_time,
            "created_at": datetime.utcnow(),
        })

        log_event(
            "embedding_completed",
            username=current_user,
            uploaded_image=image.filename,
            uploaded_audio=audio.filename,
            stego_video=stego_video_path,
            embedded_bits=result["embedded_bits"],
            audio_mask_bits=audio_result["embedded_bits"],
            video_duration=video_result["duration"],
            embedding_time=embedding_time,
        )

        return {
            "message": "Embedding Successful",
            "stego_video": f"/download/video/{os.path.basename(stego_video_path)}",
            "embedded_bits": result["embedded_bits"],
            "audio_mask_bits": audio_result["embedded_bits"],
            "video_duration": video_result["duration"],
            "video_frames": video_result["frames"],
            "embedding_time": embedding_time,
        }
    except Exception as error:
        log_event("embedding", username=current_user, status="failed", error=str(error))
        return {"error": str(error)}


@router.post("/extract")
async def extract_payload_api(
    image: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
):
    try:
        start_time = time.time()
        video_type = _video_content_type(image)
        if video_type not in ALLOWED_VIDEO_TYPES:
            log_event(
                "extraction_validation",
                username=current_user,
                status="failed",
                reason="invalid_video_format",
                video_filename=image.filename,
                video_content_type=image.content_type,
            )
            return {"error": "Invalid stego video format"}

        media_path = await save_upload(image, "uploads")
        image_path = f"uploads/video_frame_{uuid.uuid4()}.png"
        audio_path = f"uploads/video_audio_{uuid.uuid4()}.wav"
        log_event(
            "stego_video_uploaded",
            username=current_user,
            video_filename=image.filename,
            video_content_type=image.content_type,
            normalized_video_type=video_type,
            video_path=media_path,
        )

        has_embedded_media = extract_media_from_video(media_path, image_path, audio_path)
        log_event(
            "recovery_media_extracted_from_video",
            username=current_user,
            video_path=media_path,
            extracted_image=image_path,
            extracted_audio=audio_path,
            found_embedded_media=has_embedded_media,
        )

        if not has_embedded_media:
            extract_first_frame(media_path, image_path)
            log_event(
                "extraction",
                username=current_user,
                status="failed",
                reason="missing_recovery_audio",
                video_path=media_path,
                fallback_frame=image_path,
            )
            return {"error": "This video does not contain embedded recovery audio"}

        mask = extract_mask_from_wav(audio_path)
        log_event(
            "mask_extracted_from_audio",
            username=current_user,
            stego_audio=audio_path,
            mask_rows=len(mask),
            mask_cols=len(mask[0]) if len(mask) else 0,
        )

        extracted_payload = adaptive_extract(image_path=image_path, mask=mask)
        log_event(
            "payload_extracted_from_image",
            username=current_user,
            stego_image=image_path,
            payload_size=len(extracted_payload),
        )

        extraction_time = time.time() - start_time

        reports_collection.insert_one({
            "type": "extraction",
            "username": current_user,
            "stego_image": image.filename,
            "stego_video": image.filename,
            "extraction_time": extraction_time,
            "created_at": datetime.utcnow(),
        })

        log_event(
            "extraction_completed",
            username=current_user,
            stego_video=image.filename,
            payload_size=len(extracted_payload),
            extraction_time=extraction_time,
        )

        return {
            "message": "Extraction Successful",
            "payload": extracted_payload,
            "extraction_time": extraction_time,
        }
    except Exception as error:
        log_event("extraction", username=current_user, status="failed", error=str(error))
        return {"error": str(error)}


def _audio_content_type(upload):
    extension = os.path.splitext(upload.filename or "")[1].lower()

    if extension == ".wav":
        return "audio/wav"

    if extension == ".mp3":
        return "audio/mpeg"

    return upload.content_type


def _video_content_type(upload):
    extension = os.path.splitext(upload.filename or "")[1].lower()

    if extension == ".avi":
        return "video/avi"

    if extension == ".mp4":
        return "video/mp4"

    return upload.content_type
