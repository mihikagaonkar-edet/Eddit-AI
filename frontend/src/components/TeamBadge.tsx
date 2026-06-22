import { formatArtistName } from '../utils/formatArtistName';

export function TeamBadge({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`team-badge-sticker px-2.5 py-1 text-[11px] ${className}`}>
      Team {formatArtistName(name)}
    </span>
  );
}
