"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type AdminNavLinkProps = Readonly<{
  children: ReactNode;
  exact?: boolean;
  href: string;
}>;

export function isAdminNavLinkActive(pathname: string, href: string, exact = false): boolean {
  return pathname === href || (!exact && pathname.startsWith(`${href}/`));
}

export function AdminNavLink({ children, exact = false, href }: AdminNavLinkProps) {
  const active = isAdminNavLinkActive(usePathname(), href, exact);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-9 items-center gap-3 rounded-md px-3 text-sm transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      {children}
    </Link>
  );
}
