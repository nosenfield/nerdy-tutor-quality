import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/client-server";

/**
 * Home Page
 * 
 * Redirects to dashboard if logged in, otherwise redirects to login.
 */
export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
