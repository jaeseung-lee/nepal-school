import { NextResponse, type NextRequest } from "next/server";

import { isBasicAuthValid } from "./lib/basicAuth.mjs";

const AUTH_REALM = "Nepal Japan Dashboard";

function unauthorizedResponse(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${AUTH_REALM}", charset="UTF-8"`,
    },
  });
}

export function middleware(request: NextRequest): NextResponse {
  const username = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }

    return new NextResponse("Basic auth is not configured", { status: 500 });
  }

  if (!isBasicAuthValid(request.headers.get("authorization"), username, password)) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};
