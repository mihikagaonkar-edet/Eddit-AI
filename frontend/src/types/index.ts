export interface Artist {
  id: string;
  name: string;
  rating?: number | null;
  billboard_top_10?: number | null;
  billboard_number_1?: number | null;
  albums_sold?: number | null;
  singles_sold?: number | null;
  avg_songs_per_year?: number | null;
  awards?: number | null;
  youtube_views?: number | null;
  spotify_monthly_listeners?: number | null;
}

export interface Top5ItemPeople {
  position: number;
  artist: Artist;
}

export interface UserPeopleItem {
  id: string;
  name: string;
  username: string;
  city?: string | null;
  profile_image_url?: string | null;
  current_team_artist?: Artist | null;
  top5_items: Top5ItemPeople[];
  like_count: number;
  dislike_count: number;
  my_vote?: 'like' | 'dislike' | null;
}

export interface User {
  id: string;
  name: string;
  username: string;
  city?: string | null;
  profile_image_url?: string | null;
  current_team_artist?: Artist | null;
  created_at?: string;
}

export interface Top5Item {
  id: string;
  position: number;
  artist: Artist;
  like_count: number;
  dislike_count: number;
  argument_count: number;
}

export interface Top5 {
  id: string;
  items: Top5Item[];
  updated_at: string;
}

export interface Video {
  id: string;
  storage_path: string;
  thumbnail_path?: string | null;
  duration_seconds?: number | null;
}

export interface Argument {
  id: string;
  author: User;
  target_type: string;
  target_id: string;
  text_content?: string | null;
  parent_argument_id?: string | null;
  video?: Video | null;
  reply_count: number;
  created_at: string;
}

export interface HomeFeed {
  trending_top5s: Top5[];
  most_debated_artists: Artist[];
  fastest_growing_teams: Artist[];
  featured_profiles: User[];
  recent_arguments: Argument[];
}

export interface Rankings {
  top_artists: Artist[];
  top_teams: Artist[];
  most_debated_artists: Artist[];
  most_liked_artists: Artist[];
  most_disliked_artists: Artist[];
  most_active_fans: User[];
}

export interface TeamStats {
  artist: Artist;
  member_count: number;
  newest_members: User[];
  recent_arguments: Argument[];
  team_rank?: number | null;
}

export interface ArtistStats {
  artist: Artist;
  team_member_count: number;
  most_common_position?: number | null;
  top_supporters: User[];
  recent_arguments: Argument[];
  most_liked_placements: { position: number; vote_count: number }[];
  most_disliked_placements: { position: number; vote_count: number }[];
}

export interface SearchResults {
  artists: Artist[];
  users: User[];
  teams: Artist[];
}
