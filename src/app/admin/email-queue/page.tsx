import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Email Queue — RealHQ Admin" };

export default async function EmailQueuePage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/dashboard");
  redirect("/admin");
}
