import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Admins start on the dashboard, cashiers on the POS screen.
  redirect(user.role === "ADMIN" ? "/dashboard" : "/pos");
}
