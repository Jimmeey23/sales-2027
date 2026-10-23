import React, { useState } from 'react';
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
        <BrandMark large />
        <p className="login-eyebrow">COMMERCIAL OS</p>
        <h1>
          P57 Sales Plan <em>workspace</em>
        </h1>
        <p>Targets, offers, campaigns and studio evidence in one place.</p>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <h2>Sign in</h2>
          <p className="muted">Use your studio workspace account.</p>
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
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="login-note">Accounts and passwords are managed by an administrator (npm run user).</p>
        </div>
      </section>
    </main>
  );
}
