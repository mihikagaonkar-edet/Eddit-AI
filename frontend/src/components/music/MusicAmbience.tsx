type MusicAmbienceProps = {
  variant?: 'app' | 'auth';
};

function Equalizer({ className = '' }: { className?: string }) {
  const heights = [28, 44, 36, 52, 24, 48, 32, 56, 40, 20, 46, 34];
  return (
    <div className={`equalizer ${className}`} aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className="equalizer-bar"
          style={{ height: `${h}%`, animationDelay: `${i * 0.07}s` }}
        />
      ))}
    </div>
  );
}

function Soundwave({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`soundwave ${className}`}
      viewBox="0 0 400 48"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        className="soundwave-path soundwave-path-a"
        d="M0,24 Q25,8 50,24 T100,24 T150,24 T200,24 T250,24 T300,24 T350,24 T400,24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        className="soundwave-path soundwave-path-b"
        d="M0,28 Q30,42 60,28 T120,28 T180,28 T240,28 T300,28 T360,28 T400,28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />
    </svg>
  );
}

function CrowdSilhouette() {
  return (
    <svg
      className="crowd-silhouette"
      viewBox="0 0 1440 120"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="crowd-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="35%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path
        fill="url(#crowd-fade)"
        d="M0,120 L0,72
           C40,58 60,80 90,65 C120,50 130,75 160,62 C190,48 200,70 230,58
           C260,45 270,68 300,55 C330,42 340,65 370,52 C400,38 410,60 440,48
           C470,35 480,58 510,45 C540,32 550,55 580,42 C610,28 620,50 650,38
           C680,25 690,48 720,35 C750,22 760,45 790,32 C820,18 830,42 860,30
           C890,16 900,40 930,28 C960,14 970,38 1000,25 C1030,12 1040,35 1070,22
           C1100,8 1110,32 1140,20 C1170,6 1180,30 1210,18 C1240,4 1250,28 1280,16
           C1310,2 1320,26 1350,14 C1380,0 1390,24 1440,10 L1440,120 Z"
      />
      <g fill="currentColor" opacity="0.25">
        <ellipse cx="180" cy="58" rx="4" ry="10" transform="rotate(-20 180 58)" />
        <ellipse cx="420" cy="52" rx="3.5" ry="9" transform="rotate(15 420 52)" />
        <ellipse cx="680" cy="48" rx="4" ry="11" transform="rotate(-12 680 48)" />
        <ellipse cx="920" cy="50" rx="3.5" ry="9" transform="rotate(18 920 50)" />
        <ellipse cx="1150" cy="46" rx="4" ry="10" transform="rotate(-8 1150 46)" />
      </g>
    </svg>
  );
}

function VinylDecor({ className = '' }: { className?: string }) {
  return (
    <div className={`vinyl-decor ${className}`} aria-hidden>
      <div className="vinyl-decor-grooves" />
      <div className="vinyl-decor-label" />
      <div className="vinyl-decor-hole" />
    </div>
  );
}

export function MusicAmbience({ variant = 'app' }: MusicAmbienceProps) {
  return (
    <div className={`music-ambience music-ambience--${variant}`} aria-hidden>
      <div className="stage-lights">
        <div className="stage-light stage-light--violet" />
        <div className="stage-light stage-light--accent" />
        <div className="stage-light stage-light--gold" />
        <div className="stage-light stage-light--neon" />
      </div>

      <div className="music-orbs">
        <div className="music-orb music-orb--1" />
        <div className="music-orb music-orb--2" />
        <div className="music-orb music-orb--3" />
      </div>

      <VinylDecor className="vinyl-decor--tl" />
      <VinylDecor className="vinyl-decor--br" />

      <Equalizer className="equalizer--corner" />
      <Soundwave className="soundwave--footer" />
      <CrowdSilhouette />
    </div>
  );
}

export function MusicPulse({ className = '' }: { className?: string }) {
  return (
    <div className={`music-pulse ${className}`} aria-hidden>
      <Equalizer className="equalizer--inline" />
      <Soundwave className="soundwave--inline" />
    </div>
  );
}
