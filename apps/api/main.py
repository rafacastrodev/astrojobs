import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from infrastructure.db.base import SessionLocal
from infrastructure.repositories.sqlalchemy_user_repository import SqlAlchemyUserRepository
from infrastructure.security.hashing import hash_password
from interface.api.admin_router import router as admin_router
from interface.api.auth_router import router as auth_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)


SEED_ADMIN_NAME = "Admin"
SEED_ADMIN_EMAIL = "admin@astrojobs.com"
SEED_ADMIN_PASSWORD = "adminadmin"


def seed_admin_user() -> None:
    session = SessionLocal()
    try:
        repo = SqlAlchemyUserRepository(session)
        repo.ensure_admin(
            SEED_ADMIN_NAME,
            SEED_ADMIN_EMAIL,
            hash_password(SEED_ADMIN_PASSWORD),
        )
        logger.info("Ensured admin user exists: %s", SEED_ADMIN_EMAIL)
    except Exception:
        logger.exception("Failed to seed admin user")
    finally:
        session.close()


@app.on_event("startup")
def on_startup() -> None:
    seed_admin_user()


@app.get("/")
def read_root():
    return {"Hello": "World"}
