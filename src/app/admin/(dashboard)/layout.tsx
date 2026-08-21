import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
