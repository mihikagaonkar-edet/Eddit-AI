export function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const hue2 = (hue + 48) % 360;
  return `linear-gradient(145deg, hsl(${hue}, 72%, 42%) 0%, hsl(${hue2}, 65%, 22%) 100%)`;
}

export function userInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() || '?';
}
