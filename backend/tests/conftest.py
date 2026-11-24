import os
import sys
import tempfile
import threading
import time
from pathlib import Path

_tmp = tempfile.mkdtemp(prefix="airquiz-test-")
os.environ["AIRQUIZ_DATA_DIR"] = _tmp
os.environ["ADMIN_PASSWORD"] = "teacher-pass"
os.environ["AIRQUIZ_STATIC_DIR"] = os.path.join(_tmp, "no-dist")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402
import pytest  # noqa: E402
import uvicorn  # noqa: E402

PORT = 18765
BASE = f"http://127.0.0.1:{PORT}"


@pytest.fixture(scope="session")
def server():
    import main
    cfg = uvicorn.Config(main.sio_app, host="127.0.0.1", port=PORT, log_level="warning")
    srv = uvicorn.Server(cfg)
    t = threading.Thread(target=srv.run, daemon=True)
    t.start()
    for _ in range(100):
        try:
            if httpx.get(f"{BASE}/api/health").status_code == 200:
                break
        except httpx.HTTPError:
            time.sleep(0.1)
    yield BASE
    srv.should_exit = True


@pytest.fixture()
def admin_headers(server):
    r = httpx.post(f"{server}/api/admin/login", json={"password": "teacher-pass"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}
