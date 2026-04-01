import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DealScope — RealHQ",
};

export default function ScopeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
