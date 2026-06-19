import { formatArtistName } from '../utils/formatArtistName';

type PatchSize = 'sm' | 'md' | 'lg';

interface Props {
  name: string;
  size?: PatchSize;
  className?: string;
}

const dimensions: Record<PatchSize, { w: number; h: number }> = {
  sm: { w: 64, h: 78 },
  md: { w: 84, h: 102 },
  lg: { w: 120, h: 148 },
};

function patchId(name: string): string {
  return `patch-${Math.abs(name.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)) % 9999}`;
}

function patchLabel(name: string): { line1: string; line2?: string } {
  const formatted = formatArtistName(name).toUpperCase();
  const words = formatted.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    const word = words[0];
    if (word.length <= 10) return { line1: word };
    return { line1: word.slice(0, 10), line2: word.slice(10, 18) };
  }

  if (words.length === 2 && words.join(' ').length <= 14) {
    return { line1: words[0], line2: words[1] };
  }

  return { line1: words[0].slice(0, 10), line2: words.slice(1).join(' ').slice(0, 10) };
}

export function TeamPatch({ name, size = 'lg', className = '' }: Props) {
  const { w, h } = dimensions[size];
  const label = patchLabel(name);
  const id = patchId(name);

  return (
    <div
      className={`team-patch shrink-0 ${className}`}
      style={{ width: w, height: h }}
      aria-label={`Team ${formatArtistName(name)}`}
    >
      <svg viewBox="0 0 100 122" className="w-full h-full" role="img">
        <defs>
          <linearGradient id={`${id}-border`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8a060" />
            <stop offset="45%" stopColor="#ff6b4a" />
            <stop offset="100%" stopColor="#b87333" />
          </linearGradient>
          <linearGradient id={`${id}-fill`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#2a252f" />
            <stop offset="100%" stopColor="#121018" />
          </linearGradient>
          <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Outer stitch ring */}
        <path
          d="M50 4 L92 18 L92 62 Q92 82 50 96 Q8 82 8 62 L8 18 Z"
          fill="none"
          stroke={`url(#${id}-border)`}
          strokeWidth="2.5"
          strokeDasharray="3 2"
          opacity="0.85"
        />

        {/* Shield body */}
        <path
          d="M50 8 L88 20 L88 61 Q88 78 50 90 Q12 78 12 61 L12 20 Z"
          fill={`url(#${id}-fill)`}
          stroke={`url(#${id}-border)`}
          strokeWidth="2"
          filter={`url(#${id}-shadow)`}
        />

        {/* Inner bevel */}
        <path
          d="M50 14 L82 24 L82 59 Q82 72 50 82 Q18 72 18 59 L18 24 Z"
          fill="none"
          stroke="#ff6b4a"
          strokeWidth="0.6"
          opacity="0.25"
        />

        {/* TEAM header */}
        <text
          x="50"
          y="28"
          textAnchor="middle"
          className="team-patch-team-label"
          fill="#ff8566"
        >
          TEAM
        </text>

        {/* Artist name */}
        <text x="50" y={label.line2 ? 50 : 58} textAnchor="middle" className="team-patch-name" fill="#f5f0e8">
          {label.line1}
        </text>
        {label.line2 && (
          <text x="50" y="64" textAnchor="middle" className="team-patch-name team-patch-name-sub" fill="#f5f0e8">
            {label.line2}
          </text>
        )}

        {/* Bottom star */}        <path
          d="M50 84 L51.6 88.2 L56 88.2 L52.4 91 L53.8 95.2 L50 92.4 L46.2 95.2 L47.6 91 L44 88.2 L48.4 88.2 Z"
          fill="#d4af37"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}
