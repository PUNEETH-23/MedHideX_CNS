import os
from datetime import datetime
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from database.mongo import users_collection

security = HTTPBearer()

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-locally-secret")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token: sub claim missing",
            )

        # Update last login or ensure the user exists in MongoDB using username field
        users_collection.update_one(
            {"username": user_id},
            {"$set": {"username": user_id, "last_login": datetime.utcnow()}},
            upsert=True,
        )

        return user_id

    except JWTError as error:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired authentication token: {str(error)}",
        ) from error

