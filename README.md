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

比賽 checkpoint 已改為每 2 秒一次（原本每 50 ms 一次），完賽立即保存；異常重啟最多可能退回最近約 2 秒的比賽進度。轉向使用伺服器狀態，較高網路延遲仍會影響手感。


## v0.4 主控台、關房與畫質

筆電開房後可查看每位玩家的 **ping RTT**（DO 發出 nonce，收到手機 pong 才計算，15 秒取樣一次）、線上人數、DO 物件 ID、比賽更新頻率、累計送出 JSON payload KB、收發訊息數、checkpoint 次數與下次 alarm。比賽中主控資訊最多每秒 2 次，玩家賽事保持 20 Hz。數字是此房間應用程式計數，會隨最近 checkpoint 恢復，並非 Cloudflare 帳單或平台 CPU 用量。

**強制關房**按鈕使用房主 token 驗證的 POST `/api/rooms/ROOMID/close`：取消 alarm → 刪除儲存資料 → 傳送關房確認 → 關閉所有 WebSocket。HTTP 和 WebSocket 都會回報清理結果。非房主不能關房。房間的事件採序列化處理，避免關房和比賽 tick 同時修改狀態。

自動清理：

- 所有連線離開：立即清理（網路無聲中斷需等待心跳偵測）。
- 心跳逾 45 秒未收到：移除失聯連線；15 秒 watchdog 檢查，因此可能多等一個檢查週期。
- 主控離線：60 秒重連寬限後關房。
- 比賽無玩家：立即停止 20 Hz 模擬，30 秒後關房。
- 集合區／結果頁閒置：5 分鐘關房；心跳不延長這個期限。
- 房間存在上限：1 小時。

DO 不是需手動關機的 VM。房間清理會停止它的遊戲工作，不是刪除整個 Durable Objects namespace。未關房的集合區仍有低頻心跳；關房後沒有常駐輪詢，但後續外部請求仍可能喚醒物件並產生請求用量。

確認方式：按強制關房，主控應顯示「房間已關閉」，所有手機退出。Cloudflare Worker Logs 可搜尋 JSON 事件 `room_closed`，包含 `alarmCancelled: true`、`dataDeleted: true`。再在 Cloudflare Durable Objects 的 Metrics 檢查請求、duration 與儲存寫入趨勢；平台指標可能延遲且是聚合值，其他房間流量仍會計入。不要用不停輪詢舊房間的方法驗證，輪詢本身會產生請求。

官方：[WebSocket 休眠與計費](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)、[Alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)。

### 效果選單

| 品質 | 效果 |
| --- | --- |
| 低（預設） | 原有低面數風格、每次 18 個碎片、無背景飄雪／即時陰影 |
| 中 | 樹冠分層、較圓滑石頭、48 個碎片、300 顆飄雪 |
| 高 | 8 層不規則樹冠、樹幹、細分石頭、雪面微凹凸、柔化陰影、110 個碎片、1,000 顆飄雪 |

高檔是更細緻的程序式 3D 美術，並非攝影級掃描素材；尚未在實體手機做畫質／效能驗收。低 FPS 會降低渲染像素比。碎片有重力、落地彈跳與消散；撞擊物件在本機畫面碎裂隱藏。碎片不透過網路傳輸，也不改變其他玩家的碰撞規則；每個人仍需自己閃避同一障礙。切換畫質會重建顯示場景，歷史碎片不保留。

### 終點計時修正

個人越線後立即使用伺服器 `finished` 秒數，停止送出操作，顯示自己的結果；其他玩家還在比賽時只更新排行榜。單人也會固定顯示完賽時間。完賽者依固定秒數排序，不再因大家距離都等於 7.2 km 而顯示相同名次。

驗證：16 項物理／感測器／顯示規則測試、DO 協定測試（真實後端程式搭配 mock runtime）與前端 bundle 建置。涵蓋關房取消 alarm、不再排程、空房／閒置／主控離線清理、ping 與權限、降低 checkpoint 頻率、個人成績固定。真實 Cloudflare 部署與手機畫質仍需實際驗證。
