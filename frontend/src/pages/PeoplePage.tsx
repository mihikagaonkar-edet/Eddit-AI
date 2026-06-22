import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { PersonCard } from '../components/PersonCard';
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
