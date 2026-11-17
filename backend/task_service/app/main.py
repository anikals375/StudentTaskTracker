
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import Base, engine, create_database, get_db
from . import models
from .models import Task
from .schemas import TaskCreate, TaskUpdate
from .auth import get_current_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_database()

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    print("Task Service database initialized!")

    yield

    await engine.dispose()


app = FastAPI(
    title="Task Microservice",
    description="JWT-protected task management microservice",
    version="2.0.0",
    lifespan=lifespan
)


def serialize_task(task: Task):
    return {
        "id": task.id,
        "user_id": task.user_id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "created_at": task.created_at,
        "updated_at": task.updated_at
    }


def check_task_access(task: Task, current_user: dict):
    if (
        current_user["role"] != "admin"
        and task.user_id != current_user["user_id"]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this task."
        )


@app.get("/")
async def home():
    return {
        "success": True,
        "message": "Task Microservice is running!"
    }


@app.post(
    "/api/v1/tasks",
    status_code=status.HTTP_201_CREATED
)
async def create_task(
    task_data: TaskCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = Task(
        **task_data.model_dump(),
        user_id=current_user["user_id"]
    )

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return {
        "success": True,
        "message": "Task created successfully.",
        "data": serialize_task(task)
    }


@app.get("/api/v1/tasks")
async def get_tasks(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Task).order_by(Task.id.desc())

    if current_user["role"] != "admin":
        query = query.where(
            Task.user_id == current_user["user_id"]
        )

    result = await db.execute(query)
    tasks = result.scalars().all()

    return {
        "success": True,
        "message": "Tasks retrieved successfully.",
        "data": [serialize_task(task) for task in tasks]
    }


@app.get("/api/v1/tasks/{task_id}")
async def get_task(
    task_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    check_task_access(task, current_user)

    return {
        "success": True,
        "message": "Task retrieved successfully.",
        "data": serialize_task(task)
    }


@app.patch("/api/v1/tasks/{task_id}")
async def update_task(
    task_id: int,
    updates: TaskUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    check_task_access(task, current_user)

    update_data = updates.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one field to update"
        )

    for field, value in update_data.items():
        if value is None:
            raise HTTPException(
                status_code=422,
                detail=f"{field} cannot be null"
            )

        setattr(task, field, value)

    task.updated_at = datetime.now()

    await db.commit()
    await db.refresh(task)

    return {
        "success": True,
        "message": "Task updated successfully.",
        "data": serialize_task(task)
    }


@app.delete("/api/v1/tasks/{task_id}")
async def delete_task(
    task_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    check_task_access(task, current_user)

    await db.delete(task)
    await db.commit()

    return {
        "success": True,
        "message": "Task deleted successfully.",
        "data": {"id": task_id}
    }
