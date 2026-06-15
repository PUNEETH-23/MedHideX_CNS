from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends

from Auth.auth_handler import get_current_user
from database.mongo import files_collection, reports_collection, users_collection


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
        if key not in {"encrypted_document", "encrypted_aes_key", "payload", "encrypted_file"}
    }


@router.get("/reports")
def get_reports(current_user: str = Depends(get_current_user)):
    user_doc = users_collection.find_one({"username": current_user})
    if not user_doc:
        return {
            "username": current_user,
            "role": "patient",
            "reports": [],
            "encrypted_files": [],
        }

    role = user_doc.get("role", "patient")
    display_name = user_doc.get("name", user_doc.get("username", current_user))

    # Query reports by actor's username OR if username is not present (for legacy reports)
    query = {"$or": [{"username": current_user}, {"username": {"$exists": False}}]}

    # Profile cache to optimize Mongo lookups
    profile_cache = {}

    def get_profile_info(uid):
        if not uid:
            return None
        if uid not in profile_cache:
            doc = users_collection.find_one({"username": uid})
            if doc:
                profile_cache[uid] = {
                    "name": doc.get("name"),
                    "email": doc.get("email"),
                }
            else:
                profile_cache[uid] = {"name": "Unknown", "email": uid}
        return profile_cache[uid]

    reports = []
    for report in reports_collection.find(query):
        serialized = serialize_document(report)
        other_id = report.get("patient_id") if role == "doctor" else report.get("doctor_id")
        other_info = get_profile_info(other_id)
        if other_info:
            serialized["counterpart_name"] = other_info["name"]
            serialized["counterpart_email"] = other_info["email"]
        reports.append(serialized)

    encrypted_files = []
    files_query = {"$or": [{"username": current_user}, {"doctor_id": current_user}, {"patient_id": current_user}]}
    for file_record in files_collection.find(files_query):
        serialized = serialize_document(file_record)
        other_id = file_record.get("patient_id") if role == "doctor" else file_record.get("doctor_id")
        # Fallback if other_id is the user themselves
        if other_id == current_user:
            other_id = file_record.get("doctor_id") if role == "doctor" else file_record.get("patient_id")
        other_info = get_profile_info(other_id)
        if other_info:
            serialized["counterpart_name"] = other_info["name"]
            serialized["counterpart_email"] = other_info["email"]
        encrypted_files.append(serialized)

    return {
        "username": display_name,
        "role": role,
        "reports": reports,
        "encrypted_files": encrypted_files,
    }
