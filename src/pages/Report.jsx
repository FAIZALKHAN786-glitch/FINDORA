import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/App';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/input';
import { Select, SelectGroup, SelectOption } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = ['Books', 'Electronics', 'Clothing', 'Keys', 'ID & Documents', 'Bags', 'Other'];
const STATUSES = [
  { value: 'lost', label: 'I lost this' },
  { value: 'found', label: 'I found this' },
];

export default function Report({ navigate }) {
  const { session } = useApp();
  const { toast } = useToast();
  const [status, setStatus] = useState('lost');
  const [category, setCategory] = useState('Other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!session) return;
    setUploading(true);

    let photoPath = null;
    if (photo) {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${session.user.id}/${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: upError } = await supabase.storage
        .from('item-photos')
        .upload(fileName, photo);
      if (upError) {
        toast({ title: 'Upload failed', description: upError.message, variant: 'destructive' });
        setUploading(false);
        return;
      }
      photoPath = fileName;
    }

    const { error } = await supabase.from('items').insert({
      title,
      description,
      category,
      status,
      location,
      lost_found_date: date,
      photo_url: photoPath,
      reporter_id: session.user.id,
      reporter_email: session.user.email,
      reporter_phone: phone,
    });

    setUploading(false);
    if (error) {
      toast({ title: 'Could not report', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Reported!', description: 'Your item listing is live.' });
    navigate('/my-items');
  };

  if (!session) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Sign in to report an item</h2>
        <p className="mt-2 text-muted-foreground">Please sign in before posting.</p>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Report an item</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={status} onValueChange={setStatus}>
                <SelectGroup>
                  {STATUSES.map((s) => (
                    <SelectOption key={s.value} value={s.value}>
                      {s.label}
                    </SelectOption>
                  ))}
                </SelectGroup>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectGroup>
                  {CATEGORIES.map((c) => (
                    <SelectOption key={c} value={c}>{c}</SelectOption>
                  ))}
                </SelectGroup>
              </Select>
            </div>
            <Input
              placeholder="Item title (e.g. black backpack)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              placeholder="Where was it lost/found? (e.g. Library 3rd floor)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <TextArea
              placeholder="Extra details (brand, color, identifying marks…)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              placeholder="Your phone (so finders can reach you)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="file" accept="image/*" onChange={handlePhoto} />
              {photo ? (
                <Badge variant="success" size="sm">Photo attached</Badge>
              ) : (
                <span className="text-muted-foreground">Add a photo</span>
              )}
            </label>
            {photoUrl && (
              <img
                src={photoUrl}
                alt="Preview"
                className="mt-2 rounded-md border w-32 h-32 object-cover"
              />
            )}
            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? 'Posting…' : 'Post item'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
