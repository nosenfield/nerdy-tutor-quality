"use client";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { User } from "lucide-react";

/**
 * Header Component
 * 
 * Displays user information and logout button.
 * Used in dashboard layout.
 */

interface HeaderProps {
  userEmail?: string | null;
}

export function Header({ userEmail }: HeaderProps) {
  return (
    <div className="flex flex-1 items-center justify-between">
      {/* User info */}
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <User className="h-5 w-5 text-gray-400" />
        <span className="font-medium">
          {userEmail || "Loading..."}
        </span>
      </div>

      {/* Logout button */}
      <div>
        <LogoutButton />
      </div>
    </div>
  );
}

