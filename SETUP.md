# Setup — making coach sign-in work

## Status: done for local dev (2026-09-17)

Applied to project `pfbhkscauoxesvkcpzzw` via the Management API and verified:

- [x] Migrations `0001` and `0002` applied — 2 tables, RLS on both, 6 policies, 5 functions, 3 triggers
- [x] Google provider enabled with the client ID and secret
- [x] Site URL and the three redirect URLs set
- [x] Anonymous sign-ins enabled (Phase 2 dependency), verified working
- [x] `.env.local` written with the publishable key
- [x] `/auth/v1/authorize` 302s to Google with the correct `redirect_uri`; Google serves
      the consent page with no `redirect_uri_mismatch`
- [x] Verified the signup trigger creates **no** profile for anonymous users

**Still outstanding — the only two things left:**

1. **Netlify environment variables** (see the table below). Production will say
   "Not connected yet" until these are set and the site is redeployed.
2. **Rotate the exposed credentials** — the two `sbp_` tokens and the Google client
   secret were pasted into a chat transcript.

The rest of this document is the reference for redoing any of it by hand.

---

Everything below is in external consoles, so it has to be you, not the code.
Budget about 15 minutes. Once these are done, sign-in works end to end.

## This project's actual values

| Thing | Value |
|---|---|
| Supabase project ref | `pfbhkscauoxesvkcpzzw` |
| Supabase URL | `https://pfbhkscauoxesvkcpzzw.supabase.co` |
| Production domain | `https://fhgym.netlify.app` |
| Local dev | `http://localhost:5173` |

### Google OAuth — copy these exactly

**Authorised JavaScript origins** (2 entries — your app's own origins):
```
https://fhgym.netlify.app
http://localhost:5173
```

**Authorised redirect URIs** (1 entry — Supabase's callback, *not* your app's):
```
https://pfbhkscauoxesvkcpzzw.supabase.co/auth/v1/callback
```

Only one redirect URI. Google hands the code to Supabase, Supabase creates the session and
then bounces the browser to your app — so your own `/auth/callback` path never appears here.
Putting `https://fhgym.netlify.app/auth/callback` in this box is the usual mistake and
produces `redirect_uri_mismatch`.

### Which credential goes where

Getting this wrong is the one setup mistake with real consequences.

| Credential | Goes in | Never goes in |
|---|---|---|
| Supabase **URL** | `.env.local`, Netlify env | — |
| Supabase **anon** key | `.env.local`, Netlify env | — |
| Supabase **service_role** key | Edge Function secrets (Phase 2) | the app, Netlify, git |
| Google **client ID** | Supabase dashboard → Providers → Google | Netlify, the app |
| Google **client secret** | Supabase dashboard → Providers → Google | **anywhere else at all** |

Anything named `VITE_*` is **inlined into the JavaScript bundle at build time** and served to
every visitor. A `VITE_GOOGLE_CLIENT_SECRET` would be readable by anyone who opens devtools.
The Google credentials are consumed by Supabase's auth server, not by this app — the browser
never sees them, and there is no variable for them here.

The anon key is different: it is *designed* to be public. It identifies the project, and RLS
is what actually protects the data.

### Netlify → Site configuration → Environment variables

Exactly two, both public-safe:

```
VITE_SUPABASE_URL      = https://pfbhkscauoxesvkcpzzw.supabase.co
VITE_SUPABASE_ANON_KEY = <anon key from Project Settings -> API Keys>
```

Set them for **all deploy contexts** (production, deploy previews, branch deploys), then
trigger a redeploy — Vite inlines them at build time, so an existing build will not pick
them up.

### Supabase → Authentication → URL Configuration

**Site URL:**
```
https://fhgym.netlify.app
```

**Redirect URLs** (3 entries):
```
https://fhgym.netlify.app/auth/callback
http://localhost:5173/auth/callback
https://*--fhgym.netlify.app/auth/callback
```

The third is the wildcard for Netlify deploy previews (`deploy-preview-7--fhgym.netlify.app`).
Without it, sign-in works on production and on localhost but fails on every PR preview.

---

## 1. Create the Supabase project

<https://supabase.com/dashboard> → **New project**.

- Pick a region close to your users — **Frankfurt (eu-central-1)** is usually the lowest
  latency to Iran of the available regions.
- Save the database password somewhere; you will not be shown it again.

Then go to **Project Settings → API** and copy two values:

| Value | Goes into |
|---|---|
| Project URL (`https://xxxxx.supabase.co`) | `VITE_SUPABASE_URL` |
| `anon` / `public` key | `VITE_SUPABASE_ANON_KEY` |

> Do **not** copy the `service_role` key into the app. It bypasses every RLS policy. It
> belongs only in Edge Function secrets, later, in Phase 2.

Also note your **project ref** — the `xxxxx` part of the URL. Step 2 needs it.

---

## 2. Create the Google OAuth client

<https://console.cloud.google.com> → create or pick a project.

### 2a. OAuth consent screen
**APIs & Services → OAuth consent screen**

- User type: **External**
- App name: `FH Gym Assistant`, plus your support and developer email
- Scopes: the defaults (`email`, `profile`, `openid`) are enough — do not add more
- While the app is in **Testing**, only accounts you list under *Test users* can sign in.
  Add your own Google account there, or hit **Publish app** when you are ready for real coaches.

### 2b. Credentials
**APIs & Services → Credentials → Create credentials → OAuth client ID**

- Application type: **Web application**

**Authorized JavaScript origins**
```
http://localhost:5173
https://your-production-domain.com
```

**Authorized redirect URIs** — this one is Supabase's callback, not your app's:
```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

Copy the **Client ID** and **Client secret**.

---

## 3. Enable Google in Supabase

**Authentication → Sign In / Providers → Google**

- Toggle **Enable**
- Paste the Client ID and Client secret from step 2b
- Save

---

## 4. Set the redirect allow-list

**Authentication → URL Configuration**

- **Site URL:** `http://localhost:5173` for now (change to your domain at launch)
- **Redirect URLs:** add both
  ```
  http://localhost:5173/auth/callback
  https://your-production-domain.com/auth/callback
  ```

This step is the one that gets skipped. If `/auth/callback` is not on the allow-list, Google
returns the coach to the Site URL with no session and sign-in silently does nothing.

---

## 5. Run the migrations

**SQL Editor → New query**, then paste and run each file **in order**:

1. [`supabase/migrations/0001_extensions.sql`](supabase/migrations/0001_extensions.sql)
2. [`supabase/migrations/0002_gyms_profiles.sql`](supabase/migrations/0002_gyms_profiles.sql)

Or with the CLI:

```bash
pnpm dlx supabase link --project-ref <your-project-ref>
pnpm dlx supabase db push
```

---

## 6. Point the app at it

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://pfbhkscauoxesvkcpzzw.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Project Settings -> API Keys>
```

Then `pnpm dev`. The **Sign in** button goes live the moment those two variables are
present; until then it stays disabled and says "Not connected yet" rather than throwing.

### And on Netlify

Same two variables under **Site configuration → Environment variables**. Vite inlines
`VITE_*` at build time, so after adding them you must **trigger a redeploy** — restarting
the site is not enough, and the symptom is a deployed app that still says "Not connected yet".

[`netlify.toml`](netlify.toml) is committed and already handles the build command, the
SPA fallback and caching headers. The SPA fallback matters more than it looks: without it
`/auth/callback` returns Netlify's 404 page and Google sign-in fails in production while
working perfectly on localhost.

---

## 7. While you are in there — one toggle for Phase 2

**Authentication → Sign In / Providers → Anonymous sign-ins → Enable**

Trainees never get an account. The QR flow signs them in anonymously and then links that
anonymous user to their trainee row (PLAN.md §6). Nothing uses it until Phase 2, but
enabling it now saves a round trip.

Turn on **Bot and Abuse Protection → Captcha** at the same time if you want; anonymous
sign-in is the one endpoint worth rate-limiting.

---

## What "working" looks like

1. Click **Sign in** → Google account picker
2. Choose an account → back to `/auth/callback`
3. First time only: **Name your gym** → creates the gym and links you to it
4. Lands on `/coach` showing your name and gym

If step 3 loops back to onboarding, the `create_gym` RPC failed — check the SQL Editor ran
`0002` without errors.

If step 2 hangs on "Signing you in…" for six seconds and then errors, the redirect URL from
step 4 is missing or misspelled.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Button disabled, "Not connected yet" | `.env.local` missing or misnamed — it is `.env.local`, not `.env` |
| `redirect_uri_mismatch` from Google | Step 2b needs the **Supabase** callback URL, not your app's |
| Returns to landing page, still signed out | `/auth/callback` missing from step 4's allow-list |
| "Access blocked: app not verified" | Your Google account is not in *Test users*, or publish the consent screen |
| Signed in but stuck on onboarding | `0002_gyms_profiles.sql` did not run, or the `create_gym` RPC errored |
