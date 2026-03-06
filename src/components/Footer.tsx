/**
 * AirQuiz — Footer with personal branding.
 * Shows theme-aware personal logo + social links.
 */

import { Github, Linkedin, Globe } from 'lucide-react';
import { useTheme } from 'next-themes';
import logoBlack from '@/assets/Sala7BlackNobg.svg';
import logoWhite from '@/assets/Sala7WhiteNobg.svg';

// lucide doesn't have Instagram, so we use a lightweight inline SVG
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer() {
  const { resolvedTheme } = useTheme();
  const personalLogo = resolvedTheme === 'dark' ? logoWhite : logoBlack;

  return (
    <footer className="w-full py-4 px-6 border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={personalLogo} alt="Sala7" className="h-6 w-auto" />
          <p className="text-sm text-muted-foreground">
            Built by{' '}
            <span className="font-medium text-foreground">Salah Eddine Medkour</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://www.instagram.com/bettercallsala7/" target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors" aria-label="Instagram">
            <InstagramIcon className="h-5 w-5" />
          </a>
          <a href="https://salahmed-ctrlz.github.io/salaheddine-medkour-portfolio/" target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors" aria-label="Portfolio">
            <Globe className="h-5 w-5" />
          </a>
          <a href="https://github.com/salahmed-ctrlz" target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors" aria-label="GitHub">
            <Github className="h-5 w-5" />
          </a>
          <a href="https://www.linkedin.com/in/salah-eddine-medkour/" target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors" aria-label="LinkedIn">
            <Linkedin className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
