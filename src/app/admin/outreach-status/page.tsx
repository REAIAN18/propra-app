import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Outreach Status — RealHQ Admin" };

export default async function OutreachStatusPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/dashboard");
  redirect("/admin");
}
