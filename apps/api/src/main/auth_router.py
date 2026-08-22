from fastapi import APIRouter, Depends, HTTPException, Response, status

from domain.users.entities import UserEntity
from domain.users.errors import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidResetTokenError,
)
from domain.users.use_cases.login import LoginUseCase
from domain.users.use_cases.request_password_reset import RequestPasswordResetUseCase
from domain.users.use_cases.reset_password import ResetPasswordUseCase
from domain.users.use_cases.signup import SignupUseCase
from infrastructure.database.config import settings
from infrastructure.schemas.user_schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
    UserResponse,
)
from infrastructure.users.dependencies import (
    COOKIE_NAME,
    get_current_user,
    get_login_use_case,
    get_request_password_reset_use_case,
    get_reset_password_use_case,
    get_signup_use_case,
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
        path="/",
    )


def _to_user_response(user: UserEntity) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
    )


@router.post("/signup", response_model=UserResponse)
def signup(
    body: SignupRequest,
    response: Response,
    use_case: SignupUseCase = Depends(get_signup_use_case),
) -> UserResponse:
    try:
        user, token = use_case.execute(body.name, body.email, body.password)
    except EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already in use"
        )
    _set_auth_cookie(response, token)
    return _to_user_response(user)


@router.post("/login", response_model=UserResponse)
def login(
    body: LoginRequest,
    response: Response,
    use_case: LoginUseCase = Depends(get_login_use_case),
) -> UserResponse:
    try:
        user, token = use_case.execute(body.email, body.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )
    _set_auth_cookie(response, token)
    return _to_user_response(user)


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
def me(user: UserEntity = Depends(get_current_user)) -> UserResponse:
    return _to_user_response(user)


@router.post("/forgot-password")
def forgot_password(
    body: ForgotPasswordRequest,
    use_case: RequestPasswordResetUseCase = Depends(
        get_request_password_reset_use_case
    ),
) -> dict[str, bool]:
    use_case.execute(body.email)
    return {"ok": True}


@router.post("/reset-password")
def reset_password(
    body: ResetPasswordRequest,
    use_case: ResetPasswordUseCase = Depends(get_reset_password_use_case),
) -> dict[str, bool]:
    try:
        use_case.execute(body.token, body.new_password)
    except InvalidResetTokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    return {"ok": True}
