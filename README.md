# Habits

A shared habit tracker for two people. It is a webpage you can save to an iPhone home screen. Both phones read and write the same board through Supabase.

A check marks a habit done or a vice avoided, and scores the gain. An empty box scores the loss. At midnight in the board's timezone, that day's column locks and leaves. Anything still unchecked stays a loss, even if nobody opened the app.

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **Authentication → Providers → Email**, turn off **Confirm email**. Both of you can then sign up and sign in without waiting on a confirmation message.
3. Open the SQL editor and run [supabase/schema.sql](supabase/schema.sql). That creates the tables, the access rules, and the live updates.
4. In **Project Settings → API**, copy the project URL and the anon public key.
5. Copy `.env.example` to `.env.local` and fill in those two values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

6. Install and start the app:

```
npm install
npm run dev
```

If you use Bun instead of npm, `bun install` and `bun run dev` do the same thing.

Open http://127.0.0.1:5173 on this computer. On an iPhone, the published site is https://pepperpopper4.github.io/Habits/ once GitHub Pages finishes the first deploy. Use Share → Add to Home Screen. The computer does not need to stay on.

GitHub Actions builds the site from the `main` branch. The Supabase URL and anon key are repository secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. They are baked into the build. Do not commit `.env.local`. The repository is public because free GitHub Pages requires that. The anon key is visible in the built JavaScript; the service role key must stay out of the repo and out of the secrets.

## Using it

The first person creates a board and gets a six-character invite code. The second person creates an account and joins with that code.

Each person checks their own list. The other list is visible and cannot be edited. New habits and vices are offers: the other person can accept the point ratio, counter with different numbers, or decline. The person who proposed it can withdraw while they are waiting.

Settings holds the shared point goal, the timezone that decides midnight, and one notes box. Leaving the notes box saves it. Wipe clears it for both people. It is a shared note, not a message thread.

Keep the anon key in `.env.local`. Do not put the service role key in this app.
