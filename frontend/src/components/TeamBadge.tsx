import { formatArtistName } from '../utils/formatArtistName';

export function TeamBadge({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span
      className={`inline-block font-display text-[11px] uppercase tracking-[0.12em] border-2 border-accent text-accent px-2.5 py-1 bg-accent/10 shadow-[2px_2px_0_rgba(255,107,74,0.25)] ${className}`}
    >
      Team {formatArtistName(name)}
    </span>
  );
}
