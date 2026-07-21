from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.utils.names import format_artist_name


class ArtistBrief(BaseModel):
    id: UUID
    name: str
    rating: Optional[float] = None
    image_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def capitalize_name(cls, v: str) -> str:
        return format_artist_name(v)

    class Config:
        from_attributes = True


class ArtistDetail(ArtistBrief):
    billboard_top_10: Optional[int] = None
    billboard_number_1: Optional[int] = None
    albums_sold: Optional[int] = None
    singles_sold: Optional[int] = None
    singles_sold_uncapped: bool = False
    avg_songs_per_year: Optional[float] = None
    awards: Optional[int] = None
    platinum_albums: Optional[int] = None
    youtube_views: Optional[int] = None
    spotify_monthly_listeners: Optional[int] = None


class UserBrief(BaseModel):
    id: UUID
    name: str
    username: str
    city: Optional[str] = None
    profile_image_url: Optional[str] = None
    current_team_artist: Optional[ArtistBrief] = None

    class Config:
        from_attributes = True


class UserProfile(UserBrief):
    created_at: datetime


class Top5ItemPeople(BaseModel):
    position: int
    artist: ArtistBrief


class UserPeopleItem(BaseModel):
    id: UUID
    name: str
    username: str
    city: Optional[str] = None
    profile_image_url: Optional[str] = None
    current_team_artist: Optional[ArtistBrief] = None
    top5_items: list[Top5ItemPeople] = []
    like_count: int = 0
    dislike_count: int = 0
    my_vote: Optional[Literal["like", "dislike"]] = None


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    city: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class Top5ItemInput(BaseModel):
    artist_id: UUID
    position: int = Field(ge=1, le=5)


class Top5UpdateRequest(BaseModel):
    items: list[Top5ItemInput] = Field(min_length=5, max_length=5)


class Top5ItemResponse(BaseModel):
    id: UUID
    position: int
    artist: ArtistBrief
    like_count: int = 0
    dislike_count: int = 0
    argument_count: int = 0

    class Config:
        from_attributes = True


class Top5Response(BaseModel):
    id: UUID
    items: list[Top5ItemResponse]
    updated_at: datetime


class TeamJoinRequest(BaseModel):
    artist_id: UUID


class ArgumentCreate(BaseModel):
    target_type: Literal["profile", "top5", "top5_item", "artist"]
    target_id: UUID
    text_content: Optional[str] = None
    parent_argument_id: Optional[UUID] = None
    video_id: Optional[UUID] = None


class VideoResponse(BaseModel):
    id: UUID
    storage_path: str
    thumbnail_path: Optional[str] = None
    duration_seconds: Optional[int] = None

    class Config:
        from_attributes = True


class ArgumentResponse(BaseModel):
    id: UUID
    author: UserBrief
    target_type: str
    target_id: UUID
    text_content: Optional[str] = None
    parent_argument_id: Optional[UUID] = None
    video: Optional[VideoResponse] = None
    reply_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class VoteRequest(BaseModel):
    top5_item_id: UUID
    vote_type: Literal["like", "dislike"]


class SearchResults(BaseModel):
    artists: list[ArtistBrief]
    users: list[UserBrief]
    teams: list[ArtistBrief]


class TeamStats(BaseModel):
    artist: ArtistDetail
    member_count: int
    newest_members: list[UserBrief]
    recent_arguments: list[ArgumentResponse]
    team_rank: Optional[int] = None


class HomeFeed(BaseModel):
    trending_top5s: list[Top5Response]
    most_debated_artists: list[ArtistBrief]
    fastest_growing_teams: list[ArtistBrief]
    featured_profiles: list[UserProfile]
    recent_arguments: list[ArgumentResponse]


class RankingsResponse(BaseModel):
    top_artists: list[ArtistBrief]
    top_teams: list[ArtistBrief]
    most_debated_artists: list[ArtistBrief]
    most_liked_artists: list[ArtistBrief]
    most_disliked_artists: list[ArtistBrief]
    most_active_fans: list[UserBrief]
