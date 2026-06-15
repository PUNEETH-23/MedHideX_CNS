import json
import os
import time
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException

from Auth.auth_handler import get_current_user
from core import PRIVATE_KEY_PATH, public_key, private_key
from crypto.aes_util import decrypt_data, encrypt_data, generate_aes_key
from crypto.rsa_util import decrypt_aes_key, encrypt_aes_key, sign_hash, verify_signature
from crypto.sha_util import generate_hash, verify_hash
from database.mongo import files_collection, reports_collection, users_collection
from steganography.bit_utils import huffman_compress_text, huffman_decompress_text


router = APIRouter()
ENCRYPTION_NOTE = "This file contains encrypted data."


@router.post("/encrypt")
async def encrypt_document(
    file: UploadFile = File(...),
    patient_id: str = Form(None),
    password: str = Form(None),
    current_user: str = Depends(get_current_user),
):
    try:
        start_time = time.time()
        data = await file.read()
        
        # 1. Decode text and apply Huffman coding reduction
        text_str = data.decode("utf-8", errors="replace")
        huffman_compressed_bits = huffman_compress_text(text_str)
        compressed_bytes = huffman_compressed_bits.encode("ascii")

        # 2. Encrypt the compressed bits using AES-256
        aes_key = generate_aes_key()
        encrypted_document = encrypt_data(compressed_bytes, aes_key)
        
        # 3. Encrypt AES key using server's global public key (RSA Key Exchange)
        encrypted_aes_key = encrypt_aes_key(aes_key, public_key)

        # 4. Generate SHA-256 hash of raw report
        hash_value = generate_hash(data)

        # Sign the hash using the server's global private key
        signature = sign_hash(hash_value, private_key)

        # Package payload
        payload_data = {
            "aes": encrypted_document,
            "rsa": encrypted_aes_key,
            "hash": hash_value,
            "signature": signature,
            "original_filename": file.filename,
            "encryption_note": ENCRYPTION_NOTE,
            "doctor_id": current_user,
        }
        payload = json.dumps(payload_data)
        
        encryption_time = time.time() - start_time

        # Store encrypted document to disk instead of MongoDB directly to prevent BSON document too large error
        encrypted_dir = Path("uploads/encrypted")
        encrypted_dir.mkdir(parents=True, exist_ok=True)
        encrypted_filename = f"enc_{uuid.uuid4()}.json"
        encrypted_filepath = encrypted_dir / encrypted_filename
        
        with open(encrypted_filepath, "w", encoding="utf-8") as ef:
            json.dump(encrypted_document, ef)

        # Store in MongoDB files collection
        files_collection.insert_one({
            "username": current_user,
            "doctor_id": current_user,
            "patient_id": patient_id or current_user,
            "encrypted_file_path": str(encrypted_filepath),
            "sha256": hash_value,
            "original_filename": file.filename,
            "created_at": datetime.utcnow(),
        })

        # Store in MongoDB reports collection
        reports_collection.insert_one({
            "username": current_user,
            "type": "encryption",
            "original_filename": file.filename,
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
    password: str = Form(None),
    current_user: str = Depends(get_current_user),
):
    try:
        start_time = time.time()
        payload_data = json.loads(payload)

        # Decrypt AES key using server's global private key
        with open(PRIVATE_KEY_PATH, "rb") as private_file:
            private_key_data = private_file.read()

        aes_key = decrypt_aes_key(payload_data["rsa"], private_key_data)
        
        # Decrypt AES payload to get compressed bits bytes
        decrypted_compressed_bytes = decrypt_data(
            payload_data["aes"]["ciphertext"],
            aes_key,
            payload_data["aes"]["iv"],
        )

        # Decode compressed bits bytes to bit string
        huffman_compressed_bits = decrypted_compressed_bytes.decode("ascii")

        # Decompress bit string to recover original text
        recovered_text = huffman_decompress_text(huffman_compressed_bits)
        decrypted_document = recovered_text.encode("utf-8")

        # Verify digital signature using server's global public key
        signature_verified = verify_signature(
            payload_data["hash"],
            payload_data.get("signature", ""),
            public_key
        )

        # Validate integrity
        integrity_verified = verify_hash(decrypted_document, payload_data["hash"])

        original_filename = Path(payload_data.get("original_filename", "")).name
        original_suffix = Path(original_filename).suffix or ".bin"
        output_file = f"extracted/recovered_{uuid.uuid4()}{original_suffix}"

        with open(output_file, "wb") as file:
            file.write(decrypted_document)

        decryption_time = time.time() - start_time
        
        # Store in MongoDB reports collection
        reports_collection.insert_one({
            "username": current_user,
            "type": "decryption",
            "original_filename": original_filename,
            "created_at": datetime.utcnow(),
        })

        return {
            "message": "Decryption Successful",
            "integrity_verified": integrity_verified,
            "signature_verified": signature_verified,
            "original_filename": original_filename,
            "encryption_note": payload_data.get("encryption_note", ENCRYPTION_NOTE),
            "output_file": f"/download/extracted/{os.path.basename(output_file)}",
            "decryption_time": decryption_time,
        }
    except Exception as error:
        return {"error": str(error)}


