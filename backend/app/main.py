from fastapi import FastAPI
from app.routes.collections import router as collections_router

app = FastAPI(title="OilTrace API", version="0.1.0")

app.include_router(collections_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
