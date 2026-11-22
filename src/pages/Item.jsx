import React, { useCallback, useEffect, useState } from 'react';
import { api, photoUrl } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { formatDate, titleCase } from '../lib/format.js';
import { useNavigate } from '../lib/navigation.js';
import { useVisibilityRefresh } from '../lib/useVisibilityRefresh.js';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusPill from '../components/StatusPill.jsx';

export default function Item({ id }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setItem(await api.getItem(id));
    } catch (cause) {
      setError(cause.message);
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useVisibilityRefresh(load);

  const claim = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await api.claimItem(id);
      setItem(updated);
      setNotice('Marked as claimed. Thank you for closing the loop.');
      setConfirming(false);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-24 text-center"><Spinner label="Opening notice" /></div>;

  if (!item) {
    return (
      <EmptyState
        icon="search"
        title="This notice is no longer here"
        description={error || 'It may have been deleted, or the link may be out of date.'}
        action={<Button onClick={() => navigate('/')}>Back to the board</Button>}
      />
    );
  }

  const image = photoUrl(item.photo_url);
  const mine = Boolean(user && item.reporter_id === user.id);
  const canClaim = mine && ['lost', 'found'].includes(item.status);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" onClick={() => navigate('/')} className="-ml-3">
        <Icon name="back" className="h-4 w-4" /> Back to the board
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="animate-rise overflow-hidden p-0 paper-grain">
          <div className="flex min-h-[280px] items-center justify-center bg-[#eceae4] sm:min-h-[420px]">
            {image
              ? <img src={image} alt={item.title} className="h-full max-h-[520px] w-full object-cover" />
              : <div className="flex flex-col items-center gap-3 py-20 text-ink/25"><Icon name="image" className="h-12 w-12" /><span className="text-sm">No photo attached</span></div>}
          </div>
        </Card>

        <div className="animate-rise space-y-5 [animation-delay:60ms]">
          <Card className="paper-grain relative p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusPill status={item.status} />
              <span className="text-xs text-muted">Posted {formatDate(item.created_at)}</span>
            </div>
            <h1 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-[-0.03em] text-ink">{item.title}</h1>
            <p className="mt-2 text-sm text-muted">Reported by {item.reporter_name || (mine ? 'you' : 'a campus member')}</p>

            <dl className="mt-6 grid gap-4 border-y border-line py-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Location</dt><dd className="mt-1 text-sm text-ink">{item.location || 'Not listed'}</dd></div>
              </div>
              <div className="flex gap-3">
                <Icon name="tag" className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Category</dt><dd className="mt-1 text-sm text-ink">{item.category}</dd></div>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <Icon name="calendar" className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Date</dt><dd className="mt-1 text-sm text-ink">{item.lost_found_date ? formatDate(item.lost_found_date) : 'Not listed'}</dd></div>
              </div>
            </dl>

            <div className="mt-5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">Details</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{item.description || 'No further details were added.'}</p>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-sm font-bold text-ink">Reach the poster</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">Contact details are shown only on this notice.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.reporter_email && (
                <a href={`mailto:${item.reporter_email}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-paper px-4 text-sm font-semibold text-ink transition-colors hover:border-clay/40 hover:text-clay">
                  <Icon name="mail" className="h-4 w-4" /> Email
                </a>
              )}
              {item.reporter_phone && (
                <a href={`tel:${item.reporter_phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-paper px-4 text-sm font-semibold text-ink transition-colors hover:border-clay/40 hover:text-clay">
                  <Icon name="phone" className="h-4 w-4" /> {item.reporter_phone}
                </a>
              )}
            </div>
          </Card>

          {canClaim && (
            <Card className="border-dashed border-clay/30 bg-clay-soft/50 p-5">
              <h2 className="text-sm font-bold text-ink">Found it?</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">Marking it claimed removes it from the open board.</p>
              {confirming ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={claim} disabled={busy}>{busy ? 'Updating…' : 'Yes, mark claimed'}</Button>
                  <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
                </div>
              ) : (
                <Button className="mt-4" onClick={() => setConfirming(true)}><Icon name="check" className="h-4 w-4" /> Mark as claimed</Button>
              )}
            </Card>
          )}

          <div aria-live="polite" className="min-h-5 space-y-2">
            {notice && <p className="rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-sm text-success">{notice}</p>}
            {error && <p role="alert" className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
          </div>
          <p className="text-[11px] uppercase tracking-wider text-muted">{titleCase(item.status)} · {item.category}</p>
        </div>
      </div>
    </div>
  );
}
