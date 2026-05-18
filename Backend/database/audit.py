from datetime import datetime

from database.mongo import audit_logs_collection


def log_event(event_type, username=None, status="success", **details):
    log = {
        "type": event_type,
        "username": username,
        "status": status,
        "created_at": datetime.utcnow(),
        **details,
    }

    try:
        audit_logs_collection.insert_one(log)
    except Exception:
        pass
