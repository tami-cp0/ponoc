import type { Metadata } from "next";
import { requireAdmin } from "@/server/admin/access";

export const metadata: Metadata = {
  title: "ponoc admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return <div className="admin">{children}</div>;
}
