"""
AirQuiz entry point — used by the packaged executable and by `python start.py`.

Starts the server on one port (API + Socket.IO + web app), prints the address
students should open, shows a QR code and opens the teacher page.
"""

import os
import socket
import sys
import threading
import time
import webbrowser

# Make `import main` work both from source and from a PyInstaller bundle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import auth  # noqa: E402
import config  # noqa: E402
import uvicorn  # noqa: E402
from network import lan_addresses  # noqa: E402


def _utf8_console():
    """Windows consoles default to a legacy codepage that can't print the QR code."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass


def _port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False


def _pick_port(preferred: int) -> int:
    for port in range(preferred, preferred + 20):
        if _port_free(port):
            return port
    raise SystemExit(f"No free port between {preferred} and {preferred + 19}. Close other programs and retry.")


def _print_qr(url: str):
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
    except Exception:
        pass


def _banner(port: int):
    ips = lan_addresses()
    host = ips[0] if ips else "localhost"
    student_url = f"http://{host}:{port}"
    line = "=" * 60
    print(f"\n{line}\n  AirQuiz is running\n{line}")
    print(f"  Students open : {student_url}")
    print(f"  Teacher page  : http://localhost:{port}/admin")
    print(f"  Teacher password: {auth.get_admin_password()}")
    print(f"  (stored in {config.DATA_DIR / 'admin_password.txt'})")
    if len(ips) > 1:
        print("  Other addresses on this computer: " + ", ".join(f"http://{ip}:{port}" for ip in ips[1:]))
    if not ips:
        print("  ! No network detected. Connect to Wi-Fi / a router or start a hotspot.")
    print(f"{line}\n  Scan to join:\n")
    _print_qr(student_url)
    print("\n  Keep this window open during the exam. Press Ctrl+C to stop.\n")


def main():
    _utf8_console()
    port = _pick_port(config.BACKEND_PORT)
    if port != config.BACKEND_PORT:
        print(f"Port {config.BACKEND_PORT} is busy, using {port} instead.")
    os.environ["BACKEND_PORT"] = str(port)

    if not (config.STATIC_DIR / "index.html").exists():
        print(f"! Web app not found at {config.STATIC_DIR}. Run `npm run build` first.")

    import main as app_module  # noqa: F401  (import after env is set)

    _banner(port)
    if "--no-browser" not in sys.argv:
        threading.Timer(1.5, lambda: webbrowser.open(f"http://localhost:{port}/admin")).start()

    try:
        uvicorn.run(app_module.sio_app, host=config.BACKEND_HOST, port=port, log_level="warning")
    except KeyboardInterrupt:
        pass
    finally:
        time.sleep(0.1)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:  # keep the window open so a teacher can read the error
        import traceback
        traceback.print_exc()
        if config.FROZEN:
            input("\nAirQuiz stopped unexpectedly. Press Enter to close...")
        raise
