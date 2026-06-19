/**
 * Google Sheets 版 Storage。
 * - 最小權限:只用 spreadsheets scope。
 * - 寫入一律 RAW(避免影片ID/開頭 0 被當數字)。
 * - append 用 values.append;狀態更新用 values.update 單格。
 */
import { google, type sheets_v4 } from "googleapis";
import type { Storage, DuplicateHit, StatsSummary } from "./Storage.js";
import type { StagingRow } from "../types.js";
import { STAGING_COLUMNS } from "../types.js";
import { computeStats } from "./computeStats.js";
import { ageInDays } from "../utils/date.js";
import { logger } from "../utils/logger.js";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export interface GoogleSheetsOptions {
  credentials: { client_email: string; private_key: string };
  sheetId: string;
  sheetName: string;
}

/** 0-based 欄索引 → A1 欄字母(0→A, 25→Z, 26→AA)。 */
function colLetter(index: number): string {
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

const LAST_COL = colLetter(STAGING_COLUMNS.length - 1);

export class GoogleSheetsStorage implements Storage {
  private sheets: sheets_v4.Sheets;
  private readonly sheetId: string;
  private readonly sheetName: string;

  constructor(opts: GoogleSheetsOptions) {
    this.sheetId = opts.sheetId;
    this.sheetName = opts.sheetName;
    const auth = new google.auth.JWT({
      email: opts.credentials.client_email,
      key: opts.credentials.private_key,
      scopes: SCOPES,
    });
    this.sheets = google.sheets({ version: "v4", auth });
  }

  /** `暫存區!A1:N1` 之類的 range,中文分頁名要加引號。 */
  private range(a1: string): string {
    return `'${this.sheetName}'!${a1}`;
  }

  private rowToValues(row: StagingRow): string[] {
    return STAGING_COLUMNS.map((c) => String(row[c] ?? ""));
  }

  private valuesToRow(values: string[]): StagingRow {
    const obj = {} as Record<string, string>;
    STAGING_COLUMNS.forEach((c, i) => {
      obj[c] = values[i] ?? "";
    });
    return obj as unknown as StagingRow;
  }

  /** 分頁不存在就建(voc init-sheet 不建「暫存區」,bot 自己負責)。 */
  private async ensureTab(): Promise<void> {
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.sheetId,
      fields: "sheets.properties.title",
    });
    const titles = (meta.data.sheets ?? []).map((s) => s.properties?.title);
    if (!titles.includes(this.sheetName)) {
      logger.info(`分頁不存在,建立:${this.sheetName}`);
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.sheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: this.sheetName } } }],
        },
      });
    }
  }

  async ensureHeader(): Promise<void> {
    await this.ensureTab();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: this.range(`A1:${LAST_COL}1`),
    });
    const header = res.data.values?.[0] ?? [];
    const expected = STAGING_COLUMNS as string[];
    const aligned =
      header.length === expected.length && expected.every((c, i) => header[i] === c);
    if (!aligned) {
      logger.warn("暫存區表頭與 schema 不一致,寫入正確表頭");
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.sheetId,
        range: this.range(`A1:${LAST_COL}1`),
        valueInputOption: "RAW",
        requestBody: { values: [expected] },
      });
    }
  }

  async readAll(): Promise<StagingRow[]> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: this.range(`A2:${LAST_COL}`),
    });
    const values = res.data.values ?? [];
    return values
      .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
      .map((r) => this.valuesToRow(r.map((c) => String(c ?? ""))));
  }

  async findByVideoId(videoId: string, withinDays?: number): Promise<DuplicateHit | null> {
    const key = videoId.trim(); // 改進#1:lookup 去多餘空白
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: this.range(`A2:${LAST_COL}`),
    });
    const values = res.data.values ?? [];
    for (let i = 0; i < values.length; i++) {
      const row = this.valuesToRow(values[i]!.map((c) => String(c ?? "")));
      if (row.VIDEO_ID.trim() !== key) continue;
      if (withinDays != null && ageInDays(row.DATE) > withinDays) continue;
      return { row, rowNumber: i + 2 }; // +2:表頭 + 1-based
    }
    return null;
  }

  async append(row: StagingRow): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: this.range(`A1:${LAST_COL}`),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [this.rowToValues(row)] },
    });
  }

  async updateStatus(rowNumber: number, status: string): Promise<void> {
    const statusCol = colLetter(STAGING_COLUMNS.indexOf("STATUS"));
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: this.range(`${statusCol}${rowNumber}`),
      valueInputOption: "RAW",
      requestBody: { values: [[status]] },
    });
  }

  async stats(opts: { recentLimit: number; nowMs: number }): Promise<StatsSummary> {
    const rows = await this.readAll();
    return computeStats(rows, opts);
  }
}
