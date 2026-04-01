import type { Metadata } from "next";

// DealScope acquisition intelligence platform
export const metadata: Metadata = {
  title: "DealScope — RealHQ",
};

export default function ScopeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
