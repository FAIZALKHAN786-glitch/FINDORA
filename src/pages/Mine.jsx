import React, { useCallback, useEffect, useState } from 'react';
import { api, photoUrl } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { formatDate } from '../lib/format.js';
import { useNavigate } from '../lib/navigation.js';
import { useVisibilityRefresh } from '../lib/useVisibilityRefresh.js';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusPill from '../components/StatusPill.jsx';

export default function Mine() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError('');
      const all = await api.listItems();
      setItems(all.filter((item) => item.reporter_id === user.id));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);
  useVisibilityRefresh(load);

  const remove = async (id) => {
    setBusy(id);
    setError('');
    try {
      await api.deleteItem(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setConfirming(null);
      setNotice('Notice deleted.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(null);
    }
  };

  if (!ready) return <div className="py-24 text-center"><Spinner label="Checking your account" /></div>;

  if (!user) {
    return (
      <EmptyState
        icon="user"
        title="Your listings live here"
        description="Sign in to see the notices you have posted and manage them."
        action={<Button onClick={() => navigate('/login')}>Sign in</Button>}
      />
    );
  }

  const open = items.filter((item) => ['lost', 'found'].includes(item.status)).length;

  return (
    <div className="space-y-7">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">Your notices</p>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-ink sm:text-4xl">My items</h1>
          <p className="mt-2 text-sm text-muted">{items.length} total · {open} still open</p>
        </div>
        <Button onClick={() => navigate('/report')}><Icon name="plus" className="h-4 w-4" /> New notice</Button>
      </div>

      <div aria-live="polite" className="min-h-5 space-y-2">
        {notice && <p className="rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-sm text-success">{notice}</p>}
        {error && <p role="alert" className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
      </div>

      {loading ? (
        <div className="py-20 text-center"><Spinner label="Loading your notices" /></div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="tag"
          title="No notices yet"
          description="When you report a lost or found item, it will show up here for you to manage."
          action={<Button onClick={() => navigate('/report')}>Report your first item</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const image = photoUrl(item.photo_url);
            const pending = confirming === item.id;
            return (
              <Card key={item.id} className="animate-rise overflow-hidden p-0">
                <button type="button" onClick={() => navigate(`/item/${item.id}`)} className="block w-full text-left" aria-label={`View ${item.title}`}>
                  <div className="flex h-32 items-center justify-center overflow-hidden border-b border-line bg-ink/[0.04]">
                    {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Icon name="tag" className="h-8 w-8 text-ink/20" />}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2"><StatusPill status={item.status} /><span className="text-[11px] text-muted">{formatDate(item.created_at)}</span></div>
                    <h2 className="line-clamp-1 text-[15px] font-bold text-ink">{item.title}</h2>
                    <p className="line-clamp-2 text-sm text-muted">{item.location || 'No location'}</p>
                  </div>
                </button>
                <div className="border-t border-line px-4 py-3">
                  {pending ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="danger" size="sm" onClick={() => remove(item.id)} disabled={busy === item.id}>{busy === item.id ? 'Deleting…' : 'Delete'}</Button>
                      <Button variant="secondary" size="sm" onClick={() => setConfirming(null)} disabled={busy === item.id}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => navigate(`/item/${item.id}`)} className="text-xs font-semibold text-accent underline underline-offset-4">View notice</button>
                      <button onClick={() => { setNotice(''); setConfirming(item.id); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-danger hover:bg-danger/5">
                        <Icon name="trash" className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
