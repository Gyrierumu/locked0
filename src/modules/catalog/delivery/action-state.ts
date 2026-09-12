export type CatalogFormState = Readonly<{
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
}>;

export const initialCatalogFormState: CatalogFormState = {
  status: "idle",
  message: null,
};

export type AchievementPasteFormState = CatalogFormState &
  Readonly<{
    preview?: import("../contracts").AchievementPastePreview;
    input?: Readonly<{ targetGroupId: string; text: string }>;
  }>;

export const initialAchievementPasteFormState: AchievementPasteFormState =
  initialCatalogFormState;
