"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken, getMe, User, isAdminRole } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/pending"];

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

      // If on public path, allow access
      if (isPublicPath) {
        setIsLoading(false);
        setIsAuthenticated(true);
        return;
      }

      // Check for token
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      // Validate token by fetching user
      try {
        const user = await getMe();
        if (!user) {
          router.replace("/login");
          return;
        }

        // Check if user is active
        if (user.status !== "active") {
          router.replace("/pending");
          return;
        }

        // Check admin routes
        if (pathname.startsWith("/admin") && !isAdminRole(user.role)) {
          router.replace("/dashboard");
          return;
        }

        setIsAuthenticated(true);
      } catch {
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
