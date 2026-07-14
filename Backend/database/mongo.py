from pymongo import MongoClient

MONGO_URL = (
    "mongodb://localhost:27017/"
)

client = MongoClient(MONGO_URL)

db = client["medhidex"]

reports_collection = db["reports"]

users_collection = db["users"]

files_collection = db["files"]

dicom_videos_collection = db["dicom_videos"]

