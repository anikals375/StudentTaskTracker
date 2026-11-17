
from locust import HttpUser, task, between

class StudentTaskUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def get_tasks(self):
        self.client.get(
            "/api/v1/tasks",
            name="GET /api/v1/tasks"
        )
