# 🥥 Amarah Buko Juice — POS & Inventory

A Point-of-Sale and Inventory management web app built with **Next.js 16**, **Prisma 7**, and **Neon Postgres**, ready to deploy on **Vercel**.

## Features

- **Point of Sale** — product grid with category filters & search, cart, discounts, cash/GCash/Card payment, change calculation, printable receipts.
- **Inventory** — full product CRUD, stock levels that auto-decrement on every sale, low-stock thresholds, cost & price tracking.
- **Categories & Suppliers** — organise products and track where stock comes from.
- **Dashboard** — today's sales, 7-day revenue chart, best sellers, low-stock alerts, inventory value.
- **Sales history** — every transaction with reprintable receipts.
- **Staff accounts & roles** — `ADMIN` (full access) and `CASHIER` (POS + sales history only), cookie-based login.

## Tech stack

| Layer      | Choice                                        |
| ---------- | --------------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19            |
| Styling    | Tailwind CSS v4                               |
| Database   | Neon Postgres (free tier)                     |
| ORM        | Prisma 7 (with the `@prisma/adapter-pg` driver) |
| Auth       | Signed JWT session cookie (`jose` + `bcryptjs`) |
| Hosting    | Vercel                                         |

---

## 1. Get a free Neon database

**Option A — Neon directly (works for local dev too):**

1. Go to **https://neon.tech** and sign up (free, no card).
2. Create a project. Neon gives you a connection string.
3. You need **two** strings from the Neon dashboard → _Connection Details_:
   - **Pooled** connection (the host contains `-pooler`) → this is `DATABASE_URL`.
   - **Direct** connection (toggle off "Pooled connection", no `-pooler`) → this is `DIRECT_URL`.

**Option B — through Vercel (easiest when deploying):**

1. In your Vercel project → **Storage** → **Create Database** → **Neon**.
2. Vercel auto-creates the DB and injects env vars. Map them in step 3.

## 2. Configure environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://USER:PASS@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASS@HOST.REGION.aws.neon.tech/neondb?sslmode=require"
SESSION_SECRET="a-long-random-string"   # generate one below
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 3. Install, create tables, seed, run

```bash
npm install
npm run db:push     # creates the tables in your Neon database
npm run db:seed     # adds sample buko-juice products + demo accounts
npm run dev         # http://localhost:3000
```

### Demo accounts (change these!)

| Role    | Email                 | Password     |
| ------- | --------------------- | ------------ |
| Admin   | `admin@amarah.local`  | `admin123`   |
| Cashier | `cashier@amarah.local`| `cashier123` |

> After first login, go to **Staff → Reset PW** to set real passwords.

---

## 4. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. On **vercel.com** → **Add New → Project** → import the repo.
3. Add Environment Variables (Project → Settings → Environment Variables):
   - `DATABASE_URL` (pooled Neon string)
   - `DIRECT_URL` (direct Neon string)
   - `SESSION_SECRET`
   > If you used **Option B** (Neon via Vercel), it already created `DATABASE_URL`
   > and `DATABASE_URL_UNPOOLED` — set `DIRECT_URL` to the `_UNPOOLED` value.
4. Click **Deploy**. The build runs `prisma generate` automatically.
   > **Region (for Philippine users):** create your Neon database in
   > **AWS Asia Pacific (Singapore)** `ap-southeast-1`, and after deploy set the
   > Vercel **Function Region** to **Singapore `sin1`** (Project → Settings →
   > Functions). Keeping the app server and database in the same nearby region
   > makes the POS feel instant instead of routing through the US.
5. **Create the tables in your production DB once.** From your machine, with `.env`
   pointing at the same Neon database, run:
   ```bash
   npm run db:push
   npm run db:seed   # optional: demo data
   ```

That's it — your POS is live. 🎉

---

## npm scripts

| Script             | What it does                                   |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Start the dev server                           |
| `npm run build`    | Production build (`prisma generate` + `next build`) |
| `npm run db:push`  | Sync the schema to the database (no migration files) |
| `npm run db:migrate` | Create a versioned migration                 |
| `npm run db:seed`  | Seed demo products, categories, suppliers, users |
| `npm run db:studio`| Open Prisma Studio to browse/edit data         |

## Notes

- Money is stored as integer **centavos** in the DB and formatted as ₱ in the UI — no floating-point rounding errors.
- Stock is decremented inside a database transaction during checkout, so overselling is prevented even with concurrent sales.
- Deleting a product that already has sales history **archives** it (keeps the records) instead of removing it.
