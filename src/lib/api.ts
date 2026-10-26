import { supabase } from './supabase';
import type { BoardData, Kind } from '../types';

export function messageFrom(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    if (code === '42501' || /row-level security/i.test(error.message)) {
      return 'That day is locked.';
    }
    return error.message;
  }
  return 'Something went wrong.';
}

export async function fetchBoard(pairId: string): Promise<BoardData> {
  const [pair, participants, tracks, offers, checks] = await Promise.all([
    supabase.from('pairs').select('*').eq('id', pairId).single(),
    supabase.from('participants').select('*').eq('pair_id', pairId).order('seat'),
    supabase.from('tracks').select('*').eq('pair_id', pairId).order('created_at'),
    supabase.from('offers').select('*').eq('pair_id', pairId).eq('status', 'pending').order('created_at'),
    supabase.from('checks').select('*').eq('pair_id', pairId),
  ]);

  const failure = pair.error || participants.error || tracks.error || offers.error || checks.error;
  if (failure) throw failure;
  if (!pair.data || !participants.data || !tracks.data || !offers.data || !checks.data) {
    throw new Error('The board did not load.');
  }

  return {
    pair: pair.data,
    participants: participants.data,
    tracks: tracks.data,
    offers: offers.data,
    checks: checks.data,
  };
}

export async function createPair(displayName: string, timezone: string) {
  const { error } = await supabase.rpc('create_pair', {
    p_display_name: displayName,
    p_timezone: timezone,
  });
  if (error) throw error;
}

export async function joinPair(inviteCode: string, displayName: string) {
  const { error } = await supabase.rpc('join_pair', {
    p_invite_code: inviteCode,
    p_display_name: displayName,
  });
  if (error) throw error;
}

export async function proposeTrack(input: { name: string; kind: Kind; gain: number; loss: number }) {
  const { error } = await supabase.rpc('propose_track', {
    p_name: input.name,
    p_kind: input.kind,
    p_gain: input.gain,
    p_loss: input.loss,
  });
  if (error) throw error;
}

export async function respondToOffer(
  offerId: string,
  action: 'accept' | 'decline' | 'counter' | 'withdraw',
  points?: { gain: number; loss: number },
) {
  const { error } = await supabase.rpc('respond_offer', {
    p_offer_id: offerId,
    p_action: action,
    p_gain: points?.gain ?? null,
    p_loss: points?.loss ?? null,
  });
  if (error) throw error;
}
