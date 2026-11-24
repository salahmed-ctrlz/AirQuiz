import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { adminFetch } from '@/lib/api';
import { config } from '@/lib/config';
import { cn } from '@/lib/utils';

const isLocal = (h: string) => ['localhost', '127.0.0.1', '[::1]'].includes(h);

/** Join code + QR for projecting in class. The QR carries the code, so a scan lands students on a ready-to-go form. */
export function JoinPanel({ code }: { code: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!isLocal(window.location.hostname)) {
      setUrls([window.location.origin]);
      return;
    }
    adminFetch('/api/server-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => setUrls(info?.student_urls?.length ? info.student_urls : [config.apiUrl]))
      .catch(() => setUrls([config.apiUrl]));
  }, []);

  const base = urls[selected] ?? '';
  const joinUrl = code ? `${base}/?code=${code}` : base;

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
          <DialogTitle className="text-center">Students: scan to join</DialogTitle>
        </DialogHeader>
        {base && (
          <img
            src={`${config.apiUrl}/api/qr.svg?data=${encodeURIComponent(joinUrl)}`}
            alt={`QR code for ${joinUrl}`}
            className="mx-auto w-64 max-w-full rounded-md border bg-white p-2"
          />
        )}
        <div>
          <p className="text-sm text-muted-foreground">or open this address and enter the code</p>
          <p className="mt-1 break-all font-mono text-lg" dir="ltr">{base}</p>
          <p className="mt-3 font-mono text-5xl font-semibold tracking-[0.25em]" dir="ltr">{code}</p>
        </div>
        {urls.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 border-t pt-3">
            <span className="w-full text-xs text-muted-foreground">
              This computer has several network addresses. Pick the one students' phones can reach (usually the Wi-Fi one).
            </span>
            {urls.map((u, i) => (
              <button
                key={u}
                onClick={() => setSelected(i)}
                className={cn('rounded-md border px-2 py-1 font-mono text-xs', i === selected && 'border-primary bg-primary/10')}
              >
                {u.replace('http://', '')}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
