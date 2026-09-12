"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { initialCatalogFormState, type CatalogFormState } from "../action-state";
import { FormMessage } from "./form-controls";

type LifecycleActionProps = Readonly<{
  action: (
    state: CatalogFormState,
    formData: FormData,
  ) => Promise<CatalogFormState>;
  confirmMessage: string;
  label: string;
  pendingLabel: string;
  tone?: "default" | "destructive" | "outline";
}>;

export function LifecycleAction({
  action,
  confirmMessage,
  label,
  pendingLabel,
  tone = "outline",
}: LifecycleActionProps) {
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className="space-y-3"
    >
      <Button type="submit" variant={tone} disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

