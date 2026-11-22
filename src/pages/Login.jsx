import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useNavigate } from '../lib/navigation.js';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import Input from '../components/Input.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { user, ready, signin, signup } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (ready && user) navigate('/'); }, [ready, user, navigate]);

  if (!ready || user) return <div className="py-24 text-center"><Spinner label="Opening the board" /></div>;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (mode === 'signup' && fullName.trim().length < 2) return setError('Enter your name.');

    setBusy(true);
    try {
      if (mode === 'signin') await signin({ email, password });
      else await signup({ email, password, fullName: fullName.trim() });
      navigate('/');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-8 py-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
      <div className="animate-rise">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent"><span className="h-px w-6 bg-accent" /> Your account</p>
        <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
          {mode === 'signin' ? 'Welcome back.' : 'Join the board.'}
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          {mode === 'signin'
            ? 'Sign in to post notices, contact other students and manage your listings.'
            : 'One small account, kept on this machine. No email verification, no third-party login.'}
        </p>
        <div className="mt-7 hidden max-w-sm space-y-3 lg:block">
          {['Post lost and found notices', 'Add a photo where it helps', 'Mark items claimed when returned'].map((line) => (
            <p key={line} className="flex items-center gap-2 text-sm text-muted"><Icon name="check" className="h-4 w-4 text-success" /> {line}</p>
          ))}
        </div>
      </div>

      <Card className="animate-rise p-6 sm:p-7 [animation-delay:60ms]">
        <div className="mb-5 flex rounded-xl bg-paper p-1" role="tablist" aria-label="Account mode">
          {[
            ['signin', 'Sign in'],
            ['signup', 'Create account'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => { setMode(value); setError(''); }}
              className={`min-h-10 flex-1 rounded-lg text-sm font-semibold transition-colors duration-150 ${mode === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === 'signup' && (
            <Input label="Full name" autoComplete="name" placeholder="Your name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          )}
          <Input label="Email" type="email" autoComplete="email" placeholder="you@student.edu" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} />

          <div aria-live="polite" className="min-h-5">
            {error && <p role="alert" className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="font-semibold text-accent underline underline-offset-4">
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </Card>
    </div>
  );
}
