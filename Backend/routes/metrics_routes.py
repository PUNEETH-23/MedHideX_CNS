from datetime import datetime

from fastapi import APIRouter, Depends, File, UploadFile

from Auth.auth_handler import get_current_user
from core import save_upload
from database.mongo import reports_collection
from steganography.metrics import calculate_metrics


router = APIRouter()


@router.post("/metrics")
async def metrics_api(
    original_image: UploadFile = File(...),
    stego_image: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
):
    try:
        original_path = await save_upload(original_image, "uploads")
        stego_path = await save_upload(stego_image, "uploads")
        metric_values = calculate_metrics(original_path, stego_path)

        reports_collection.insert_one({
            "type": "metrics",
            "username": current_user,
            "original_image": original_image.filename,
            "stego_image": stego_image.filename,
            "PSNR": metric_values["PSNR"],
            "SSIM": metric_values["SSIM"],
            "created_at": datetime.utcnow(),
        })

        return {
            "message": "Metrics Calculated",
            "metrics": metric_values,
        }
    except Exception as error:
        return {"error": str(error)}
