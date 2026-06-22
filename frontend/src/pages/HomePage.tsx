import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';
import { PersonCard } from '../components/PersonCard';
import { useAuth } from '../context/AuthContext';
import type { Artist, HomeFeed, UserPeopleItem } from '../types';

const FEATURED_TEAM_NAMES = ['Drake', 'Beyoncé', 'Taylor Swift', 'Eminem', 'Rihanna'];

const SAMPLE_FEED = [
  'Mike joined Team Drake',
  'Sarah moved Kendrick to #1',
  'Jamal added 50 Cent to his Top 5',
  'Team Beyoncé gained 42 fans today',
];

const SAMPLE_DEBATES = [
  'No way Drake is over Wayne.',
  'Beyoncé belongs top 3 easy.',
  'This list needs 50 Cent.',
];

function findArtist(artists: Artist[], ...candidates: string[]): Artist | undefined {
  for (const name of candidates) {
    const needle = name.toLowerCase();
    const hit = artists.find(
      (a) =>
        a.name.toLowerCase() === needle ||
        a.name.toLowerCase().includes(needle) ||
        needle.includes(a.name.toLowerCase())
    );
    if (hit) return hit;
  }
  return undefined;
}

function buildFeedLines(home: HomeFeed | undefined, people: UserPeopleItem[]): string[] {
  const lines: string[] = [];

  for (const user of home?.featured_profiles ?? []) {
    if (user.current_team_artist && lines.length < 4) {
      lines.push(`${user.name} joined Team ${user.current_team_artist.name}`);
    }
  }

  for (const person of people) {
    if (lines.length >= 4) break;
    const hero = person.top5_items.find((i) => i.position === 1);
    if (hero) {
      lines.push(`${person.name} has ${hero.artist.name} at #1`);
    }
  }

  for (const artist of home?.fastest_growing_teams ?? []) {
    if (lines.length >= 4) break;
    lines.push(`Team ${artist.name} is gaining momentum`);
  }

  for (const arg of home?.recent_arguments ?? []) {
    if (lines.length >= 4) break;
    if (arg.text_content?.trim()) {
      const snippet =
        arg.text_content.length > 60 ? `${arg.text_content.slice(0, 57)}...` : arg.text_content;
      lines.push(`${arg.author.name}: ${snippet}`);
    }
  }

  if (lines.length === 0) return SAMPLE_FEED;
  while (lines.length < 4) {
    lines.push(SAMPLE_FEED[lines.length % SAMPLE_FEED.length]);
  }
  return lines.slice(0, 4);
}

function SectionHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <p className="draft-label">{label}</p>
      <h2 className="font-headline text-4xl sm:text-5xl text-off-white mt-1 tracking-wide">{title}</h2>
      {description && <p className="text-muted text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">{description}</p>}
    </div>
  );
}

export function HomePage() {
  const { user } = useAuth();

  const { data: home, isLoading: homeLoading } = useQuery({
    queryKey: ['home'],
    queryFn: api.getHome,
  });

  const { data: rankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ['rankings'],
    queryFn: api.getRankings,
  });

  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: api.getPeople,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
  });

  const featuredTeams = useMemo(() => {
    const picked: Artist[] = [];
    for (const name of FEATURED_TEAM_NAMES) {
      const artist = findArtist(teams, name);
      if (artist && !picked.some((p) => p.id === artist.id)) picked.push(artist);
    }
    if (picked.length < 5) {
      for (const team of rankings?.top_teams ?? teams) {
        if (picked.length >= 5) break;
        if (!picked.some((p) => p.id === team.id)) picked.push(team);
      }
    }
    return picked.slice(0, 5);
  }, [teams, rankings?.top_teams]);

  const teamStatsQueries = useQueries({
    queries: featuredTeams.map((team) => ({
      queryKey: ['team', team.id, 'home'],
      queryFn: () => api.getTeam(team.id),
      staleTime: 60_000,
    })),
  });

  const feedLines = useMemo(() => buildFeedLines(home, people), [home, people]);

  const recentJoiners = useMemo(() => {
    const featured = home?.featured_profiles ?? [];
    return featured
      .slice(0, 2)
      .map((profile) => people.find((p) => p.username === profile.username))
      .filter((p): p is UserPeopleItem => !!p);
  }, [home?.featured_profiles, people]);

  const topRated = useMemo(() => {
    const artists = rankings?.top_artists ?? [];
    if (artists.length >= 4) return artists.slice(0, 4);
    return artists;
  }, [rankings?.top_artists]);

  const debateLines = useMemo(() => {
    const fromApi =
      home?.recent_arguments
        ?.map((a) => a.text_content?.trim())
        .filter((t): t is string => !!t)
        .slice(0, 3) ?? [];
    if (fromApi.length >= 3) return fromApi;
    return [...fromApi, ...SAMPLE_DEBATES].slice(0, 3);
  }, [home?.recent_arguments]);

  const isLoading = homeLoading || rankingsLoading;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-16 space-y-20">
      {/* 1. Hero */}
      <section className="relative stage-hero px-6 py-14 sm:px-10 sm:py-20 text-center">
        <div className="relative z-10">
          <p className="draft-label mb-3 flex items-center justify-center gap-2">
            <span className="live-dot" aria-hidden />
            Eddit AI
          </p>
          <h1 className="font-headline text-5xl sm:text-6xl lg:text-7xl text-off-white leading-none tracking-wide">
            Your Top 5 Says Everything
          </h1>
          <p className="text-muted text-base sm:text-lg mt-4 max-w-xl mx-auto">
            Build your music identity. Join one artist team. Debate the rankings.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link
              to={user ? '/profile?edit=top5' : '/signup'}
              className="btn-primary px-6 py-3 text-sm font-semibold"
            >
              {user ? 'Edit My Top 5' : 'Create My Top 5'}
            </Link>
            <Link to="/artists" className="btn-ghost px-6 py-3 text-sm font-semibold">
              Browse Artists
            </Link>
          </div>
          <p className="text-xs text-muted mt-6">
            New Eddit Ratings drop every Monday at 7 PM EST.
          </p>
        </div>
      </section>

      {/* 2. Live Fandom Feed */}
      <section>
        <SectionHeader label="Live" title="What's Happening Right Now" />
        <div className="grid sm:grid-cols-2 gap-3">
          {feedLines.map((line, i) => (
            <motion.div
              key={`${line}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="draft-card-row px-4 py-4 flex items-start gap-3"
            >
              <span className="live-dot mt-1.5" aria-hidden />
              <p className="text-sm sm:text-base text-off-white/90 leading-snug">{line}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. Top 5 Spotlight */}
      <section>
        <SectionHeader label="Spotlight" title="Top 5 Spotlight" />
        {recentJoiners.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-3 max-w-4xl">
            {recentJoiners.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">No profiles yet — be the first to join.</p>
        )}
      </section>

      {/* 4. Team War */}
      <section>
        <SectionHeader
          label="Allegiance"
          title="Pick A Side"
          description="You can like every artist. You can only represent one team."
        />
        {isLoading && featuredTeams.length === 0 ? (
          <p className="text-muted">Loading teams...</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {featuredTeams.map((team, i) => {
              const stats = teamStatsQueries[i]?.data;
              const fanCount = stats?.member_count;
              return (
                <div key={team.id} className="team-war-card">
                  <ArtistAvatar name={team.name} size="xl" />
                  <p className="font-display text-lg text-accent mt-4 tracking-wide">
                    Team {team.name}
                  </p>
                  <p className="text-muted text-xs mt-1 font-display tracking-wider">
                    {fanCount != null
                      ? `${fanCount.toLocaleString()} fan${fanCount === 1 ? '' : 's'}`
                      : team.rating != null
                        ? `★ ${team.rating}`
                        : 'Join the movement'}
                  </p>
                  <Link
                    to={user ? `/teams/${team.id}` : '/login'}
                    className="mt-4 w-full btn-primary py-2 text-xs font-semibold"
                  >
                    Join Team
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Weekly Ratings */}
      <section>
        <SectionHeader
          label="Weekly drop"
          title="Eddit Ratings"
          description="Updated every Monday at 7 PM EST based on Top 5 placements, team growth, likes, dislikes, comments, and fan momentum."
        />
        {isLoading && topRated.length === 0 ? (
          <p className="text-muted">Loading ratings...</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {(topRated.length > 0
                ? topRated
                : [
                    { id: '1', name: 'Drake', rating: 97 },
                    { id: '2', name: 'Taylor Swift', rating: 97 },
                    { id: '3', name: 'Beyoncé', rating: 96 },
                    { id: '4', name: 'Rihanna', rating: 95 },
                  ]
              ).map((artist, i) => (
                <Link
                  key={artist.id}
                  to={`/artists/${artist.id}`}
                  className={`flex items-center justify-between p-4 transition-colors hover:border-accent/30 ${
                    i === 0 ? 'draft-card-hero' : 'draft-card-row'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`rank-num text-2xl w-8 shrink-0 ${i === 0 ? 'text-gold' : 'text-muted'}`}>
                      {i + 1}
                    </span>
                    <ArtistAvatar name={artist.name} size="md" />
                    <span className="font-serif text-lg sm:text-xl truncate">{artist.name}</span>
                  </div>
                  <span className="rank-num text-3xl sm:text-4xl text-gold tabular-nums shrink-0 ml-3">
                    {artist.rating ?? '—'}
                  </span>
                </Link>
              ))}
            </div>
            <Link to="/rankings" className="btn-ghost px-5 py-2.5 text-sm font-semibold inline-block">
              See Full Ratings
            </Link>
          </>
        )}
      </section>

      {/* 6. Debate */}
      <section>
        <SectionHeader
          label="Arguments"
          title="Debate The Top 5"
          description="Comment, like, dislike, and challenge other fans' lists."
        />
        <div className="space-y-3 mb-6">
          {debateLines.map((quote, i) => (
            <blockquote key={`${quote}-${i}`} className="debate-quote">
              <p className="font-serif text-lg text-off-white/95 italic leading-relaxed">
                &ldquo;{quote}&rdquo;
              </p>
            </blockquote>
          ))}
        </div>
        <Link to="/people" className="btn-ghost px-5 py-2.5 text-sm font-semibold inline-block">
          Browse Top 5s
        </Link>
      </section>
    </div>
  );
}
