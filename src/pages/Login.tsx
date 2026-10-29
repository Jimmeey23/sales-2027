import React, { useState } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { post } from '../api';
import type { User } from '../types';
import BrandMark from '../components/BrandMark';
import { Button, Field, Input } from '../components/ui';

export default function Login({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onSignedIn((await post<{ user: User }>('/auth/login', { email, password })).user);
    } catch (err: any) {
      setError(err.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="login-brand-mark">
          <BrandMark large />
          <span>Physique 57 · India</span>
        </div>
        <div className="login-brand-copy">
          <p className="login-eyebrow">Commercial OS</p>
          <h1>
            The 2027 sales <em>plan</em>, in one room.
          </h1>
          <p>
            Targets, offers, campaigns and studio evidence — held together for Kemps Corner, Bandra, Kenkere House and
            the Pop-up programme.
          </p>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <h2>Sign in</h2>
          <p>Use the studio workspace account issued to you.</p>
          <form onSubmit={submit}>
            {error && (
              <div className="form-alert" role="alert">
                {error}
              </div>
            )}
            <Field label="Email" required>
              <Input
                type="email"
                autoComplete="username"
                placeholder="you@physique57.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Enter workspace'}
              {!busy && <ArrowRight size={15} />}
            </Button>
          </form>
          <p className="login-note">
            <Lock size={12} aria-hidden="true" /> Accounts and passwords are managed by an administrator
            <span aria-hidden="true"> · </span>
            <code>npm run user</code>
          </p>
        </div>
      </section>
    </main>
  );
}
