import { formatArtistName } from '../utils/formatArtistName';
import { avatarGradient } from '../utils/avatarGradient';

const EQ_HEIGHTS = [38, 72, 54, 88, 46, 76, 42, 64];
const NOTES = ['♪', '♫', '♩', '♬'];

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

  // Pick a consistent note per artist
  let noteIndex = 0;
  for (let i = 0; i < displayName.length; i++) noteIndex += displayName.charCodeAt(i);
  const note = NOTES[noteIndex % NOTES.length];

  const showDecor = size === 'lg' || size === 'xl';

  return (
    <div className={`artist-avatar-wrap ${sizes[size]} ${className}`}>
      <div
        className="artist-avatar"
        style={{ background: avatarGradient(displayName), width: '100%', height: '100%' }}
      >
        <span className="relative z-[1]">{displayName[0]?.toUpperCase() || '♪'}</span>

        {showDecor && (
          <div className="artist-avatar-eq" aria-hidden>
            {EQ_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="artist-eq-bar"
                style={{ height: `${h}%`, animationDelay: `${i * 0.11}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {showDecor && (
        <span className="artist-avatar-note" aria-hidden>{note}</span>
      )}

      <div className="artist-avatar-spotlight" aria-hidden />
    </div>
  );
}
