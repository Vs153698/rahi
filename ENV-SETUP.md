# ENV-SETUP — how to get every environment variable, step by step

Every secret name lives in [`.env.example`](./.env.example), grouped by Doppler
project (`rahi-api`, `rahi-mobile`, `rahi-powersync`). This guide tells you
**where each value comes from**. Work top to bottom; you can stop after the
services you actually need (Supabase + OTP get you a usable login).

Pricing/UX may have changed — **verify on each provider's site at setup time**.

---

## 0. Doppler (holds all secrets)

1. Create an account at <https://dashboard.doppler.com>.
2. Create three **projects**: `rahi-api`, `rahi-mobile`, `rahi-powersync`. Each gets
   `dev` / `staging` / `prod` configs by default.
3. Install the CLI: `brew install dopplerhq/cli/doppler` → `doppler login`.
4. In the repo, run `doppler setup` and pick `rahi-api` / `dev`.
5. In each project's **dev** config, click **Import** and paste that project's block
   from `.env.example`, then fill values as you obtain them below.

---

## 1. Supabase  → `rahi-api` + `rahi-powersync` + `rahi-mobile`

1. <https://supabase.com> → **New project**. **Region: ap-south-1 (Mumbai)** (DPDP).
   Set a strong database password (save it).
2. Project → **Settings → API**:
   - **Project URL** → `SUPABASE_URL` (api) and `EXPO_PUBLIC_SUPABASE_URL` (mobile).
   - **anon public** key → `SUPABASE_ANON_KEY` (api) + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mobile).
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (api **only** — never on device).
3. Settings → API → **JWT Settings** → **JWT Secret** → `SUPABASE_JWT_SECRET`
   (api + `rahi-powersync`).
4. Settings → **Database → Connection string (URI)** → `SUPABASE_DB_CONNECTION_URI`
   (`rahi-powersync`). Replace `[YOUR-PASSWORD]` with the DB password.
5. Enable phone auth: **Authentication → Providers → Phone** → enable. (The SMS
   sender is your OTP provider below.)
6. Apply migrations: **SQL Editor** → run `apps/api/migrations/0000…0006` in order.

## 2. PowerSync  → `rahi-powersync` + `rahi-mobile`

1. <https://www.powersync.com> → create a **Cloud instance** (Asia region).
2. Connect it to your Supabase **Postgres** (paste `SUPABASE_DB_CONNECTION_URI`)
   and set the JWKS/JWT to your `SUPABASE_JWT_SECRET`.
3. Copy the **instance URL** → `POWERSYNC_INSTANCE_URL` (rahi-powersync) and
   `EXPO_PUBLIC_POWERSYNC_URL` (mobile).
4. **Sync Rules** tab → paste `packages/sync-rules/sync-rules.yaml` → deploy.

## 3. OTP — pick ONE provider

Set `OTP_PROVIDER` in `rahi-api` to `msg91` or `twilio`.

### Option A — Twilio (fastest; no DLT) → `OTP_PROVIDER=twilio`
1. <https://www.twilio.com> → sign up.
2. Console dashboard → **Account SID** → `TWILIO_ACCOUNT_SID`; **Auth Token** →
   `TWILIO_AUTH_TOKEN`.
3. **Verify → Services → Create** a Verify service → copy its **Service SID**
   (`VAxxxx`) → `TWILIO_VERIFY_SERVICE_SID`.
4. (Trial accounts can only text verified numbers — add yours under Verified
   Caller IDs.)

### Option B — MSG91 (India, DLT) → `OTP_PROVIDER=msg91`
1. <https://msg91.com> → sign up.
2. **Auth Key** (API → Auth Key) → `MSG91_AUTH_KEY`.
3. Register a **DLT entity + SMS template** (TRAI requirement; has lead time).
   The approved **template id** → `MSG91_OTP_TEMPLATE_ID`.
4. Your DLT-registered **sender id** (6 chars, e.g. `RAHIIN`) → `MSG91_SENDER_ID`.

## 4. RevenueCat (subscriptions)  → `rahi-api` + `rahi-mobile`

1. <https://www.revenuecat.com> → create a project; connect **App Store** (shared
   secret) and **Play** (service account).
2. Create products `pro_monthly` / `pro_annual` in both stores + a **7-day trial**
   (see `infra/STORE-SETUP.md`), then map both to one **entitlement `pro`** and an
   **offering** with monthly+annual packages.
3. **API keys**: the **public SDK key** → `EXPO_PUBLIC_REVENUECAT_API_KEY` (mobile);
   the **secret key** → `REVENUECAT_SECRET_API_KEY` (api).
4. **Integrations → Webhooks** → point to `https://<api>/billing/revenuecat/webhook`
   and set an Authorization header value → `REVENUECAT_WEBHOOK_AUTH_HEADER` (api).

## 5. Razorpay (trip-money pay-in)  → `rahi-api`

1. <https://razorpay.com> → sign up (start in **Test mode**).
2. **Settings → API Keys → Generate** → **Key Id** → `RAZORPAY_KEY_ID`; **Key
   Secret** → `RAZORPAY_KEY_SECRET` (shown once).
3. **Settings → Webhooks → Add** → URL `https://<api>/payments/razorpay/webhook`,
   set a secret → `RAZORPAY_WEBHOOK_SECRET`; subscribe to `payment.captured`/`failed`.

## 6. Cloudflare R2 (tiles / media / docs)  → `rahi-api`

1. <https://dash.cloudflare.com> → **R2** → create buckets `rahi-tiles`,
   `rahi-media`, `rahi-docs`.
2. **Manage R2 API Tokens → Create** → copy **Access Key ID** →
   `R2_ACCESS_KEY_ID`, **Secret Access Key** → `R2_SECRET_ACCESS_KEY`.
3. Account ID (R2 overview) → `R2_ACCOUNT_ID`. If you serve tiles via a public
   bucket/CDN, that base URL → `R2_PUBLIC_BASE_URL`.

## 7. Upstash Redis (BullMQ jobs)  → `rahi-api`

1. <https://upstash.com> → create a **Redis** database (Asia region).
2. Copy the **connection URL** (`rediss://…`) → `REDIS_URL`.

## 8. Sentry (diagnostics)  → `rahi-api` + `rahi-mobile`

1. <https://sentry.io> → create two projects (one Node, one React Native).
2. Each project's **DSN** → `SENTRY_DSN` (api) and `EXPO_PUBLIC_SENTRY_DSN` (mobile).

## 9. Routing & data (mostly self-host / keyless)  → `rahi-api`

- **GraphHopper** — self-host with an OSM India extract; the running base URL →
  `GRAPHHOPPER_BASE_URL`. (Managed GraphHopper is a fallback.)
- **Overpass** — `OVERPASS_API_URL` (default public instance works; self-host if
  throttled).
- **Open-Meteo** — keyless; `OPEN_METEO_BASE_URL=https://api.open-meteo.com`.

## 10. Admin + app config

- `ADMIN_USER_IDS` (api) — comma-separated Supabase user ids allowed to use the
  moderation queue (find ids in Supabase → Authentication → Users).
- `EXPO_PUBLIC_API_BASE_URL` (mobile) — your API URL (`http://localhost:3000` in
  dev; your deployed URL otherwise).
- `NODE_ENV`, `PORT` (api) — `development` / `3000` in dev.

---

## Minimum to log in and sync (skip the rest for now)
1. **Supabase** (§1) — URL, anon key, service role, JWT secret, run migrations.
2. **PowerSync** (§2) — instance URL + deploy sync rules.
3. **OTP** (§3) — Twilio is fastest.
4. Mobile `EXPO_PUBLIC_*` (Supabase URL/anon, PowerSync URL, API base URL).

Everything else (RevenueCat, Razorpay, R2, Redis, Sentry, GraphHopper) unlocks the
corresponding feature when you add it.
