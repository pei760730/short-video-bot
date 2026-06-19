/**
 * 一次性對接驗證(唯讀):用 voc 的 service account 連 voc 新表,
 * 只列出分頁、確認參考池在、檢查暫存區是否存在 —— 不建分頁、不寫入。
 * 跑法:npx tsx scripts/verify-sheet.ts
 */
import { readFileSync } from "node:fs";
import { google } from "googleapis";

const SHEET_ID = "1V_CaTb4YgtsFP7HLrLK3QHrKCMr2gPCnU0Xe7y7Dse0";
const STAGING = "暫存區";

const sa = JSON.parse(readFileSync("./service_account.json", "utf-8")) as {
  client_email: string;
  private_key: string;
};
const auth = new google.auth.JWT({
  email: sa.client_email,
  key: sa.private_key.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

const meta = await sheets.spreadsheets.get({
  spreadsheetId: SHEET_ID,
  fields: "properties.title,sheets.properties.title",
});
const tabs = (meta.data.sheets ?? []).map((s) => s.properties?.title ?? "");
console.log("表名:", meta.data.properties?.title);
console.log("現有分頁:", tabs.join(" / "));
console.log("參考池存在:", tabs.includes("參考池"));
console.log("暫存區存在:", tabs.includes(STAGING), tabs.includes(STAGING) ? "" : "(bot 啟動時會自建)");
