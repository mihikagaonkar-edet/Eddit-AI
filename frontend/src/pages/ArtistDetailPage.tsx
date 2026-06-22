import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';
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
      <div className="draft-card-hero p-6 flex items-center gap-4">
        <ArtistAvatar name={artist.name} size="lg" />
        <div>
          <p className="draft-label mb-1">Artist</p>
          <h1 className="font-display text-4xl text-off-white">{artist.name}</h1>
          {artist.rating != null && (
            <p className="text-gold font-display text-2xl mt-1">★ {artist.rating}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Rating" value={artist.rating != null ? String(artist.rating) : '—'} />
        <Stat label="Team Members" value={String(stats.team_member_count)} />
        <Stat label="Billboard Top 10" value={String(artist.billboard_top_10 ?? '—')} />
        <Stat label="Billboard #1s" value={String(artist.billboard_number_1 ?? '—')} />
        <Stat label="Albums Sold" value={formatNumber(artist.albums_sold)} />
        <Stat label="Singles Sold" value={formatNumber(artist.singles_sold)} />
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

      <Section title="Top Supporters">
        <div className="flex gap-3 flex-wrap">
          {stats.top_supporters.map((u) => (
            <Link key={u.id} to={`/profile/${u.username}`} className="text-center">
              <ArtistAvatar name={u.name} size="md" />
              <p className="text-xs mt-1">{u.name}</p>
            </Link>
          ))}
          {!stats.top_supporters.length && <p className="text-muted text-sm">No #1 placements yet</p>}
        </div>
      </Section>

      <Section title="Recent Arguments">
        {stats.recent_arguments.length > 0 ? (
          stats.recent_arguments.map((a) => (
            <div key={a.id} className="draft-card-row p-3 mb-1.5 text-sm">
              <span className="font-medium">{a.author.name}</span>: {a.text_content || '📹 Video argument'}
            </div>
          ))
        ) : (
          <p className="text-muted text-sm">No arguments yet</p>
        )}
      </Section>

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
