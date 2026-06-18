import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';

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
      <h1 className="font-display text-3xl">Rankings</h1>
      <p className="text-muted text-sm -mt-6">Competition. Discovery. Debate.</p>

      <Leaderboard title="Top Artists" items={data.top_artists.map((a) => ({ id: a.id, name: a.name, sub: ratingSub(a), link: `/artists/${a.id}` }))} />
      <Leaderboard title="Top Teams" items={data.top_teams.map((a) => ({ id: a.id, name: `Team ${a.name}`, sub: ratingSub(a), link: `/teams/${a.id}` }))} />
      <Leaderboard title="Most Debated" items={data.most_debated_artists.map((a) => ({ id: a.id, name: a.name, sub: 'Hot debate', link: `/artists/${a.id}` }))} />
      <Leaderboard title="Most Liked" items={data.most_liked_artists.map((a) => ({ id: a.id, name: a.name, sub: '👍 Fan favorite', link: `/artists/${a.id}` }))} />
      <Leaderboard title="Most Disliked" items={data.most_disliked_artists.map((a) => ({ id: a.id, name: a.name, sub: '👎 Controversial', link: `/artists/${a.id}` }))} />

      <section>
        <h2 className="font-display text-xl mb-3">Most Active Fans</h2>
        <div className="space-y-2">
          {data.most_active_fans.map((fan, i) => (
            <Link
              key={fan.id}
              to={`/profile/${fan.username}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-charcoal-card border border-white/5 hover:border-accent/20"
            >
              <span className="font-display text-2xl text-accent w-8">#{i + 1}</span>
              <div>
                <p className="font-medium text-sm">{fan.name}</p>
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
      <h2 className="font-display text-xl mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <Link
            key={item.id}
            to={item.link}
            className="flex items-center gap-3 p-3 rounded-xl bg-charcoal-card border border-white/5 hover:border-accent/20 transition-colors"
          >
            <span className={`font-display text-2xl w-8 ${i < 3 ? 'text-gold' : 'text-muted'}`}>
              #{i + 1}
            </span>
            <ArtistAvatar name={item.name.replace(/^Team /, '')} size="md" />
            <div>
              <p className="font-medium text-sm">{item.name}</p>
              {item.sub && <p className="text-muted text-xs">{item.sub}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
