"use client";

import { Button } from "@/components/ui/button";

type ErrorStateProps = Readonly<{
  reset: () => void;
}>;

export function ErrorState({ reset }: ErrorStateProps) {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-destructive">
          Erro inesperado
        </p>
        <h1 className="mt-4 text-3xl font-bold">Não foi possível abrir esta página.</h1>
        <p className="mt-4 text-muted-foreground">
          Tente novamente. Se o problema continuar, volte em alguns instantes.
        </p>
        <Button className="mt-8" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
