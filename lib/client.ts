// Small client-side fetch wrapper. Throws on non-2xx with the server message.

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Request failed");
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  del: <T>(url: string) => request<T>("DELETE", url),
};

// ---- Shared shapes returned by the API -------------------------------------
export type Role = "ADMIN" | "CASHIER";

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  priceCents: number;
  costCents: number;
  capitalCents: number;
  // For raw-linked products this is the DERIVED number of sellable units
  // available (floor of rawMaterial.stock / rawUsage); otherwise own stock.
  stock: number;
  lowStockThreshold: number;
  unit: string;
  active: boolean;
  categoryId: string | null;
  supplierId: string | null;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  rawMaterialId: string | null;
  rawUsage: number;
  rawMaterial?: {
    id: string;
    name: string;
    unit: string;
    stock: number;
    lowStockThreshold: number;
  } | null;
  // Set by the POS date view: this product's stock reflects the selected day's
  // production (packs produced that day − sold that day).
  productionFed?: boolean;
};

export type ProductionLog = {
  id: string;
  date: string;
  bukosBroken: number;
  damaged: number;
  packsProduced: number;
  note: string | null;
  createdAt: string;
  rawMaterialId: string | null;
  productId: string | null;
  rawMaterial?: { id: string; name: string; unit: string } | null;
  product?: { id: string; name: string; unit: string } | null;
  createdBy?: { id: string; name: string } | null;
};

export type Expense = {
  id: string;
  date: string;
  category: string;
  amountCents: number;
  note: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
};

export type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  lowStockThreshold: number;
  costCents: number;
  capitalCents: number;
  active: boolean;
  supplierId: string | null;
  supplier?: { id: string; name: string } | null;
  _count?: { products: number };
};

export type Category = {
  id: string;
  name: string;
  _count?: { products: number };
};

export type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  _count?: { products: number };
};

export type SaleItem = {
  id: string;
  productName: string;
  unitCents: number;
  quantity: number;
  lineCents: number;
};

export type Sale = {
  id: string;
  reference: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paymentMethod: "CASH" | "GCASH" | "CARD";
  cashCents: number;
  changeCents: number;
  createdAt: string;
  cashier?: { id: string; name: string };
  items: SaleItem[];
};

export type StaffRole = {
  id: string;
  name: string;
  isAdmin: boolean;
  _count?: { users: number };
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt?: string;
  staffRoleId?: string | null;
  staffRole?: { id: string; name: string; isAdmin: boolean } | null;
};
