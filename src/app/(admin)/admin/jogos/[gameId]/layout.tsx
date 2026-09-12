import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getAdminGameContext } from "@/modules/catalog/server";
import { GameWorkspace } from "@/modules/catalog/ui";

type GameLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ gameId: string }>;
}>;

export default async function GameLayout({ children, params }: GameLayoutProps) {
  const { gameId } = await params;
  const game = await getAdminGameContext(gameId);
  if (!game) notFound();

  return <GameWorkspace game={game}>{children}</GameWorkspace>;
}

