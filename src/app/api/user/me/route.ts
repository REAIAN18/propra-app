import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ name: null, email: null, id: null });
  }
  return NextResponse.json({
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    id: session.user.id ?? null,
  });
}
