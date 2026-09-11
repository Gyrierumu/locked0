import type { Metadata } from "next";

import { Locked0Wordmark } from "@/components/brand/locked0-wordmark";
import { brand } from "@/config/brand";
import { sanitizeAdminReturnPath } from "@/modules/identity/contracts";
import { LoginForm } from "@/modules/identity/ui";

import { loginAction } from "./actions";

export const metadata: Metadata = {
  title: "Entrar",
  description: `Acesso ao ambiente administrativo do ${brand.name}.`,
};

type LoginPageProps = Readonly<{
  searchParams: Promise<{ next?: string | string[] }>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const nextPath = sanitizeAdminReturnPath(next);

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(20rem,0.8fr)_minmax(28rem,1.2fr)]">
      <section className="relative hidden overflow-hidden border-r border-border bg-card p-12 lg:flex lg:flex-col lg:justify-between">
        <Locked0Wordmark />
        <div className="relative max-w-md">
          <div
            aria-hidden="true"
            className="mb-8 h-1 w-16 rounded-full bg-sidebar-primary"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Área operacional
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Conteúdo com acesso controlado.
          </h1>
          <p className="mt-5 leading-7 text-muted-foreground">
            Entre com uma conta administrativa existente para acessar as ferramentas editoriais
            do {brand.name}.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Identity + RBAC</p>
      </section>

      <section className="flex min-w-0 items-center justify-center px-6 py-14 sm:px-10">
        <div className="w-full min-w-0 max-w-sm">
          <div className="mb-12 lg:hidden">
            <Locked0Wordmark />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {brand.name} Admin
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Acesse sua conta</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Use o e-mail e a senha cadastrados no Supabase Auth.
          </p>
          <LoginForm action={loginAction} nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
