import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Energy — RealHQ",
};

export default function EnergyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
