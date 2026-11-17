# Student Task Tracker CRUD API

A task management application built with React, FastAPI, and MongoDB. It allows users to create, view, update, and delete student tasks through a REST API and a simple web interface.

## Features

- Create tasks with a title, description, status, and priority.
- Retrieve all tasks or a task by its ID.
- Update task details using PATCH.
- Delete tasks.
- Validate task titles, statuses, priorities, and task IDs.
- Store task data in MongoDB.
- Provide a React frontend connected to the FastAPI backend.

## Technology Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Python, FastAPI
- **Database:** MongoDB
- **Database driver:** PyMongo
- **API testing:** Postman
- **Code quality:** ESLint

## Project Structure

```text
StudentTaskTracker/
├── backend/
│   ├── main.py
│   ├── check_db.py
│   └── venv/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── eslint.config.js
└── README.md
```

## Prerequisites

Install the following software:

- Python
- Node.js and npm
- MongoDB Community Server
- Visual Studio Code
- Postman (for API testing)

## Setup and Run

### 1. Start MongoDB

Make sure your local MongoDB server is running.

The application uses:

`mongodb://localhost:27017/`

Database: `student_task_tracker`

Collection: `tasks`

### 2. Start the backend

Open a terminal in the project folder and run:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

The API will be available at:

`http://127.0.0.1:8000`

### 3. Start the frontend

Open a second terminal and run:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

`http://localhost:5173/`

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/tasks` | Create a task |
| GET | `/api/v1/tasks` | Retrieve all tasks |
| GET | `/api/v1/tasks/{task_id}` | Retrieve a task by ID |
| PATCH | `/api/v1/tasks/{task_id}` | Update a task |
| DELETE | `/api/v1/tasks/{task_id}` | Delete a task |

### Task Fields

- `title`: Required string, 1–200 characters
- `description`: Optional string
- `status`: `todo`, `in_progress`, or `completed`
- `priority`: `low`, `medium`, or `high`

### Example Request

Create a task using POST `/api/v1/tasks`:

```json
{
  "title": "Complete DBMS assignment",
  "description": "Prepare notes and solve questions",
  "status": "todo",
  "priority": "medium"
}
```

## Testing

The API was tested using Postman. Tests included:

- Successful creation, retrieval, update, and deletion.
- Invalid task IDs and nonexistent tasks.
- Empty task titles.
- Invalid status and priority values.

MongoDB Compass was used to verify that database changes were persisted.

## Running the Application

Keep the MongoDB server, FastAPI backend, and React development server running while using the application.
