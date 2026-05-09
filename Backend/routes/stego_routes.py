import json
import os
import time
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, UploadFile

from Auth.auth_handler import get_current_user
from core import ALLOWED_IMAGE_TYPES, save_upload
from database.mongo import reports_collection
from steganography.adaptive_embed import adaptive_embed
from steganography.adaptive_extract import adaptive_extract
from steganography.capacity import estimate_capacity


router = APIRouter()


@router.post("/embed")
async def embed_payload_api(
    image: UploadFile = File(...),
    payload: str = Form(...),
    current_user: str = Depends(get_current_user),
):
    try:
        start_time = time.time()

        if image.content_type not in ALLOWED_IMAGE_TYPES:
            return {"error": "Invalid image format"}

        image_path = await save_upload(image, "uploads")
        capacity = estimate_capacity(image_path)

        if len(payload) * 8 > capacity["bits"]:
            return {"error": "Payload exceeds image capacity"}

        output_path = f"stego/stego_{uuid.uuid4()}.png"
        mask_path = f"stego/mask_{uuid.uuid4()}.json"

        result = adaptive_embed(
            image_path=image_path,
            payload=payload,
            output_path=output_path,
        )

        with open(mask_path, "w") as mask_file:
            json.dump(result["mask"], mask_file)

        embedding_time = time.time() - start_time
        reports_collection.insert_one({
            "type": "embedding",
            "username": current_user,
            "uploaded_image": image.filename,
            "stego_image": output_path,
            "mask_file": mask_path,
            "embedded_bits": result["embedded_bits"],
            "embedding_time": embedding_time,
            "created_at": datetime.utcnow(),
        })

        return {
            "message": "Embedding Successful",
            "stego_image": f"/download/stego/{os.path.basename(output_path)}",
            "mask_file": f"/download/mask/{os.path.basename(mask_path)}",
            "embedded_bits": result["embedded_bits"],
            "embedding_time": embedding_time,
        }
    except Exception as error:
        return {"error": str(error)}


@router.post("/extract")
async def extract_payload_api(
    image: UploadFile = File(...),
    mask_file: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
):
    try:
        start_time = time.time()
        image_path = await save_upload(image, "uploads")
        mask = json.loads(await mask_file.read())
        extracted_payload = adaptive_extract(image_path=image_path, mask=mask)
        extraction_time = time.time() - start_time

        reports_collection.insert_one({
            "type": "extraction",
            "username": current_user,
            "stego_image": image.filename,
            "mask_file": mask_file.filename,
            "extraction_time": extraction_time,
            "created_at": datetime.utcnow(),
        })

        return {
            "message": "Extraction Successful",
            "payload": extracted_payload,
            "extraction_time": extraction_time,
        }
    except Exception as error:
        return {"error": str(error)}
