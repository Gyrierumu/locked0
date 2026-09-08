"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/feedback/error-state.client";

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState reset={reset} />;
}
