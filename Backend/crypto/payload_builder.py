import json


def payload_builder(aes, rsa, hash, original_filename=None, encryption_note=None):
    data = {
        "aes": aes,
        "rsa": rsa,
        "hash": hash
    }

    if original_filename:
        data["original_filename"] = original_filename

    if encryption_note:
        data["encryption_note"] = encryption_note

    payload = json.dumps(data)
    return payload
