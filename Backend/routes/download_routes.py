from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from database.audit import log_event


router = APIRouter()

DOWNLOAD_DIRS = {
    "stego": Path("stego"),
    "mask": Path("stego"),
    "audio": Path("stego"),
    "video": Path("stego"),
    "extracted": Path("extracted"),
}


@router.get("/download/{file_type}/{filename}")
def download_file(file_type: str, filename: str):
    directory = DOWNLOAD_DIRS.get(file_type)
    if directory is None:
        log_event("download", status="failed", file_type=file_type, filename=filename, reason="invalid_file_type")
        raise HTTPException(status_code=404, detail="Invalid file type")

    file_path = directory / Path(filename).name
    if not file_path.exists() or not file_path.is_file():
        log_event("download", status="failed", file_type=file_type, filename=filename, reason="file_not_found")
        raise HTTPException(status_code=404, detail="File not found")

    log_event(
        "download",
        file_type=file_type,
        filename=file_path.name,
        file_size=file_path.stat().st_size,
    )

    return FileResponse(
        file_path,
        filename=file_path.name,
        media_type="application/octet-stream",
    )
