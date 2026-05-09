import json
def payload_builder(aes,rsa,hash):
    data = {
        "aes": aes,
        "rsa": rsa,
        "hash": hash
    }
    payload = json.dumps(data)
    return payload