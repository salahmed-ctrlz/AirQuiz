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
