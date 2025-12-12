import { Github, Linkedin, Globe } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full py-4 px-6 border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Built by{' '}
          <span className="font-medium text-foreground">Salah Eddine Medkour</span>
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://salahmed-ctrlz.github.io/salaheddine-medkour-portfolio/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="Portfolio"
          >
            <Globe className="h-5 w-5" />
          </a>
          <a
            href="https://github.com/salahmed-ctrlz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="https://www.linkedin.com/in/salah-eddine-medkour/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
