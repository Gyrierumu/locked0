"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const dirtyForms = new Set<symbol>();

function warnBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
}

export function useUnsavedChanges() {
  const [dirty, setDirty] = useState(false);
  const formToken = useRef(Symbol("catalog-form"));

  useEffect(() => {
    if (!dirty) return;

    const token = formToken.current;
    dirtyForms.add(token);
    if (dirtyForms.size === 1) window.addEventListener("beforeunload", warnBeforeUnload);

    return () => {
      dirtyForms.delete(token);
      if (dirtyForms.size === 0) window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [dirty]);

  const markDirty = useCallback(() => setDirty(true), []);
  const markClean = useCallback(() => setDirty(false), []);

  return { dirty, markDirty, markClean };
}
