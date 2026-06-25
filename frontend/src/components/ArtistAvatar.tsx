import { formatArtistName } from '../utils/formatArtistName';
import { avatarGradient } from '../utils/avatarGradient';

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
