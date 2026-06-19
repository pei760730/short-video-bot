/**
 * /stats handler。預設版(邊做邊修):
 * 總筆數 + 各平台筆數 + 本週/本月新增 + 狀態分布 + 最近 5 筆。
 */
import type { Storage } from "../../storage/Storage.js";

export interface StatsDeps {
  storage: Storage;
  recentLimit?: number;
  now?: () => number;
}

export async function runStats(deps: StatsDeps): Promise<string> {
  const recentLimit = deps.recentLimit ?? 5;
  const nowMs = (deps.now ?? Date.now)();
  const s = await deps.storage.stats({ recentLimit, nowMs });

  if (s.total === 0) {
    return "📊 暫存區目前是空的。";
  }

  const platformLines = Object.entries(s.byPlatform)
    .sort((a, b) => b[1] - a[1])
    .map(([p, n]) => `  ${p}：${n}`);

  const statusLines = Object.entries(s.byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([st, n]) => `  ${st}：${n}`);

  const recentLines = s.recent.map((r) => {
    const note = r.NOTE ? ` — ${r.NOTE}` : "";
    return `  ${r.PLATFORM_ICON || "•"} ${r.VIDEO_ID}${note}（${r.DATE}）`;
  });

  return [
    `📊 暫存區統計（共 ${s.total} 筆）`,
    "",
    "各平台：",
    ...platformLines,
    "",
    `本週新增：${s.addedThisWeek}　本月新增：${s.addedThisMonth}`,
    "",
    "狀態：",
    ...statusLines,
    "",
    `最近 ${s.recent.length} 筆：`,
    ...recentLines,
  ].join("\n");
}
