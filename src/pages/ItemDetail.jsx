import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/App';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function ItemDetail({ id, navigate }) {
  const { session } = useApp();
  const { toast } = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    supabase
      .from('items')
      .select('*, profiles(full_name, avatar_url)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setItem(data);
        setLoading(false);
      });
  }, [id]);

  const markReturned = async () => {
    if (!item || item.reporter_id !== session?.user?.id) return;
    setReturning(true);
    const { error } = await supabase
      .from('items')
      .update({ status: 'returned' })
      .eq('id', id);
    setReturning(false);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    setItem({ ...item, status: 'returned' });
    toast({ title: 'Marked as returned' });
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!item) return <div className="py-20 text-center text-muted-foreground">Item not found.</div>;

  const photoUrl =
    item.photo_url &&
    `${import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'}/storage/v1/object/public/item-photos/${item.photo_url}`;

  const isMine = item.reporter_id === session?.user?.id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {photoUrl && (
        <img src={photoUrl} alt={item.title} className="w-full rounded-xl object-cover h-64" />
      )}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h1 className="text-2xl font-bold">{item.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.category} &bull; {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={item.status === 'found' ? 'success' : item.status === 'returned' ? 'outline' : 'default'}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Badge>
          </div>
          {item.location && (
            <p className="mt-4 text-sm text-muted-foreground">
              📍 {item.location}
            </p>
          )}
          {item.description && (
            <p className="mt-4 text-sm">{item.description}</p>
          )}
          {item.lost_found_date && (
            <p className="mt-1 text-xs text-muted-foreground">
              Date: {format(new Date(item.lost_found_date), 'MMM d, yyyy')}
            </p>
          )}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
            {item.reporter_email && (
              <a
                href={`mailto:${item.reporter_email}`}
                className="inline-flex items-center gap-2 rounded-md border bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
              >
                ✉️ Contact owner
              </a>
            )}
            {item.reporter_phone && (
              <a
                href={`tel:${item.reporter_phone}`}
                className="inline-flex items-center gap-2 rounded-md border bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
              >
                📱 {item.reporter_phone}
              </a>
            )}
          </div>
          {isMine && item.status !== 'returned' && (
            <Button
              onClick={markReturned}
              disabled={returning}
              className="mt-4 w-full"
            >
              {returning ? 'Updating…' : 'Mark as returned'}
            </Button>
          )}
        </CardContent>
      </Card>
      <div className="text-center text-xs text-muted-foreground">
        Posted by {item.profiles?.full_name || 'A student'}
      </div>
    </div>
  );
}
