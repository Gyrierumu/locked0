"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

export type LoginFormState = Readonly<{
  error: string | null;
}>;

type LoginFormProps = Readonly<{
  action: (state: LoginFormState, formData: FormData) => Promise<LoginFormState>;
  nextPath: string;
}>;

const initialState: LoginFormState = { error: null };

export function LoginForm({ action, nextPath }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errorId = state.error ? "login-error" : undefined;

  return (
    <form action={formAction} aria-describedby={errorId} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={nextPath} />

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
          disabled={isPending}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="voce@exemplo.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="Sua senha"
        />
      </div>

      <div
        id="login-error"
        aria-live="polite"
        className="min-h-5 text-sm text-destructive"
      >
        {state.error}
      </div>

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? "Entrando…" : "Entrar no Admin"}
      </Button>
    </form>
  );
}
