import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full border-t border-border px-5 py-4 pb-safe text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>
          AirQuiz by{' '}
          <a href="https://salahmed-ctrlz.github.io/salaheddine-medkour-portfolio/" target="_blank" rel="noopener noreferrer"
            className="text-foreground underline-offset-4 hover:underline">
            Salah Eddine Medkour
          </a>
        </span>
        <a href="https://github.com/salahmed-ctrlz/AirQuiz" target="_blank" rel="noopener noreferrer"
          className="underline-offset-4 hover:underline">
          GitHub
        </a>
        <Link to="/about" className="underline-offset-4 hover:underline">About</Link>
      </div>
    </footer>
  );
}
