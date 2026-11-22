import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { NavigationContext } from './lib/navigation.js';
import Button from './components/Button.jsx';
import Icon from './components/Icon.jsx';
import Logo from './components/Logo.jsx';
import Home from './pages/Home.jsx';
import Report from './pages/Report.jsx';
import Item from './pages/Item.jsx';
import Mine from './pages/Mine.jsx';
import Login from './pages/Login.jsx';

function Header({ path, navigate }) {
  const { user, ready, signout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const active = (to) => (to === '/' ? path === '/' || path.startsWith('/item/') : path === to);

  const leave = async () => {
    setLeaving(true);
    try {
      await signout();
      navigate('/');
    } finally {
      setLeaving(false);
    }
  };

  const links = [
    { to: '/', label: 'Browse' },
    ...(user ? [{ to: '/report', label: 'Report' }, { to: '/my-items', label: 'My items' }] : []),
  ];

  return (
    <header className="glass-bar sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <button onClick={() => navigate('/')} className="rounded-xl text-left" aria-label="Findora home">
          <Logo compact />
        </button>

        <nav aria-label="Main" className="flex items-center gap-1 rounded-full border border-line/70 bg-surface/70 p-1 sm:gap-1.5">
          {links.map((link) => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              aria-current={active(link.to) ? 'page' : undefined}
              className={`min-h-10 rounded-full px-3 text-sm font-semibold transition-colors duration-150 ${active(link.to) ? 'bg-ink text-white shadow-sm' : 'text-muted hover:bg-paper hover:text-ink'}`}
            >
              {link.label}
            </button>
          ))}
          {ready && (user
            ? <Button variant="ghost" size="sm" onClick={leave} disabled={leaving} className="ml-0.5">
                <Icon name="logout" className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            : <Button size="sm" onClick={() => navigate('/login')} className="ml-0.5">Sign in</Button>)}
        </nav>
      </div>
    </header>
  );
}

function Shell() {
  const [path, setPath] = useState(window.location.pathname);
  const navigate = useCallback((to) => {
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const Page = path === '/report' ? Report
    : path.startsWith('/item/') ? () => <Item id={path.split('/')[2]} />
    : path === '/my-items' ? Mine
    : path === '/login' ? Login
    : Home;

  return (
    <NavigationContext.Provider value={navigate}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-clay focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <Header path={path} navigate={navigate} />
      <main id="main" className="paper-grain relative mx-auto min-h-[calc(100vh-180px)] max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Page navigate={navigate} />
      </main>
      <footer className="border-t border-line bg-surface/50 py-6 text-center text-xs text-muted">
        Findora — built for the things that go missing on campus.
      </footer>
    </NavigationContext.Provider>
  );
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>;
}
