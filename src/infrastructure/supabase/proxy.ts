import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabasePublicEnv } from "@/config/env.client";
import { routes } from "@/config/routes";
import { sanitizeAdminReturnPath } from "@/modules/identity/contracts";

function copyCookies(source: NextResponse, target: NextResponse): void {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAdminRequest =
    request.nextUrl.pathname === routes.admin ||
    request.nextUrl.pathname.startsWith(`${routes.admin}/`);

  if (!data?.claims && isAdminRequest) {
    const loginUrl = request.nextUrl.clone();
    const returnPath = sanitizeAdminReturnPath(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    loginUrl.pathname = routes.login;
    loginUrl.search = "";
    loginUrl.searchParams.set("next", returnPath);

    const redirectResponse = NextResponse.redirect(loginUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}
