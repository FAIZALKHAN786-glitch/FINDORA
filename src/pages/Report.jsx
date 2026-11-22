import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useNavigate } from '../lib/navigation.js';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import Input from '../components/Input.jsx';
import Select from '../components/Select.jsx';
import Textarea from '../components/Textarea.jsx';

const CATEGORIES = ['Books', 'Electronics', 'Clothing', 'Keys', 'ID & Documents', 'Bags', 'Other'];
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;

export default function Report() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    status: 'lost',
    category: 'Other',
    title: '',
    location: '',
    lost_found_date: new Date().toISOString().slice(0, 10),
    description: '',
    reporter_phone: '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const onFile = (event) => {
    const selected = event.target.files?.[0] || null;
    setError('');
    if (selected && !ALLOWED.includes(selected.type)) {
      setError('Please choose a JPG, PNG, WEBP or GIF image.');
      event.target.value = '';
      return;
    }
    if (selected && selected.size > MAX_FILE_SIZE) {
      setError('That image is larger than 5 MB.');
      event.target.value = '';
      return;
    }
    setFile(selected);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!user) return;
    setError('');
    if (form.title.trim().length < 2 || form.title.trim().length > 120) return setError('Title must be 2–120 characters.');
    if (form.description.length > 1000) return setError('Description must be under 1000 characters.');
    if (form.location.length > 200) return setError('Location must be under 200 characters.');
    if (form.reporter_phone && !PHONE_RE.test(form.reporter_phone.trim())) return setError('Enter a valid phone number.');

    setBusy(true);
    try {
      await api.createItem({ ...form, photo: file });
      navigate('/my-items');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon="user"
        title="Sign in to post a notice"
        description="Your notice needs a name behind it. Creating an account takes a few seconds and stays on this machine."
        action={<Button onClick={() => navigate('/login')}>Sign in or sign up</Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="animate-rise">
        <p className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-clay"><span className="h-px w-6 bg-clay" /> New notice</p>
        <h1 className="text-balance text-4xl font-extrabold tracking-[-0.045em] text-ink sm:text-5xl">Report an item</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">Give the next person enough detail to recognise it. A photo helps more than anything else.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="paper-grain relative animate-rise p-5 sm:p-6 [animation-delay:60ms]">
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="This item is…" value={form.status} onChange={(event) => set('status', event.target.value)}>
                <option value="lost">Lost — I am missing it</option>
                <option value="found">Found — I have it</option>
              </Select>
              <Select label="Category" value={form.category} onChange={(event) => set('category', event.target.value)}>
                {CATEGORIES.map((name) => <option key={name} value={name}>{name}</option>)}
              </Select>
            </div>

            <Input label="Title" placeholder="e.g. Black backpack with laptop" value={form.title} onChange={(event) => set('title', event.target.value)} maxLength={120} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Where" placeholder="e.g. Library, 3rd floor" value={form.location} onChange={(event) => set('location', event.target.value)} maxLength={200} />
              <Input label="When" type="date" value={form.lost_found_date} onChange={(event) => set('lost_found_date', event.target.value)} />
            </div>
            <Textarea
              label="Identifying details"
              hint="Brand, colour, marks, what was inside — anything that makes it unmistakable."
              placeholder="Blue cover, name written inside the front page…"
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
              maxLength={1000}
            />
            <Input label="Phone number (optional)" type="tel" placeholder="555-0100" value={form.reporter_phone} onChange={(event) => set('reporter_phone', event.target.value)} />

            <div className="space-y-2">
              <label htmlFor="photo" className="block text-sm font-semibold text-ink">Photo (optional)</label>
              <div className="flex flex-wrap items-center gap-4 rounded-notice border border-dashed border-clay/30 bg-paper/70 p-4">
                <input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onFile}
                  className="max-w-full text-xs text-muted file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-clay-soft file:px-3 file:text-sm file:font-semibold file:text-clay hover:file:bg-clay/15"
                />
                <span className="text-xs text-muted">JPG, PNG, WEBP or GIF · up to 5 MB</span>
              </div>
              {preview && <img src={preview} alt="Selected photo preview" className="mt-3 h-40 w-full rounded-xl border border-line object-cover" />}
            </div>

            <div aria-live="polite" className="min-h-5">
              {error && <p role="alert" className="flex items-center gap-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger"><Icon name="close" className="h-4 w-4" /> {error}</p>}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-line pt-5">
              <Button type="submit" size="lg" disabled={busy}>{busy ? 'Posting…' : 'Post notice'}</Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/')} disabled={busy}>Cancel</Button>
            </div>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card className="paper-grain relative p-5">
            <h2 className="text-sm font-bold text-ink">Before you post</h2>
            <ul className="mt-3 space-y-3 text-xs leading-relaxed text-muted">
              <li className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Check the board first — it may already be listed.</li>
              <li className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Leave a phone number if you want a quick call.</li>
              <li className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Mark it claimed once it is back with its owner.</li>
            </ul>
          </Card>
          <div className="rounded-card border border-dashed border-clay/25 bg-clay-soft/60 p-5 text-xs leading-relaxed text-ink/70">
            <Icon name="shield" className="mb-2 h-5 w-5 text-clay" />
            Your contact details appear only on your notice. Nothing is emailed or stored anywhere else.
          </div>
        </aside>
      </div>
    </div>
  );
}
