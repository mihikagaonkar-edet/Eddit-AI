export function ArtistAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-xl',
  };
  return (
    <div
      className={`${sizes[size]} rounded-full bg-accent/20 flex items-center justify-center font-display text-accent shrink-0`}
    >
      {name[0]?.toUpperCase() || '🎵'}
    </div>
  );
}
