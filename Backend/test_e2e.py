import os
import shutil
import uuid
import numpy as np
import cv2
import asyncio
import io
import wave
from fastapi import UploadFile
from starlette.datastructures import Headers
from unittest.mock import MagicMock, patch

# Mock MongoDB before importing the app/routes
mock_client = MagicMock()
mock_db = MagicMock()
mock_reports = MagicMock()
mock_files = MagicMock()
mock_users = MagicMock()

mock_client.__getitem__.return_value = mock_db
mock_db.__getitem__.side_effect = lambda name: {
    "reports": mock_reports,
    "files": mock_files,
    "users": mock_users
}[name]

# Setup mock find_one logic for user keys
from crypto.rsa_util import generate_rsa_keys
from crypto.key_management import encrypt_private_key

doc_priv, doc_pub = generate_rsa_keys()
pat_priv, pat_pub = generate_rsa_keys()

encrypted_doc_priv = encrypt_private_key(doc_priv, "doc_password")
encrypted_pat_priv = encrypt_private_key(pat_priv, "pat_password")

mock_doctor_doc = {
    "username": "test_doctor",
    "role": "doctor",
    "name": "Dr. Test Doctor",
    "email": "doctor@test.com",
    "public_key": doc_pub.decode('utf-8'),
    "encrypted_private_key": encrypted_doc_priv
}

mock_patient_doc = {
    "username": "test_patient",
    "role": "patient",
    "name": "Test Patient",
    "email": "patient@test.com",
    "public_key": pat_pub.decode('utf-8'),
    "encrypted_private_key": encrypted_pat_priv
}

def mock_find_one(query):
    uid = query.get("username")
    if uid == "test_doctor":
        return mock_doctor_doc
    if uid == "test_patient":
        return mock_patient_doc
    return None

mock_users.find_one.side_effect = mock_find_one

# Patch database collections
patcher_mongo = patch("database.mongo.reports_collection", mock_reports)
patcher_mongo.start()

patcher_files = patch("database.mongo.files_collection", mock_files)
patcher_files.start()

patcher_users = patch("database.mongo.users_collection", mock_users)
patcher_users.start()

# Now import the API route functions
from routes.crypto_routes import encrypt_document, decrypt_payload_api
from routes.stego_routes import embed_payload_api, extract_payload_api

async def run_pipeline_test():
    # Setup test directories
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("stego", exist_ok=True)
    os.makedirs("extracted", exist_ok=True)
    
    # 1. Create secret text
    secret_text = "Confidential medical record text: " + "PATIENT_DATA_" * 20
    
    # 2. Cover image (256x256 RGB)
    cover_img = np.zeros((256, 256, 3), dtype=np.uint8)
    cover_img[:, :] = [100, 150, 200]  # dummy colors
    cover_bytes = cv2.imencode(".png", cover_img)[1].tobytes()
    
    # 3. Create dummy carrier.wav (valid WAV format)
    wav_path = "uploads/carrier.wav"
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(44100)
        w.writeframes(b"\x00\x00" * 44100)
        
    with open(wav_path, "rb") as wf:
        audio_bytes = wf.read()

    print("--- 1. Encrypting document ---")
    doc_file = UploadFile(
        filename="medical_record.txt",
        file=io.BytesIO(secret_text.encode("utf-8")),
        size=len(secret_text),
        headers=Headers({"content-type": "text/plain"})
    )
    
    encrypt_res = await encrypt_document(
        file=doc_file, 
        patient_id="test_patient",
        password="doc_password",
        current_user="test_doctor"
    )
    assert "error" not in encrypt_res, f"Encryption failed: {encrypt_res}"
    encrypted_payload = encrypt_res["payload"]
    print("Encryption successful.")

    print("\n--- 2. Embedding payload in video & audio ---")
    cover_file = UploadFile(
        filename="cover.png",
        file=io.BytesIO(cover_bytes),
        size=len(cover_bytes),
        headers=Headers({"content-type": "image/png"})
    )

    audio_file = UploadFile(
        filename="carrier.wav",
        file=io.BytesIO(audio_bytes),
        size=len(audio_bytes),
        headers=Headers({"content-type": "audio/wav"})
    )

    embed_res = await embed_payload_api(
        image=cover_file,
        audio=audio_file,
        payload=encrypted_payload,
        lsb_bits=3,
        current_user="test_doctor"
    )
    assert "error" not in embed_res, f"Embedding failed: {embed_res}"
    stego_video_path = f"stego/{os.path.basename(embed_res['stego_video'])}"
    print(f"Embedding successful. Stego video created at: {stego_video_path}")

    print("\n--- 3. Extracting payload from stego video ---")
    with open(stego_video_path, "rb") as vf:
        video_bytes = vf.read()

    video_upload_file = UploadFile(
        filename="stego_video.mp4",
        file=io.BytesIO(video_bytes),
        size=len(video_bytes),
        headers=Headers({"content-type": "video/mp4"})
    )

    extract_res = await extract_payload_api(image=video_upload_file, current_user="test_patient")
    assert "error" not in extract_res, f"Extraction failed: {extract_res}"
    extracted_payload = extract_res["payload"]
    print("Extraction successful.")

    print("\n--- 4. Decrypting payload ---")
    decrypt_res = await decrypt_payload_api(
        payload=extracted_payload, 
        password="pat_password",
        current_user="test_patient"
    )
    assert "error" not in decrypt_res, f"Decryption failed: {decrypt_res}"
    
    recovered_file_path = f"extracted/{os.path.basename(decrypt_res['output_file'])}"
    print(f"Decryption successful. Recovered file path: {recovered_file_path}")

    # Read and compare
    with open(recovered_file_path, "r", encoding="utf-8") as rf:
        recovered_text = rf.read()

    assert recovered_text == secret_text, "Decrypted text does not match the original secret text!"
    assert decrypt_res["signature_verified"] is True, "Digital signature verification failed!"
    assert decrypt_res["integrity_verified"] is True, "Integrity verification failed!"
    print("\n=== PIPELINE INTEGRATION TEST PASSED SUCCESSFULLY! ===")

    # Cleanup test files generated by the test itself
    for folder in ["uploads", "stego", "extracted"]:
        if os.path.exists(folder):
            for file_name in os.listdir(folder):
                if file_name.endswith((".wav", ".mp4", ".png", ".txt", ".mp3", ".avi", ".wan")):
                    try:
                        os.remove(os.path.join(folder, file_name))
                    except OSError:
                        pass

if __name__ == "__main__":
    asyncio.run(run_pipeline_test())
