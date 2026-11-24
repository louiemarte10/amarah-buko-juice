# 🥥 How to Use — Amarah Fresh Buko's POS & Inventory

A simple guide to running the Point-of-Sale and Inventory system. There's also an in-app version: click **How to Use** in the sidebar.

---

## 1. Signing in

Open the app and sign in with your email and password.

There are two access levels:

- **Admin** — full access (Dashboard, Inventory, Archived, Categories, Suppliers, Staff).
- **Cashier** — Point of Sale and Sales History only.

> Demo accounts (change the passwords!): `admin@amarah.local / admin123` and `cashier@amarah.local / cashier123`.

Use the **Light / Dark** toggle at the bottom of the sidebar anytime.

---

## 2. Making a sale (Point of Sale)

1. Go to **Point of Sale**.
2. Filter by category or use the **search box** to find products.
3. **Tap a product** to add it to the order. Use **+ / −** to change quantity, or ✕ to remove.
4. Optionally add a **discount** (in pesos).
5. Choose a payment method — **Cash, GCash, or Card**. For cash, type the amount received; the **change** is calculated for you.
6. Press **Charge** to complete the sale.

A product shows **Out of stock** and can't be added once its stock hits zero, so you never oversell.

---

## 3. Invoices save automatically

The moment you press **Charge**:

- A **sales invoice** is created with its own invoice number.
- It's **saved automatically to Sales History** — nothing to do manually.
- A printable invoice appears — press **Print**, or **New Sale** to continue.
- Stock for the items sold is reduced automatically.

Open **Sales History** anytime and click a sale to **re-open and reprint** its invoice. Use the **date filter** at the top — **Today / Yesterday / Last 7 days** or a **From–To** range — to review any day's sales and total. Admins can **Delete** a sale there; deleting returns its items to stock.

---

## 4. Inventory (Admin)

The **Inventory** page lists your active products with price and stock (low stock shows in amber).

- **+ Add Product** — name, price, cost, stock, unit, category, supplier.
- **Edit** — change any detail (you'll confirm the update).
- **Checkboxes** — tick rows, or the header box to **select all**, then act in bulk.
- **Archive** — remove a product from the POS without losing its history.
- **Low-stock alert** — set a number per product; when stock reaches it, the item appears in the Dashboard's Low Stock list.

---

## 5. Raw Materials — your buko stock (Admin)

**Raw Materials** holds the base stock you buy — your **whole buko**.

1. Open the **Raw Materials** page and add **Whole Buko** — unit `buko`, how many on hand, and a low-stock alert (say 20).
2. Selling the **whole coconut**? In **Inventory**, add/edit a product and under **Stock source** choose **Made from raw material → Whole Buko**, with **Uses per sale = 1**. Each whole-buko sale subtracts 1 buko.
3. When you buy more, open **Raw Materials → Restock** to add. The Dashboard flags raw materials at or below their alert level (shown with a **Raw** tag).

> Packs don't use a fixed ratio (yield varies), so you fill pack stock on the **Production** page — see below. Products with their own stock (bottled drinks, sago, nata…) work as normal.

---

## 6. Production — daily buko breakage (Admin)

Because some bukos have no water, the number of packs per buko varies — so you **encode each day** what you actually produced.

1. Open the **Production** page.
2. Pick the **date**, then enter **bukos broken** (e.g. 9), **damaged** (no water), and **packs produced** (the count you got).
3. Choose which product the packs go to (**Buko Water Pack**).
4. **Save entry.** This **adds the packs to that product's stock** (ready to sell in the POS) and **subtracts the broken bukos** from your buko stock.
5. The **History** table keeps every day — filter by **Today / Yesterday / 7 days** or a **date range** to backtrack. Totals show at the bottom. Delete an entry to undo its stock effects.

> The daily flow: buy buko (**Raw Materials**) → break & count packs (**Production**) → sell packs (**Point of Sale**) → review by day (**Sales History**).

---

## 7. Archiving (Admin)

Archiving is a safe alternative to deleting.

- From **Inventory**, use **Archive** (single or bulk) to shelve products.
- Open the **Archived** page to **Restore** them (undo) or **Delete permanently**.
- Products with past sales can't be fully deleted — they stay archived to protect your records.

---

## 8. Categories & Suppliers (Admin)

- **Categories** — group products (e.g. Buko Drinks, Add-ons). Assign them when adding/editing a product.
- **Suppliers** — track where stock comes from, with contact person, phone and email.
- Deleting a category or supplier keeps the products; they just lose that link.

---

## 9. Dashboard (Admin)

The **Dashboard** shows the day at a glance:

- **Today's Sales** and **Last 7 Days** revenue.
- **Best Sellers** over the last 30 days.
- **Low Stock Alerts** — what to restock before you run out.

---

## 10. Staff & Roles (Admin)

On the **Staff** page:

- **+ Add Staff** — create an account (name, email, password, role).
- **Edit** — change a staff member's name, role, or password.
- **Manage roles** — create as many roles as you like (e.g. Manager, Supervisor). Each role is either **Admin access** or cashier-level.
- **Deactivate** — block someone from signing in without deleting them. You can't deactivate your own account.

---

That's everything you need to run **Amarah Fresh Buko's**. 🥥
