"""接口冒烟测试：覆盖根路径与健康检查两个公开入口。"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_read_root():
    """根路径应返回欢迎信息。"""
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["message"].startswith("Hello")


def test_health_check():
    """健康检查应返回 ok。"""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
