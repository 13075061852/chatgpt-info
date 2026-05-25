import { json, sessionCookie } from "./_shared.js";

export const onRequestPost = async ({ request }) =>
  json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": sessionCookie(request, "", 0)
      }
    }
  );
