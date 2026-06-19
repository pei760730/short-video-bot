/**
 * 訊息模板 —— 一律純文字(不用 MarkdownV2)。
 * 改進#2:n8n 版用 MarkdownV2 但沒跳脫,含 . - ( ) 會發送失敗;
 * 純文字最穩,emoji 照常顯示,不必跳脫。
 */
import type { StagingRow } from "../types.js";

export function formatErrorMsg(): string {
  return [
    "⚠️ 看不懂這則訊息。",
    "",
    "請貼「短影音連結 + 備註」,例如:",
    "https://www.tiktok.com/@user/video/1234567890 健身梗很好笑",
    "",
    "支援:TikTok / YouTube / Facebook / Instagram / X / 抖音 / 小紅書",
  ].join("\n");
}

export function successMsg(row: StagingRow, opts: { unsupported: boolean; isShortUrl: boolean }): string {
  const lines = [
    `${row.PLATFORM_ICON} 已收進暫存區`,
    `平台:${row.PLATFORM}`,
    `VIDEO_ID:${row.VIDEO_ID}`,
  ];
  if (row.NOTE) lines.push(`備註:${row.NOTE}`);
  lines.push(`提交者:${row.SENDER}　日期:${row.DATE}`);
  if (row.PLATFORM_CONFIDENCE === "medium") {
    lines.push("（平台是用 fallback 猜的,可能不準）");
  }
  if (opts.unsupported) {
    lines.push("⚠️ 這個平台抓不到 video ID,先以 unknown 收錄。");
  }
  if (opts.isShortUrl) {
    lines.push("🔗 偵測到短網址,已標記。");
  }
  return lines.join("\n");
}

export function duplicateMsg(existing: StagingRow): string {
  return [
    "♻️ 這支已經收過了,沒有重複寫入。",
    `VIDEO_ID:${existing.VIDEO_ID}`,
    `首次提交:${existing.DATE}　by ${existing.SENDER || "unknown"}`,
    existing.NOTE ? `當時備註:${existing.NOTE}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function saveErrorMsg(detail: string): string {
  return ["❌ 寫入失敗,沒有存進暫存區。", `原因:${detail}`].join("\n");
}
