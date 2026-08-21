import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from infrastructure.database.config import settings
from infrastructure.database.session import init_db
from main.admin_router import router as admin_router
from main.auth_router import router as auth_router

logging.basicConfig(level=logging.INFO)

_DEV_ORIGINS = (
    "http://localhost",
    "http://localhost:80",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://127.0.0.1:80",
    "http://127.0.0.1:3000",
)


def _cors_origins() -> list[str]:
    origins = {origin for origin in (settings.frontend_origin,) if origin}
    if settings.is_development:
        origins.update(_DEV_ORIGINS)
    return sorted(origins)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
