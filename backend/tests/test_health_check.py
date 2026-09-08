from fastapi.testclient import TestClient

from app.api.main import app

client = TestClient(app)


def test_healthcheck_returns_ok():
    response = client.get("/healthcheck")

    assert response.status_code == 200
    assert response.json() == {"message": "OK"}


def test_root_returns_configured_message():
    response = client.get("/")

    assert response.status_code == 200
    assert "message" in response.json()
