/**
 * /move handler。預設版(邊做邊修):
 * 把暫存區內 STATUS=active 的列改成 moved(不搬表、不動結構)。
 * 之後若要加「正式區」分頁,改這支與 storage 即可,介面不變。
 *
 * 用法:
 *   /move            → 把所有 active 標成 moved
 *   /move <VIDEO_ID> → 只標該一筆
 */
import type { Storage } from "../../storage/Storage.js";
import { STATUS } from "../../types.js";
import { logger } from "../../utils/logger.js";

export interface MoveDeps {
  storage: Storage;
}

export async function runMove(arg: string, deps: MoveDeps): Promise<string> {
  const target = arg.trim();
  const rows = await deps.storage.readAll();

  // rowNumber = 索引 + 2(表頭 + 1-based)
  const candidates = rows
    .map((row, i) => ({ row, rowNumber: i + 2 }))
    .filter((x) => x.row.STATUS === STATUS.ACTIVE)
    .filter((x) => (target ? x.row.VIDEO_ID.trim() === target : true));

  if (candidates.length === 0) {
    return target
      ? `找不到 active 且 VIDEO_ID=${target} 的資料。`
      : "沒有 active 狀態的資料可搬移。";
  }

  let moved = 0;
  for (const c of candidates) {
    await deps.storage.updateStatus(c.rowNumber, STATUS.MOVED);
    moved++;
  }
  logger.info(`/move 標記 ${moved} 筆 active → moved`);
  return `✅ 已把 ${moved} 筆 active 標記為 moved。`;
}
