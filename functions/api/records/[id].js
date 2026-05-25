import { json, readJson, readRecords, requireUser, validateRecord, writeRecords } from "../_shared.js";

export const onRequestPut = async ({ request, env, params }) => {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const payload = await readJson(request);
  const result = validateRecord(payload);
  if (result.error) return json({ error: result.error }, { status: 400 });

  const records = await readRecords(env);
  const index = records.findIndex((record) => record.id === params.id);
  if (index === -1) return json({ error: "记录不存在" }, { status: 404 });

  records[index] = {
    ...records[index],
    ...result.record,
    updatedAt: new Date().toISOString()
  };

  await writeRecords(env, records);
  return json({ record: records[index] });
};

export const onRequestDelete = async ({ request, env, params }) => {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const records = await readRecords(env);
  const nextRecords = records.filter((record) => record.id !== params.id);
  if (nextRecords.length === records.length) return json({ error: "记录不存在" }, { status: 404 });

  await writeRecords(env, nextRecords);
  return json({ ok: true });
};
