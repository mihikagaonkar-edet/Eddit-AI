import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';
import { UserAvatar } from '../components/UserAvatar';
import { ArgumentThread } from '../components/ArgumentThread';
import { useAuth } from '../context/AuthContext';

function formatNumber(n?: number | null) {
  if (!n) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString();
}

export function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['artist-stats', id],
    queryFn: () => api.getArtistStats(id!),
    enabled: !!id,
  });

  if (isLoading) return <p className="p-6 text-muted">Loading...</p>;
  if (!stats) return <p className="p-6 text-muted">Artist not found</p>;

  const { artist } = stats;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-8 pb-8">
      <div className="artist-stage-hero">
        <div className="artist-stage-beams" aria-hidden>
          <div className="artist-beam artist-beam--1" />
          <div className="artist-beam artist-beam--2" />
          <div className="artist-beam artist-beam--3" />
        </div>

        <svg
          className="artist-stage-crowd"
          viewBox="0 0 600 60"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0,60 L0,34 C20,26 30,38 45,30 C60,22 68,35 82,28 C96,20 104,33 118,26
               C132,18 140,32 155,24 C170,16 178,30 192,22 C206,14 214,28 228,20
               C242,12 250,26 265,18 C280,10 288,24 302,16 C316,8 324,22 338,15
               C352,7 360,21 374,14 C388,6 396,20 410,13 C424,5 432,19 446,12
               C460,4 468,18 482,11 C496,3 504,17 518,10 C532,2 540,16 555,9
               C570,1 578,15 600,8 L600,60 Z"
          />
        </svg>

        <div className="relative z-10 flex items-center gap-5 p-6 sm:p-8">
          <ArtistAvatar name={artist.name} imageUrl={artist.image_url} size="xl" />
          <div>
            <p className="draft-label mb-1 flex items-center gap-2">
              <span className="live-dot" aria-hidden />
              Artist
            </p>
            <h1 className="font-headline text-5xl sm:text-6xl text-off-white leading-none">
              {artist.name}
            </h1>
            {artist.rating != null && (
              <p className="text-gold font-display text-2xl mt-2 flex items-center gap-1">
                ★ <span>{artist.rating}</span>
                <span className="text-muted text-xs ml-2">Eddit Rating</span>
              </p>
            )}
          </div>
        </div>

        <div className="artist-stage-eq-strip" aria-hidden>
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="artist-stage-eq-bar"
              style={{
                height: `${20 + Math.sin(i * 0.8) * 60 + 20}%`,
                animationDelay: `${(i * 0.06).toFixed(2)}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Rating" value={artist.rating != null ? String(artist.rating) : '—'} />
        <Stat label="Billboard Top 10" value={String(artist.billboard_top_10 ?? '—')} />
        <Stat label="Billboard #1s" value={String(artist.billboard_number_1 ?? '—')} />
        <Stat label="Albums Sold" value={formatNumber(artist.albums_sold)} />
        <Stat label="Singles Sold" value={formatNumber(artist.singles_sold)} />
        <Stat label="Platinum Albums" value={String(artist.platinum_albums ?? '—')} />
        <Stat label="Avg Songs / Year" value={artist.avg_songs_per_year != null ? String(artist.avg_songs_per_year) : '—'} />
        <Stat label="Spotify Listeners" value={formatNumber(artist.spotify_monthly_listeners)} />
        <Stat label="YouTube Views" value={formatNumber(artist.youtube_views)} />
        <Stat label="Awards" value={String(artist.awards ?? '—')} />
      </div>

      {stats.most_common_position && (
        <Section title="Most Common Ranking Position">
          <p className="font-display text-5xl text-gold">{stats.most_common_position}</p>
        </Section>
      )}

      <Section title="Recent Top 5 Placements">
        {stats.recent_placements.length > 0 ? (
          <div className="space-y-1.5">
            {stats.recent_placements.map((p, i) => (
              <Link
                key={`${p.user.id}-${i}`}
                to={`/profile/${p.user.username}`}
                className="draft-card-row flex items-center gap-3 p-3 hover:border-accent/30 transition-colors"
              >
                <UserAvatar name={p.user.name} profileImageUrl={p.user.profile_image_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm tracking-wide truncate">{p.user.name}</p>
                  <p className="text-muted text-xs">@{p.user.username}</p>
                </div>
                <span className={`rank-num text-xl shrink-0 ${p.position === 1 ? 'text-gold' : 'text-muted'}`}>
                  #{p.position}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">No Top 5 placements yet</p>
        )}
      </Section>

      <section>
        <p className="draft-label mb-3">Reactions</p>
        <ArgumentThread targetType="artist" targetId={artist.id} />
      </section>

      <Link
        to={user ? `/teams/${artist.id}` : '/login'}
        className="block text-center btn-primary py-3"
      >
        Join Team {artist.name}
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="draft-card p-3">
      <p className="draft-label">{label}</p>
      <p className="font-display text-xl mt-1 text-off-white">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="draft-label mb-3">{title}</p>
      {children}
    </section>
  );
}
