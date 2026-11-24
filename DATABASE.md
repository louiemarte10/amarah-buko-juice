# 🗄️ Where your data is stored & how to view it on Neon

Everything the app saves — products, raw materials (buko), sales, staff — lives
in a **cloud Postgres database hosted on [Neon](https://neon.tech)** (free tier).

It is **not** stored on your computer or inside the app's code. That means:

- Your data is safe even if your laptop breaks or you open the app from another device.
- The live website (on Vercel) and your local app both read and write the **same** database.

## Your database at a glance

| | |
|---|---|
| **Host** | Neon (neon.tech) — cloud Postgres |
| **Project** | `Amarah` |
| **Region** | Singapore (`ap-southeast-1`) — closest to the Philippines |
| **Database** | `neondb` |
| **Branch** | `production` |

## How to see your data on the Neon website

1. Go to **https://neon.tech** and click **Sign in** (use the account you created the project with).
2. Open the **Amarah** project from your dashboard.
3. In the left menu, click **Tables** to browse your data. You'll see tables like:
   - `Product`, `RawMaterial`, `Category`, `Supplier`
   - `Sale`, `SaleItem`
   - `User`, `StaffRole`
4. Click any table to view, search, and sort its rows.
5. Prefer queries? Click **SQL Editor** and run, for example:

   ```sql
   select name, "priceCents", stock from "Product" order by name;
   select * from "RawMaterial";
   ```

## Connection details (keep private 🔒)

Your database password and connection strings are in the project's `.env` file
and in Vercel's **Environment Variables** — never share them or post them online.
On Neon you can find them anytime under **Connection Details** / **Connect**.

> Tip: Neon's free tier is generous, but if the database "sleeps" after a period
> of no activity, the first request just takes a second or two to wake it up.
