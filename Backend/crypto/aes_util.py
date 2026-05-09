from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import base64

def generate_aes_key():
    return get_random_bytes(32)  # AES-256


def encrypt_data(data, key):
    cipher = AES.new(key, AES.MODE_CBC)

    ciphertext = cipher.encrypt(
        pad(data, AES.block_size)
    )

    return {
        "iv": base64.b64encode(cipher.iv).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode()
    }


def decrypt_data(ciphertext, key, iv):
    cipher = AES.new(
        key,
        AES.MODE_CBC,
        base64.b64decode(iv)
    )

    plaintext = unpad(
        cipher.decrypt(base64.b64decode(ciphertext)),
        AES.block_size
    )

    return plaintext