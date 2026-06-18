import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { Top5Item } from '../types';
import { ArtistAvatar } from './ArtistAvatar';

interface Props {
  items: Top5Item[];
  editable?: boolean;
  onVote?: (itemId: string, type: 'like' | 'dislike') => void;
  onArgue?: (item: Top5Item) => void;
  showVotes?: boolean;
}

const rankSizes = ['text-7xl', 'text-6xl', 'text-5xl', 'text-4xl', 'text-3xl'];

export function Top5Display({ items, editable, onVote, onArgue, showVotes = true }: Props) {
  const sorted = [...items].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-3">
      {sorted.map((item, i) => (
        <motion.div
          key={item.id}
          whileHover={{ scale: editable ? 1 : 1.01 }}
          className={`relative overflow-hidden rounded-2xl bg-charcoal-card border border-white/8 ${
            item.position === 1 ? 'ring-1 ring-gold/30' : ''
          }`}
        >
          <div className="flex items-stretch min-h-[100px]">
            <div className="flex items-center justify-center w-20 shrink-0 bg-black/30">
              <span className={`font-display ${rankSizes[i]} text-accent leading-none`}>
                #{item.position}
              </span>
            </div>
            <div className="relative w-24 shrink-0 flex items-center justify-center bg-charcoal-light">
              <ArtistAvatar name={item.artist.name} size="md" />
            </div>
            <div className="flex-1 p-4 flex flex-col justify-center">
              <Link to={`/artists/${item.artist.id}`} className="font-display text-2xl tracking-wide hover:text-accent transition-colors">
                {item.artist.name}
              </Link>
              {item.artist.rating != null && (
                <p className="text-gold text-sm mt-0.5">★ {item.artist.rating}</p>
              )}
              {showVotes && !editable && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <button
                    onClick={() => onVote?.(item.id, 'like')}
                    className="flex items-center gap-1 text-muted hover:text-green-400 transition-colors"
                  >
                    👍 {item.like_count}
                  </button>
                  <button
                    onClick={() => onVote?.(item.id, 'dislike')}
                    className="flex items-center gap-1 text-muted hover:text-red-400 transition-colors"
                  >
                    👎 {item.dislike_count}
                  </button>
                  <button
                    onClick={() => onArgue?.(item)}
                    className="flex items-center gap-1 text-muted hover:text-accent transition-colors"
                  >
                    🔥 {item.argument_count} Arguments
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
