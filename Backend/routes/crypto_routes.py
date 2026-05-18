import json
import os
import time
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile

from Auth.auth_handler import get_current_user
from core import PRIVATE_KEY_PATH, public_key
from crypto.aes_util import decrypt_data, encrypt_data, generate_aes_key
from crypto.payload_builder import payload_builder
from crypto.rsa_util import decrypt_aes_key, encrypt_aes_key
from crypto.sha_util import generate_hash, verify_hash
from database.mongo import files_collection, reports_collection


router = APIRouter()
ENCRYPTION_NOTE = "This file contains encrypted data."


@router.post("/encrypt")
async def encrypt_document(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
):
    try:
        start_time = time.time()
        data = await file.read()
        aes_key = generate_aes_key()

        encrypted_document = encrypt_data(data, aes_key)
        encrypted_aes_key = encrypt_aes_key(aes_key, public_key)
        hash_value = generate_hash(data)

        payload = payload_builder(
            encrypted_document,
            encrypted_aes_key,
            hash_value,
            file.filename,
            ENCRYPTION_NOTE,
        )
        encryption_time = time.time() - start_time

        files_collection.insert_one({
            "username": current_user,
            "original_filename": file.filename,
            "file_size": len(data),
            "encrypted_document": encrypted_document,
            "encrypted_aes_key": encrypted_aes_key,
            "sha256_hash": hash_value,
            "payload": payload,
            "encryption_time": encryption_time,
            "created_at": datetime.utcnow(),
        })

        reports_collection.insert_one({
            "type": "encryption",
            "username": current_user,
            "original_filename": file.filename,
            "file_size": len(data),
            "encryption_time": encryption_time,
            "created_at": datetime.utcnow(),
        })

        return {
            "message": "Encryption Successful",
            "payload": payload,
            "encryption_time": encryption_time,
        }
    except Exception as error:
        return {"error": str(error)}


@router.post("/decrypt")
async def decrypt_payload_api(
    payload: str = Form(...),
    current_user: str = Depends(get_current_user),
):
    try:
        start_time = time.time()
        payload_data = json.loads(payload)

        with open(PRIVATE_KEY_PATH, "rb") as private_file:
            private_key_data = private_file.read()

        aes_key = decrypt_aes_key(payload_data["rsa"], private_key_data)
        decrypted_document = decrypt_data(
            payload_data["aes"]["ciphertext"],
            aes_key,
            payload_data["aes"]["iv"],
        )
        integrity_verified = verify_hash(decrypted_document, payload_data["hash"])

        original_filename = Path(payload_data.get("original_filename", "")).name
        original_suffix = Path(original_filename).suffix or ".bin"
        output_file = f"extracted/recovered_{uuid.uuid4()}{original_suffix}"

        with open(output_file, "wb") as file:
            file.write(decrypted_document)

        decryption_time = time.time() - start_time
        reports_collection.insert_one({
            "type": "decryption",
            "username": current_user,
            "output_file": output_file,
            "integrity_verified": integrity_verified,
            "decryption_time": decryption_time,
            "created_at": datetime.utcnow(),
        })

        return {
            "message": "Decryption Successful",
            "integrity_verified": integrity_verified,
            "original_filename": original_filename,
            "encryption_note": payload_data.get("encryption_note", ENCRYPTION_NOTE),
            "output_file": f"/download/extracted/{os.path.basename(output_file)}",
            "decryption_time": decryption_time,
        }
    except Exception as error:
        return {"error": str(error)}
