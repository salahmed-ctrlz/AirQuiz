/**
 * AirQuiz — Join page (the app's front door for students).
 * Scanning the teacher's QR opens this page with ?code= already filled in.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useSocket } from '@/hooks/useSocket';
import { useTranslation } from '@/i18n/LanguageContext';
import { config } from '@/lib/config';
import { cn } from '@/lib/utils';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';

const PROFILE_KEY = 'airquiz.profile';

type Profile = { firstName: string; lastName: string; email: string; group: string };

const loadProfile = (): Partial<Profile> => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
  } catch {
    return {};
  }
};

export default function StudentLogin() {
  const navigate = useNavigate();
  const { t, dir } = useTranslation();
  const [params] = useSearchParams();
  const saved = loadProfile();

  const [code, setCode] = useState((params.get('code') || '').replace(/\D/g, '').slice(0, 6));
  const [firstName, setFirstName] = useState(saved.firstName || '');
  const [lastName, setLastName] = useState(saved.lastName || '');
  const [email, setEmail] = useState(saved.email || '');
  const [group, setGroup] = useState(saved.group || '');
  const [isLoading, setIsLoading] = useState(false);
  const [rooms, setRooms] = useState<{ id: string; code: string; name: string }[]>([]);

  const { connect, disconnect, status } = useSocket({ onRoomList: setRooms });

  useEffect(() => {
    connect();
    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValid = code.length >= 3 && firstName.trim() && lastName.trim() && group;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsLoading(true);
    const profile: Profile = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), group };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch { /* private mode: fine */ }
    sessionStorage.setItem('studentInfo', JSON.stringify({
      ...profile,
      email: profile.email || undefined,
      room_id: code.trim().toLowerCase(),
    }));
    navigate('/waiting');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background" dir={dir}>
      <header className="flex items-center justify-between px-5 pt-4 pt-safe">
        <img src={logo} alt="AirQuiz" className="h-9 w-auto dark:brightness-0 dark:invert" />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-5 pt-8 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight">{t('join.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('join.subtitle')}</p>

        {status !== 'connected' && status !== 'connecting' && (
          <p role="status" className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            {t('join.offline')}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code">{t('join.code')}</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="h-14 text-center font-mono text-3xl tracking-[0.35em]"
              dir="ltr"
            />
            <p className="text-sm text-muted-foreground">{t('join.codeHint')}</p>
            {rooms.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-sm text-muted-foreground">{t('join.nearby')}:</span>
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setCode(r.code)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-sm transition-colors',
                      code === r.code ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
                    )}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('join.firstName')}</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name" required className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('join.lastName')}</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name" required className="h-12" />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none mb-2">{t('join.group')}</legend>
            <div className="grid grid-cols-5 gap-2" role="radiogroup">
              {config.groups.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={group === g}
                  onClick={() => setGroup(g)}
                  className={cn(
                    'h-12 rounded-md border text-sm font-medium transition-colors',
                    group === g ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="email">{t('join.email')}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" className="h-12" dir="ltr" />
          </div>

          <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={!isValid || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? t('join.connecting') : t('join.submit')}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm">
          <Link to="/admin" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
            {t('join.teacher')}
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
