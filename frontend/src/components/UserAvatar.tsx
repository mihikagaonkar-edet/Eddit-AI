import { mediaUrl } from '../api/client';
import { avatarGradient, userInitial } from '../utils/avatarGradient';

const sizes = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 sm:w-24 sm:h-24 text-3xl',
} as const;

export function UserAvatar({
  name,
  profileImageUrl,
  size = 'md',
  variant = 'default',
  className = '',
}: {
  name: string;
  profileImageUrl?: string | null;
  size?: keyof typeof sizes;
  variant?: 'default' | 'gold';
  className?: string;
}) {
  const initial = userInitial(name);
  const sizeClass = sizes[size];

  if (profileImageUrl) {
    return (
      <img
        src={mediaUrl(profileImageUrl)}
        alt=""
        className={`artist-avatar object-cover ${sizeClass} ${className}`}
      />
    );
  }

  if (variant === 'gold') {
    return (
      <div
        className={`${sizeClass} rounded-lg border-2 border-gold/50 flex items-center justify-center font-display text-gold shrink-0 ${className}`}
        style={{
          background: 'linear-gradient(145deg, rgba(240,192,64,0.2), rgba(255,85,51,0.12))',
          boxShadow: '0 0 20px rgba(240,192,64,0.12)',
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={`artist-avatar ${sizeClass} text-off-white ${className}`}
      style={{ background: avatarGradient(name) }}
    >
      {initial}
    </div>
  );
}
