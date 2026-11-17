
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware


TASK_SERVICE_URL = "http://127.0.0.1:8001"
USER_SERVICE_URL = "http://127.0.0.1:8002"


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.task_client = httpx.AsyncClient(
        base_url=TASK_SERVICE_URL,
        timeout=30.0
    )

    app.state.user_client = httpx.AsyncClient(
        base_url=USER_SERVICE_URL,
        timeout=30.0
    )

    yield

    await app.state.task_client.aclose()
    await app.state.user_client.aclose()


app = FastAPI(
    title="Student Task Tracker API Gateway",
    description="Gateway for routing requests to User and Task microservices",
    version="2.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def forward_request(
    request: Request,
    client: httpx.AsyncClient,
    path: str
):
    try:
        body = await request.body()

        response = await client.request(
            method=request.method,
            url=path,
            params=request.query_params,
            content=body if body else None,
            headers={
                "Content-Type": request.headers.get(
                    "content-type",
                    "application/json"
                ),
                "Authorization": request.headers.get(
                    "authorization",
                    ""
                )
            }
        )

        return JSONResponse(
            status_code=response.status_code,
            content=response.json()
        )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Microservice request timed out"
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Microservice is unavailable"
        )


@app.get("/")
async def home():
    return {
        "success": True,
        "message": "API Gateway is running!"
    }

@app.api_route(
    "/api/v1/users",
    methods=["GET"]
)
async def all_users(request: Request):
    return await forward_request(
        request,
        request.app.state.user_client,
        "/api/v1/users"
    )
# USER SERVICE ROUTES

@app.api_route(
    "/api/v1/users/{path:path}",
    methods=["GET", "POST", "PATCH", "PUT", "DELETE"]
)
async def user_routes(path: str, request: Request):
    return await forward_request(
        request,
        request.app.state.user_client,
        f"/api/v1/users/{path}"
    )


# TASK SERVICE ROUTES

@app.api_route(
    "/api/v1/tasks",
    methods=["GET", "POST"]
)
async def tasks(request: Request):
    return await forward_request(
        request,
        request.app.state.task_client,
        "/api/v1/tasks"
    )


@app.api_route(
    "/api/v1/tasks/{task_id}",
    methods=["GET", "PATCH", "DELETE"]
)
async def task_by_id(task_id: int, request: Request):
    return await forward_request(
        request,
        request.app.state.task_client,
        f"/api/v1/tasks/{task_id}"
    )
