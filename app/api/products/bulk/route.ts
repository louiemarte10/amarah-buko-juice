import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest } from "@/lib/api";

// Bulk product actions: archive (soft), restore, or permanently delete.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  let body: { action?: string; ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const ids = (body.ids ?? []).filter((x) => typeof x === "string" && x);
  if (ids.length === 0) return badRequest("No products selected");

  switch (body.action) {
    case "archive": {
      const res = await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { active: false },
      });
      return NextResponse.json({ archived: res.count });
    }
    case "restore": {
      const res = await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { active: true },
      });
      return NextResponse.json({ restored: res.count });
    }
    case "delete": {
      // Products referenced by sales can't be hard-deleted (FK) — keep them
      // archived; permanently remove the rest.
      const rows = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, _count: { select: { saleItems: true } } },
      });
      const deletable = rows.filter((r) => r._count.saleItems === 0).map((r) => r.id);
      const blocked = rows.filter((r) => r._count.saleItems > 0).map((r) => r.id);

      if (deletable.length) {
        await prisma.product.deleteMany({ where: { id: { in: deletable } } });
      }
      if (blocked.length) {
        await prisma.product.updateMany({
          where: { id: { in: blocked } },
          data: { active: false },
        });
      }
      return NextResponse.json({
        deleted: deletable.length,
        blocked: blocked.length,
      });
    }
    default:
      return badRequest("Unknown action");
  }
}
