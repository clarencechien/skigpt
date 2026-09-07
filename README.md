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
| Runtime variables / secrets | 開房必填 `ACCESS_TEAM_DOMAIN`、`ACCESS_AUD`，見 v0.5 設定 |

Cloudflare Builds 會依 package-lock.json 安裝依賴。`npm run build` 產生遊戲前端，`wrangler deploy` 同時上傳前端資產與 Worker，並依設定建立 `ROOMS` Durable Objects 綁定及首次 SQLite migration。Worker 名稱需與設定中的 `skigpt` 一致。

這是完整 Worker 部署，請使用 **Workers 的 Git 整合**。若介面一直要求 Pages 的「輸出目錄」，請回到建立 Worker 的流程。

首次成功後，請在 Dashboard → Worker → Settings → Domains & Routes 綁定正式 Custom Domain，並開啟該 HTTPS 網址（v0.6.3 已停用 workers.dev 與 Preview URLs）：

1. 完成下方 Cloudflare Access 設定，筆電按「Access 登入開房」，通過驗證後開房。
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

**強制關房**按鈕使用房主 token 驗證的 POST `/host/api/rooms/ROOMID/close`（v0.5 起同時要求 Access）：取消 alarm → 刪除儲存資料 → 傳送關房確認 → 關閉所有 WebSocket。HTTP 和 WebSocket 都會回報清理結果。非房主不能關房。房間的事件採序列化處理，避免關房和比賽 tick 同時修改狀態。

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


## v0.5 開房者 Access、位置資訊、單人 AI

### 必須先設定 Access 才能開房

v0.5 採 fail-closed：設定未完成時顯示 503，未登入或 token 無效時回 401/403。一般玩家加入與單人練習仍為公開功能。程式不提供略過 Access 的 production 開關。

1. 在 Cloudflare Zero Trust → Access controls → Applications 建立 **Self-hosted** 應用程式。
2. 使用遊戲的實際 hostname，保護 **`/host` 與 `/host/*`**，涵蓋主控入口、開房 API、主控 WebSocket 與關房 API。請確認兩個路徑都被涵蓋。
3. Allow policy 限制可開房的 email／群組，依你的名單設定；不可設為 Everyone 或 Bypass。
4. 複製此應用程式的 Application Audience（AUD）Tag，並取得團隊 `xxx.cloudflareaccess.com` 網域。
5. Worker `skigpt` → Settings → Variables and Secrets 新增下面兩項 **Runtime Secret**，再部署／重載。它們不是密碼，使用 Secret 類型是為了讓 Wrangler 後續 Git 部署保留 Dashboard 管理的值。不要只設在 Build variables。

| 名稱 | 填入內容 |
| --- | --- |
| `ACCESS_TEAM_DOMAIN` | 你的 `xxx.cloudflareaccess.com`（可含 https://） |
| `ACCESS_AUD` | 上一步複製的 Application Audience Tag |
| `CF_ZONE_NAME`（選填，同樣可用 Runtime Secret） | 遊戲自訂網域所屬 DNS zone，例如 `example.com` |
| `DO_LOCATION_HINT`（選填，同樣可用 Runtime Secret） | `apac` 或其他受支援地區；不填為 automatic |

設定需在你的 Cloudflare 帳號完成；原始碼沒有預填虛構 Access 網域、AUD 或擅自指定允許登入的人。若目前 workers.dev 介面只提供保護整站的 Access 快捷設定，而你希望手機玩家免登入，請使用自訂網域建立上述路徑型應用程式，不要把整個遊戲網站套進同一個 Access 限制。

首頁「Access 登入開房」先導向 `/host`，Access edge policy 負責登入流程；Worker 再使用 WebCrypto 驗證 RS256 簽章、issuer、audience、exp、nbf 與使用者身份。只檢查 header 存在並不算驗證。驗證通過後 UI 顯示房主 email，按開房即可。主控操作同時綁定 Access 的 sub 與房主 token，另一個已登入的人也不能接管你的房間。

JWT 公鑰只從已設定的團隊 certs URL 取得，快取 5 分鐘。Access 到期會關閉主控連線；重新登入後才能再連線，房間仍遵守主控離線 60 秒清理規則。此版不支援無使用者 email 的 Access service token 開房。

舊 `/api/rooms/.../create`、`/close` 及公開路徑的 `?host=` 皆被拒絕，避免繞過 `/host`。公開請求上的內部身份 headers 會被清除。舊版已開的房間沒有 Access owner，請在更新前結束並重開；新版本不把未驗證的舊房主自動升權。

[Access 官方 JWT 驗證文件](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)。

### Zone / region 顯示的意義

- hostname：開房所用遊戲網域。
- DNS zone：你填入的 `CF_ZONE_NAME`，明確標示「設定值」；workers.dev 沒有你的自訂 DNS zone。
- 開房入口機房：開房請求的 `request.cf.colo`，例如 TPE。
- 開房端地區：開房請求的 country / region，屬於用戶位置，並非 DO 位置。
- DO location hint：你設定的期望地區，只在物件首次定位時有效，不保證實際落點。
- DO jurisdiction：從 `ctx.id.jurisdiction` 取得（若有），代表地區限制而不是實際機房。
- DO 實際機房：沒有直接可用的實際 colo 查詢欄位，保留未知；不拿入口機房冒充。

這些位置資訊在開房時記錄，只送給房主 dashboard。不要透過對外 probe 猜測機房位置。[Cloudflare DO data location](https://developers.cloudflare.com/durable-objects/reference/data-location/)。

### 輕鬆 AI 陪跑

集合區只有 **1 位線上真人玩家**（不含筆電主控）時，自動顯示 `小雪 · AI 陪跑`；第二位真人加入就移除 AI。開賽時固定名單，賽中不突然增加對手。AI 在同一個 DO 內使用相同 step 物理運算，走同一條賽道，所有手機看到同一個 AI。

AI 起步延遲約 1.8 秒、間歇加速，巡航弱於持續點擊 2× 的真人；會漏掉大多數跳板、偶爾避障失誤，沒有傳送或追趕瞬移。真人尚未突破 2× 時 AI 也不超過 2×；真人解鎖更高段後 AI 最多到 3×。

AI 沒有獨立 WebSocket，因此不顯示虛假的 ping，標示「AI · 同 DO」。真人全離開時，AI 不會讓空房繼續 20 Hz 工作，也不會延長清理期限。這可測試多人狀態廣播、畫面中的對手及排名，但不能取代兩台真手機的網路延遲測試。單人練習模式不連 DO，也不自動加入此 AI。

驗證：21 項回歸測試，加上 DO 協定與 Worker 路由測試；涵蓋實際 RSA 簽章／偽造／錯誤 AUD／過期、公開路徑繞過拒絕、身份 header 清除、位置來源、AI 速度上限、AI 完賽及真人離場清理。Access edge policy、真實部署及跨手機效果仍需你的帳號實測。

## v0.6.0 多人視野與起跑體驗

- 修正所有角色同座標起跑、第一人稱只見頭盔：開賽前伺服器安排橫向起跑位置，所有人距離同為 0；清除未連線的待機名額。
- 倒數鏡頭依畫面比例與起跑陣列寬度拉遠，出發後 1.2 秒平順回到第一人稱。
- 對手使用低面數滑雪者：外套、頭盔、護目鏡、四肢、雪板、雪杖，呈現轉彎傾斜與空翻。顏色由玩家 ID 決定，在各手機一致。
- 近鏡頭淡出，避免穿入角色；位置採短時間平滑，角色重疊不改物理。
- 最多三張前方 140m 內姓名／距離標籤，避免重疊並保留操作區；左側雷達顯示前後 45m，白箭頭為自己，圓點真人、方點 AI。雷達橫向為相對雪道位置。
- 所有提示不攔截觸控；共用原有場景繪製，沒有第二個後照鏡畫面，也沒有新增網路訊息或 DO 排程。

參考：iRacing 官方 [Spotting](https://support.iracing.com/support/solutions/articles/31000162971-spotting) 說明視野外車輛資訊對競速判斷的用途；此處將概念轉為靜音手機雷達，並非照搬其 UI。

驗證：`tests/opponent-view.test.mjs` 涵蓋 2–16 人起跑間距、直式與橫式的完整角色投影、雷達篩選及貼近淡出。建置、DO 模擬協定與 Access 路由測試通過；尚待真機多人視覺驗收。

## v0.6.1 放大 QR Code / 滑雪者重建

- 主控 QR Code 可點擊放大：原生 modal dialog，白底四格 quiet zone、1024px 圖片，顯示房號及已上線真人數；關閉按鈕、Esc、點背景皆可關閉。離開主控或房間關閉時自動收起，原生對話框提供焦點限制及返回觸發按鈕。
- 原創程序化滑雪模型：圓角外套、撞色肩片、包覆式頭盔與護目鏡、連續手肘／膝蓋關節、手套、雪靴扣具、彎曲雪板尖與雪杖。背面加霧青背包，讓追逐視角容易辨識。
- AI 使用暖橘，真人使用同系列柔和配色；奶白與深藍裝備沿用場景配色。五個材質批次合併幾何，各角色共用模型資料，不載入外部貼圖或模型。
- 翻轉與傾斜改以腰部附近為旋轉中心。

造型研究參考：[低面數滑雪者輪廓](https://sketchfab.com/3d-models/skier-low-poly-character-13ae2a85b3af43ab8b1e984c8f8c87e2)、[滑雪服與装备的角色分色](https://3dexport.com/3dmodel-skier-223295.htm)。僅作造型方向參考，未使用其模型或貼圖。

驗證：已檢視實際幾何的正面、背面斜角與追逐角度離線投影；建置與既有視野測試通過。離線投影不是 WebGL 真機畫面，掃碼距離仍需現場測試。

## v0.6.2 安全修補

完整 [安全審查與修補紀錄](security_best_practices_report.md) 已加入 repo。優先修復 High 01／02：重連不能推延清理時間、到期入口拒絕服務、公開握手與 WebSocket 分層限流。限流設定隨 Wrangler 自動部署，不需新增 Access 參數。

- `JOIN_LIMIT`：每 IP／機房 120 次握手／分鐘，保留 16 人共用 Wi-Fi 餘裕。
- `HOST_CREATE_LIMIT`：每 Access subject／機房 6 次開房／分鐘。
- 每房間加入：2 次／秒、burst 32；同一玩家重連間隔至少 2 秒。
- 每 socket：40 訊息／秒、burst 80；每房 800／秒、burst 1600；最多 128 個待處理訊息。正常客戶端約 20Hz。
- 過量回 429；遺漏 rate-limit binding 回 503；WebSocket 違規以 1008 關閉，其他玩家繼續。
- 中風險待辦（離線名額、替代入口、工具依賴）請見報告。此版本不變更 workers.dev 或 WAF 規則。


## v0.6.3：離線名額與替代入口修補

- 等待室玩家斷線後保留 30 秒供原 resume token 重連；逾時由 alarm 或下次加入請求回收，並寫入 storage。心跳失聯先經既有 45 秒 stale 判定，再開始保留期（alarm 排程可能有延遲）。重連成功取消回收，舊 socket 的 close 不會移除新連線。
- 16 人限制只計真人；AI 不占名額。賽中與結果頁保留離線玩家和成績；下一場回等待室時重新套用回收規則。
- `workers_dev: false`、`preview_urls: false` 會隨 Wrangler 部署停用兩種入口。Worker 亦在 Access、Rate Limit、DO binding 前拒絕 `.workers.dev` 主機的後端請求。
- 請使用 Dashboard 已綁定的正式 Custom Domain。此修補不指定猜測的正式 hostname，也不修改 Access／WAF 規則；`CF_ZONE_NAME` 仍只是診斷標籤，不能建立 DNS 或路由。
- 部署完成後，在 Domains & Routes 確認 workers.dev 與 Preview URLs 皆 Disabled；用正式網址測試開房與加入，再確認舊 workers.dev／版本 Preview 網址無法提供遊戲 API。尚未從本機驗證 Cloudflare 帳戶的實際部署狀態。
- 新增 `tests/security-medium.mjs`；24 個遊戲單元測試、room-protocol、host-routing、security-high、security-medium 與 standalone build 通過。

設定依據：[workers.dev 路由](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)、[Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/)。


## v0.6.4：手機觸控與效能診斷

- 遊戲操作區加入 Safari 的 `-webkit-user-select: none`、停用長按 callout／context menu，並在加速、左右、後空翻 pointerdown 阻止預設選取行為。左右鍵保留 pointer capture 與取消／放開清理；加速與後空翻保留鍵盤觸發。表單輸入不受限制。
- 低畫質 pixel ratio 上限由 1.5 降為 1；高 DPI 裝置的畫布像素最多減少約 56%。樹林 instance 矩陣只在跨過 38m 區段時更新，避免每幀重算。中／高畫質設定維持原值。
- 比賽操作列新增 FPS、ping、同步資料 age（距離收到上一筆狀態的本機毫秒數）。ping 使用既有心跳 RTT，不新增網路探測；單人練習顯示本機運算。
- 判讀：單人也低 FPS，優先懷疑裝置繪圖／主執行緒負擔或發熱；FPS 正常但多人資料 age 經常跳到數百 ms，優先檢查網路、伺服器排程或瀏覽器訊息處理。資料 age 不是單程網路延遲，ping 也不是即時每幀測量，不能只憑單一數值定案。目前位置外推上限 120ms，超過會暫停推算。
- 驗證：24 項單元測試與 standalone build 通過。執行環境未安裝 Playwright 瀏覽器，沒有宣稱 iOS／Android 實機或瀏覽器互動驗收已通過。部署後請用手機測試連點、雙手同時加速／轉向、長按／滑出按鈕，以及低畫質單人與多人比較。

參考：[MDN user-select](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/user-select)、[Three.js 高 DPI 畫布成本](https://threejs.org/manual/en/responsive.html)。
