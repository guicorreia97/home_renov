from fastapi.testclient import TestClient

VALID_EXPENSE = {
    "description": "Kitchen tiles",
    "amount": "1250.00",
    "category": "materials",
    "payment_method": "credit_card",
    "payee": "Tile Depot",
    "incurred_on": "2026-01-15",
    "status": "paid",
}


def test_get_budget_returns_empty_budget_when_none_set(client: TestClient) -> None:
    response = client.get("/budget")

    assert response.status_code == 200
    body = response.json()
    assert body["target_sale_price"] is None
    assert body["purchase_price"] is None
    assert body["planned_budget"] is None
    assert "updated_at" in body


def test_update_budget_returns_200_with_changed_fields(client: TestClient) -> None:
    response = client.put("/budget", json={"planned_budget": "50000.00"})

    assert response.status_code == 200
    assert response.json()["planned_budget"] == "50000.00"


def test_update_budget_rejects_unknown_field(client: TestClient) -> None:
    response = client.put("/budget", json={"not_a_field": "value"})

    assert response.status_code == 422


def test_update_budget_rejects_negative_amount(client: TestClient) -> None:
    response = client.put("/budget", json={"planned_budget": "-1.00"})

    assert response.status_code == 422


def test_get_budget_summary_returns_zeros_when_no_expenses(client: TestClient) -> None:
    response = client.get("/budget/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["total_paid"] == "0.00"
    assert body["total_committed"] == "0.00"
    assert body["total_planned"] == "0.00"
    assert body["total_forecast"] == "0.00"
    assert body["expense_count"] == 0
    assert body["by_category"] == []
    assert body["remaining_budget"] is None
    assert body["projected_profit"] is None
    assert body["over_budget"] is False


def test_get_budget_summary_reflects_created_expenses(client: TestClient) -> None:
    client.put("/budget", json={"planned_budget": "1000.00"})
    client.post("/expenses", json=VALID_EXPENSE)

    response = client.get("/budget/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["total_paid"] == "1250.00"
    assert body["expense_count"] == 1
    assert body["over_budget"] is True
    assert body["by_category"] == [{"category": "materials", "amount": "1250.00"}]
