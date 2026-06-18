import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import type { Artist } from '../types';
import { ArtistAvatar } from './ArtistAvatar';

interface Props {
  selected: Map<number, Artist>;
  onChange: (selected: Map<number, Artist>) => void;
}

const rankSizes = ['text-4xl', 'text-3xl', 'text-2xl', 'text-xl', 'text-lg'];

export function Top5Picker({ selected, onChange }: Props) {
  const [search, setSearch] = useState('');
  const { data: artists = [] } = useQuery({
    queryKey: ['artists'],
    queryFn: () => api.getArtists(0, 100),
  });

  const filtered = artists.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedIds = new Set([...selected.values()].map((a) => a.id));

  const pick = (position: number, artist: Artist) => {
    const next = new Map(selected);
    for (const [pos, a] of next) {
      if (a.id === artist.id) next.delete(pos);
    }
    next.set(position, artist);
    onChange(next);
  };

  const remove = (position: number) => {
    const next = new Map(selected);
    next.delete(position);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        {[1, 2, 3, 4, 5].map((pos, i) => {
          const artist = selected.get(pos);
          return (
            <motion.div
              key={pos}
              layout
              className={`flex items-center gap-3 min-h-[52px] ${
                pos === 1 ? 'draft-card-hero' : 'draft-card-row'
              } ${!artist ? 'border-dashed border-white/15' : ''}`}
            >
              <div className="w-12 sm:w-14 shrink-0 flex items-center justify-center">
                <span
                  className={`font-display leading-none ${
                    pos === 1 ? 'text-gold ' + rankSizes[0] : 'text-muted ' + rankSizes[i]
                  }`}
                >
                  {pos}
                </span>
              </div>
              {artist ? (
                <>
                  <ArtistAvatar name={artist.name} size="sm" />
                  <p className="font-display text-base tracking-wide flex-1 truncate">{artist.name}</p>
                  <button
                    type="button"
                    onClick={() => remove(pos)}
                    className="text-muted hover:text-accent text-xs px-2 shrink-0"
                  >
                    Clear
                  </button>
                </>
              ) : (
                <p className="text-muted text-sm py-3">Tap an artist below</p>
              )}
            </motion.div>
          );
        })}
      </div>

      <input
        type="search"
        placeholder="Search artists..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full draft-card px-4 py-2.5 text-sm focus:outline-none focus:border-accent/40"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
        {filtered.map((artist) => (
          <button
            key={artist.id}
            type="button"
            disabled={selectedIds.has(artist.id)}
            onClick={() => {
              const nextPos = [1, 2, 3, 4, 5].find((p) => !selected.has(p));
              if (nextPos) pick(nextPos, artist);
            }}
            className={`flex items-center gap-2 p-2 text-left text-sm transition-colors ${
              selectedIds.has(artist.id)
                ? 'opacity-40 cursor-not-allowed draft-card'
                : 'draft-card-row hover:border-accent/30'
            }`}
          >
            <ArtistAvatar name={artist.name} size="sm" />
            <span className="truncate">{artist.name}</span>
          </button>
        ))}
      </div>

      <p className="text-muted text-xs text-center">
        {selected.size}/5 selected — fills slots from #1 down
      </p>
    </div>
  );
}
