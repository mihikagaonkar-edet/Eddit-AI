import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { Top5Item } from '../types';

interface Props {
  items: Top5Item[];
  editable?: boolean;
  onVote?: (itemId: string, type: 'like' | 'dislike') => void;
  onArgue?: (item: Top5Item) => void;
  showVotes?: boolean;
}

const rankSizes = ['text-5xl', 'text-4xl', 'text-3xl', 'text-2xl', 'text-xl'];

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

function IconArgument({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
    </svg>
  );
}

function Top5Stats({
  item,
  isHero,
  onVote,
  onArgue,
}: {
  item: Top5Item;
  isHero: boolean;
  onVote?: (itemId: string, type: 'like' | 'dislike') => void;
  onArgue?: (item: Top5Item) => void;
}) {
  const color = isHero ? 'text-gold' : '';
  const likeColor = isHero ? 'text-gold' : 'text-accent';
  const argColor = isHero ? 'text-gold' : 'text-muted';

  return (
    <div className={`flex items-center gap-3 sm:gap-4 shrink-0 ${color}`}>
      <button
        type="button"
        onClick={() => onVote?.(item.id, 'like')}
        className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${likeColor}`}
        aria-label={`Lit: ${item.like_count}`}
      >
        <span className="text-sm shrink-0" aria-hidden>
          🔥
        </span>
        <span className="font-display text-sm tabular-nums">{formatCount(item.like_count)}</span>
        <span className={`top5-stat-label hidden sm:inline ${isHero ? 'text-gold/80' : 'text-accent/80'}`}>
          Lit
        </span>
      </button>

      <button
        type="button"
        onClick={() => onVote?.(item.id, 'dislike')}
        className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${likeColor}`}
        aria-label={`Cringe: ${item.dislike_count}`}
      >
        <span className="text-sm shrink-0" aria-hidden>
          😬
        </span>
        <span className="font-display text-sm tabular-nums">{formatCount(item.dislike_count)}</span>
        <span className={`top5-stat-label hidden sm:inline ${isHero ? 'text-gold/80' : 'text-accent/80'}`}>
          Cringe
        </span>
      </button>

      <button
        type="button"
        onClick={() => onArgue?.(item)}
        className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${argColor}`}
      >
        <IconArgument className="shrink-0" />
        <span className="font-display text-sm tabular-nums">{formatCount(item.argument_count)}</span>
        <span className={`top5-stat-label hidden sm:inline ${isHero ? 'text-gold/80' : 'text-muted'}`}>
          Arguments
        </span>
      </button>
    </div>
  );
}

export function Top5Display({ items, editable, onVote, onArgue, showVotes = true }: Props) {
  const sorted = [...items].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-0">
      <h2 className="font-serif text-2xl sm:text-3xl text-gold mb-4 tracking-wide">Top 5</h2>

      <div className="space-y-0">
        {sorted.map((item, i) => {
          const isHero = item.position === 1;

          return (
            <motion.div
              key={item.id}
              whileHover={{ x: editable ? 0 : 1 }}
              className={
                isHero
                  ? 'top5-pick-one px-3 sm:px-4 py-3 sm:py-4 mb-3'
                  : `flex items-center gap-2 sm:gap-4 min-h-[56px] py-3 ${
                      i < sorted.length - 1 ? 'border-b border-white/8' : ''
                    }`
              }
            >
              <div className={`flex items-center gap-2 sm:gap-4 w-full ${isHero ? 'flex-wrap sm:flex-nowrap' : ''}`}>
                <div className="w-12 sm:w-14 shrink-0 flex items-center justify-center">
                  <span
                    className={`font-serif leading-none ${
                      isHero ? 'text-gold ' + rankSizes[0] : 'text-accent ' + rankSizes[i]
                    }`}
                  >
                    {item.position}
                  </span>
                </div>

                <div className={`flex-1 min-w-0 ${isHero ? 'py-0.5' : 'py-1'}`}>
                  <Link
                    to={`/artists/${item.artist.id}`}
                    className={`font-serif hover:opacity-80 transition-opacity truncate block ${
                      isHero
                        ? 'text-xl sm:text-2xl text-gold'
                        : 'text-lg sm:text-xl text-off-white'
                    }`}
                  >
                    {item.artist.name}
                  </Link>
                  {item.artist.rating != null && (
                    <p className={`text-xs mt-0.5 font-display tracking-wider ${isHero ? 'text-gold/70' : 'text-muted'}`}>
                      ★ {item.artist.rating}
                    </p>
                  )}
                </div>

                {isHero && (
                  <div className="hidden sm:flex w-10 h-10 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold text-lg">
                    🏆
                  </div>
                )}

                {showVotes && !editable && (
                  <div className={`${isHero ? 'w-full sm:w-auto mt-2 sm:mt-0' : ''}`}>
                    <Top5Stats item={item} isHero={isHero} onVote={onVote} onArgue={onArgue} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
