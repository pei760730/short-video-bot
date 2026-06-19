/**
 * Parse — 從 Telegram 訊息文字抽出第一個網址 + 備註。
 * 純函式,無副作用,好測試。
 */
import type { ParsedMessage } from "../types.js";

/** 抓訊息中第一個 http(s) 網址。 */
const URL_RE = /https?:\/\/\S+/;

// 1) 截斷在第一個「非 URL 合法字元」—— CJK 等必須 %-encode 的字不會出現在裸 URL,
//    所以遇到就代表後面是備註。把 `…/abc。很好笑` 切回 `…/abc`。
const NON_URL_CHAR = /[^A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%].*$/u;
// 2) 再剝掉尾端句讀(這些雖是合法 URL 字元,但黏在連結尾幾乎都是標點)。
const TRAILING_PUNCT = /[.,;:!?)\]'"}>]+$/u;

/** 把訊息抓到的裸 URL 修乾淨:截斷非法字元 + 剝尾端標點。 */
export function tidyUrl(raw: string): string {
  return raw.replace(NON_URL_CHAR, "").replace(TRAILING_PUNCT, "");
}

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
  const rawUrl = tidyUrl(match[0]);
  if (!/^https?:\/\/\S/.test(rawUrl)) {
    // 整段被剝光(例如 `https://` 後面全是標點)→ 視為沒有有效網址
    throw new NoUrlError();
  }
  // 備註 = 訊息移除該(已修乾淨的)網址後 trim。rawUrl 是原 token 的前綴,
  // 被截掉的尾巴(備註正文)會自然留在 note 裡。
  const note = text.replace(rawUrl, "").trim();
  // 改進#5:SENDER 不再寫死 'Pei',用真實提交者,沒有才 unknown
  const sender =
    input.senderName && input.senderName.trim() !== ""
      ? input.senderName.trim()
      : "unknown";
  return { rawUrl, note, sender };
}
