#!/usr/bin/env node
'use strict';

/**
 * Reusable Feishu bug-table updater for ETMS-style bug sheets.
 *
 * This is a public-safe template. Do not hard-code real app secrets, sheet
 * tokens, chat ids, cookies, or private media tokens in this file.
 *
 * Configuration sources, in priority order:
 *   1. Environment variables
 *   2. bug_config.json in the current working directory
 *   3. Defaults below
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const cwd = process.cwd();
const localConfigPath = path.join(cwd, 'bug_config.json');
const fileConfig = fs.existsSync(localConfigPath)
  ? JSON.parse(fs.readFileSync(localConfigPath, 'utf8'))
  : {};

function env(name, fallback = '') {
  return process.env[name] || fileConfig[name] || fallback;
}

function parseSheets(value) {
  if (Array.isArray(value)) return value;
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`ETMS_BUG_SHEETS must be JSON: ${error.message}`);
  }
}

const CONFIG = {
  sheetToken: env('FEISHU_SHEET_TOKEN'),
  appId: env('FEISHU_APP_ID'),
  appSecret: env('FEISHU_APP_SECRET'),
  chatId: env('FEISHU_CHAT_ID'),
  htmlFile: env('ETMS_BUG_HTML', path.join(cwd, 'bug.html')),
  owner: env('ETMS_BUG_OWNER', '28'),
  appSheetId: env('ETMS_APP_SHEET_ID', 'XNeO5J'),
  sheets: parseSheets(process.env.ETMS_BUG_SHEETS || fileConfig.ETMS_BUG_SHEETS) || [
    {id: 'NqDPGd', range: 'A1:Z1000', name: '正式环境紧急Bug反馈'},
    {id: 'wdLlAN', range: 'A1:Z1000', name: '三期Web端验收测试'},
    {id: 'XNeO5J', range: 'A1:Z1000', name: 'APP端验收测试'},
  ],
};

const TARGET_STATUSES = ['待解决', '解决中', '后期解决'];

function requireConfig() {
  const missing = ['sheetToken', 'appId', 'appSecret'].filter((key) => !CONFIG[key]);
  if (missing.length) {
    throw new Error(
      `Missing required Feishu config: ${missing.join(', ')}. ` +
      'Set FEISHU_SHEET_TOKEN, FEISHU_APP_ID, FEISHU_APP_SECRET, or create bug_config.json.'
    );
  }
}

function requestJson(method, apiPath, body, token) {
  return new Promise((resolve, reject) => {
    const bodyText = body ? JSON.stringify(body) : '';
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: apiPath,
      method,
      headers: {
        ...(bodyText ? {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyText)} : {}),
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (res.statusCode >= 400 || parsed.code) {
            reject(new Error(`Feishu API error ${res.statusCode}: ${data.slice(0, 500)}`));
            return;
          }
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Invalid JSON from Feishu: ${error.message}`));
        }
      });
    });
    req.on('error', reject);
    if (bodyText) req.write(bodyText);
    req.end();
  });
}

async function getTenantToken() {
  const res = await requestJson('POST', '/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: CONFIG.appId,
    app_secret: CONFIG.appSecret,
  });
  if (!res.tenant_access_token) throw new Error('Feishu did not return tenant_access_token');
  return res.tenant_access_token;
}

function cellToText(cell) {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'string' || typeof cell === 'number') return String(cell);
  if (Array.isArray(cell)) return cell.map(cellToText).join('');
  if (typeof cell === 'object') {
    if (cell.text !== undefined) return cellToText(cell.text);
    if (cell.name !== undefined) return cellToText(cell.name);
    if (cell.value !== undefined) return cellToText(cell.value);
    if (cell.link !== undefined) return cellToText(cell.link);
  }
  return '';
}

function escapeHtml(value) {
  return cellToText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function excelDateToText(value) {
  const raw = cellToText(value);
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return raw || '-';
  const date = new Date((num - 25569) * 86400 * 1000);
  return date.toLocaleDateString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit'});
}

async function readSheet(token, sheetId, range, renderOption = 'ToString') {
  const apiPath = `/open-apis/sheets/v2/spreadsheets/${CONFIG.sheetToken}/values/${sheetId}!${range}?valueRenderOption=${renderOption}`;
  const res = await requestJson('GET', apiPath, null, token);
  return res.data?.valueRange?.values || [];
}

function findColumn(headers, names, fallback) {
  for (const name of names) {
    const index = headers.indexOf(name);
    if (index >= 0) return index;
  }
  return fallback;
}

async function fetchSheetBugs(token, sheet) {
  const values = await readSheet(token, sheet.id, sheet.range || 'A1:Z1000');
  if (!values.length) return {...sheet, bugs: []};

  const headers = values[0].map(cellToText);
  const idIdx = findColumn(headers, ['编号', 'ID', '#'], 0);
  const moduleIdx = findColumn(headers, ['功能模块', '模块'], 1);
  const descIdx = findColumn(headers, ['Bug描述', '问题描述', '描述'], 2);
  const severityIdx = findColumn(headers, ['严重程度'], 7);
  const priorityIdx = findColumn(headers, ['优先级'], 8);
  const statusIdx = findColumn(headers, ['解决状态'], 9);
  const submitterIdx = findColumn(headers, ['提交人'], 10);
  const submitTimeIdx = findColumn(headers, ['提交时间'], 11);
  const remarkIdx = findColumn(headers, ['备注'], 15);
  const assignIdx = findColumn(headers, ['分配状态', '状态'], 17);

  const bugs = values.slice(1).map((row, offset) => ({
    id: cellToText(row[idIdx]) || String(offset + 1),
    sheetId: sheet.id,
    sheetName: sheet.name || sheet.id,
    module: cellToText(row[moduleIdx]),
    desc: cellToText(row[descIdx]),
    severity: cellToText(row[severityIdx]),
    priority: cellToText(row[priorityIdx]),
    status: cellToText(row[statusIdx]),
    assignStatus: cellToText(row[assignIdx]),
    submitter: cellToText(row[submitterIdx]),
    submitTime: row[submitTimeIdx],
    remark: cellToText(row[remarkIdx]),
  })).filter((bug) => TARGET_STATUSES.includes(bug.status));

  return {...sheet, bugs};
}

function statusClass(status) {
  if (status === '待解决') return 'todo';
  if (status === '解决中') return 'doing';
  return 'later';
}

function renderHtml(sheetResults) {
  const ownerBugs = sheetResults.flatMap((sheet) => sheet.bugs)
    .filter((bug) => bug.assignStatus === CONFIG.owner);
  const now = new Date().toLocaleString('zh-CN');
  const appCount = ownerBugs.filter((bug) => bug.sheetId === CONFIG.appSheetId).length;

  const sections = sheetResults.map((sheet) => {
    const rows = sheet.bugs.map((bug) => `
      <tr class="${bug.assignStatus === CONFIG.owner ? 'mine' : ''}">
        <td>${escapeHtml(bug.id)}</td>
        <td>${escapeHtml(bug.module)}</td>
        <td class="desc">${escapeHtml(bug.desc)}</td>
        <td>${escapeHtml(bug.severity)}</td>
        <td>${escapeHtml(bug.priority)}</td>
        <td><span class="status ${statusClass(bug.status)}">${escapeHtml(bug.status)}</span></td>
        <td class="assign">${escapeHtml(bug.assignStatus || '-')}</td>
        <td>${escapeHtml(bug.submitter)}</td>
        <td>${escapeHtml(excelDateToText(bug.submitTime))}</td>
        <td class="remark">${escapeHtml(bug.remark)}</td>
      </tr>`).join('') || '<tr><td colspan="10" class="empty">暂无数据</td></tr>';

    return `
      <section>
        <h2>${escapeHtml(sheet.name || sheet.id)} <small>${sheet.bugs.length}</small></h2>
        <table>
          <thead><tr><th>#</th><th>功能模块</th><th>Bug描述</th><th>严重程度</th><th>优先级</th><th>解决状态</th><th>分配状态</th><th>提交人</th><th>提交时间</th><th>备注</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ETMS Bug Table</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;margin:24px;background:#f6f7f9;color:#202124}header,section{background:#fff;border:1px solid #e6e8eb;border-radius:8px;padding:16px;margin-bottom:16px}h1{margin:0 0 8px;font-size:22px}h2{font-size:17px;margin:0 0 12px}small{color:#6b7280}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-top:1px solid #edf0f2;padding:8px;text-align:left;vertical-align:top}th{background:#fafafa;color:#4b5563}.desc{max-width:420px}.remark{max-width:220px}.assign{text-align:center;font-weight:700}.mine{background:#fff8e6}.status{border-radius:999px;padding:2px 8px;font-size:12px}.todo{background:#fee2e2;color:#991b1b}.doing{background:#dbeafe;color:#1e40af}.later{background:#fef3c7;color:#92400e}.empty{text-align:center;color:#9ca3af;padding:24px}
</style>
</head>
<body>
<header>
  <h1>ETMS Bug Table</h1>
  <div>Updated: ${escapeHtml(now)} | Owner: ${escapeHtml(CONFIG.owner)} | Owner open bugs: ${ownerBugs.length} | APP owner bugs: ${appCount}</div>
</header>
${sections}
</body>
</html>`;
}

async function sendSummary(token, sheetResults) {
  if (!CONFIG.chatId) return;
  const total = sheetResults.reduce((sum, sheet) => sum + sheet.bugs.length, 0);
  const mine = sheetResults.flatMap((sheet) => sheet.bugs).filter((bug) => bug.assignStatus === CONFIG.owner).length;
  const lines = [`ETMS bug table updated`, `Open bugs: ${total}`, `Owner ${CONFIG.owner}: ${mine}`];
  await requestJson('POST', '/open-apis/im/v1/messages?receive_id_type=chat_id', {
    receive_id: CONFIG.chatId,
    msg_type: 'text',
    content: JSON.stringify({text: lines.join('\n')}),
  }, token);
}

async function main() {
  requireConfig();
  const token = await getTenantToken();
  const sheetResults = await Promise.all(CONFIG.sheets.map((sheet) => fetchSheetBugs(token, sheet)));
  const html = renderHtml(sheetResults);
  fs.mkdirSync(path.dirname(CONFIG.htmlFile), {recursive: true});
  fs.writeFileSync(CONFIG.htmlFile, html, 'utf8');
  console.log(`Updated ${CONFIG.htmlFile}`);
  await sendSummary(token, sheetResults).catch((error) => {
    console.warn(`Feishu notification skipped: ${error.message}`);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
