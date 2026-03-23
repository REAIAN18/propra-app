/**
 * POST /api/user/work-orders/preview/scope
 * Preview scope generation without a saved work order.
 * Used by the BriefBuilder modal "Generate scope →" button before the order exists.
 *
 * Delegates to the /[orderId]/scope route with orderId="preview".
 */

import { NextRequest } from "next/server";
import { POST as scopeHandler } from "@/app/api/user/work-orders/[orderId]/scope/route";

export async function POST(req: NextRequest) {
  return scopeHandler(req, { params: Promise.resolve({ orderId: "preview" }) });
}
