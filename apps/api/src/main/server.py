import logging

from fastapi import FastAPI

from main.admin_router import router as admin_router
from main.auth_router import router as auth_router

logging.basicConfig(level=logging.INFO)

app = FastAPI()

app.include_router(auth_router)
app.include_router(admin_router)
