"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { CatalogFormState } from "../action-state";

export function useRefreshAfterSuccess(state: CatalogFormState): void {
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state]);
}
