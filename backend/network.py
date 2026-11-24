"""Find the addresses students can use to reach this computer (works offline)."""

import socket


def _is_private(ip: str) -> bool:
    return ip.startswith(("10.", "192.168.")) or (
        ip.startswith("172.") and 16 <= int(ip.split(".")[1]) <= 31
    )


def lan_addresses() -> list[str]:
    found: list[str] = []

    # Route-based guess. A UDP connect sends no packets, so no internet is needed.
    for target in ("10.255.255.255", "192.168.255.255", "8.8.8.8"):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect((target, 1))
                ip = s.getsockname()[0]
                if ip and not ip.startswith(("127.", "169.254.", "0.")) and ip not in found:
                    found.append(ip)
        except OSError:
            continue

    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith(("127.", "169.254.")) and ip not in found:
                found.append(ip)
    except OSError:
        pass

    # Prefer private (LAN) addresses
    return sorted(found, key=lambda ip: (not _is_private(ip), found.index(ip)))


# ---------------------------------------------------------------------------
# Friendly name (mDNS / Bonjour): http://airquiz.local
# ---------------------------------------------------------------------------
MDNS_NAME = "airquiz"
_zc = None


def start_mdns(port: int) -> bool:
    """Advertise AirQuiz on the LAN as airquiz.local. Best effort: returns False if unavailable."""
    global _zc
    try:
        from zeroconf import IPVersion, ServiceInfo, Zeroconf

        addrs = [socket.inet_aton(ip) for ip in lan_addresses()]
        if not addrs:
            return False
        info = ServiceInfo(
            "_http._tcp.local.",
            "AirQuiz._http._tcp.local.",
            addresses=addrs,
            port=port,
            properties={"path": "/"},
            server=f"{MDNS_NAME}.local.",
        )
        _zc = Zeroconf(ip_version=IPVersion.V4Only)
        _zc.register_service(info, allow_name_change=True)
        return True
    except Exception:
        _zc = None
        return False


def stop_mdns() -> None:
    global _zc
    if _zc is not None:
        try:
            _zc.close()
        except Exception:
            pass
        _zc = None


# ---------------------------------------------------------------------------
# Wi-Fi name of this computer (to offer a "join this Wi-Fi" QR). Best effort.
# ---------------------------------------------------------------------------
def current_wifi_ssid() -> str | None:
    import platform
    import re
    import subprocess

    def run(cmd):
        try:
            return subprocess.run(cmd, capture_output=True, text=True, timeout=2).stdout
        except Exception:
            return ""

    system = platform.system()
    if system == "Windows":
        m = re.search(r"^\s*SSID\s*:\s*(.+)$", run(["netsh", "wlan", "show", "interfaces"]), re.M)
        return m.group(1).strip() if m else None
    if system == "Darwin":
        out = run(["networksetup", "-getairportnetwork", "en0"])
        m = re.search(r"Network:\s*(.+)$", out, re.M)
        return m.group(1).strip() if m else None
    out = run(["nmcli", "-t", "-f", "active,ssid", "dev", "wifi"])
    for line in out.splitlines():
        if line.startswith("yes:"):
            return line[4:].strip() or None
    return None
