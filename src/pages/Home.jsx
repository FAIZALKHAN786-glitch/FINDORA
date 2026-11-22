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
    <div className="space-y-8">
      <section className="grid items-end gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="animate-rise">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            <span className="h-px w-6 bg-accent" /> Campus noticeboard
          </p>
          <h1 className="max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-ink sm:text-5xl">
            Lost something? <span className="text-accent">It might be here.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            A small board for the things that slip between lecture halls, library desks and bus stops. Browse what neighbours have found — or post what you have lost.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate(user ? '/report' : '/login')}>
              <Icon name="plus" className="h-4 w-4" /> Report an item
            </Button>
            {!user && <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>Create an account</Button>}
          </div>
        </div>

        <Card className="animate-rise p-5 [animation-delay:80ms]">
          <h2 className="text-sm font-bold tracking-tight text-ink">How the board works</h2>
          <ol className="mt-4 space-y-3.5">
            {[
              ['1', 'Search the board', 'Look by title, location or category.'],
              ['2', 'Contact the poster', 'Use the email or phone shown on the notice.'],
              ['3', 'Close the loop', 'The poster marks it claimed when it is back.'],
            ].map(([step, title, description]) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">{step}</span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                  <span className="block text-xs leading-relaxed text-muted">{description}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_160px]">
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
        <div className="mb-4 flex items-center justify-between gap-3">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                className="[animation-delay:var(--delay)]"
                onClick={() => navigate(`/item/${item.id}`)}
                style={{ '--delay': `${Math.min(index, 6) * 35}ms` }}
              />
            ))}
          </div>
        )}
      </section>

      {(query || category !== 'all' || status !== 'all') && (
        <p className="text-center text-sm text-muted">
          <button onClick={clearFilters} className="font-semibold text-accent underline underline-offset-4">Clear all filters</button>
        </p>
      )}
    </div>
  );
}
