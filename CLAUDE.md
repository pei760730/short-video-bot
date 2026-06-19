# CLAUDE.md — short-video-bot 協作規則

> 接手這個 repo(含 AI)先讀這份。short-video-bot = Telegram 短影音收集 bot,
> 取代舊 n8n 流程。貼「連結+備註」→ 解析→清理→判平台→抽 video ID→去重→寫 Google Sheet「暫存區」。

## 第一層:永久紅線(違反就停)

1. **機密永不進 git**:`TELEGRAM_BOT_TOKEN`、`service_account.json`、`.env`。有人提議 commit 立刻拒絕(`.gitignore` 已擋)。
2. **未經明確同意不 commit / push / 開 PR**。在 branch 做完、跑 `npm test` + `npm run typecheck`、先報告,等 yes。
3. **只改被要求的部分**,不順手改旁邊的 code/欄位。
4. **修 bug 前先想**:能不能用 schema/設定/純函式擋掉?n8n 的 regex 與邏輯要 1:1 保留,別憑印象重寫跑掉行為。
5. **不在 Sheet 裡的事實不能編造**;寫入後反向驗證(讀回確認),CLI 自報成功不算數。

## 第二層:資料地圖

| 找什麼 | 去哪 |
|---|---|
| 「暫存區」欄位 / schema(SSOT) | `src/types.ts`:`StagingRow` / `STAGING_COLUMNS` |
| 抽網址 + 備註 | `src/pipeline/parse.ts` |
| 清網址(追蹤參數/行動版/短網址) | `src/pipeline/cleanUrl.ts` |
| 判斷平台(domain 優先序) | `src/pipeline/detectPlatform.ts` |
| 抽 video ID(各平台 regex) | `src/pipeline/extractVideoId.ts` |
| pipeline 組合(parse→組草稿) | `src/pipeline/index.ts` |
| 去重 / 寫入 / 統計介面 | `src/storage/Storage.ts` |
| Google Sheets 實作 | `src/storage/googleSheets.ts` |
| 測試用記憶體 storage | `src/storage/memory.ts` |
| 收集流程 handler | `src/bot/handlers/collect.ts`(`runCollect`,不依賴 Telegraf) |
| `/stats` `/move` | `src/bot/handlers/{stats,move}.ts` |
| 指令路由 / 錯誤通知 | `src/bot/router.ts` |
| 訊息模板 | `src/messages/templates.ts` |
| 設定 / 環境變數 | `src/config.ts`(範本 `.env.example`) |

## 第三層:技術不變式

- **pipeline 全純函式**:parse / cleanUrl / detectPlatform / extractVideoId 無副作用、無網路,I/O 隔在 storage + handler。改邏輯先補 / 改 `tests/`。
- **時區固定 `Asia/Taipei`**(`src/utils/date.ts`),DATE 欄格式 `YYYY/M/D`(不補零,沿用 n8n moment 行為)。
- **寫入一律 RAW**(不用 USER_ENTERED),避免 video ID / 開頭 0 被吃成數字。
- **訊息純文字**,不用 MarkdownV2(舊版跳脫漏字會發送失敗)。
- **去重靠 `VIDEO_ID`**(去多餘空白),且只看 `DEDUPE_PERIOD_DAYS` 天內;`unknown_*` 視為唯一不去重。
- **storage 只認 `Storage` 介面**:換來源新增實作即可,handlers 不動。
- **最小權限**:Google 只用 `spreadsheets` scope。
- **fail fast**:缺必要 env 啟動就丟錯,不帶半套設定跑。

## 第四層:環境

- 使用者 **Pei**([pei760730](https://github.com/pei760730)),回覆繁體中文、短句直接。
- 技術棧已定案:Node.js + TypeScript、telegraf、googleapis、dayjs、vitest。儲存 Google Sheets。
- 部署:Docker 自架、long polling 為預設(`BOT_MODE=polling`)。webhook 模式需 `WEBHOOK_DOMAIN`。
- 開發指令:`npm run dev`(tsx watch)、`npm test`、`npm run typecheck`、`npm run build`。

## 第五層:待確認(邊做邊修)

- `/stats` 顯示哪些數字 —— 現為預設版(總筆數+各平台+本週/本月+狀態+最近5筆)。
- `/move` 行為 —— 現為「改 STATUS active→moved、不搬表」。要加「正式區」分頁時改 `handlers/move.ts` + storage。
- 短網址展開(`EXPAND_SHORT_URLS`)預設關;要開再驗 redirect 行為。
