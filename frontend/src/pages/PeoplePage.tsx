import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
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
        <h1 className="font-display text-3xl">People</h1>
        <p className="text-muted text-sm mt-1">Discover fans by their Top 5 and team.</p>
      </div>

      <input
        type="search"
        placeholder="Search by name, username, or team..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-charcoal-card border border-white/10 rounded-xl px-4 py-2.5 text-sm text-off-white placeholder:text-muted focus:outline-none focus:border-accent/50"
      />

      {isLoading && <p className="text-muted">Loading...</p>}

      {!isLoading && (
        <>
          <p className="text-muted text-sm">
            {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
          </p>
          <div className="grid grid-cols-2 gap-4">
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
      className="flex flex-col h-full bg-charcoal-card rounded-2xl p-3 border border-white/8 hover:border-accent/30 transition-all"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-display text-accent text-lg shrink-0">
          {person.name[0]?.toUpperCase()}
        </div>
        <p className="font-medium text-sm mt-2 truncate w-full">{person.name}</p>
        <p className="text-muted text-xs truncate w-full">@{person.username}</p>
        {person.current_team_artist ? (
          <span className="mt-1.5 text-[10px] font-medium bg-accent/15 text-accent px-2 py-0.5 rounded-full truncate max-w-full">
            Team {person.current_team_artist.name}
          </span>
        ) : (
          <span className="mt-1.5 text-[10px] text-muted">No team</span>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-white/5 flex-1">
        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Top 5</p>
        {person.top5_items.length > 0 ? (
          <div className="space-y-0.5">
            {person.top5_items.map((item) => (
              <div key={item.position} className="flex items-center gap-1.5 text-xs leading-tight">
                <span className="font-display text-accent text-sm w-4 shrink-0">{item.position}</span>
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
