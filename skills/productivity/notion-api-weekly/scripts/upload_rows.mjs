import fs from "node:fs";
import https from "node:https";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);

function arg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const token = process.env.NOTION_TOKEN || arg("--token");
const databaseArg = arg("--database") || process.env.NOTION_WEEKLY_DATABASE;
const inputPath = arg("--input");
const ownerArg = arg("--owner") || process.env.NOTION_WEEKLY_OWNER;
const dryRun = args.includes("--dry-run");

if (!token || !databaseArg || !inputPath) {
  console.error("Usage: node upload_rows.mjs --database <database-id-or-url> --input <rows.json>");
  console.error("Or set NOTION_WEEKLY_DATABASE locally and omit --database.");
  console.error("Set NOTION_TOKEN locally; do not store tokens in files.");
  process.exit(1);
}

function extractId(value) {
  const compact = value.replace(/-/g, "");
  const match = compact.match(/[0-9a-fA-F]{32}/);
  if (!match) return value;
  const id = match[0].toLowerCase();
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

function richText(content) {
  return [{ type: "text", text: { content: String(content) } }];
}

function localIso(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetRemainder = String(absoluteOffset % 60).padStart(2, "0");
  const local = new Date(date.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 19);
  return `${local}${sign}${offsetHours}:${offsetRemainder}`;
}

async function notion(path, options = {}) {
  const attempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await new Promise((resolve, reject) => {
        const body = options.body;
        const request = https.request(`https://api.notion.com/v1${path}`, {
          method: options.method || "GET",
          headers: {
            ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json; charset=utf-8",
          },
        }, (response) => {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            const parsed = text ? JSON.parse(text) : {};
            if (response.statusCode < 200 || response.statusCode >= 300) {
              reject(new Error(`Notion API ${response.statusCode} ${parsed.code || ""}: ${parsed.message || text}`));
              return;
            }
            resolve(parsed);
          });
        });

        request.on("error", reject);
        if (body) request.write(body);
        request.end();
      });
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  if (process.platform === "win32") {
    return notionWithPowerShell(path, options);
  }

  throw lastError;
}

function notionWithPowerShell(path, options = {}) {
  const method = options.method || "GET";
  const body = options.body || "";
  const bodyBase64 = Buffer.from(body, "utf8").toString("base64");
  const script = `
$ErrorActionPreference = "Stop"
$headers = @{
  Authorization = "Bearer $env:NOTION_TOKEN"
  "Notion-Version" = "2022-06-28"
  "Content-Type" = "application/json"
}
$bodyBytes = [Convert]::FromBase64String($env:NOTION_REQUEST_BODY_BASE64)
$uri = "https://api.notion.com/v1${path}"
if ($bodyBytes.Length -gt 0) {
  Invoke-RestMethod -Method "${method}" -Uri $uri -Headers $headers -Body $bodyBytes | ConvertTo-Json -Depth 50
} else {
  Invoke-RestMethod -Method "${method}" -Uri $uri -Headers $headers | ConvertTo-Json -Depth 50
}
`;
  const output = execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, NOTION_REQUEST_BODY_BASE64: bodyBase64 },
  });
  return JSON.parse(output);
}

function findProperty(schema, candidates, type) {
  for (const name of candidates) {
    if (schema[name]?.type === type) return name;
  }
  return Object.entries(schema).find(([, value]) => value.type === type)?.[0];
}

function buildProperties(item, schema, date) {
  const titleName = findProperty(schema, ["任务", "任务名称", "Name", "title"], "title");
  if (!titleName) throw new Error("No title property found in database.");

  const statusName = findProperty(schema, ["状态", "Status"], "status");
  const descName = findProperty(schema, ["备注", "描述", "说明", "Description", "Notes"], "rich_text");
  const dateName = findProperty(schema, ["创建时间", "日期", "Date"], "date");
  const typeName = findProperty(schema, ["系统", "任务类型", "类型", "System"], "multi_select");
  const ownerName = findProperty(schema, ["负责人", "Owner", "Assignee"], "people");

  const props = {
    [titleName]: { title: richText(item.name) },
  };

  if (statusName && item.status) props[statusName] = { status: { name: item.status } };
  if (descName && item.description) props[descName] = { rich_text: richText(item.description) };
  if (dateName) props[dateName] = { date: { start: date } };
  if (typeName && item.system) props[typeName] = { multi_select: [{ name: item.system }] };
  if (ownerName && item.ownerId) props[ownerName] = { people: [{ id: item.ownerId }] };

  return props;
}

function findPropertyByType(schema, type) {
  return Object.entries(schema).find(([, value]) => value.type === type)?.[0];
}

function findUser(users, owner) {
  if (!owner) return undefined;
  const needle = owner.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)) {
    return { id: owner };
  }
  return users.find((user) => {
    const email = user.person?.email?.toLowerCase();
    const emailName = email?.split("@")[0];
    return (
      user.id.toLowerCase() === needle ||
      user.name?.toLowerCase() === needle ||
      email === needle ||
      emailName === needle
    );
  });
}

const databaseId = extractId(databaseArg);
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const database = await notion(`/databases/${databaseId}`);
const schema = database.properties || {};
const typeName = findProperty(schema, ["系统", "任务类型", "类型", "System"], "multi_select");
const typeOptions = new Set(schema[typeName]?.multi_select?.options?.map((option) => option.name) || []);
const statusName = findPropertyByType(schema, "status");
const statusOptions = new Set(schema[statusName]?.status?.options?.map((option) => option.name) || []);
const users = ownerArg ? await notion("/users?page_size=100") : { results: [] };
const owner = ownerArg ? findUser(users.results, ownerArg) : undefined;
const uploadTime = localIso();

if (ownerArg && !owner) {
  throw new Error(`Owner not found: ${ownerArg}`);
}

for (const item of input.items || []) {
  if (typeName && item.system && !typeOptions.has(item.system)) {
    throw new Error(`Unknown ${typeName} option: ${item.system}. Choose one of: ${[...typeOptions].join(", ")}`);
  }
  if (statusName && item.status && !statusOptions.has(item.status)) {
    throw new Error(`Unknown ${statusName} status: ${item.status}. Choose one of: ${[...statusOptions].join(", ")}`);
  }
  if (owner) item.ownerId = owner.id;
}

if (dryRun) {
  console.log(JSON.stringify({
    database: database.title?.map((t) => t.plain_text).join("") || databaseId,
    properties: Object.fromEntries(Object.entries(schema).map(([name, value]) => [name, value.type])),
    typeProperty: typeName,
    typeOptions: [...typeOptions],
    statusProperty: statusName,
    statusOptions: [...statusOptions],
    uploadTime,
    owner: owner ? { id: owner.id, name: owner.name, email: owner.person?.email } : undefined,
    count: input.items?.length || 0,
  }, null, 2));
  process.exit(0);
}

const created = [];
for (const item of input.items || []) {
  const page = await notion("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: buildProperties(item, schema, uploadTime),
    }),
  });
  created.push({ name: item.name, url: page.url });
}

console.log(JSON.stringify({ count: created.length, created }, null, 2));
