
from contextlib import asynccontextmanager

from fastapi import (
    FastAPI, Depends, HTTPException, status
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from .database import Base, engine, create_database, get_db
from . import models
from .models import User
from .schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    UserProfileUpdate,
    TokenResponse,
    RoleUpdate,
    ChangePassword
)
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)


security = HTTPBearer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_database()

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    print("User Service database initialized!")

    yield

    await engine.dispose()


app = FastAPI(
    title="User Microservice",
    description="User registration, authentication and profile management",
    version="1.0.0",
    lifespan=lifespan
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    payload = decode_access_token(credentials.credentials)

    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = await db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


async def get_admin_user(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


@app.get("/")
async def home():
    return {
        "success": True,
        "message": "User Microservice is running!"
    }


@app.post(
    "/api/v1/users/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
async def register_user(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )

    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role="student"
    )

    db.add(user)

    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    return user


@app.post(
    "/api/v1/users/login",
    response_model=TokenResponse
)
async def login_user(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.email == login_data.email)
    )

    user = result.scalar_one_or_none()

    if user is None or not verify_password(
        login_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(user.id, user.role)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@app.get(
    "/api/v1/users/me",
    response_model=UserResponse
)
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user

@app.get("/api/v1/users", response_model=list[UserResponse])
async def get_all_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).order_by(User.id)
    )

    users = result.scalars().all()

    return users

@app.patch(
    "/api/v1/users/me",
    response_model=UserResponse
)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    updates = profile_data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one field to update"
        )

    for field, value in updates.items():
        if value is None:
            raise HTTPException(
                status_code=422,
                detail=f"{field} cannot be null"
            )

        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    return current_user


@app.patch(
    "/api/v1/users/{user_id}/role",
    response_model=UserResponse
)
async def update_user_role(
    user_id: int,
    role_data: RoleUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.role = role_data.role

    await db.commit()
    await db.refresh(user)

    return user

@app.patch("/api/v1/users/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify current password
    if not verify_password(
        password_data.current_password,
        current_user.hashed_password
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    # Hash and update new password
    current_user.hashed_password = hash_password(
        password_data.new_password
    )

    await db.commit()

    return {
        "success": True,
        "message": "Password changed successfully"
    }