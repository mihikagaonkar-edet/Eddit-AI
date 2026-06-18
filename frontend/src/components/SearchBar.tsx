import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function SearchBar() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.search(q),
    enabled: q.length >= 2,
  });

  return (
    <div className="relative">
      <input
        type="search"
        placeholder="Search artists, users, teams..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(e.target.value.length >= 2);
        }}
        onFocus={() => q.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-full bg-charcoal-card border border-white/10 rounded-xl px-4 py-2.5 text-sm text-off-white placeholder:text-muted focus:outline-none focus:border-accent/50"
      />
      {open && data && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-charcoal-card border border-white/10 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
          {data.artists.length > 0 && (
            <Section title="Artists">
              {data.artists.map((a) => (
                <ResultRow key={a.id} label={a.name} sub={a.rating != null ? `★ ${a.rating}` : ''} onClick={() => { navigate(`/artists/${a.id}`); setOpen(false); }} />
              ))}
            </Section>
          )}
          {data.users.length > 0 && (
            <Section title="Users">
              {data.users.map((u) => (
                <ResultRow key={u.id} label={u.name} sub={`@${u.username}`} onClick={() => { navigate(`/profile/${u.username}`); setOpen(false); }} />
              ))}
            </Section>
          )}
          {data.teams.length > 0 && (
            <Section title="Teams">
              {data.teams.map((t) => (
                <ResultRow key={t.id} label={`Team ${t.name}`} sub={t.rating != null ? `★ ${t.rating}` : ''} onClick={() => { navigate(`/teams/${t.id}`); setOpen(false); }} />
              ))}
            </Section>
          )}
          {!data.artists.length && !data.users.length && !data.teams.length && (
            <p className="p-4 text-muted text-sm">No results</p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-2">
      <p className="text-xs text-muted uppercase tracking-wider px-2 py-1">{title}</p>
      {children}
    </div>
  );
}

function ResultRow({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted">{sub}</p>
    </button>
  );
}
