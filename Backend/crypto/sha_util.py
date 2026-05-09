import hashlib

def generate_hash(data):
    return hashlib.sha256(data).hexdigest()


def verify_hash(data, original_hash):
    new_hash = hashlib.sha256(data).hexdigest()

    return new_hash == original_hash