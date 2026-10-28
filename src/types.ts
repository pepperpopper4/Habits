export type Kind = 'habit' | 'vice';

export type Visibility = 'private' | 'public';

export type ScoringMode = 'raw' | 'capped';

export type Pair = {
  id: string;
  goal: number;
  notes: string;
  title: string;
  timezone: string;
  invite_code: string;
  scoring: ScoringMode;
  daily_max: number;
  prize: string;
  created_at: string;
};

export type Membership = {
  participant: Participant;
  pair: Pair;
};

export type Participant = {
  id: string;
  pair_id: string;
  user_id: string;
  display_name: string;
  seat: number;
};

export type OfferStatus = 'pending' | 'accepted' | 'declined';

export type Offer = {
  id: string;
  pair_id: string;
  proposer_id: string;
  awaiting_id: string | null;
  countered_by: string | null;
  name: string;
  kind: Kind;
  gain: number;
  loss: number;
  status: OfferStatus;
  created_at: string;
};

export type Track = {
  id: string;
  pair_id: string;
  owner_id: string;
  offer_id: string | null;
  name: string;
  kind: Kind;
  gain: number;
  loss: number;
  starts_on: string;
  weekdays: number;
  visibility: Visibility;
  created_at: string;
};

export type Nudge = {
  id: string;
  pair_id: string;
  track_id: string;
  day: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
};

export type Check = {
  id: string;
  pair_id: string;
  track_id: string;
  day: string;
};

export type BoardData = {
  pair: Pair;
  participants: Participant[];
  tracks: Track[];
  offers: Offer[];
  checks: Check[];
  nudges: Nudge[];
};

export type FeedItem = {
  check_id: string;
  actor_id: string;
  actor_name: string;
  habit_name: string;
  kind: Kind;
  day: string;
  checked_at: string;
};

export type Standing = {
  user_id: string;
  display_name: string;
  kept: number;
  scheduled: number;
};

export type FriendCard = {
  user_id: string;
  display_name: string;
};

export type FriendRequest = FriendCard & {
  id: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'accepted';
};

export type Profile = {
  user_id: string;
  display_name: string;
};
