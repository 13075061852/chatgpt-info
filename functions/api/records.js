import { json, readJson, readRecords, requireUser, validateRecord, writeRecords } from "./_shared.js";

export const onRequestGet = async ({ request, env }) => {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const records = await readRecords(env);
  return json({ records });
};

export const onRequestPost = async ({ request, env }) => {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const payload = await readJson(request);
  const result = validateRecord(payload);
  if (result.error) return json({ error: result.error }, { status: 400 });

  const records = await readRecords(env);
  const record = {
    id: crypto.randomUUID(),
    ...result.record,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  records.unshift(record);
  await writeRecords(env, records);
  return json({ record }, { status: 201 });
};
