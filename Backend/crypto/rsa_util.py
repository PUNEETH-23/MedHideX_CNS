from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256
import base64


def generate_rsa_keys():
    key = RSA.generate(2048)

    private_key = key.export_key()
    public_key = key.publickey().export_key()

    return private_key, public_key


def encrypt_aes_key(aes_key, public_key):
    rsa_key = RSA.import_key(public_key)

    cipher = PKCS1_OAEP.new(rsa_key)

    encrypted_key = cipher.encrypt(aes_key)

    return base64.b64encode(encrypted_key).decode()


def decrypt_aes_key(encrypted_key, private_key):
    rsa_key = RSA.import_key(private_key)

    cipher = PKCS1_OAEP.new(rsa_key)

    decrypted_key = cipher.decrypt(
        base64.b64decode(encrypted_key)
    )

    return decrypted_key


def sign_hash(hash_hex: str, private_key_pem: bytes) -> str:
    rsa_key = RSA.import_key(private_key_pem)
    h = SHA256.new(bytes.fromhex(hash_hex))
    signature = pkcs1_15.new(rsa_key).sign(h)
    return base64.b64encode(signature).decode("utf-8")


def verify_signature(hash_hex: str, signature_b64: str, public_key_pem: bytes) -> bool:
    try:
        rsa_key = RSA.import_key(public_key_pem)
        h = SHA256.new(bytes.fromhex(hash_hex))
        signature = base64.b64decode(signature_b64)
        pkcs1_15.new(rsa_key).verify(h, signature)
        return True
    except Exception:
        return False