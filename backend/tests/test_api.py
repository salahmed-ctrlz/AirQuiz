import httpx

EXAM = {
    "title": "API Test Exam",
    "questions": [
        {"id": i, "text": f"Q{i}?", "options": ["a", "b", "c", "d"], "correct": "a", "time": 30}
        for i in range(1, 6)
    ],
}


def test_admin_endpoints_require_login(server):
    for method, path in [("GET", "/api/exams"), ("DELETE", "/api/room/reset"),
                         ("GET", "/admin/export_csv"), ("POST", "/api/exam/load")]:
        r = httpx.request(method, server + path, json=EXAM if method == "POST" else None)
        assert r.status_code == 401, path


def test_wrong_password_rejected(server):
    assert httpx.post(f"{server}/api/admin/login", json={"password": "nope"}).status_code == 401


def test_exam_answers_not_public(server, admin_headers):
    httpx.post(f"{server}/api/exam/load", json=EXAM, headers=admin_headers).raise_for_status()
    assert httpx.get(f"{server}/api/exams/API_Test_Exam.json").status_code == 401
    got = httpx.get(f"{server}/api/exams/API_Test_Exam.json", headers=admin_headers)
    assert got.json()["questions"][0]["correct"] == "a"


def test_path_traversal_blocked(server, admin_headers):
    r = httpx.get(f"{server}/api/exams/..%2F..%2Fetc%2Fpasswd", headers=admin_headers)
    assert r.status_code in (404, 400)


def test_exam_validation(server, admin_headers):
    bad = {"title": "Bad", "questions": [{"id": 1, "text": "x", "options": ["a", "b"], "correct": "z"}]}
    assert httpx.post(f"{server}/api/exam/load", json=bad, headers=admin_headers).status_code == 422
    dup = {"title": "Dup", "questions": [{"id": 1, "text": "x", "options": ["a", "a"], "correct": "a"}]}
    assert httpx.post(f"{server}/api/exam/load", json=dup, headers=admin_headers).status_code == 422


def test_legacy_correct_index(server, admin_headers):
    legacy = {"title": "Legacy", "questions": [{"id": 1, "text": "x", "options": ["a", "b"], "correct_index": 1}]}
    assert httpx.post(f"{server}/api/exam/load", json=legacy, headers=admin_headers).status_code == 200
