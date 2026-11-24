import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminFetch } from '@/lib/api';
import { config } from '@/lib/config';
import { cn } from '@/lib/utils';

const isLocal = (h: string) => ['localhost', '127.0.0.1', '[::1]'].includes(h);
const WIFI_KEY = 'airquiz.wifi';

/** Escape the characters that are special in the WIFI: QR format. */
const esc = (v: string) => v.replace(/([\\;,:"])/g, '\\$1');

type Wifi = { ssid: string; password: string };
const loadWifi = (): Wifi => {
  try {
    return { ssid: '', password: '', ...JSON.parse(localStorage.getItem(WIFI_KEY) || '{}') };
  } catch {
    return { ssid: '', password: '' };
  }
};

const qr = (data: string) => `${config.apiUrl}/api/qr.svg?data=${encodeURIComponent(data)}`;

/** Join code + QR for projecting in class. Step 1 (optional): join the Wi-Fi. Step 2: open AirQuiz. */
export function JoinPanel({ code }: { code: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [friendly, setFriendly] = useState('');
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<'join' | 'wifi'>('join');
  const [wifi, setWifi] = useState<Wifi>(loadWifi);

  useEffect(() => {
    adminFetch('/api/server-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (!info) throw new Error('no info');
        // A teacher opening the dashboard from a phone/other PC is already on the right address.
        setUrls(isLocal(window.location.hostname) ? info.student_urls : [window.location.origin]);
        setFriendly(info.friendly_url || '');
        setWifi((w) => (w.ssid ? w : { ...w, ssid: info.wifi_ssid || '' }));
      })
      .catch(() => setUrls([window.location.origin]));
  }, []);

  const saveWifi = (next: Wifi) => {
    setWifi(next);
    try {
      localStorage.setItem(WIFI_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  };

  const base = urls[selected] ?? '';
  const joinUrl = code ? `${base}/?code=${code}` : base;
  const wifiPayload = wifi.ssid
    ? `WIFI:T:${wifi.password ? 'WPA' : 'nopass'};S:${esc(wifi.ssid)};${wifi.password ? `P:${esc(wifi.password)};` : ''};`
    : '';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-auto gap-3 py-1.5" disabled={!code}>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Join code</span>
            <span className="font-mono text-xl font-semibold tracking-[0.2em]">{code || '——'}</span>
          </span>
          <QrCode className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-center">{tab === 'join' ? 'Students: scan to join' : 'Step 1: join the Wi-Fi'}</DialogTitle>
        </DialogHeader>

        <div className="mx-auto flex gap-1 rounded-md border p-1 text-sm" role="tablist">
          {(['join', 'wifi'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn('rounded px-3 py-1', tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              {t === 'join' ? 'Open the quiz' : 'Join Wi-Fi first'}
            </button>
          ))}
        </div>

        {tab === 'join' ? (
          <>
            {base && (
              <img src={qr(joinUrl)} alt={`QR code for ${joinUrl}`}
                className="mx-auto w-64 max-w-full rounded-md border bg-white p-2" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">or open this address and enter the code</p>
              <p className="mt-1 break-all font-mono text-lg" dir="ltr">{base.replace('http://', '')}</p>
              {friendly && (
                <p className="text-sm text-muted-foreground" dir="ltr">
                  (most phones also accept <span className="font-mono">{friendly.replace('http://', '')}</span>)
                </p>
              )}
              <p className="mt-3 font-mono text-5xl font-semibold tracking-[0.25em]" dir="ltr">{code}</p>
            </div>
            {urls.length > 1 && (
              <div className="flex flex-wrap justify-center gap-2 border-t pt-3">
                <span className="w-full text-xs text-muted-foreground">
                  This computer has several network addresses. Pick the one students' phones can reach (usually the Wi-Fi one).
                </span>
                {urls.map((u, i) => (
                  <button key={u} onClick={() => setSelected(i)}
                    className={cn('rounded-md border px-2 py-1 font-mono text-xs', i === selected && 'border-primary bg-primary/10')}>
                    {u.replace('http://', '')}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3 text-start">
            <p className="text-sm text-muted-foreground">
              Using a hotspot or a router with no internet? Students scan this first to connect their phone,
              then scan the quiz code. Nothing is sent anywhere; the QR is generated on this computer.
            </p>
            <div className="space-y-1">
              <Label htmlFor="ssid">Wi-Fi name</Label>
              <Input id="ssid" value={wifi.ssid} onChange={(e) => saveWifi({ ...wifi, ssid: e.target.value })} dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wifipw">Wi-Fi password (empty if open)</Label>
              <Input id="wifipw" value={wifi.password} onChange={(e) => saveWifi({ ...wifi, password: e.target.value })} dir="ltr" />
            </div>
            {wifiPayload && (
              <img src={qr(wifiPayload)} alt="QR code to join the Wi-Fi"
                className="mx-auto w-56 max-w-full rounded-md border bg-white p-2" />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
