from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends

from Auth.auth_handler import get_current_user
from database.mongo import files_collection, reports_collection


router = APIRouter()


def serialize_value(value):
    if isinstance(value, ObjectId):
        return str(value)

    if isinstance(value, datetime):
        return value.isoformat()

    return value


def serialize_document(document):
    return {
        key: serialize_value(value)
        for key, value in document.items()
        if key not in {"encrypted_document", "encrypted_aes_key", "payload"}
    }


@router.get("/reports")
def get_reports(current_user: str = Depends(get_current_user)):
    reports = []

    for report in reports_collection.find({"username": current_user}):
        reports.append(serialize_document(report))

    encrypted_files = []
    for file_record in files_collection.find({"username": current_user}):
        encrypted_files.append(serialize_document(file_record))

    return {
        "username": current_user,
        "reports": reports,
        "encrypted_files": encrypted_files,
    }
