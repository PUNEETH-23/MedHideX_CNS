from fastapi import APIRouter, Form

from Auth.auth_handler import create_access_token
from Auth.password_handler import hash_password, verify_password
from database.mongo import users_collection


router = APIRouter()


@router.post("/register")
async def register_user(
    username: str = Form(...),
    password: str = Form(...),
    re_enter_password: str = Form(...),
):
    if password != re_enter_password:
        return {"error": "Passwords do not match"}

    existing_user = users_collection.find_one({"username": username})
    if existing_user:
        return {"error": "User already exists"}

    users_collection.insert_one({
        "username": username,
        "password": hash_password(password),
    })

    return {"message": "Registration Successful"}


@router.post("/login")
async def login_user(
    username: str = Form(...),
    password: str = Form(...),
):
    user = users_collection.find_one({"username": username})
    if not user:
        return {"error": "User not found"}

    if not verify_password(password, user["password"]):
        return {"error": "Invalid password"}

    access_token = create_access_token({"sub": username})

    return {
        "message": "Login Successful",
        "token": access_token,
    }
