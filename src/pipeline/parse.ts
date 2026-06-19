/**
 * Parse — 從 Telegram 訊息文字抽出第一個網址 + 備註。
 * 純函式,無副作用,好測試。
 */
import type { ParsedMessage } from "../types.js";

/** 抓訊息中第一個 http(s) 網址。 */
const URL_RE = /https?:\/\/\S+/;

export class NoUrlError extends Error {
  constructor() {
    super("訊息中找不到網址");
    this.name = "NoUrlError";
  }
}

export interface ParseInput {
  text: string;
  /** Telegram from.first_name;沒有就傳空字串。 */
  senderName?: string;
}

/**
 * @throws {NoUrlError} 訊息沒有網址(格式錯誤)。
 */
export function parseMessage(input: ParseInput): ParsedMessage {
  const text = (input.text ?? "").trim();
  const match = text.match(URL_RE);
  if (!match) {
    throw new NoUrlError();
  }
  const rawUrl = match[0];
  // 備註 = 訊息移除該網址後 trim(只移第一個,避免吃掉備註裡的其他字)
  const note = text.replace(rawUrl, "").trim();
  // 改進#5:SENDER 不再寫死 'Pei',用真實提交者,沒有才 unknown
  const sender =
    input.senderName && input.senderName.trim() !== ""
      ? input.senderName.trim()
      : "unknown";
  return { rawUrl, note, sender };
}
