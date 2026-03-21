import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetEditForm } from "./AssetEditForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssetEditPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const asset = await prisma.userAsset.findUnique({ where: { id } });
  if (!asset || asset.userId !== session.user.id) notFound();

  return <AssetEditForm asset={asset} />;
}
