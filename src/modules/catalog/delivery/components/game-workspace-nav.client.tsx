"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/config/routes";
import { cn } from "@/shared/utils/cn";

export function GameWorkspaceNav({ gameId }: Readonly<{ gameId: string }>) {
  const pathname = usePathname();
  const items = [
    { href: routes.adminGame(gameId), label: "Overview" },
    { href: routes.adminGameReleases(gameId), label: "Releases" },
    { href: routes.adminGameContentPacks(gameId), label: "Content Packs" },
    { href: routes.adminGameAchievementSets(gameId), label: "Achievement Sets" },
  ];

  return (
    <nav aria-label="Áreas do jogo" className="mt-6 flex flex-wrap gap-1 border-b border-border">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      {[["Guides", "Em breve"]].map(([label, note]) => (
        <span
          key={label}
          aria-disabled="true"
          className="cursor-not-allowed border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground/60"
        >
          {label} <span className="ml-1 text-[0.65rem] uppercase">{note}</span>
        </span>
      ))}
    </nav>
  );
}
