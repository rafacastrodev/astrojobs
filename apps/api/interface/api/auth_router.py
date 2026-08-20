from fastapi import APIRouter, Depends, HTTPException, Response, status

from application.auth.errors import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidResetTokenError,
)
from application.auth.service import AuthService
from core.config import settings
from domain.entities.user_entity import UserEntity
from interface.api.dependencies import COOKIE_NAME, get_auth_service, get_current_user
from interface.api.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_MAX_AGE_SECONDS = settings.jwt_expires_minutes * 60


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=COOKIE_MAX_AGE_SECONDS,
    )


def _to_user_response(user: UserEntity) -> UserResponse:
    return UserResponse(id=user.id, name=user.name, email=user.email, created_at=user.created_at)


@router.post("/signup", response_model=UserResponse)
def signup(
    body: SignupRequest,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    try:
        user, token = auth_service.signup(body.name, body.email, body.password)
    except EmailAlreadyExistsError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    _set_auth_cookie(response, token)
    return _to_user_response(user)


@router.post("/login", response_model=UserResponse)
def login(
    body: LoginRequest,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    try:
        user, token = auth_service.login(body.email, body.password)
    except InvalidCredentialsError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    _set_auth_cookie(response, token)
    return _to_user_response(user)


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
def me(user: UserEntity = Depends(get_current_user)) -> UserResponse:
    return _to_user_response(user)


@router.post("/forgot-password")
def forgot_password(
    body: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> dict[str, bool]:
    auth_service.request_password_reset(body.email)
    return {"ok": True}


@router.post("/reset-password")
def reset_password(
    body: ResetPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> dict[str, bool]:
    try:
        auth_service.reset_password(body.token, body.new_password)
    except InvalidResetTokenError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    return {"ok": True}
