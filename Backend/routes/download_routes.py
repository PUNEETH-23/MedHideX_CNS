from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse


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
        raise HTTPException(status_code=404, detail="Invalid file type")

    file_path = directory / Path(filename).name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        file_path,
        filename=file_path.name,
        media_type="application/octet-stream",
    )
