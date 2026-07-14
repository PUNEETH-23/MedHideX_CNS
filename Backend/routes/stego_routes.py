import os
import time
import uuid
import json
import random
from datetime import datetime
import cv2
import numpy as np
import pydicom
import hashlib
from fastapi import APIRouter, Depends, File, Form, UploadFile

from Auth.auth_handler import get_current_user
from core import ALLOWED_AUDIO_TYPES, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, save_upload
from database.mongo import reports_collection, dicom_videos_collection
from steganography.adaptive_embed import adaptive_embed
from steganography.adaptive_extract import adaptive_extract
from steganography.audio_mask import (
    embed_mask_png_in_wav,
    extract_mask_from_wav,
    prepare_audio_carrier,
    get_wav_duration,
)
from steganography.bit_utils import (
    LENGTH_PREFIX_BITS,
    huffman_compress_text,
    add_length_prefix,
    text_to_binary,
    binary_to_text,
    read_length_prefixed_binary,
    huffman_decompress_text,
)
from steganography.capacity import estimate_capacity
from steganography.mask_generator import save_mask_png, generate_binary_mask
from steganography.video_util import (
    extract_first_frame,
    extract_audio_from_video,
    create_stego_video_from_frames,
    repeat_wav_to_duration,
    mux_audio_into_video,
)
from steganography.chunk_embed import (
    embed_bits_in_frame,
    extract_bits_from_frame,
    divide_into_chunks,
)

router = APIRouter()


@router.post("/embed")
async def embed_payload_api(
    image: UploadFile = File(...),
    audio: UploadFile = File(...),
    payload: str = Form(...),
    lsb_bits: int = Form(3),
    current_user: str = Depends(get_current_user),
):
    try:
        start_time = time.time()

        filename = image.filename or ""
        is_dicom = filename.lower().endswith(".dcm") or image.content_type == "application/dicom"
        if not is_dicom:
            return {"error": "Invalid file format. Please upload a DICOM (.dcm) image."}

        audio_type = _audio_content_type(audio)
        if audio_type not in ALLOWED_AUDIO_TYPES:
            return {"error": "Invalid audio format. Upload a MP3 or WAV file."}

        image_path = await save_upload(image, "uploads")
        audio_path = await save_upload(audio, "uploads")

        # Parse DICOM SOP Instance UID and convert to PNG
        try:
            ds = pydicom.dcmread(image_path)
            dicom_uid = ds.SOPInstanceUID
        except Exception as e:
            return {"error": f"Failed to read DICOM file: {str(e)}"}

        dicom_uid_hash = hashlib.sha256(dicom_uid.encode("utf-8")).hexdigest()

        # Convert DICOM pixel array to 8-bit RGB PNG
        try:
            pixels = ds.pixel_array
            min_val = pixels.min()
            max_val = pixels.max()
            if max_val > min_val:
                normalized = ((pixels - min_val) / (max_val - min_val) * 255.0).astype(np.uint8)
            else:
                normalized = np.zeros_like(pixels, dtype=np.uint8)

            if normalized.ndim == 2:
                img_rgb = cv2.cvtColor(normalized, cv2.COLOR_GRAY2RGB)
            elif normalized.ndim == 3:
                if normalized.shape[0] < 10:
                    normalized = np.transpose(normalized, (1, 2, 0))
                if normalized.shape[2] != 3:
                    normalized = normalized[0]
                    img_rgb = cv2.cvtColor(normalized, cv2.COLOR_GRAY2RGB)
                else:
                    img_rgb = normalized
            else:
                raise ValueError(f"Unsupported pixel dimensions: {normalized.ndim}")

            cover_image_path = f"uploads/converted_{uuid.uuid4()}.png"
            cv2.imwrite(cover_image_path, img_rgb)
        except Exception as e:
            return {"error": f"Failed to convert DICOM image to PNG: {str(e)}"}

        carrier_audio_path = prepare_audio_carrier(
            audio_path,
            audio_type,
            f"uploads/carrier_{uuid.uuid4()}.wav",
        )

        mask = generate_binary_mask(cover_image_path)
        num_pixels_in_mask = np.sum(mask == 1)
        coords = np.where(mask == 1)
        chunk_capacity = num_pixels_in_mask * 3 * lsb_bits

        if chunk_capacity == 0:
            return {"error": "Cover image capacity is too small or zero."}

        compressed_payload = huffman_compress_text(payload)
        binary_payload = add_length_prefix(compressed_payload)

        num_chunks_needed = (len(binary_payload) // chunk_capacity) + 1
        audio_duration = get_wav_duration(carrier_audio_path)
        audio_frames = int(round(audio_duration * 30))
        total_frames = max(num_chunks_needed + 1, audio_frames, 2)
        N = total_frames - 1

        chunks = divide_into_chunks(binary_payload, N)

        # Generate a random sequence for chunk placement
        mapping = list(range(1, N + 1))
        random.shuffle(mapping)

        # Construct JSON metadata
        metadata = {
            "lsb_bits": lsb_bits,
            "total_bits": len(binary_payload),
            "num_chunks": N,
            "mapping": mapping
        }

        metadata_str = json.dumps(metadata)
        metadata_bits = text_to_binary(metadata_str)
        metadata_payload = add_length_prefix(metadata_bits)

        # Verify Frame 0 capacity (metadata uses lsb_bits = 3)
        metadata_capacity = num_pixels_in_mask * 3 * 3
        if len(metadata_payload) > metadata_capacity:
            return {"error": "Metadata exceeds frame capacity"}

        # Read cover image
        cover_image = cv2.imread(cover_image_path)
        if cover_image is None:
            return {"error": "Failed to read cover image"}

        # Initialize the list of unique frames
        unique_frames = [None] * (N + 1)

        # Frame 0 is metadata
        metadata_frame, _ = embed_bits_in_frame(cover_image, mask, metadata_payload, 3, coords)
        unique_frames[0] = metadata_frame

        # Frames 1 to N are payload chunks
        for i, chunk in enumerate(chunks):
            frame_idx = mapping[i]
            frame_img, _ = embed_bits_in_frame(cover_image, mask, chunk, lsb_bits, coords)
            unique_frames[frame_idx] = frame_img

        output_path = f"stego/stego_{uuid.uuid4()}.png"
        mask_path = f"stego/mask_{uuid.uuid4()}.png"
        stego_audio_path = f"stego/audio_mask_{uuid.uuid4()}.wav"
        frame_video_path = f"stego/stego_frames_{uuid.uuid4()}.mp4"
        stego_video_path = f"stego/stego_video_{uuid.uuid4()}.mp4"

        # Save Frame 0 as the downloadable stego image for frontend compatibility
        cv2.imwrite(output_path, unique_frames[0])

        # Write stego frames to video (automatically duplicates frames to convert 30 FPS content to 60 FPS)
        video_result = create_stego_video_from_frames(unique_frames, frame_video_path, fps=60)
        video_duration = video_result["duration"]

        # Loop/repeat audio if video duration is longer
        if video_duration > audio_duration:
            repeated_audio_path = f"uploads/repeated_{uuid.uuid4()}.wav"
            repeat_wav_to_duration(carrier_audio_path, video_duration, repeated_audio_path)
            carrier_audio_path = repeated_audio_path

        # Embed mask PNG into the (repeated) audio
        save_mask_png(mask, mask_path)
        audio_result = embed_mask_png_in_wav(
            mask_png_path=mask_path,
            audio_path=carrier_audio_path,
            output_path=stego_audio_path,
        )

        # Mux/append audio and video
        mux_audio_into_video(
            video_path=frame_video_path,
            audio_path=stego_audio_path,
            output_path=stego_video_path,
        )

        # Compute SHA-256 hash of the generated stego video
        video_hash = hashlib.sha256()
        with open(stego_video_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                video_hash.update(chunk)
        video_sha256 = video_hash.hexdigest()

        # Store DICOM UID association and metadata
        dicom_videos_collection.insert_one({
            "video_hash": video_sha256,
            "dicom_uid_hash": dicom_uid_hash,
            "dicom_filename": image.filename,
            "created_at": datetime.utcnow(),
            "algorithm_version": "1.0",
        })

        # Extract patient_id from payload if possible
        try:
            payload_data = json.loads(payload)
            patient_id = payload_data.get("patient_id")
        except Exception:
            patient_id = None

        embedding_time = time.time() - start_time
        reports_collection.insert_one({
            "type": "embedding",
            "username": current_user,
            "uploaded_image": image.filename,
            "uploaded_audio": audio.filename,
            "stego_image": output_path,
            "mask_file": mask_path,
            "stego_audio": stego_audio_path,
            "stego_video": stego_video_path,
            "embedded_bits": len(binary_payload),
            "audio_mask_bits": audio_result["embedded_bits"],
            "video_duration": video_duration,
            "embedding_time": embedding_time,
            "created_at": datetime.utcnow(),
            "dicom_uid_hash": dicom_uid_hash,
            "video_hash": video_sha256,
        })

        return {
            "message": "Embedding Successful",
            "mask_file": f"/download/mask/{os.path.basename(mask_path)}",
            "stego_image": f"/download/stego/{os.path.basename(output_path)}",
            "stego_audio": f"/download/audio/{os.path.basename(stego_audio_path)}",
            "stego_video": f"/download/video/{os.path.basename(stego_video_path)}",
            "embedded_bits": len(binary_payload),
            "audio_mask_bits": audio_result["embedded_bits"],
            "video_duration": video_duration,
            "video_frames": video_result["frames"],
            "embedding_time": embedding_time,
            "dicom_uid_hash": dicom_uid_hash,
            "video_hash": video_sha256,
        }
    except Exception as error:
        return {"error": str(error)}


@router.post("/extract")
async def extract_payload_api(
    image: UploadFile = File(...),
    dicom: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
):
    try:
        start_time = time.time()
        video_type = _video_content_type(image)
        if video_type not in ALLOWED_VIDEO_TYPES:
            return {"error": "Invalid stego video format"}

        media_path = await save_upload(image, "uploads")

        # Compute SHA-256 hash of the uploaded stego video
        video_hash = hashlib.sha256()
        with open(media_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                video_hash.update(chunk)
        video_sha256 = video_hash.hexdigest()

        # Retrieve DICOM UID hash from database
        record = dicom_videos_collection.find_one({"video_hash": video_sha256})
        if not record:
            return {"error": "No matching DICOM association found for this video hash in the database."}

        db_dicom_uid_hash = record["dicom_uid_hash"]

        # Parse uploaded DICOM and verify UID hash
        dicom_filename = dicom.filename or ""
        is_dicom = dicom_filename.lower().endswith(".dcm") or dicom.content_type == "application/dicom"
        if not is_dicom:
            return {"error": "Invalid DICOM file format. Please upload a valid DICOM (.dcm) file."}

        dicom_path = await save_upload(dicom, "uploads")
        try:
            ds = pydicom.dcmread(dicom_path)
            uploaded_dicom_uid = ds.SOPInstanceUID
        except Exception as e:
            return {"error": f"Failed to parse uploaded DICOM file: {str(e)}"}

        uploaded_dicom_uid_hash = hashlib.sha256(uploaded_dicom_uid.encode("utf-8")).hexdigest()

        if uploaded_dicom_uid_hash != db_dicom_uid_hash:
            return {"error": "Verification failed: Provided DICOM image does not match the original stego video."}

        audio_path = f"uploads/video_audio_{uuid.uuid4()}.wav"

        # Extract the audio from the video (using the fallback or ffmpeg)
        extract_audio_from_video(media_path, audio_path)

        # Extract the binary mask from the audio
        mask = extract_mask_from_wav(audio_path)
        coords = np.where(mask == 1)

        # Read all video frames using cv2.VideoCapture
        video = cv2.VideoCapture(media_path)
        frames = []
        while True:
            ret, frame = video.read()
            if not ret:
                break
            frames.append(frame)
        video.release()

        if not frames:
            return {"error": "Unable to read frames from stego video"}

        # Get unique frames by taking every 2nd frame (since they were duplicated for 60 FPS)
        unique_frames = frames[::2]

        # Extract metadata from Frame 0 using lsb_bits = 3
        # Extract length prefix first
        length_bits = extract_bits_from_frame(unique_frames[0], mask, 32, 3, coords)
        if not length_bits or len(length_bits) < 32:
            return {"error": "Failed to extract metadata length from Frame 0"}
        metadata_length = int(length_bits, 2)

        # Extract full metadata payload (prefix + body)
        full_metadata_bits = extract_bits_from_frame(unique_frames[0], mask, 32 + metadata_length, 3, coords)
        metadata_bits = full_metadata_bits[32:]
        metadata_str = binary_to_text(metadata_bits)
        metadata = json.loads(metadata_str)

        lsb_bits = metadata["lsb_bits"]
        total_bits = metadata["total_bits"]
        num_chunks = metadata["num_chunks"]
        mapping = metadata["mapping"]

        # Extract each chunk from Frame mapping[i]
        chunks = [None] * num_chunks
        for i in range(num_chunks):
            frame_idx = mapping[i]
            if frame_idx >= len(unique_frames):
                return {"error": f"Frame index {frame_idx} in mapping exceeds unique frames count {len(unique_frames)}"}
            chunk_size = (total_bits // num_chunks) + (1 if i < (total_bits % num_chunks) else 0)
            chunk_bits = extract_bits_from_frame(unique_frames[frame_idx], mask, chunk_size, lsb_bits, coords)
            chunks[i] = chunk_bits

        binary_payload = "".join(chunks)

        # Decompress payload
        compressed_payload = read_length_prefixed_binary(binary_payload)
        extracted_payload = huffman_decompress_text(compressed_payload)

        extraction_time = time.time() - start_time

        reports_collection.insert_one({
            "type": "extraction",
            "username": current_user,
            "stego_video": image.filename,
            "dicom_filename": dicom.filename,
            "dicom_uid_hash": uploaded_dicom_uid_hash,
            "video_hash": video_sha256,
            "extraction_time": extraction_time,
            "created_at": datetime.utcnow(),
        })

        return {
            "message": "Extraction Successful",
            "payload": extracted_payload,
            "extraction_time": extraction_time,
            "dicom_uid_hash": db_dicom_uid_hash,
            "video_hash": video_sha256,
        }
    except Exception as error:
        return {"error": str(error)}


def _audio_content_type(upload):
    extension = os.path.splitext(upload.filename or "")[1].lower()

    if extension == ".wav":
        return "audio/wav"

    if extension == ".mp3":
        return "audio/mpeg"

    if extension == ".wan":
        return "audio/wan"

    return upload.content_type


def _video_content_type(upload):
    extension = os.path.splitext(upload.filename or "")[1].lower()

    if extension == ".avi":
        return "video/avi"

    if extension == ".mp4":
        return "video/mp4"

    return upload.content_type
