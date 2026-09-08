import type { ReactNode } from "react";

type PageShellProps = Readonly<{
  children: ReactNode;
}>;

export function PageShell({ children }: PageShellProps) {
  return <main className="mx-auto min-h-screen max-w-7xl px-6">{children}</main>;
}
