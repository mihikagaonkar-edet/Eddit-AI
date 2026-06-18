import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { TeamBadge } from '../components/TeamBadge';
import type { UserPeopleItem } from '../types';

export function PeoplePage() {
  const [search, setSearch] = useState('');

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: api.getPeople,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.current_team_artist?.name.toLowerCase().includes(q)
    );
  }, [people, search]);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6 pb-8">
      <div>
        <p className="draft-label">Community</p>
        <h1 className="font-display text-4xl text-off-white mt-1">People</h1>
        <p className="text-muted text-sm mt-1">Discover fans by their Top 5 and team.</p>
      </div>

      <input
        type="search"
        placeholder="Search by name, username, or team..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full draft-card px-4 py-2.5 text-sm text-off-white placeholder:text-muted focus:outline-none focus:border-accent/40"
      />

      {isLoading && <p className="text-muted">Loading...</p>}

      {!isLoading && (
        <>
          <p className="text-muted text-sm">
            {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-muted text-center py-8">No people found</p>
          )}
        </>
      )}
    </div>
  );
}

function PersonCard({ person }: { person: UserPeopleItem }) {
  return (
    <Link
      to={`/profile/${person.username}`}
      className="flex flex-col h-full draft-card p-3 hover:border-accent/30 transition-colors"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-10 h-10 border-2 border-gold/40 bg-charcoal-light flex items-center justify-center font-display text-gold text-lg shrink-0">
          {person.name[0]?.toUpperCase()}
        </div>
        <p className="font-display text-sm mt-2 truncate w-full tracking-wide">{person.name}</p>
        <p className="text-muted text-xs truncate w-full">@{person.username}</p>
        {person.current_team_artist ? (
          <TeamBadge name={person.current_team_artist.name} className="mt-2 text-[9px] px-2 py-0.5" />
        ) : (
          <span className="mt-2 draft-label">No team</span>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-white/5 flex-1">
        <p className="draft-label mb-1.5">Top 5</p>
        {person.top5_items.length > 0 ? (
          <div className="space-y-1">
            {person.top5_items.map((item) => (
              <div
                key={item.position}
                className={`flex items-center gap-1.5 text-xs leading-tight min-h-[22px] ${
                  item.position === 1 ? 'border-l-2 border-l-gold pl-1.5 -ml-0.5' : ''
                }`}
              >
                <span
                  className={`font-display w-4 shrink-0 ${
                    item.position === 1 ? 'text-gold text-base' : 'text-muted text-sm'
                  }`}
                >
                  {item.position}
                </span>
                <span className="truncate">{item.artist.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-xs leading-tight">No Top 5 yet</p>
        )}
      </div>
    </Link>
  );
}
