import pytest

def test_system_kpis(client):
    res = client.get("/api/stats/kpis")
    assert res.status_code == 200
    kpis = res.json()
    assert "total_clients" in kpis
    assert "active_clients" in kpis
    assert "completed_clients" in kpis
    assert "on_time_sla_rate" in kpis
    assert "department_workloads" in kpis
    assert isinstance(kpis["department_workloads"], list)
    assert len(kpis["department_workloads"]) >= 1
