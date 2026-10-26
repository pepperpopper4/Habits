import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthScreen, PairScreen, SetupScreen } from './components/AuthScreen';
import { Board } from './components/Board';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type { Participant } from './types';

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Participant | null | undefined>(undefined);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileVersion, setProfileVersion] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(session === undefined ? undefined : null);
      return;
    }
    let cancelled = false;
    setProfile(undefined);
    setProfileError(null);
    void supabase
      .from('participants')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setProfile(null);
          setProfileError(error.message);
          return;
        }
        setProfile(data);
      });
    return () => {
      cancelled = true;
    };
  }, [session, profileVersion]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!isSupabaseConfigured) return <SetupScreen />;
  if (session === undefined || (session && profile === undefined)) {
    return (
      <main className="shell">
        <p className="loading">Loading…</p>
      </main>
    );
  }
  if (!session) return <AuthScreen onSignedIn={() => setProfileVersion((value) => value + 1)} />;
  if (profileError) {
    return (
      <main className="shell">
        <section className="auth-card">
          <p className="error">{profileError}</p>
          <button type="button" className="button" onClick={() => setProfileVersion((value) => value + 1)}>
            Try again
          </button>
        </section>
      </main>
    );
  }
  if (!profile) {
    return <PairScreen onJoined={() => setProfileVersion((value) => value + 1)} onSignOut={() => void signOut()} />;
  }
  return <Board pairId={profile.pair_id} userId={session.user.id} onSignOut={() => void signOut()} />;
}
