import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { PersonCard } from '../components/PersonCard';
import { useAuth } from '../context/AuthContext';

export function PeoplePage() {
  const [search, setSearch] = useState('');
  const { user: currentUser } = useAuth();

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: api.getPeople,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const others = people.filter((p) => p.username !== currentUser?.username);
    if (!q) return others;
    return others.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.current_team_artist?.name.toLowerCase().includes(q)
    );
  }, [people, search]);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6 pb-8">
      <header className="page-header">
        <p className="draft-label">Community</p>
        <h1 className="font-headline text-5xl text-off-white mt-1">People</h1>
        <p className="text-muted text-sm mt-2">Discover fans by their Top 5 and team.</p>
      </header>

      <input
        type="search"
        placeholder="Search by name, username, or team..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-stage"
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
