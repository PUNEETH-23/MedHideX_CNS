import base64
import hashlib
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad

def derive_aes_key(password: str, salt: bytes) -> bytes:
    # PBKDF2 derivation: 100,000 iterations, 32-byte key for AES-256
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000, 32)

def encrypt_private_key(private_key_pem: bytes, password: str) -> dict:
    salt = get_random_bytes(16)
    aes_key = derive_aes_key(password, salt)
    cipher = AES.new(aes_key, AES.MODE_CBC)
    ciphertext = cipher.encrypt(pad(private_key_pem, AES.block_size))
    return {
        "salt": base64.b64encode(salt).decode("utf-8"),
        "iv": base64.b64encode(cipher.iv).decode("utf-8"),
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
    }

def decrypt_private_key(encrypted_pk_data: dict, password: str) -> bytes:
    salt = base64.b64decode(encrypted_pk_data["salt"])
    iv = base64.b64decode(encrypted_pk_data["iv"])
    ciphertext = base64.b64decode(encrypted_pk_data["ciphertext"])
    aes_key = derive_aes_key(password, salt)
    cipher = AES.new(aes_key, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(ciphertext), AES.block_size)
