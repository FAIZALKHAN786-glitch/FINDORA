import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const C = (a, b) => (a || '') + ' ' + (b || '');
const Ctx = React.createContext(null);
export function useApp() { const c = React.useContext(Ctx); if (!c) throw new Error('ctx'); return c; }

const MAX_TITLE = 120;
const MAX_DESC = 1000;
const MAX_LOCATION = 200;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;

export default function App() {
  const [session, setSession] = useState(null);
  const [route, setRoute] = useState(window.location.pathname);
  const navigate = (to) => { window.history.pushState({}, '', to); setRoute(to); };

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPop);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { window.removeEventListener('popstate', onPop); sub.subscription.unsubscribe(); };
  }, []);

  const Page =
    route === '/report' ? Report :
    route.startsWith('/item/') ? () => <Item id={route.split('/')[2]} /> :
    route === '/my-items' ? Mine :
    route === '/login' ? Login : Home;

  return (
    <Ctx.Provider value={{ session, navigate }}>
      <nav className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur-md">
        <div className="flex h-12 items-center justify-between px-4">
          <span className="text-xl font-bold tracking-tight">Lost &amp; Found</span>
          <div className="flex items-center gap-2">
            {session
              ? [
                  React.createElement('button', { key: 'r', onClick: () => navigate('/report'), className: 'text-sm hover:text-blue-600' }, 'Report'),
                  React.createElement('button', { key: 'm', onClick: () => navigate('/my-items'), className: 'text-sm hover:text-blue-600' }, 'Mine'),
                  React.createElement('button', { key: 'o', onClick: () => supabase.auth.signOut().then(() => navigate('/')), className: 'text-sm text-red-500' }, 'Sign out')
                ]
              : [
                  React.createElement('button', { key: 'l', onClick: () => navigate('/login'), className: 'text-sm hover:text-blue-600' }, 'Sign in'),
                  React.createElement('button', { key: 'r', onClick: () => navigate('/report'), className: 'flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700' }, 'Report')
                ]
            }
          </div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <Page navigate={navigate} session={session} />
      </main>
    </Ctx.Provider>
  );
}

function useItems() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    supabase.from('items').select('*').order('created_at', { ascending: false }).then(({ data }) => setItems(data || []));
    const ch = supabase.channel('items-live').on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => supabase.from('items').select('*').order('created_at', { ascending: false }).then(({ data }) => setItems(data || []))).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);
  return items;
}

const statusColor = { lost: 'bg-red-50 text-red-700 border-red-200', found: 'bg-green-50 text-green-700 border-green-200', returned: 'bg-gray-100 text-gray-600 border-gray-200', claimed: 'bg-indigo-50 text-indigo-700 border-indigo-200' };

function Card({ className, children }) { return React.createElement('div', { className: C('rounded-2xl border bg-white p-6 shadow-sm', className) }, children); }
function Btn({ className, children, ...p }) { return React.createElement('button', { className: C('inline-flex items-center justify-center rounded-xl border bg-blue-600 px-4 py-2.5 text-sm text-white shadow-sm hover:bg-blue-700 disabled:opacity-60', className), ...p }, children); }
function Input({ label, type = 'text', ...p }) { return React.createElement('div', { className: 'space-y-1' }, React.createElement('label', { className: 'text-xs font-medium text-gray-600' }, label), React.createElement('input', { type, className: 'h-11 w-full rounded-xl border bg-white px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent', ...p })); }
function Pill({ children, status }) { return React.createElement('span', { className: C('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', statusColor[status]) }, children); }

function Home({ navigate, session }) {
  const items = useItems();
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const cats = ['Books', 'Electronics', 'Clothing', 'Keys', 'ID & Documents', 'Bags', 'Other'];
  const fl = items.filter(i => (f === 'all' || i.category === f || i.status === f) && (i.title + ' ' + (i.description || '') + ' ' + (i.location || '')).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Lost &amp; Found</h1>
        {session && <Btn onClick={() => navigate('/report')}>Report item</Btn>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input label="Search" placeholder="title, location…" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
        <select value={f} onChange={e => setF(e.target.value)} className="h-11 rounded-xl border bg-white px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="all">All</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
          <option value="claimed">Claimed</option>
          <option value="returned">Returned</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fl.length === 0 ? <div className="col-span-3 py-16 text-center text-gray-500">Nothing here.</div> : fl.map(i => (
          <Card key={i.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/item/${i.id}`)}>
            <div className="flex justify-between items-start gap-2">
              <Pill status={i.status}>{i.status}</Pill>
              <span className="ml-auto text-xs text-gray-400">{new Date(i.created_at).toLocaleDateString()}</span>
            </div>
            <h3 className="mt-1 font-semibold">{i.title}</h3>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{i.location || '—'}</p>
            <p className="mt-2 text-xs text-gray-400 truncate">{i.category}</p>
          </Card>
        ))}
      </div>
      {!session && (
        <div className="rounded-2xl border bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">Sign in to report an item.</p>
          <button onClick={() => navigate('/login')} className="mt-3 text-sm text-blue-600 underline">Sign in</button>
        </div>
      )}
    </div>
  );
}

function Report({ navigate, session }) {
  const [s, setS] = useState('lost');
  const [c, setC] = useState('Other');
  const f = React.useRef(null);
  const [t, setT] = useState('');
  const [d, setD] = useState('');
  const [l, setL] = useState('');
  const [dt, setDt] = useState(new Date().toISOString().slice(0, 10));
  const [p, setP] = useState('');
  const [up, setUp] = useState(false);

  const sub = async (e) => {
    e.preventDefault();
    if (!session) return;
    if (!t || t.trim().length < 2 || t.trim().length > MAX_TITLE) return alert('Title must be 2–120 characters.');
    if (d && d.trim().length > MAX_DESC) return alert('Description is too long.');
    if (l && l.trim().length > MAX_LOCATION) return alert('Location is too long.');
    if (p && !PHONE_RE.test(p)) return alert('Enter a valid phone number.');
    const file = f.current?.files?.[0];
    if (file) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return alert('Only JPG, PNG, WEBP or GIF images are allowed.');
      if (file.size > MAX_FILE_SIZE) return alert('Image must be under 5 MB.');
    }
    setUp(true);
    let photo = null;
    if (file) {
      const nm = `${session.user.id}/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const { error: eu } = await supabase.storage.from('item-photos').upload(nm, file);
      if (eu) { setUp(false); return alert('Upload failed.'); }
      photo = nm;
    }
    const { error } = await supabase.from('items').insert({ title: t.trim(), description: d?.trim() || null, category: c, status: s, location: l?.trim() || null, lost_found_date: dt, photo_url: photo, reporter_id: session.user.id, reporter_email: session.user.email, reporter_phone: p?.trim() || null });
    setUp(false);
    if (error) return alert('Could not post item. Please try again.');
    navigate('/my-items');
  };

  if (!session) return (
    <div className="text-center py-20">
      <h2 className="text-lg font-semibold">Sign in to report</h2>
      <button onClick={() => navigate('/login')} className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm text-white">Sign in</button>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Card>
        <form onSubmit={sub} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-2">Report an item</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={s} onChange={e => setS(e.target.value)} className="h-11 rounded-xl border bg-white px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="lost">I lost this</option>
              <option value="found">I found this</option>
            </select>
            <select value={c} onChange={e => setC(e.target.value)} className="h-11 rounded-xl border bg-white px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {['Books', 'Electronics', 'Clothing', 'Keys', 'ID & Documents', 'Bags', 'Other'].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <Input label="Title" placeholder="e.g. black backpack" value={t} onChange={e => setT(e.target.value)} required />
          <Input label="Location" placeholder="e.g. Library 3rd floor" value={l} onChange={e => setL(e.target.value)} />
          <input type="date" value={dt} onChange={e => setDt(e.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <textarea placeholder="Brand, color, identifying marks…" value={d} onChange={e => setD(e.target.value)} className="w-full min-h-[90px] rounded-xl border bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <Input label="Your phone" placeholder="so finders can reach you" value={p} onChange={e => setP(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="file" accept="image/*" ref={f} className="block text-sm text-muted" />
            <span className="text-gray-500">{f.current?.files?.[0] ? `${f.current.files[0].name} (${Math.round(f.current.files[0].size / 1024)}KB)` : 'Add a photo'}</span>
          </label>
          <Btn type="submit" disabled={up} className="w-full">{up ? 'Posting…' : 'Post item'}</Btn>
        </form>
      </Card>
    </div>
  );
}

function Item({ id }) {
  const [i, setI] = useState(null);
  const [load, setLoad] = useState(true);
  const { session } = useApp();
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const load = () => supabase.from('items').select('*').eq('id', id).single().then(({ data }) => { setI(data); setLoad(false); });
    load();
    const ch = supabase.channel('item-live-' + id).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'items', filter: 'id=eq.' + id }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [id]);

  const claim = async () => {
    const { error } = await supabase.from('items').update({ status: 'claimed' }).eq('id', id);
    if (error) return alert('Could not update item.');
    setI({ ...i, status: 'claimed' });
    setMsg('Item marked as claimed.');
  };

  const pu = i?.photo_url && import.meta.env.VITE_SUPABASE_URL + '/storage/v1/object/public/item-photos/' + i.photo_url;
  const mine = i?.reporter_id === session?.user?.id;

  if (load) return <div className="py-20 text-center text-gray-500">Loading…</div>;
  if (!i) return <div className="py-20 text-center text-gray-500">Not found.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {pu && <img src={pu} alt={i.title} className="w-full rounded-2xl object-cover h-64" />}
      <Card>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start gap-2">
            <Pill status={i.status}>{i.status}</Pill>
            <span className="ml-auto text-xs text-gray-400">{new Date(i.created_at).toLocaleDateString()}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold">{i.title}</h1>
          {i.location && <p className="mt-1 text-sm text-gray-500"><span>📍 </span>{i.location}</p>}
          {i.description && <p className="mt-2 text-sm">{i.description}</p>}
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            {i.reporter_email && <a href={'mailto:' + i.reporter_email} className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm shadow-sm hover:bg-gray-100">✉️ Contact</a>}
            {i.reporter_phone && <a href={'tel:' + i.reporter_phone} className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm shadow-sm hover:bg-gray-100">📱 {i.reporter_phone}</a>}
          </div>
          {mine && i.status === 'lost' && <Btn onClick={claim} className="mt-4 w-full">Mark as claimed</Btn>}
          {msg && <p className="mt-3 text-sm text-green-600">{msg}</p>}
        </div>
      </Card>
    </div>
  );
}

function Mine({ navigate }) {
  const { session } = useApp();
  const [items, setItems] = useState([]);
  const [load, setLoad] = useState(true);
  useEffect(() => {
    if (!session) return;
    supabase.from('items').select('*').eq('reporter_id', session.user.id).order('created_at', { ascending: false }).then(({ data }) => { setItems(data || []); setLoad(false); });
    const ch = supabase.channel('mine-live').on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: 'reporter_id=eq.' + session.user.id }, () => supabase.from('items').select('*').eq('reporter_id', session.user.id).order('created_at', { ascending: false }).then(({ data }) => setItems(data || []))).subscribe();
    return () => supabase.removeChannel(ch);
  }, [session]);
  const del = async (id) => { if (!confirm('Delete?')) return; await supabase.from('items').delete().eq('id', id); setItems(prev => prev.filter(x => x.id !== id)); };
  if (!session) return (
    <div className="text-center py-20">
      <h2 className="text-lg font-semibold">My items</h2>
      <p className="mt-2 text-gray-500">Sign in.</p>
      <button onClick={() => navigate('/login')} className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm text-white">Sign in</button>
    </div>
  );
  if (load) return <div className="py-20 text-center text-gray-500">Loading…</div>;
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">My listings</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? <div className="col-span-3 py-16 text-center text-gray-500">No listings yet.</div> : items.map(i => (
          <Card key={i.id}>
            <div className="p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <Pill status={i.status}>{i.status}</Pill>
                <button onClick={() => del(i.id)} className="rounded-lg text-red-400 hover:bg-red-50">🗑️</button>
              </div>
              <h3 className="font-semibold truncate">{i.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2">{i.location || '—'}</p>
              <button onClick={() => navigate(`/item/${i.id}`)} className="mt-2 w-full text-xs text-blue-600 underline">View</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Login({ navigate }) {
  const [e, setE] = useState('');
  const [p, setP] = useState('');
  const [m, setM] = useState('signin');
  const [up, setUp] = useState(false);
  const sub = async (ev) => {
    ev.preventDefault();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(e)) return alert('Enter a valid email.');
    if (p.length < 6) return alert('Password needs 6+ characters.');
    setUp(true);
    try {
      if (m === 'signin') { const { error } = await supabase.auth.signInWithPassword({ email: e, password: p }); if (error) throw error; }
      else {
        const { data, error } = await supabase.auth.signUp({ email: e, password: p });
        if (error) throw error;
        if (data.user && !data.session) return alert('Check your email to confirm your account.');
      }
      navigate('/');
    } catch (err) { alert('Sign in failed. Please try again.'); } finally { setUp(false); }
  };
  return (
    <div className="max-w-md mx-auto py-10">
      <Card>
        <form onSubmit={sub} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-2">{m === 'signin' ? 'Welcome back' : 'Create account'}</h2>
          <Input label="Email" type="email" value={e} onChange={ev => setE(ev.target.value)} required />
          <Input label="Password" type="password" value={p} onChange={ev => setP(ev.target.value)} required />
          <Btn type="submit" disabled={up} className="w-full">{up ? '…' : m === 'signin' ? 'Sign in' : 'Create account'}</Btn>
          <p className="mt-4 text-center text-sm text-gray-500">{m === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}<button onClick={() => setM(m === 'signin' ? 'signup' : 'signin')} className="text-blue-600 underline">{m === 'signin' ? 'Sign up' : 'Sign in'}</button></p>
        </form>
      </Card>
    </div>
  );
}
