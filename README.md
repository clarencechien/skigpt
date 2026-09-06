# skigpt — ALPINE RUSH 雪線競速

手機直式 Three.js 第一人稱滑雪競速，Cloudflare Worker + Durable Objects 多人房間。筆電開房、朋友掃 QR Code 在自己的手機玩，同場顯示對手，比誰先到終點。

## Cloudflare Dashboard 連接 GitHub 部署

在 **Workers & Pages → Create application → Import a repository**（或 Connect Git）選擇 `clarencechien/skigpt`，建立 **Worker**。

| 設定 | 值 |
| --- | --- |
| Worker / Project name | `skigpt` |
| Production branch | `main` |
| Root directory | repository 根目錄（留空或 `/`） |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node.js | `.node-version` 已指定 `22.16.0` |
| Build output directory | 不需另外填；`wrangler.jsonc` 已指定 `standalone` |
| Environment variables / secrets | 遊戲本身不需要 |

Cloudflare Builds 會依 package-lock.json 安裝依賴。`npm run build` 產生遊戲前端，`wrangler deploy` 同時上傳前端資產與 Worker，並依設定建立 `ROOMS` Durable Objects 綁定及首次 SQLite migration。Worker 名稱需與設定中的 `skigpt` 一致。

這是完整 Worker 部署，請使用 **Workers 的 Git 整合**。若介面一直要求 Pages 的「輸出目錄」，請回到建立 Worker 的流程。

首次成功後，開啟 Dashboard 顯示的 workers.dev HTTPS 網址：

1. 筆電按「筆電開房」。
2. 手機掃 QR Code，輸入暱稱並授權體感。
3. 筆電按「全員出發」，四秒倒數後一起競速。
4. 日後推送到 `main`，Cloudflare 自動重新建置與部署。

不需要在 GitHub 加 Cloudflare API token；Workers Builds 的部署權限由 Dashboard 連接流程管理。使用 Durable Objects 的帳號需具備對應功能及可用配額。

官方設定參考：[Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)。

## 速度與操作

- **連續點擊最高 2×**（44 m/s，畫面約 158 km/h）。第一次點擊解鎖 2×，速度平滑上升，不會瞬間跳到極速。
- **超過 2× 必須跳板＋後空翻**，一般從 2× 依序升到 3×、4×…最高 9×。之後點擊可維持已取得的高速段位，不會降回 2×。
- 不持續點擊會回落至當前段位的 72% 巡航速度。
- 直式左右傾斜控制雪道位置；手機回正回中。按「體感校正」重取舒適握姿。
- 对準橘色跳板，進入前或滯空中向上輕甩。提早輸入保留 0.65 秒，每次跳躍只能升一段。
- 缺少線性加速度時使用含重力資料；無 motion 時以俯仰角備援。畫面會顯示實際收到的感測器狀態。
- 可用螢幕按鈕；鍵盤 ←/→ 或 A/D 轉彎、空白加速、↑ 後空翻。
- 樹石擦撞會減速、噴雪，保留已取得段位。玩家彼此碰撞只有特效，不影響速度。
- 7.2 km 雪道，最多 16 人；每場最多 10 分鐘，房間約一小時到期。

## 本機開發 / 驗證

Node 22.13+：

```bash
npm ci
npm test
npm run build
npm run check:deploy
npm run dev
```

`npm run check:deploy` 僅執行 Wrangler dry-run，檢查 Worker bundle 與綁定，不上傳到 Cloudflare。

手動 CLI 部署（Dashboard Git 整合不需要執行）：

```bash
npx wrangler login
npm run build
npm run deploy
```

`npm run test:integration` 是 Miniflare / workerd 的真實 WebSocket 測試，需要環境允許本機網路監聽；其餘測試不需網路。

## 架構與限制

- `game/physics.mjs`：前後端共享固定種子賽道及比賽規則；伺服器計算距離、段位、碰撞與完賽時間。
- `game/motion.mjs`：手機轉向校正、甩動判定與感測器備援。
- `game/renderer.ts`：低面數雪道、實例化樹林、霧化遠景、對手與雪花。
- `app/page.tsx`：React 遊戲介面、WebSocket 連線、QR Code。
- `multiplayer/worker.mjs`：每房一個 RaceRoom DO，20 Hz 更新及廣播、主控權限、玩家秘密重連憑證。
- `wrangler.jsonc`：Worker `skigpt`、Assets、ROOMS 綁定及 SQLite migration。

已驗證物理／感測器回歸及模擬 DO 協定；含純點擊 2× 上限、跳板升到 9× 完賽。不宣稱手機硬體、16 人負載或真實 Cloudflare 多人連線已全部測通。

目前每 50 ms 保存比賽狀態，優先確保原型重啟可恢復；長時間公開營運前應評估 DO 寫入成本並優化 checkpoint 頻率。轉向使用伺服器狀態，較高網路延遲仍會影響手感。
