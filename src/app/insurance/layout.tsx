import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insurance — RealHQ",
};

export default function InsuranceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
