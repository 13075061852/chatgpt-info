import { json, makeSession, readJson, sessionCookie } from "./_shared.js";

export const onRequestPost = async ({ request, env }) => {
  const body = await readJson(request);
  const username = String(body.username || "");
  const password = String(body.password || "");
  const expectedUser = env.ADMIN_USER || "admin";
  const expectedPassword = env.ADMIN_PASSWORD || "admin123";

  if (username !== expectedUser || password !== expectedPassword) {
    return json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const session = await makeSession(username, env);
  return json(
    { user: { username } },
    {
      headers: {
        "Set-Cookie": sessionCookie(request, session, 43200)
      }
    }
  );
};
