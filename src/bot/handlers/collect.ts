/**
 * 收集 pipeline handler。
 * runCollect 不依賴 Telegraf —— 吃 {text, senderName} 回 {reply, error},
 * 方便用 MemoryStorage 寫整合測試。Telegraf wiring 在 router.ts。
 */
import { parseMessage, NoUrlError } from "../../pipeline/parse.js";
import { assembleDraft } from "../../pipeline/index.js";
import type { Storage } from "../../storage/Storage.js";
import { expandShortUrl } from "../../utils/expandUrl.js";
import { logger } from "../../utils/logger.js";
import {
  formatErrorMsg,
  successMsg,
  duplicateMsg,
  saveErrorMsg,
} from "../../messages/templates.js";

export interface CollectDeps {
  storage: Storage;
  dedupePeriodDays: number;
  expandShortUrls: boolean;
  now?: () => number;
}

export interface CollectResult {
  reply: string;
  /** 有值 → 也要通知 error chat。 */
  error?: string;
}

export async function runCollect(
  input: { text: string; senderName?: string },
  deps: CollectDeps,
): Promise<CollectResult> {
  const now = deps.now ?? Date.now;

  let parsed;
  try {
    parsed = parseMessage({ text: input.text, senderName: input.senderName });
  } catch (err) {
    if (err instanceof NoUrlError) {
      return { reply: formatErrorMsg() };
    }
    throw err;
  }

  // 短網址展開(opt-in)。展開在 clean 之前,讓平台判斷吃到真實網址。
  if (deps.expandShortUrls) {
    const expanded = await expandShortUrl(parsed.rawUrl);
    if (expanded !== parsed.rawUrl) {
      parsed = { ...parsed, rawUrl: expanded };
    }
  }

  const draft = assembleDraft(parsed, now);

  // 去重:只看 N 天內的同 VIDEO_ID(改進#3)。unknown_* 視為唯一,不去重。
  if (!draft.unsupported) {
    const hit = await deps.storage.findByVideoId(draft.videoId, deps.dedupePeriodDays);
    if (hit) {
      return { reply: duplicateMsg(hit.row) };
    }
  }

  try {
    await deps.storage.append(draft.row);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.error("寫入暫存區失敗", err);
    return {
      reply: saveErrorMsg(detail),
      error: `collect 寫入失敗:${detail}｜url=${draft.row.VIDEO_REF}`,
    };
  }

  logger.info(`收錄 ${draft.row.PLATFORM} ${draft.videoId}`);
  return {
    reply: successMsg(draft.row, {
      unsupported: draft.unsupported,
      isShortUrl: draft.isShortUrl,
    }),
  };
}
