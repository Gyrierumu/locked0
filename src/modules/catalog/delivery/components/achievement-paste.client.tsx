"use client";

import { useActionState, useEffect, useMemo, useRef, type RefObject } from "react";
import { ClipboardPaste, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { AdminAchievementGroup } from "../../contracts";
import {
  applyAchievementPasteAction,
  previewAchievementPasteAction,
} from "../actions/achievement-actions";
import {
  initialAchievementPasteFormState,
  initialCatalogFormState,
} from "../action-state";
import { Field, FormMessage } from "./form-controls";

type AchievementPasteProps = Readonly<{
  gameId: string;
  achievementSetId: string;
  groups: readonly AdminAchievementGroup[];
}>;

export function AchievementPaste({ gameId, achievementSetId, groups }: AchievementPasteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = useMemo(
    () => previewAchievementPasteAction.bind(null, gameId, achievementSetId),
    [achievementSetId, gameId],
  );
  const [state, previewAction, pending] = useActionState(
    action,
    initialAchievementPasteFormState,
  );

  return (
    <>
      <Button type="button" variant="outline" onClick={() => dialogRef.current?.showModal()}>
        <ClipboardPaste aria-hidden="true" /> Colar lista
      </Button>
      <dialog ref={dialogRef} aria-labelledby="paste-dialog-title" className="m-auto max-h-[90dvh] w-[min(56rem,calc(100%-2rem))] rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Structured Paste</p>
            <h2 id="paste-dialog-title" className="mt-1 text-xl font-semibold">Colar lista de conquistas</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => dialogRef.current?.close()} aria-label="Fechar"><X aria-hidden="true" /></Button>
        </div>
        <div className="max-h-[calc(90dvh-5rem)] overflow-y-auto p-5">
          <form action={previewAction} className="space-y-5">
            <Field htmlFor="paste-target-group" label="Grupo de destino" required>
              <Select id="paste-target-group" name="targetGroupId" defaultValue={state.input?.targetGroupId ?? groups[0]?.id ?? ""} disabled={pending} required>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </Select>
            </Field>
            <Field
              htmlFor="paste-text"
              label="Lista"
              required
              description="TSV ou CSV: name, type, hidden, points. Cabeçalho opcional; slug e group também são aceitos. Máximo de 500 linhas."
            >
              <Textarea
                id="paste-text"
                name="text"
                defaultValue={state.input?.text ?? ""}
                rows={10}
                disabled={pending}
                placeholder={'name\ttype\thidden\tpoints\nElden Ring\tplatinum\tfalse\nElden Lord\tgold\ttrue'}
                required
                className="font-mono text-xs"
              />
            </Field>
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" disabled={pending || groups.length === 0}>{pending ? "Analisando…" : "Gerar preview"}</Button>
              <FormMessage status={state.status} message={state.message} />
            </div>
          </form>

          {state.preview ? (
            <section className="mt-7 border-t border-border pt-6" aria-labelledby="paste-preview-heading">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 id="paste-preview-heading" className="font-semibold">Preview</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {state.preview.detectedCount} linhas · {state.preview.validCount} válidas · {state.preview.invalidCount} com atenção
                  </p>
                </div>
                {state.preview.canApply && state.input ? (
                  <PasteApplyForm
                    gameId={gameId}
                    achievementSetId={achievementSetId}
                    targetGroupId={state.input.targetGroupId}
                    text={state.input.text}
                    dialogRef={dialogRef}
                  />
                ) : null}
              </div>
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Nome / slug</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Hidden</th><th className="px-3 py-2">Pontos</th><th className="px-3 py-2">Grupo</th><th className="px-3 py-2">Validação</th></tr>
                  </thead>
                  <tbody>
                    {state.preview.rows.map((row) => (
                      <tr key={row.rowNumber} className="border-t border-border align-top">
                        <td className="px-3 py-2 font-mono text-xs">{row.rowNumber}</td>
                        <td className="px-3 py-2"><span className="block font-medium">{row.name || "—"}</span><span className="font-mono text-xs text-muted-foreground">{row.slug || "—"}</span></td>
                        <td className="px-3 py-2 capitalize">{row.achievementType ?? "—"}</td>
                        <td className="px-3 py-2">{row.isHidden === null ? "—" : row.isHidden ? "Sim" : "Não"}</td>
                        <td className="px-3 py-2">{row.points ?? "—"}</td>
                        <td className="px-3 py-2">{row.groupName ?? "—"}</td>
                        <td className={row.errors.length > 0 ? "px-3 py-2 text-destructive" : "px-3 py-2 text-emerald-300"}>
                          {row.errors.length > 0 ? row.errors.join(" ") : "Válida"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </dialog>
    </>
  );
}

function PasteApplyForm({ gameId, achievementSetId, targetGroupId, text, dialogRef }: Readonly<{
  gameId: string;
  achievementSetId: string;
  targetGroupId: string;
  text: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
}>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    applyAchievementPasteAction.bind(null, gameId, achievementSetId),
    initialCatalogFormState,
  );
  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    router.refresh();
  }, [dialogRef, router, state.status]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="targetGroupId" value={targetGroupId} />
      <input type="hidden" name="text" value={text} />
      <Button type="submit" disabled={pending}>{pending ? "Aplicando…" : "Aplicar lista"}</Button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}
