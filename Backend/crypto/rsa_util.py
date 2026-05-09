from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
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