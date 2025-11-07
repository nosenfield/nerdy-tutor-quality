import { LogoutButton } from "@/components/auth/LogoutButton";

/**
 * Tutor Assessment Dashboard
 * 
 * Main dashboard page displaying scatter plots and tutor data.
 * This is the primary view after login.
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Tutor Assessment Dashboard
          </h1>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Placeholder for dashboard content */}
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600">
              Dashboard content will be implemented in subsequent tasks.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

