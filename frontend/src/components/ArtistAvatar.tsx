import { formatArtistName } from '../utils/formatArtistName';

function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const hue2 = (hue + 48) % 360;
  return `linear-gradient(145deg, hsl(${hue}, 72%, 42%) 0%, hsl(${hue2}, 65%, 22%) 100%)`;
}

export function ArtistAvatar({
  name,
  size = 'md',
  className = '',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const displayName = formatArtistName(name);
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 sm:w-24 sm:h-24 text-3xl',
  };
  return (
    <div
      className={`artist-avatar ${sizes[size]} text-off-white ${className}`}
      style={{ background: avatarGradient(displayName) }}
    >
      {displayName[0]?.toUpperCase() || '♪'}
    </div>
  );
}
