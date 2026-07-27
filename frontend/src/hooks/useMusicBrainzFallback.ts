import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { MusicBrainzCandidate } from '../types';

/**
 * When a search has zero local matches, check MusicBrainz (debounced) to see
 * if the typed name is a real artist that just isn't in our database yet.
 */
export function useMusicBrainzFallback(query: string, hasLocalMatches: boolean) {
  const [candidate, setCandidate] = useState<MusicBrainzCandidate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    setCandidate(null);

    if (hasLocalMatches || trimmed.length < 2) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      api
        .searchMusicBrainz(trimmed)
        .then((res) => {
          if (!cancelled) setCandidate(res.candidate);
        })
        .catch(() => {
          if (!cancelled) setCandidate(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, hasLocalMatches]);

  return { candidate, loading };
}
