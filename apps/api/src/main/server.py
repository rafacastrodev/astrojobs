import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from infrastructure.database.config import settings
from infrastructure.database.session import init_db
from infrastructure.storage.s3_file_storage import ensure_s3_bucket
from main.admin_router import router as recruiter_router
from main.analysis_router import router as analysis_router
from main.auth_router import router as auth_router
from main.documents_router import router as documents_router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    ensure_s3_bucket()
    yield


app = FastAPI(lifespan=lifespan)

allowed_origins = {settings.frontend_origin or "http://localhost"}
if settings.is_development:
    allowed_origins.update(
        {
            "http://localhost",
            "http://localhost:3000",
            "http://127.0.0.1",
            "http://127.0.0.1:3000",
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(recruiter_router)
app.include_router(documents_router)
app.include_router(analysis_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
