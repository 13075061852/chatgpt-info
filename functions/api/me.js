import { json, requireUser } from "./_shared.js";

export const onRequestGet = async ({ request, env }) => {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  return json({ user: auth.user });
};
