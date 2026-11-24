import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { adminLogin, getAdminToken, tryLocalLogin } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (getAdminToken()) {
      navigate('/admin/dashboard');
      return;
    }
    // Sitting at the host computer? No password needed.
    tryLocalLogin().then((ok) => ok && navigate('/admin/dashboard'));
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await adminLogin(password);
    if (result.ok) {
      navigate('/admin/dashboard');
    } else {
      toast({ title: 'Could not sign in', description: result.message, variant: 'destructive' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center justify-between px-5 pt-4 pt-safe">
        <img src={logo} alt="AirQuiz" className="h-9 w-auto dark:brightness-0 dark:invert" />
        <ThemeToggle />
      </header>
      <main className="flex-1 w-full max-w-sm mx-auto px-5 pt-14">
        <h1 className="text-3xl font-semibold tracking-tight">Teacher sign-in</h1>
        <p className="mt-2 text-muted-foreground">
          On the computer running AirQuiz you are signed in automatically. From another device, use the password shown in the AirQuiz window, also saved in{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">AirQuizData/admin_password.txt</code>.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" autoFocus
              value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
          </div>
          <Button type="submit" className="w-full h-12 text-base" disabled={!password || isLoading}>
            {isLoading ? 'Checking…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-8 text-sm">
          <Link to="/" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
            I'm a student
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
