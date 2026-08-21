import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const cookieStore = await cookies();
  redirect(
    isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)
      ? "/admin/wall"
      : "/admin/login",
  );
}
