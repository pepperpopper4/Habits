export type Kind = 'habit' | 'vice';

export type Pair = {
  id: string;
  goal: number;
  notes: string;
  timezone: string;
  invite_code: string;
  created_at: string;
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
  awaiting_id: string;
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
};
