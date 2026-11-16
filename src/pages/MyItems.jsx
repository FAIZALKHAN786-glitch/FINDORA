import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/App';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default function MyItems() {
  const { session, navigate } = useApp();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('items')
      .select('*')
      .eq('reporter_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
          return;
        }
        setItems(data || []);
        setLoading(false);
      });
  }, [session]);

  const del = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast({ title: 'Deleted' });
  };

  if (!session) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">My items</h2>
        <p className="mt-2 text-muted-foreground">Sign in to see your listings.</p>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (loading)
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">My listings</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            You haven&apos;t reported any items yet.
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="outline" size="sm">
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                  <button
                    onClick={() => del(item.id)}
                    className="opacity-0 hover:opacity-100 text-destructive"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
                <h3 className="mt-1 text-base font-semibold truncate">{item.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {item.location || 'No location'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
                <button
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="mt-3 w-full text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  View listing
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
