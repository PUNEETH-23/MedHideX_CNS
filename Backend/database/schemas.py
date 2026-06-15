from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserSchema(BaseModel):
    id: str = Field(alias="_id")
    username: str
    password: str  # Contains the bcrypt password hash
    role: Optional[str] = "patient"
    name: Optional[str] = None
    email: Optional[str] = None
    public_key: Optional[str] = None
    encrypted_private_key: Optional[dict] = None
    private_key: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ReportSchema(BaseModel):
    id: str = Field(alias="_id")
    type: str
    username: Optional[str] = None
    stego_image: Optional[str] = None
    mask_file: Optional[str] = None
    stego_audio: Optional[str] = None
    stego_video: Optional[str] = None
    embedded_bits: Optional[int] = None
    audio_mask_bits: Optional[int] = None
    video_duration: Optional[float] = None
    embedding_time: Optional[float] = None
    extraction_time: Optional[float] = None
    created_at: Optional[datetime] = None
    original_filename: Optional[str] = None
    uploaded_image: Optional[str] = None
    uploaded_audio: Optional[str] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
