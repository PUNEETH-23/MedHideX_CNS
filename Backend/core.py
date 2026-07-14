import os
import uuid

from fastapi import UploadFile

from crypto.rsa_util import generate_rsa_keys


APP_DIRS = (
    "uploads",
    "stego",
    "extracted",
    "keys",
)

PRIVATE_KEY_PATH = "keys/private.pem"
PUBLIC_KEY_PATH = "keys/public.pem"

ALLOWED_IMAGE_TYPES = (
    "image/png",
    "image/jpeg",
    "image/jpg",
)

ALLOWED_AUDIO_TYPES = (
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/wan",
)

ALLOWED_VIDEO_TYPES = (
    "video/mp4",
)


def setup_storage():
    for directory in APP_DIRS:
        os.makedirs(directory, exist_ok=True)


def setup_keys():
    if os.path.exists(PRIVATE_KEY_PATH) and os.path.exists(PUBLIC_KEY_PATH):
        with open(PRIVATE_KEY_PATH, "rb") as private_file:
            private_key = private_file.read()

        with open(PUBLIC_KEY_PATH, "rb") as public_file:
            public_key = public_file.read()

        return private_key, public_key

    private_key, public_key = generate_rsa_keys()

    with open(PRIVATE_KEY_PATH, "wb") as private_file:
        private_file.write(private_key)

    with open(PUBLIC_KEY_PATH, "wb") as public_file:
        public_file.write(public_key)

    return private_key, public_key


async def save_upload(upload: UploadFile, directory: str):
    filename = f"{uuid.uuid4()}_{upload.filename}"
    file_path = f"{directory}/{filename}"

    with open(file_path, "wb") as file:
        file.write(await upload.read())

    return file_path


setup_storage()
private_key, public_key = setup_keys()
