from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
from fastapi.middleware.cors import CORSMiddleware

from app.routes import dashboard, products, progress, routine, scan

app = FastAPI(title="Skinly API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router, prefix="/scan", tags=["scan"])
app.include_router(dashboard.router, prefix="/scan", tags=["dashboard"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(routine.router, prefix="/routine", tags=["routine"])
app.include_router(progress.router, prefix="/progress", tags=["progress"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
