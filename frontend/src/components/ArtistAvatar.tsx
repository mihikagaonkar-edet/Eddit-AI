import { formatArtistName } from '../utils/formatArtistName';

export function ArtistAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const displayName = formatArtistName(name);
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 sm:w-24 sm:h-24 text-3xl',
  };
  return (
    <div
      className={`${sizes[size]} rounded-sm border border-gold/30 bg-charcoal-light flex items-center justify-center font-display text-gold shrink-0`}
    >
      {displayName[0]?.toUpperCase() || '♪'}
    </div>
  );
}
