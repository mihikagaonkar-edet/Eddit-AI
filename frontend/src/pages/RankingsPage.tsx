import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';
import { UserAvatar } from '../components/UserAvatar';

export function RankingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['rankings'],
    queryFn: api.getRankings,
  });

  if (isLoading) return <p className="p-6 text-muted">Loading rankings...</p>;
  if (!data) return null;

  const ratingSub = (a: { rating?: number | null }) =>
    a.rating != null ? `★ ${a.rating}` : '';

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-8 pb-8">
      <header className="page-header">
        <p className="draft-label">Competition</p>
        <h1 className="font-headline text-5xl text-off-white mt-1">Rankings</h1>
        <p className="text-muted text-sm mt-2">Discovery. Debate. Bragging rights.</p>
      </header>

      <Leaderboard title="Top Artists" items={data.top_artists.map((a) => ({ id: a.id, name: a.name, sub: ratingSub(a), link: `/artists/${a.id}` }))} />
      <Leaderboard title="Top Teams" items={data.top_teams.map((a) => ({ id: a.id, name: `Team ${a.name}`, sub: ratingSub(a), link: `/teams/${a.id}` }))} />
      <Leaderboard title="Most Debated" items={data.most_debated_artists.map((a) => ({ id: a.id, name: a.name, sub: 'Hot debate', link: `/artists/${a.id}` }))} />
      <Leaderboard title="Most Liked" items={data.most_liked_artists.map((a) => ({ id: a.id, name: a.name, sub: '👍 Fan favorite', link: `/artists/${a.id}` }))} />
      <Leaderboard title="Most Disliked" items={data.most_disliked_artists.map((a) => ({ id: a.id, name: a.name, sub: '👎 Controversial', link: `/artists/${a.id}` }))} />

      <section>
        <p className="draft-label mb-3">Most Active Fans</p>
        <div className="space-y-1.5">
          {data.most_active_fans.map((fan, i) => (
            <Link
              key={fan.id}
              to={`/profile/${fan.username}`}
              className={`flex items-center gap-3 p-3 draft-card-row hover:border-accent/30 transition-colors ${
                i === 0 ? 'draft-card-hero' : ''
              }`}
            >
              <span className={`rank-num text-3xl w-10 ${i === 0 ? 'text-gold' : 'text-muted'}`}>
                {i + 1}
              </span>
              <UserAvatar name={fan.name} profileImageUrl={fan.profile_image_url} size="sm" />
              <div>
                <p className="font-display text-base tracking-wide">{fan.name}</p>
                <p className="text-muted text-xs">@{fan.username}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Leaderboard({
  title,
  items,
}: {
  title: string;
  items: { id: string; name: string; sub: string; link: string }[];
}) {
  return (
    <section>
      <p className="draft-label mb-3">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <Link
            key={item.id}
            to={item.link}
            className={`flex items-center gap-3 p-3 transition-colors hover:border-accent/30 ${
              i === 0 ? 'draft-card-hero' : 'draft-card-row'
            }`}
          >
            <span className={`rank-num text-3xl w-10 shrink-0 ${i === 0 ? 'text-gold' : 'text-muted'}`}>
              {i + 1}
            </span>
            <ArtistAvatar name={item.name.replace(/^Team /, '')} size="sm" />
            <div className="min-w-0">
              <p className="font-display text-base tracking-wide truncate">{item.name}</p>
              {item.sub && <p className="text-muted text-xs">{item.sub}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
