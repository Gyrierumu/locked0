import {
  ArrowLeft,
  BookOpenText,
  Gamepad2,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Medal,
  MonitorCog,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { routes } from "@/config/routes";
import type { CurrentActor, PlatifyRole } from "@/modules/identity/contracts";

import { logoutAction } from "../actions";

type AdminShellProps = Readonly<{
  actor: CurrentActor;
  children: ReactNode;
}>;

const roleLabel: Readonly<Record<PlatifyRole, string>> = {
  author: "AUTHOR",
  editor: "EDITOR",
  admin: "ADMIN",
};

const plannedItems = [
  { label: "Games", icon: Gamepad2 },
  { label: "Platforms", icon: MonitorCog },
  { label: "Achievements", icon: Medal },
] as const;

function ActorLabel({ actor }: Readonly<{ actor: CurrentActor }>) {
  return (
    <div className="min-w-0 text-right">
      <p className="truncate text-sm font-medium">
        {actor.profile?.displayName ?? actor.profile?.username ?? actor.email ?? "Conta autenticada"}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">Sessão verificada</p>
    </div>
  );
}

function PlannedItem({
  label,
  icon: Icon,
}: Readonly<{ label: string; icon: typeof Gamepad2 }>) {
  return (
    <span
      aria-disabled="true"
      className="flex min-h-9 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm text-muted-foreground/70"
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>{label}</span>
      <span className="ml-auto text-[0.65rem] font-semibold uppercase tracking-wider">Em breve</span>
    </span>
  );
}

export function AdminShell({ actor, children }: AdminShellProps) {
  const effectiveRole = actor.effectiveRole;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex min-h-16 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
        <Link
          href={routes.admin}
          className="flex shrink-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Platify Admin — visão geral"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground"
          >
            P
          </span>
          <span className="hidden text-sm font-semibold tracking-wide sm:inline">PLATIFY ADMIN</span>
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-4">
          <ActorLabel actor={actor} />
          {effectiveRole ? (
            <span className="rounded-md border border-sidebar-primary/40 bg-sidebar-primary/10 px-2 py-1 text-[0.65rem] font-bold tracking-widest text-sidebar-primary">
              {roleLabel[effectiveRole]}
            </span>
          ) : null}
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label="Sair do Platify Admin"
              title="Sair"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </header>

      <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-b border-border bg-sidebar px-4 py-5 lg:border-r lg:border-b-0">
          <nav aria-label="Navegação administrativa" className="space-y-6">
            <div>
              <Link
                href={routes.admin}
                aria-current="page"
                className="flex min-h-9 items-center gap-3 rounded-md bg-sidebar-accent px-3 text-sm font-medium text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50"
              >
                <LayoutDashboard className="size-4" aria-hidden="true" />
                Overview
              </Link>
            </div>

            <div>
              <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Content
              </p>
              <div className="mt-2 space-y-1">
                {plannedItems.map((item) => (
                  <PlannedItem key={item.label} {...item} />
                ))}
              </div>
            </div>

            <div>
              <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Editorial
              </p>
              <div className="mt-2">
                <PlannedItem label="Guides" icon={BookOpenText} />
              </div>
            </div>

            <div>
              <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                System
              </p>
              <div className="mt-2">
                <PlannedItem label="Media" icon={ImageIcon} />
              </div>
            </div>
          </nav>

          <Link
            href={routes.home}
            className="mt-8 flex min-h-9 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 lg:mt-12"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Platify
          </Link>
        </aside>

        <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
