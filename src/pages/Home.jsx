import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useNavigate } from '../lib/navigation.js';
import { useDebouncedValue } from '../lib/useDebouncedValue.js';
import { useVisibilityRefresh } from '../lib/useVisibilityRefresh.js';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import Input from '../components/Input.jsx';
import ItemCard from '../components/ItemCard.jsx';
import Select from '../components/Select.jsx';
import Spinner from '../components/Spinner.jsx';

const CATEGORIES = ['Books', 'Electronics', 'Clothing', 'Keys', 'ID & Documents', 'Bags', 'Other'];
const TILTS = [-1.2, 0.9, -0.6, 1.1, -0.9, 0.6];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedQuery = useDebouncedValue(query);

  const load = useCallback(async () => {
    try {
      setError('');
      setItems(await api.listItems({ q: debouncedQuery, category, status }));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, category, status]);

  useEffect(() => { load(); }, [load]);
  useVisibilityRefresh(load);

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setStatus('all');
  };

  return (
    <div className="space-y-10">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-rise">
          <p className="mb-4 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-clay">
            <span className="h-px w-7 bg-clay" /> Findora · lost &amp; found
          </p>
          <h1 className="max-w-xl text-balance text-5xl font-extrabold leading-[1.02] tracking-[-0.055em] text-ink sm:text-6xl">
            It’s here <span className="relative inline-block text-clay">somewhere.<svg viewBox="0 0 240 12" className="absolute -bottom-2 left-0 w-full" aria-hidden="true"><path d="M3 8c55-7 125-8 234-3" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="5" strokeLinecap="round" /></svg></span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted">
            A quiet place for the things that wander off between lecture halls, library desks and bus stops. Browse open notices or pin your own.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate(user ? '/report' : '/login')}>
              <Icon name="plus" className="h-4 w-4" /> Report an item
            </Button>
            {!user && <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>Create an account</Button>}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted">
            {['Search the board', 'Contact the poster', 'Close the loop'].map((step, index) => (
              <span key={step} className="inline-flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-[10px] font-bold text-ink">{index + 1}</span>
                {step}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md animate-rise [animation-delay:80ms]" aria-hidden="true">
          <div className="absolute -left-5 top-10 h-24 w-24 rounded-full border border-dashed border-line" />
          <div className="absolute -right-4 -top-5 h-16 w-16 rotate-12 rounded-2xl bg-clay-soft" />
          <div className="relative rotate-[2deg] rounded-card border border-line bg-surface p-5 shadow-lift paper-grain">
            <div className="flex items-center justify-between border-b border-dashed border-line pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-[13px] font-extrabold text-white">F</span>
                <span className="text-sm font-extrabold tracking-tight">FOUND</span>
              </div>
              <span className="rounded-full border border-clay/20 bg-clay-soft px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-clay">Today</span>
            </div>
            <div className="mt-4 h-40 rounded-notice bg-[repeating-linear-gradient(135deg,#e9e7e0,#e9e7e0_10px,#f1efe9_10px,#f1efe9_20px)]" />
            <p className="mt-4 text-base font-bold tracking-tight">Blue water bottle</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Left on the library desk. Unmistakable dent on the cap.</p>
            <div className="mt-4 flex items-center gap-2 border-t border-dashed border-line pt-3 text-xs text-muted">
              <Icon name="pin" className="h-3.5 w-3.5 text-clay" /> Library, 2nd floor
            </div>
          </div>
          <div className="absolute -bottom-7 -left-6 w-44 -rotate-6 rounded-notice border border-line bg-surface p-3 shadow-card">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Lost</p>
            <p className="mt-1 text-sm font-bold">Campus card</p>
            <div className="mt-2 h-8 rounded-md bg-paper" />
          </div>
        </div>
      </section>

      <Card className="p-4 paper-grain relative sm:p-5">
        <div className="relative grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_160px]">
          <Input
            label="Search"
            aria-label="Search listings"
            placeholder="Try “keys”, “library”, “backpack”…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((name) => <option key={name} value={name}>{name}</option>)}
          </Select>
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
            <option value="claimed">Claimed</option>
            <option value="returned">Returned</option>
          </Select>
        </div>
      </Card>

      <section aria-labelledby="results-heading">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="results-heading" className="text-lg font-bold tracking-tight text-ink" role="status" aria-live="polite">
            {loading ? 'Looking…' : `${items.length} ${items.length === 1 ? 'notice' : 'notices'}`}
          </h2>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <Icon name="arrow" className="h-4 w-4 rotate-[-90deg]" /> Refresh
          </Button>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
            <span>{error}</span>
            <Button variant="danger" size="sm" onClick={load}>Try again</Button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center"><Spinner label="Loading notices" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing on the board yet"
            description="Try a different search or clear the filters. If your search came up empty, be the first to post a notice."
            action={<Button onClick={user ? () => navigate('/report') : () => navigate('/login')}>Post a notice</Button>}
          />
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/item/${item.id}`)}
                style={{ '--delay': `${Math.min(index, 6) * 35}ms`, '--tilt': `${TILTS[index % TILTS.length]}deg` }}
              />
            ))}
          </div>
        )}
      </section>

      {(query || category !== 'all' || status !== 'all') && (
        <p className="text-center text-sm text-muted">
          <button onClick={clearFilters} className="font-semibold text-clay underline underline-offset-4">Clear all filters</button>
        </p>
      )}
    </div>
  );
}
