export type MediaUsageKind =
  | "game_cover"
  | "game_hero"
  | "platform_icon"
  | "achievement_icon"
  | "guide_image";

export type MediaUsage = Readonly<{
  kind: MediaUsageKind;
  entityId: string;
  label: string;
  context: string | null;
}>;
