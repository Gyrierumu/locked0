import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { brand } from "@/config/brand";
import { routes } from "@/config/routes";
import { canAccessAdmin } from "@/modules/identity/contracts";
import { getOptionalActor } from "@/modules/identity/server";
import { AccessDenied } from "@/modules/identity/ui";

import { AdminShell } from "./_components/admin-shell";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} Admin`,
    template: `%s | ${brand.name} Admin`,
  },
};

export const dynamic = "force-dynamic";

type AdminLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const actor = await getOptionalActor();

  if (actor === null) {
    redirect(`${routes.login}?next=${encodeURIComponent(routes.admin)}`);
  }

  if (!canAccessAdmin(actor.roles)) {
    return <AccessDenied />;
  }

  return <AdminShell actor={actor}>{children}</AdminShell>;
}
