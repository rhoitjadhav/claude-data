import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.export import router as export_router
from app.routers.lendings import router as lendings_router
from app.routers.jobs import router as jobs_router
from app.routers.stats import router as stats_router
from app.routers.transactions import router as transactions_router
from app.routers.upload import router as upload_router

app = FastAPI(title="UPI Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(jobs_router)
app.include_router(transactions_router)
app.include_router(stats_router)
app.include_router(export_router)
app.include_router(lendings_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}