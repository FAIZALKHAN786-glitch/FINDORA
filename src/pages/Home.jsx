import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/App';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectGroup, SelectOption } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = ['Books', 'Electronics', 'Clothing', 'Keys', 'ID & Documents', 'Bags', 'Other'];
const STATUS_LABEL = { lost: 'Lost', found: 'Found', returned: 'Returned' };

export default function Home({ navigate }) {
  const { session } = useApp();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('items')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = (e) => setSearch(e.target.value.toLowerCase());

  const filtered = items.filter((i) => {
    const isCat = filter === 'all' || i.category === filter;
    const isStatus =
      filter === 'all'
        ? true
        : filter === 'returned'
          ? i.status === 'returned'
          : filter === 'lost'
            ? i.status === 'lost'
            : i.status === 'found';
    const isSearch =
      i.title.toLowerCase().includes(search) ||
      (i.description || '').toLowerCase().includes(search) ||
      (i.location || '').toLowerCase().includes(search);
    return isCat && isStatus && isSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Lost &amp; Found</h1>
        {session && (
          <Button onClick={() => navigate('/report')}>
            Report a lost item
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search title, description, location…"
          value={search}
          onChange={handleSearch}
          className="max-w-sm sm:max-w-md"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectGroup>
            <SelectOption value="all">All items</SelectOption>
            <SelectOption value="lost">Lost</SelectOption>
            <SelectOption value="found">Found</SelectOption>
            <SelectOption value="returned">Returned</SelectOption>
            {CATEGORIES.map((c) => (
              <SelectOption key={c} value={c}>{c}</SelectOption>
            ))}
          </SelectGroup>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center py-12 text-muted-foreground">
            Loading items…
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-12 text-muted-foreground">
            No items found.
          </div>
        ) : (
          filtered.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/item/${item.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start gap-2">
                  <Badge
                    variant={
                      item.status === 'found'
                        ? 'success'
                        : item.status === 'returned'
                          ? 'outline'
                          : 'default'
                    }
                    size="sm"
                  >
                    {STATUS_LABEL[item.status]}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {item.location || 'Location not specified'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground truncate">
                  {item.category}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {!session && (
        <div className="rounded-xl border bg-secondary p-6 text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            Sign in to report an item and get notified when it&apos;s found.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium text-primary hover:underline"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}
