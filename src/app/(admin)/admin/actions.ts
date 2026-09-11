"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { endCurrentSession } from "@/modules/identity/server";

export async function logoutAction(): Promise<never> {
  await endCurrentSession();
  revalidatePath(routes.home, "layout");
  redirect(routes.home);
}
