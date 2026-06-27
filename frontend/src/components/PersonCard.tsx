import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TeamBadge } from './TeamBadge';
import { UserAvatar } from './UserAvatar';
import type { UserPeopleItem } from '../types';

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

interface Props {
  person: UserPeopleItem;
  onVote?: (userId: string, type: 'like' | 'dislike') => void;
}

export function PersonCard({ person, onVote }: Props) {
  const isLit = person.my_vote === 'like';
  const isCringe = person.my_vote === 'dislike';

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Link
        to={`/profile/${person.username}`}
        className="flex flex-col h-full draft-card p-4 block"
      >
        <div className="flex flex-col items-center text-center">
          <UserAvatar
            name={person.name}
            profileImageUrl={person.profile_image_url}
            size="md"
            variant="gold"
          />
          <p className="font-display text-sm mt-3 truncate w-full tracking-wide">{person.name}</p>
          <p className="text-muted text-xs truncate w-full">@{person.username}</p>
          {person.current_team_artist ? (
            <TeamBadge name={person.current_team_artist.name} className="mt-2 text-[9px] px-2 py-0.5" />
          ) : (
            <span className="mt-2 draft-label">No team</span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-white/8 flex-1">
          <p className="draft-label mb-2">Top 5</p>
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
                    className={`rank-num w-4 shrink-0 ${
                      item.position === 1 ? 'text-gold text-lg' : 'text-muted text-sm'
                    }`}
                  >
                    {item.position}
                  </span>
                  <span className="truncate font-medium">{item.artist.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-xs leading-tight">No Top 5 yet</p>
          )}
        </div>

        {onVote && (
          <div
            className="mt-3 pt-3 border-t border-white/8 flex items-center justify-center gap-4"
            onClick={(e) => e.preventDefault()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onVote(person.id, 'like');
              }}
              className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${
                isLit ? 'text-gold' : 'text-accent'
              }`}
              aria-label={`Lit: ${person.like_count}`}
            >
              <span className="text-sm shrink-0" aria-hidden>🔥</span>
              <span className="font-display text-sm tabular-nums">{formatCount(person.like_count)}</span>
              <span className="text-[10px] text-accent/80 hidden sm:inline">Lit</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onVote(person.id, 'dislike');
              }}
              className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${
                isCringe ? 'text-gold' : 'text-accent'
              }`}
              aria-label={`Cringe: ${person.dislike_count}`}
            >
              <span className="text-sm shrink-0" aria-hidden>😬</span>
              <span className="font-display text-sm tabular-nums">{formatCount(person.dislike_count)}</span>
              <span className="text-[10px] text-accent/80 hidden sm:inline">Cringe</span>
            </button>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
