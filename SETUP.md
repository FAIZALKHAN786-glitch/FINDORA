# Campus Lost & Found — setup

## 1. Create a Supabase project
Go to https://supabase.com, create a new project, and copy **Project URL** and **anon public key** from Settings > API.

## 2. Configure environment
Copy `.env.example` to `.env` and fill in your values:

```powershell
copy .env.example .env
# then edit .env with your URL and key
```

## 3. Apply the database schema
In the Supabase Dashboard > SQL Editor, paste and run the contents of:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/seed.sql`

This creates `items`, the `item-photos` storage bucket, and row-level security policies, plus seed data.

## 4. Run the app
```powershell
npm install   # already done
npm run dev   # http://localhost:3000
```

## What works
- **Home**: browse lost/found items with search + category filter
- **Report**: sign in, then post an item with title, location, date, category, optional photo and phone
- **Item detail**: one-tap email/phone contact, mark your lost item as claimed
- **My items**: your listings, with delete
- **Auth**: sign in / sign up (email confirmation is off for speed)
