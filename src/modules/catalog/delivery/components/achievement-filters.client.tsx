"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import type {
  AdminAchievementGroup,
  AdminAchievementListQuery,
} from "../../contracts";
import { buildAchievementFilterHref } from "./achievement-filter-navigation";

type AchievementFiltersProps = Readonly<{
  pathname: string;
  groups: readonly AdminAchievementGroup[];
  query: AdminAchievementListQuery;
}>;

export function AchievementFilters({
  pathname,
  groups,
  query,
}: AchievementFiltersProps) {
  const router = useRouter();

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    router.push(buildAchievementFilterHref(pathname, new FormData(event.currentTarget)), {
      scroll: false,
    });
  }

  return (
    <form
      action={pathname}
      method="get"
      onSubmit={applyFilters}
      className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <input type="hidden" name="view" value="achievements" />
      <Input name="q" defaultValue={query.q} placeholder="Buscar por nome ou slug…" aria-label="Buscar conquistas" />
      <Select name="groupId" defaultValue={query.groupId ?? ""} aria-label="Filtrar por grupo">
        <option value="">Todos os grupos</option>
        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
      </Select>
      <Select name="type" defaultValue={query.type} aria-label="Filtrar por tipo">
        <option value="all">Todos os tipos</option><option value="bronze">Bronze</option><option value="silver">Prata</option><option value="gold">Ouro</option><option value="platinum">Platina</option><option value="standard">Padrão</option>
      </Select>
      <Select name="status" defaultValue={query.status} aria-label="Filtrar por status">
        <option value="all">Todos os status</option><option value="active">Ativas</option><option value="archived">Arquivadas</option>
      </Select>
      <div className="flex gap-2">
        <Select name="hidden" defaultValue={query.hidden} aria-label="Filtrar ocultas">
          <option value="all">Visíveis e ocultas</option><option value="hidden">Somente ocultas</option><option value="visible">Somente visíveis</option>
        </Select>
        <Button type="submit">Filtrar</Button>
      </div>
    </form>
  );
}
