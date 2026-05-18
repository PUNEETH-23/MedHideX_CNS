from fastapi import APIRouter, Form

from Auth.auth_handler import create_access_token
from Auth.password_handler import hash_password, verify_password
from database.audit import log_event
from database.mongo import users_collection


router = APIRouter()


@router.post("/register")
async def register_user(
    username: str = Form(...),
    password: str = Form(...),
    re_enter_password: str = Form(...),
):
    if password != re_enter_password:
        log_event("registration", username=username, status="failed", reason="password_mismatch")
        return {"error": "Passwords do not match"}

    existing_user = users_collection.find_one({"username": username})
    if existing_user:
        log_event("registration", username=username, status="failed", reason="user_exists")
        return {"error": "User already exists"}

    users_collection.insert_one({
        "username": username,
        "password": hash_password(password),
    })

    log_event("registration", username=username)

    return {"message": "Registration Successful"}


@router.post("/login")
async def login_user(
    username: str = Form(...),
    password: str = Form(...),
):
    user = users_collection.find_one({"username": username})
    if not user:
        log_event("login", username=username, status="failed", reason="user_not_found")
        return {"error": "User not found"}

    if not verify_password(password, user["password"]):
        log_event("login", username=username, status="failed", reason="invalid_password")
        return {"error": "Invalid password"}

    access_token = create_access_token({"sub": username})

    log_event("login", username=username)

    return {
        "message": "Login Successful",
        "token": access_token,
    }
