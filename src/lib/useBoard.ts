import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBoard } from './api';
import { supabase } from './supabase';
import type { BoardData } from '../types';

export function useBoard(pairId: string) {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++loadId.current;
    try {
      const next = await fetchBoard(pairId);
      if (id !== loadId.current) return;
      setData(next);
      setError(null);
    } catch (err) {
      if (id !== loadId.current) return;
      setError(err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Could not load the board.');
    } finally {
      if (id === loadId.current) setLoading(false);
    }
  }, [pairId]);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    void reload();

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!stopped) void reload();
      }, 40);
    };

    const channel = supabase
      .channel(`pair-${pairId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pairs', filter: `id=eq.${pairId}` }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `pair_id=eq.${pairId}` }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks', filter: `pair_id=eq.${pairId}` }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers', filter: `pair_id=eq.${pairId}` }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checks', filter: `pair_id=eq.${pairId}` }, schedule)
      .subscribe();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [pairId, reload]);

  return { data, error, loading, reload, setData };
}
