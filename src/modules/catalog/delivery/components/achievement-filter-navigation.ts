function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function buildAchievementFilterHref(
  pathname: string,
  formData: FormData,
): string {
  const params = new URLSearchParams({ view: "achievements" });
  const q = formValue(formData, "q").trim();
  const groupId = formValue(formData, "groupId");
  const type = formValue(formData, "type");
  const status = formValue(formData, "status");
  const hidden = formValue(formData, "hidden");

  if (q) params.set("q", q);
  if (groupId) params.set("groupId", groupId);
  if (type && type !== "all") params.set("type", type);
  if (status && status !== "all") params.set("status", status);
  if (hidden && hidden !== "all") params.set("hidden", hidden);

  return `${pathname}?${params}`;
}
