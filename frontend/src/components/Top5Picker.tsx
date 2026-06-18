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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((pos) => {
          const artist = selected.get(pos);
          return (
            <motion.div
              key={pos}
              layout
              className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden ${
                artist ? 'border-accent/50 bg-charcoal-card' : 'border-white/15 bg-charcoal-light'
              }`}
            >
              <span className="font-display text-2xl text-accent">#{pos}</span>
              {artist ? (
                <>
                  <ArtistAvatar name={artist.name} size="sm" />
                  <p className="text-[10px] text-center mt-1 px-1 truncate w-full">{artist.name}</p>
                </>
              ) : (
                <p className="text-[10px] text-muted mt-1">Pick</p>
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
        className="w-full bg-charcoal-card border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent/50"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
        {filtered.map((artist) => (
          <button
            key={artist.id}
            disabled={selectedIds.has(artist.id)}
            onClick={() => {
              const nextPos = [1, 2, 3, 4, 5].find((p) => !selected.has(p));
              if (nextPos) pick(nextPos, artist);
            }}
            className={`flex items-center gap-2 p-2 rounded-xl text-left text-sm transition-colors ${
              selectedIds.has(artist.id)
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-white/5 bg-charcoal-card'
            }`}
          >
            <ArtistAvatar name={artist.name} size="sm" />
            <span className="truncate">{artist.name}</span>
          </button>
        ))}
      </div>

      <p className="text-muted text-xs text-center">
        Tap an artist to fill the next open slot. {selected.size}/5 selected.
      </p>
    </div>
  );
}
