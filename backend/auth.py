"""Admin authentication: password check + stateless HMAC tokens."""

import base64
import hashlib
import hmac
import secrets
import time
from typing import Optional

import config
from fastapi import Header, HTTPException, Query

_PASSWORD_FILE = config.DATA_DIR / "admin_password.txt"
_SECRET_FILE = config.DATA_DIR / "secret.key"

# 8 chars from an unambiguous alphabet (no 0/O/1/l/I)
_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def _read_or_create(path, factory) -> str:
    if path.exists():
        value = path.read_text(encoding="utf-8").strip()
        if value:
            return value
    value = factory()
    path.write_text(value + "\n", encoding="utf-8")
    try:
        path.chmod(0o600)
    except OSError:
        pass
    return value


def get_admin_password() -> str:
    if config.ADMIN_PASSWORD:
        return config.ADMIN_PASSWORD
    return _read_or_create(
        _PASSWORD_FILE, lambda: "".join(secrets.choice(_ALPHABET) for _ in range(8))
    )


def _secret() -> bytes:
    return _read_or_create(_SECRET_FILE, lambda: secrets.token_hex(32)).encode()


def check_password(candidate: str) -> bool:
    return hmac.compare_digest(candidate.encode(), get_admin_password().encode())


def _sign(payload: str) -> str:
    return hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()


def make_token() -> str:
    expires = str(int(time.time()) + config.ADMIN_TOKEN_TTL_SECONDS)
    body = base64.urlsafe_b64encode(expires.encode()).decode()
    return f"{body}.{_sign(body)}"


def verify_token(token: Optional[str]) -> bool:
    if not token or "." not in token:
        return False
    body, sig = token.rsplit(".", 1)
    if not hmac.compare_digest(sig, _sign(body)):
        return False
    try:
        return int(base64.urlsafe_b64decode(body.encode()).decode()) > time.time()
    except (ValueError, UnicodeDecodeError):
        return False


# --- login throttling (per client address) ---------------------------------
_failures: dict[str, list[float]] = {}
_WINDOW, _MAX_FAILURES = 300, 8


def login_allowed(client: str) -> bool:
    now = time.time()
    recent = [t for t in _failures.get(client, []) if now - t < _WINDOW]
    _failures[client] = recent
    return len(recent) < _MAX_FAILURES


def record_failure(client: str) -> None:
    _failures.setdefault(client, []).append(time.time())


# --- FastAPI dependency ------------------------------------------------------
def require_admin(
    authorization: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None),  # for plain download links
) -> None:
    bearer = authorization[7:] if authorization and authorization.lower().startswith("bearer ") else None
    if not verify_token(bearer or token):
        raise HTTPException(status_code=401, detail="Admin login required")
