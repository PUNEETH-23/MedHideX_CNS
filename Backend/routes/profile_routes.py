from datetime import datetime
from typing import Optional
import hashlib
import hmac
import bcrypt
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from Auth.auth_handler import get_current_user
from database.mongo import users_collection
from crypto.rsa_util import generate_rsa_keys
from crypto.key_management import encrypt_private_key

router = APIRouter()

PASSWORD_SALT = "medhidex-salt-2024"

class ProfileRegisterRequest(BaseModel):
    username: str
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = "patient"
    password: str
    password_confirm: str

@router.post("/register_profile")
async def register_profile(req: ProfileRegisterRequest):
    # Validate password confirmation
    if req.password != req.password_confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    # Check if profile already exists
    existing = users_collection.find_one({"username": req.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Validate role if provided
    role = req.role or "patient"
    if role not in ["doctor", "patient"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Generate RSA-2048 key pair
    private_key, public_key = generate_rsa_keys()

    # Encrypt private key with the user's password
    encrypted_pk_data = encrypt_private_key(private_key, req.password)

    # Hash password with bcrypt
    password_bcrypt = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Hash password with HMAC-SHA256 for compatibility
    password_hash = hmac.new(PASSWORD_SALT.encode(), req.password.encode(), hashlib.sha256).hexdigest()

    # Insert user document into MongoDB
    user_doc = {
        "username": req.username,
        "role": role,
        "name": req.name or req.username,
        "email": req.email,
        "password": password_bcrypt,
        "password_hash": password_hash,
        "public_key": public_key.decode("utf-8"),
        "encrypted_private_key": encrypted_pk_data,
        # Store plaintext private key to simplify decryption flow (no unlock required)
        "private_key": private_key.decode("utf-8"),
        "created_at": datetime.utcnow(),
    }
    users_collection.insert_one(user_doc)

    return {"message": "Profile registered successfully"}

@router.get("/patients")
def get_patients(current_user: str = Depends(get_current_user)):
    patients = []
    for user in users_collection.find({"role": "patient"}):
        patients.append({
            "user_id": user.get("username"),
            "name": user.get("name"),
            "email": user.get("email"),
        })
    return patients
