import { createServerSupabaseClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { redirect } from "next/navigation";

/**
 * Dashboard Layout
 * 
 * Provides consistent layout for all dashboard pages:
 * - Sidebar navigation
 * - Header with user info and logout
 * - Main content area
 * 
 * This layout is protected by middleware, so we can safely assume
 * the user is authenticated. However, we still fetch the session
 * to get user details for display.
 */

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // This should never happen due to middleware, but handle gracefully
  if (!session) {
    redirect("/login");
  }

  const userEmail = session.user.email;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Header with mobile menu button */}
      <div className="flex h-16 items-center border-b border-gray-200 bg-white px-4 lg:px-6">
        <div className="lg:hidden">
          <Sidebar />
        </div>
        <Header userEmail={userEmail} />
      </div>

      {/* Main layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
