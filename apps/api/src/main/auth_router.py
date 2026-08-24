from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import Response as BinaryResponse

from domain.users.entities import UserEntity
from domain.users.errors import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidResetTokenError,
    PhotoNotFoundError,
    PhotoTooLargeError,
    UnsupportedPhotoError,
    UsernameAlreadyExistsError,
)
from domain.users.use_cases.get_profile_photo import GetProfilePhotoUseCase
from domain.users.use_cases.login import LoginUseCase
from domain.users.use_cases.request_password_reset import RequestPasswordResetUseCase
from domain.users.use_cases.reset_password import ResetPasswordUseCase
from domain.users.use_cases.signup import SignupUseCase
from domain.users.use_cases.upload_profile_photo import UploadProfilePhotoUseCase
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
    get_profile_photo_use_case,
    get_request_password_reset_use_case,
    get_reset_password_use_case,
    get_signup_use_case,
    get_upload_profile_photo_use_case,
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


def _photo_url(user: UserEntity) -> str | None:
    if not user.photo_key:
        return None
    version = user.photo_key.rsplit("/", 1)[-1][:8]
    return f"/auth/me/photo?v={version}"


def _to_user_response(user: UserEntity) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
        photo_url=_photo_url(user),
    )


@router.post("/signup", response_model=UserResponse)
def signup(
    body: SignupRequest,
    response: Response,
    use_case: SignupUseCase = Depends(get_signup_use_case),
) -> UserResponse:
    try:
        user, token = use_case.execute(
            body.username, body.email, body.password, body.role
        )
    except EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already in use"
        )
    except UsernameAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Username already in use"
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
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
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


@router.post("/me/photo", response_model=UserResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    user: UserEntity = Depends(get_current_user),
    use_case: UploadProfilePhotoUseCase = Depends(get_upload_profile_photo_use_case),
) -> UserResponse:
    content = await file.read()
    try:
        updated = use_case.execute(user, content)
    except PhotoTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)
        )
    except UnsupportedPhotoError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )
    return _to_user_response(updated)


@router.get("/me/photo")
def get_profile_photo(
    user: UserEntity = Depends(get_current_user),
    use_case: GetProfilePhotoUseCase = Depends(get_profile_photo_use_case),
) -> BinaryResponse:
    try:
        content, content_type = use_case.execute(user)
    except PhotoNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return BinaryResponse(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=3600"},
    )


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
