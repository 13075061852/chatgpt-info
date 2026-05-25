const recordKey = "records";

const sources = ["抖音", "快手", "小红书", "QQ", "微信"];
const packages = ["ChatGpt月卡", "ChatGpt年卡", "Cursor pro月卡", "Cursor pro月卡年卡", "ClaudeCode pro"];
const types = ["代充", "成品号"];

const seedRecords = [
  ["seed-1", "张三", "zhangsan_123", "抖音", "user123@example.com", "aBc123!@#", "ChatGpt月卡", "代充", 29.9, "2024-05-18T14:32:21.000Z", "已充月卡"],
  ["seed-2", "李四", "lisi_456", "快手", "lisi.ai@outlook.com", "Lisi2024@", "ChatGpt年卡", "代充", 298, "2024-05-17T10:18:00.000Z", "年卡优惠"],
  ["seed-3", "王五", "wangwu_789", "小红书", "wangwu11@gmail.com", "Ww2024#", "Cursor pro月卡", "成品号", 49, "2024-05-16T09:45:00.000Z", "成品号可登录"],
  ["seed-4", "赵六", "zhaoliu_666", "QQ", "zhaoliu@163.com", "Zhao666!@", "Cursor pro月卡年卡", "代充", 499, "2024-05-15T18:20:00.000Z", "年付优惠"],
  ["seed-5", "孙七", "sunqi_ai", "微信", "sunqi.ai@gmail.com", "Sunqi2024@", "ClaudeCode pro", "成品号", 199, "2024-05-14T12:06:00.000Z", "自动发货"],
  ["seed-6", "周八", "zhouba_88", "抖音", "zhouba@outlook.com", "Zb88@2024", "ChatGpt月卡", "代充", 29.9, "2024-05-13T16:38:00.000Z", "-"],
  ["seed-7", "吴九", "wujiu_999", "快手", "wujiu99@gmail.com", "Wujiu2024#", "ChatGpt年卡", "成品号", 268, "2024-05-12T11:12:00.000Z", "账号稳定"],
  ["seed-8", "郑十", "zhengshi_ai", "QQ", "zhengshi@126.com", "Zs2024@", "Cursor pro月卡", "代充", 49, "2024-05-11T15:30:00.000Z", "-"],
  ["seed-9", "冯十一", "feng11_2024", "小红书", "feng11@gmail.com", "Feng112024!", "ClaudeCode pro", "代充", 199, "2024-05-10T20:10:00.000Z", "-"],
  ["seed-10", "陈十二", "chen12_ai", "微信", "chen12@outlook.com", "Chen12@2024", "Cursor pro月卡年卡", "成品号", 469, "2024-05-09T08:50:00.000Z", "企业号"]
].map(([id, userName, wechat, source, account, password, packageName, recordType, price, purchaseTime, remark]) => ({
  id,
  userName,
  wechat,
  source,
  account,
  password,
  packageName,
  recordType,
  costPrice: price,
  salePrice: price,
  purchaseTime,
  remark,
  createdAt: "2024-05-18T14:32:21.000Z",
  updatedAt: "2024-05-18T14:32:21.000Z"
}));

const legacyValueMap = new Map([
  ["鎶栭煶", "抖音"],
  ["蹇墜", "快手"],
  ["灏忕孩涔?", "小红书"],
  ["寰俊", "微信"],
  ["ChatGpt鏈堝崱", "ChatGpt月卡"],
  ["ChatGpt骞村崱", "ChatGpt年卡"],
  ["Cursor pro鏈堝崱", "Cursor pro月卡"],
  ["Cursor pro鏈堝崱骞村崱", "Cursor pro月卡年卡"],
  ["浠ｅ厖", "代充"],
  ["鎴愬搧鍙?", "成品号"]
]);

const normalizeLegacyRecord = (record) => ({
  ...record,
  source: legacyValueMap.get(record.source) || record.source,
  packageName: legacyValueMap.get(record.packageName) || record.packageName,
  recordType: legacyValueMap.get(record.recordType) || record.recordType,
  costPrice: Number(record.costPrice ?? record.price ?? 0),
  salePrice: Number(record.salePrice ?? record.price ?? 0),
  purchaseTime: record.purchaseTime || record.createdAt || "2024-05-18T14:32:21.000Z"
});

export const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });

export const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

export const readRecords = async (env) => {
  const stored = await env.DATA_STORE?.get(recordKey);
  if (!stored) {
    await writeRecords(env, seedRecords);
    return seedRecords;
  }
  const rawRecords = JSON.parse(stored);
  const looksLikeOldSeed = rawRecords.length <= 3 && rawRecords.every((record) => String(record.id || "").startsWith("seed-"));
  if (looksLikeOldSeed) {
    await writeRecords(env, seedRecords);
    return seedRecords;
  }
  const records = rawRecords.map(normalizeLegacyRecord);
  if (rawRecords.some((record, index) => JSON.stringify(record) !== JSON.stringify(records[index]))) {
    await writeRecords(env, records);
  }
  return records;
};

export const writeRecords = async (env, records) => {
  if (!env.DATA_STORE) {
    throw new Error("DATA_STORE KV binding is missing");
  }
  await env.DATA_STORE.put(recordKey, JSON.stringify(records));
};

export const validateRecord = (payload) => {
  const hasCostPrice = String(payload.costPrice ?? "").trim() !== "";
  const hasSalePrice = String(payload.salePrice ?? "").trim() !== "";
  const record = {
    userName: String(payload.userName || "").trim(),
    wechat: String(payload.wechat || "").trim(),
    source: String(payload.source || "").trim(),
    account: String(payload.account || "").trim(),
    password: String(payload.password || "").trim(),
    packageName: String(payload.packageName || "").trim(),
    recordType: String(payload.recordType || "").trim(),
    costPrice: Number(payload.costPrice),
    salePrice: Number(payload.salePrice),
    purchaseTime: String(payload.purchaseTime || "").trim(),
    remark: String(payload.remark || "").trim()
  };

  const required = ["userName", "wechat", "source", "account", "password", "packageName", "recordType", "purchaseTime"];
  const missing = required.find((field) => !record[field]);
  if (missing) return { error: `${missing} is required` };
  if (!hasCostPrice) return { error: "成本价必填" };
  if (!hasSalePrice) return { error: "售价必填" };
  if (!sources.includes(record.source)) return { error: "来源不在允许范围内" };
  if (!packages.includes(record.packageName)) return { error: "套餐不在允许范围内" };
  if (!types.includes(record.recordType)) return { error: "类型不在允许范围内" };
  if (!Number.isFinite(record.costPrice) || record.costPrice < 0) return { error: "成本价必须是非负数字" };
  if (!Number.isFinite(record.salePrice) || record.salePrice < 0) return { error: "售价必须是非负数字" };
  if (Number.isNaN(new Date(record.purchaseTime).getTime())) return { error: "购买时间格式不正确" };

  return { record };
};

const textEncoder = new TextEncoder();

const base64Url = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const sign = async (value, secret) => {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, textEncoder.encode(value)));
};

export const makeSession = async (username, env) => {
  const expires = Date.now() + 1000 * 60 * 60 * 12;
  const payload = `${username}.${expires}`;
  const signature = await sign(payload, env.SESSION_SECRET || "dev-session-secret");
  return `${payload}.${signature}`;
};

export const sessionCookie = (request, value, maxAge) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `session=${encodeURIComponent(value)}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
};

export const getSessionUser = async (request, env) => {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) return null;

  const [username, expires, signature] = decodeURIComponent(match[1]).split(".");
  if (!username || !expires || !signature || Number(expires) < Date.now()) return null;

  const expected = await sign(`${username}.${expires}`, env.SESSION_SECRET || "dev-session-secret");
  return signature === expected ? { username } : null;
};

export const requireUser = async (request, env) => {
  const user = await getSessionUser(request, env);
  if (!user) return { response: json({ error: "未登录" }, { status: 401 }) };
  return { user };
};
