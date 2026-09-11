"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { sanitizeAdminReturnPath } from "@/modules/identity/contracts";
import { authenticateWithPassword } from "@/modules/identity/server";

type LoginActionState = Readonly<{
  error: string | null;
}>;

const credentialsSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(1_000),
});

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const credentials = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!credentials.success) {
    return { error: "Informe um e-mail e uma senha válidos." };
  }

  let authenticated = false;

  try {
    authenticated = await authenticateWithPassword(
      credentials.data.email,
      credentials.data.password,
    );
  } catch {
    return { error: "Não foi possível entrar agora. Tente novamente." };
  }

  if (!authenticated) {
    return { error: "E-mail ou senha inválidos." };
  }

  redirect(sanitizeAdminReturnPath(formData.get("next")));
}
