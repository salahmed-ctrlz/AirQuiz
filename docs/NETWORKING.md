# Networking and scale

## What AirQuiz needs from the network

Nothing but a local connection between the host computer and the phones. No internet, no DNS, no cloud.

| Setup | Works? | Notes |
|---|---|---|
| Dedicated router / access point | yes | Best option. Plug the host in by **Ethernet** if you can; it frees Wi-Fi capacity for the phones. |
| Campus / school Wi-Fi | usually | Many block device-to-device traffic ("client isolation"). If phones can't open the address, that's why — use a router or hotspot instead. |
| Phone hotspot | yes | Hotspots often cap at 5–10 devices. Fine for a small group, not a class. |
| Laptop hotspot (Windows Mobile Hotspot, macOS Internet Sharing) | small groups | Same device cap as phone hotspots (Windows: 8). |
| No network at all | no | Phones and host must share *some* network. A $20 travel router is enough. |

### How students find the host
1. **QR code** (teacher dashboard → *Join code*): encodes the address and the room code. Most reliable.
2. **Address** such as `http://192.168.1.20` (port 80 is used when free, so no `:8000`).
3. **`http://airquiz.local`**: advertised over mDNS/Bonjour. Works on iPhones, recent Android, Windows 10+ and macOS; some Android versions and some routers don't resolve it, which is why the IP/QR remain primary.
4. **Wi-Fi QR** (dashboard → *Join code* → *Join Wi-Fi first*): students scan it to join the hotspot/router, then scan the quiz QR.

## What the router and host actually carry

Measured with `scripts/loadtest.py` (300 simulated students, 20 questions each, think time 3–12 s, 4-core machine that also ran the load generator):

| | |
|---|---|
| App download per phone (first visit) | ≈ 57 KB JS + 14 KB CSS + ≈ 75 KB fonts, all compressed once and cached by the phone (and by the service worker, so later visits cost ~0) |
| Joining | 300 students in 1.7 s, p95 0.37 s |
| Exam start | ≈ 6 KB per phone (their own shuffled questions) |
| Each answer | a few hundred bytes up, a few bytes back; ack p50 7 ms, p95 17 ms |
| Teacher dashboard | ≈ 50 KB every ~1.6 s at 300 students (updates are spaced out as the room grows) |
| Host | 6000/6000 answers acknowledged; process memory ≈ 126 MB; CPU average ≈ 18% |

So the traffic is tiny. The limit in practice is **how many Wi-Fi clients your access point can associate** (often 30–50 on very cheap routers, 100+ on decent ones), not bandwidth or the host PC. For a class of 60+, use a proper router or two access points on the same network — AirQuiz works unchanged across several access points as long as they're on the same subnet.

Reproduce on your own machine:

```bash
pip install -r backend/requirements-dev.txt psutil
python scripts/loadtest.py --students 300 --questions 20
```

## Why phones are not used as mini-hosts

Letting student devices relay or host parts of the exam sounds attractive, but it doesn't help and it would weaken the exam:

- **It isn't the bottleneck.** The numbers above show a single laptop handles a whole lecture hall; the practical limit is the access point's client count, which relaying through phones doesn't raise (they are all on the same Wi-Fi anyway).
- **Browsers can't listen.** A web page on a phone cannot accept incoming connections, so a phone can't act as a server. The only browser-to-browser path is WebRTC, which needs signalling and is unreliable on locked-down campus networks and iOS background tabs.
- **Integrity.** Answers, scores and the per-student shuffles are authoritative on the host. Routing them through students' own devices would let a student tamper with or observe other students' data.

What *is* shared between devices: the teacher dashboard can be opened from any device on the network (phone, tablet, second laptop) with the password, and the app itself is cached on each phone after the first visit.

If you ever need more than one access point's worth of students in different rooms, run one AirQuiz per room (each is self-contained) and export CSVs at the end.
