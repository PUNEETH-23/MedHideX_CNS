import os
from datetime import datetime, timedelta
import hashlib
import hmac

from fastapi import APIRouter, HTTPException
from jose import jwt
from pydantic import BaseModel

from database.mongo import users_collection

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-locally-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480
PASSWORD_SALT = "medhidex-salt-2024"

import bcrypt

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(req: LoginRequest):
    user = users_collection.find_one({"username": req.username})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    is_valid = False
    
    # Check if bcrypt password hash exists and starts with standard bcrypt prefix
    if "password" in user:
        stored_password = user["password"]
        if isinstance(stored_password, str) and stored_password.startswith("$2"):
            try:
                is_valid = bcrypt.checkpw(req.password.encode('utf-8'), stored_password.encode('utf-8'))
            except Exception:
                is_valid = False

    # Fallback to HMAC-SHA256 password_hash if bcrypt was not valid or not present
    if not is_valid and "password_hash" in user:
        password_hash = hmac.new(PASSWORD_SALT.encode(), req.password.encode(), hashlib.sha256).hexdigest()
        if password_hash == user.get("password_hash", ""):
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": req.username,
        "exp": expire,
    }
    access_token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": req.username,
        "role": user.get("role"),
    }
