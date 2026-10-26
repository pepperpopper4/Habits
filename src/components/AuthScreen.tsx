import { useState, type FormEvent } from 'react';
import { createPair, joinPair, messageFrom } from '../lib/api';
import { supabase } from '../lib/supabase';

type AuthProps = {
  onSignedIn: () => void;
};

type PairProps = {
  onJoined: () => void;
  onSignOut: () => void;
};

const CODE_ALPHABET = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;

export function SetupScreen() {
  return (
    <main className="shell">
      <section className="auth-card">
        <p className="brand">Habits</p>
        <h1>Connect a board</h1>
        <p className="help">
          Add your Supabase project URL and anon key to <code>.env.local</code>, then restart the app. The README lists the steps.
        </p>
      </section>
    </main>
  );
}

export function AuthScreen({ onSignedIn }: AuthProps) {
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (creating) {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
      setBusy(false);
      if (signUpError) {
        setError(messageFrom(signUpError));
        return;
      }
      if (!data.session) {
        setNotice('Check your email to confirm the account, or turn off email confirmation in the Supabase auth settings.');
        return;
      }
      onSignedIn();
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (signInError) {
      setError(messageFrom(signInError));
      return;
    }
    onSignedIn();
  }

  return (
    <main className="shell">
      <section className="auth-card">
        <p className="brand">Habits</p>
        <h1>{creating ? 'Create an account' : 'Sign in'}</h1>
        <form onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={creating ? 'new-password' : 'current-password'}
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          {notice ? <p className="help">{notice}</p> : null}
          <button type="submit" className="button primary wide" disabled={busy}>
            {creating ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <button type="button" className="text-button" onClick={() => setCreating((value) => !value)}>
          {creating ? 'Already have an account? Sign in' : 'Need an account? Create one'}
        </button>
      </section>
    </main>
  );
}

export function PairScreen({ onJoined, onSignOut }: PairProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 32) {
      setError('Name must be 1 to 32 characters.');
      return;
    }
    setBusy('create');
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      await createPair(clean, timezone);
      onJoined();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(null);
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 1 || cleanName.length > 32) {
      setError('Name must be 1 to 32 characters.');
      return;
    }
    if (code.length !== 6) {
      setError('Enter the 6-character invite code.');
      return;
    }
    setBusy('join');
    setError(null);
    try {
      await joinPair(code, cleanName);
      onJoined();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="shell">
      <section className="auth-card">
        <p className="brand">Habits</p>
        <h1>Start a board</h1>
        <form onSubmit={(event) => void create(event)}>
          <label className="field">
            <span>Your name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={32} required />
          </label>
          <button type="submit" className="button primary wide" disabled={busy !== null}>
            Create a board
          </button>
        </form>
        <p className="or">or join one</p>
        <form onSubmit={(event) => void join(event)}>
          <label className="field">
            <span>Invite code</span>
            <input
              className="code-input"
              value={code}
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(CODE_ALPHABET, '').slice(0, 6))}
            />
          </label>
          <button type="submit" className="button wide" disabled={busy !== null}>
            Join with a code
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className="text-button" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </main>
  );
}
