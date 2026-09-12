export type CatalogFormState = Readonly<{
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
}>;

export const initialCatalogFormState: CatalogFormState = {
  status: "idle",
  message: null,
};

