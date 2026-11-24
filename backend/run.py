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
from network import MDNS_NAME, lan_addresses, start_mdns, stop_mdns  # noqa: E402


def _utf8_console():
    """Windows consoles default to a legacy codepage that can't print the QR code."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass


def _raise_fd_limit():
    """macOS/Linux default to 256-1024 open files; every phone is a socket."""
    try:
        import resource
        soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
        target = 10240 if hard == resource.RLIM_INFINITY else min(10240, hard)
        if soft < target:
            resource.setrlimit(resource.RLIMIT_NOFILE, (target, hard))
    except (ImportError, ValueError, OSError):
        pass  # Windows has no such limit


def _port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False


def _pick_port(preferred: int) -> int:
    candidates = [preferred] if preferred else [80, *range(8000, 8020)]
    for port in candidates:
        if _port_free(port):
            return port
    raise SystemExit("No free network port found. Close other programs (or set BACKEND_PORT) and retry.")


def _print_qr(url: str):
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
    except Exception:
        pass


def _banner(port: int, mdns: bool = False):
    ips = lan_addresses()
    host = ips[0] if ips else "localhost"
    suffix = "" if port == 80 else f":{port}"
    student_url = f"http://{host}{suffix}"
    line = "=" * 60
    print(f"\n{line}\n  AirQuiz is running\n{line}")
    print(f"  Students open : {student_url}")
    if mdns:
        print(f"  Or type       : http://{MDNS_NAME}.local{suffix}   (most phones; the address above always works)")
    print(f"  Teacher page  : http://localhost{suffix}/admin")
    print(f"  Teacher password: {auth.get_admin_password()}")
    print(f"  (stored in {config.DATA_DIR / 'admin_password.txt'})")
    if len(ips) > 1:
        print("  Other addresses on this computer: " + ", ".join(f"http://{ip}{suffix}" for ip in ips[1:]))
    if not ips:
        print("  ! No network detected. Connect to Wi-Fi / a router or start a hotspot.")
    print(f"{line}\n  Scan to join:\n")
    _print_qr(student_url)
    print("\n  Keep this window open during the exam. Press Ctrl+C to stop.\n")


def main():
    _utf8_console()
    _raise_fd_limit()
    port = _pick_port(config.BACKEND_PORT)
    os.environ["BACKEND_PORT"] = str(port)

    if not (config.STATIC_DIR / "index.html").exists():
        print(f"! Web app not found at {config.STATIC_DIR}. Run `npm run build` first.")

    import main as app_module  # noqa: F401  (import after env is set)

    mdns = start_mdns(port)
    _banner(port, mdns)
    if "--no-browser" not in sys.argv:
        threading.Timer(1.5, lambda: webbrowser.open(f"http://localhost{'' if port == 80 else ':' + str(port)}/admin")).start()

    try:
        uvicorn.run(app_module.sio_app, host=config.BACKEND_HOST, port=port, log_level="warning")
    except KeyboardInterrupt:
        pass
    finally:
        stop_mdns()
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
