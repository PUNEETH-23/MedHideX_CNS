from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth_routes import router as auth_router
from routes.crypto_routes import router as crypto_router
from routes.download_routes import router as download_router
from routes.health_routes import router as health_router
from routes.metrics_routes import router as metrics_router
from routes.report_routes import router as report_router
from routes.stego_routes import router as stego_router


app = FastAPI(title="MedHideX+")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(crypto_router)
app.include_router(stego_router)
app.include_router(metrics_router)
app.include_router(report_router)
app.include_router(download_router)


# Run with: uvicorn app:app --reload
