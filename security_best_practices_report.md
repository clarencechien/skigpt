# SkiGPT 安全審查 — v0.6.1

日期：2026-09-07。審查基準：[clarencechien/skigpt @ 5c4d93e](https://github.com/clarencechien/skigpt/tree/5c4d93e9346bf1ec26dbbe52cb5c8821c34012aa)。


## v0.6.6 修補狀態（2026-09-07，最新）

- **06 依賴告警已處理**：esbuild 0.28.2、Wrangler 4.129.1、Miniflare 5.20260907.0-alpha，與 lockfile 同步。Miniflare 版本是穩定 Wrangler 官方指定的依賴；較舊的穩定 Miniflare 配套仍帶 sharp／undici 告警，因此沒有只為避開 alpha 名稱而保留已知告警，也沒有 audit fix --force 或任意 overrides。更新後完整 npm audit（含 dev）為 0 項已知告警；原始結果見 `security/audit-v0.6.6.json`。這不是不存在未知漏洞的保證。
- **應用安全 headers 已補齊**：CSP 限制 script 為同源、禁止 object／base／外站嵌入；nosniff、DENY、no-referrer、Permissions-Policy。保留同源體感與 QR data 圖片、動態 inline style；未開放 inline script 或 unsafe-eval。首頁／主控與 API 經 Worker 加 header；JS／CSS 靜態資產使用 build 產出的 _headers。WebSocket connect-src 明確列出當前 hostname；不使用所有 wss 網域的通配允許。
- **長效連線憑證不再放在公開 WebSocket URL**：`POST /api/rooms/:room/ticket` 接受玩家 id／name／resume；房主使用 `/host/api/rooms/:room/ticket`，仍需 Access subject + 房主 token。POST JSON 上限 1024 bytes，字段驗證、Origin 檢查及 edge／DO 限流。公開 WebSocket 僅接受 ticket query；舊 host／resume URL 拒絕。短票券有效 30 秒、限制 64 張未過期票券、持久化只存票券 SHA-256，消耗後先存檔再升級，綁定房間（DO）、origin 與房主身分／入口。票券及加入各自使用 2/s、burst 32 的 room bucket，避免正常 16 人的兩階段加入共用一個額度。票券回應與 API 不快取。
- 短票券本身仍是 bearer credential，尚未使用且未過期時被他人取得仍有搶先兌換風險；這項修補縮短可利用時間並防重放，不代表 URL 可以任意公開。不得另行把 POST body、Authorization 或票券記錄到自訂 log。歷史存取紀錄中的舊憑證並不會被這次部署刪除。
- 驗證：npm test 全部通過（25 項單元測試及 room-protocol／host-routing／security-high／security-medium／security-tickets）；standalone build、Wrangler 4.129.1 deploy --dry-run 通過。票券測試包括重放、精確到期、錯誤身分／入口／origin、超長與非法 body、resume、16 人兩階段加入及 storage restore；既有最後一名結算回歸持續通過。
- 真實 Miniflare／Workerd 整合測試已改為新版官方 convertV4MiniflareOptions API 與票券流程，但執行時網路核准遭環境中止，未列通過。尚未驗證線上 Access／WAF、部署生效或 iOS／Android CSP 實機行為。
- 部署後已開啟舊版本的手機需重新整理才能使用票券重連；仍可讀取原 sessionStorage resume，不要求重建玩家身分。房主踢人／鎖入場、全域成本預算與帳戶設定驗收仍未包含於本次。

## v0.6.3 修補狀態（2026-09-07，歷史）

- **04 離線名額：已修補並通過本機回歸**。等待室離線保留 30 秒，alarm 與加入路徑回收並持久化；AI 排除於 16 真人上限之外。重連取消回收、舊 close 不影響新 socket。心跳失聯於 stale 判定後開始保留期。賽中／結果資料保留，reset 回等待室套用相同政策。
- **05 替代入口：程式與部署設定已修補，線上生效待確認**。Wrangler 停用 workers.dev 與 Preview URLs；Worker 對 `.workers.dev` 後端請求在任何 binding 前回 403。既有 Dashboard Custom Domain 不在此次修改範圍。靜態資產可能由 assets 直接服務，因此全站入口停用仍以部署設定生效為準。
- 驗證：24 個遊戲單元測試、room-protocol、host-routing、security-high、security-medium 與 standalone build 全部通過。新測試涵蓋名額保留／回收、滿房加入、AI 容量、心跳失聯、持久化、重連舊 close、賽中成績、reset，以及兩類替代 hostname 在 binding 前拒絕。
- 尚未驗證 Cloudflare 線上部署及帳戶 Access／WAF 設定；06 開發依賴更新及先前 runtime／安全標頭待辦仍未包含於此次修補。下方 v0.6.2 與 v0.6.1 為歷史紀錄。

## v0.6.2 修補狀態（2026-09-07）

本檔保留下方 v0.6.1 的原始審查證據；以下為目前程式狀態，原始行號對應 v0.6.1 commit。

- **High 01 已修補並通過本機回歸**：fetch、message、alarm／close 路徑共同檢查 deadline；重連不延後已設定 alarm；一小時、房主離線、空場期限不能被連線重設。重新載入 DO 時讀回 storage alarm。
- **High 02 已加上分層控制並通過本機回歸**：Worker 在呼叫 DO 前檢查 WebSocket GET 與參數；匿名握手使用 Cloudflare Rate Limiting binding，每 IP／機房 120 次／60 秒；房主每 subject／機房 6 次開房／60 秒。DO 每房間加入 bucket 2 次／秒、burst 32；同一玩家至少間隔 2 秒重連。每 WebSocket 40 訊息／秒、burst 80，房間 800／秒、burst 1600，最多 128 個待處理訊息；超量或格式違規關閉該連線。
- 正常 16 人同時 20Hz、10 秒模擬通過；洪泛連線被關閉且正常對手保留。拒絕的 HTTP 請求不呼叫 DO。手動主控關房不受匿名握手 bucket 限制。
- 為完成輸入限流，同步處理 03 的 query 長度／字元集、JSON null／形狀及缺少 attachment 的防禦；其餘完整 runtime 驗收仍待執行。04 離線名額回收、05 替代入口與 06 開發依賴更新尚未處理。
- `wrangler.jsonc` 已加入 `JOIN_LIMIT`、`HOST_CREATE_LIMIT`，Dashboard Git 部署會隨設定建立 binding；若 binding 遺漏或故障，入口回 503，不悄悄略過限制。namespace_id 610201、610202 為本專案使用，key 加 skigpt 前綴。
- 限制：Cloudflare Rate Limiting 是每機房、非全球強一致計數；IP 額度刻意保留共享 Wi-Fi 餘裕。分散式流量仍可能增加 Worker 請求費，這不是全站帳單硬上限。未修改帳戶中的 WAF／Access 規則，未進行線上負載測試。

驗證：`node tests/security-high.mjs`、`node tests/room-protocol.mjs`、`node tests/host-routing.mjs`、`node scripts/build-standalone.mjs` 均通過。

[Cloudflare Rate Limiting binding 與 locality 文件](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)。

## 原始 v0.6.1 審查結論

Access 對開房／主控的保護有實際作用，本次未找到偽造 JWT 或直接取得他人房主權限的途徑。但不能認為 Access + WAF 已經足夠：遊戲刻意允許匿名玩家加入，主要缺口在 DO 生命週期、連線／訊息濫用及玩家名額管理。兩項高優先問題已在隔離的本機協定模擬中重現。

最優先修補：讓到期時間成為每個入口都必須遵守的硬限制、避免重連延後既有清理 alarm；補上 WebSocket 訊息與握手限流。這些是應用程式責任，不能只靠 WAF。

原始審查當時尚未套用修補；目前狀態請以上方最新修補紀錄為準。

## 方法與範圍

- 套用 OpenAI `security-best-practices` skill，讀取 JavaScript 通用前端及 React 安全指引。這個專案雖然使用 `app/page.tsx` 路徑，實際部署是 esbuild 產生的 React SPA + Cloudflare Worker / Durable Object，沒有 Next.js 伺服器。
- skill 沒有 Cloudflare DO 專用後端指引，因此後端補充使用 Cloudflare 官方 WebSocket、alarm 與 routing 文件。
- 原始碼檢查、npm 依賴稽核、既有 Access 測試、本機 DO／WebSocket 模擬重現。模擬沒有向線上房間發送攻擊或壓測流量。
- Codex Security 服務尚未安裝／連接；本報告不是該服務的掃描認證。
- 無法讀取帳戶內 Access policy、WAF 規則、rate limiting、Workers Domains & Routes、帳單與部署狀態。
- 對先前使用的兩個網域只做四次未登入的唯讀頁面請求：大部分未取得應用頁面；`alpine-rush.ai-apps.work/host` 回傳 Cloudflare 403 challenge 類頁面。這只能證明該次請求被攔下，不能確認所有入口及遊戲訊息都受保護。中介代理的 502 不作為站點故障證據。

## 已確認有效的保護

1. `multiplayer/access.mjs:4–11`：限制 Access issuer 網域、RS256、公鑰驗簽、AUD、exp／nbf 與使用者身分；缺設定或 token 時拒絕，不只是相信 header 文字。
2. `multiplayer/worker.mjs:44–48`：先刪除外部傳入的內部身分 header，驗證後才填入可信身分；公開 `/api` 不允許 create、close 或 host 連線。
3. `multiplayer/worker.mjs:21–22`：房主 token 還必須搭配相同 Access subject。本機測試中，不同 subject 搭配正確房主 token，主控連線與關房均為 403；錯誤玩家 resume 也為 403。
4. `multiplayer/worker.mjs:26–28`：玩家快照不含 resume，DO 資訊與房主 Email 只給主控；前端 JSX／`textContent` 顯示暱稱。唯一 `innerHTML` 用於固定雷達標記，未找到使用者字串流入該位置。
5. 模擬計算與終點成績在 DO 端執行，玩家不能直接提交任意速度、tier 或秒數。這不等於有反外掛能力：自動點擊／精準轉彎仍可被腳本模擬。

## 高優先問題

### 01 — 重連能延後清理 alarm，繞過房間生命週期上限

- **嚴重度：High；信心：高（本機模擬重現，官方 alarm 語意相符）。**
- **類型：CWE-400／生命週期控制。**
- **位置：** `multiplayer/worker.mjs:16,24,35–40`，`schedule`、`handleFetch`、`handleAlarm`。
- **證據：** `schedule(ms)` 無條件執行 `setAlarm(Date.now()+ms)`；每次成功連線都重新安排 alarm。`created + LIMITS.lifetime`、`hostMissing + hostGrace` 的主要檢查只在 `handleAlarm`。
- **重現：** 模擬房主離線後，已加入玩家每 10 秒用自己的 resume 重連；每次都早於 15 秒 alarm。房間年齡達 3,610 秒後仍存活、仍接受連線，alarm 仍在未來 15 秒，超過一小時上限及房主離線 60 秒期限。
- **影響：** 具有房號及自身玩家 session 的人可以持續保留房間，延长存放與工作時間；先前「最多一小時」不是對惡意流量有效的成本硬上限。手動關房在正常狀態下仍可運作。
- **建議修法：** 所有 fetch、message、alarm 入口共用到期判斷；接納連線前先關閉到期房間；排程以最早的 tick／heartbeat／房間到期／房主到期時間為準。讀取既有 alarm，不能因重連將更早的清理時間後移。補上虛擬時間回歸測試。
- **WAF 補強：** 重連限流只能降低濫用，不能代替修正 alarm 邏輯。
- **限制：** 本機模擬沒有重現 Cloudflare 全部網路事件與休眠排程；不是已量測的線上帳單損失。

[Cloudflare 官方說明：新的 setAlarm 會覆寫既有 alarm](https://developers.cloudflare.com/durable-objects/api/alarms/)。

### 02 — 公開加入與 WebSocket 訊息缺乏完整資源限流

- **嚴重度：High；信心：高（程式路徑及本機重現）。**
- **類型：CWE-770／CWE-400。**
- **位置：** `multiplayer/worker.mjs:9,24,29–34,47–50`。
- **證據：** `now-a.last>=35` 只限制 input 被採用的頻率；訊息在那之前已進入 handler、解析 JSON、更新計數及 attachment。沒有 token bucket、累積超量處置或每位玩家的訊息預算。公開房號路由也先轉進 DO 才檢查房間是否存在及是否為 WebSocket。
- **重現：** 同一模擬時間點送 200 筆未知 type，200 筆全被處理且連線未關閉；32 次匿名、非 WebSocket 的房號查詢全被轉進 DO binding。
- **影響：** 不用 Access 也能觸發 DO 呼叫；知道房號的玩家可用單一連線大量送訊息，消耗處理與排隊資源。反覆成功重連另會觸發 save 和全房廣播。不存在的房號會觸發 DO 呼叫／可能喚醒與讀取，不代表已建立持久房間或執行 20Hz 比賽。
- **建議修法：** Worker 在呼叫 DO 前驗證 method、Upgrade、參數長度並做握手限流；DO 再做每個 session、每房間的訊息與重連預算，超量持續時關閉連線。限制必須保留正常 20Hz 輸入與網路突發的餘裕。
- **WAF 補強：** 對匿名房號握手／查詢設 rate limiting；對登入房主另按 subject 限制開房數。現場多人可能共用 NAT，不應粗暴以單一 IP 限制成只容許一兩支手機。若加 Turnstile，放在入場流程並由後端驗證，不把互動挑戰塞進 WebSocket 資料通道。
- **限制：** 沒有做線上吞吐量或成本壓測，未量測造成服務退化的實際流量門檻。

[Cloudflare 官方說明：WAF 僅檢查 WebSocket 初始握手，連線後不再檢查訊息](https://developers.cloudflare.com/network/websockets/)。

## 中優先問題

### 03 — 玩家 ID 與訊息形狀未完整驗證，錯誤可進入房間處理流程

- **嚴重度：Medium；信心：部分高、部分需真實 runtime 驗證。**
- **類型：CWE-20。**
- **位置：** `multiplayer/worker.mjs:22–25,29–30,35,41`。
- **證據：** 玩家 `id` 直接取 query，不驗 UUID 格式或長度；先 `acceptWebSocket`、加入 state，才 `serializeAttachment`。`JSON.parse` 成功後沒有確認內容為非 null 物件，就存取 `m.type`。多個 socket 迴圈假定 attachment 必定存在。
- **重現：** 傳入合法 JSON `null` 會拋 TypeError。另以 JSON byte count 近似官方目前 16,384-byte attachment 上限的模擬中，16,300 字元 ID 使接納中途拋錯、留下無 attachment 的 socket，後續 alarm 在讀取 host 時再拋錯。
- **影響：** 錯誤／大輸入可以放大例外處理與廣播成本；部分接納失敗可能影響同房間運作。
- **建議修法：** 接納前驗證 ID／resume 的固定格式與長度；先建立並驗證 attachment；接納後若失敗應回復名額並關閉 socket。JSON schema 明確驗證 type、布林值、有限數值、非 null 物件；迴圈容忍並清理缺 attachment 的 socket。限制以 bytes 計算，並對反覆違規者斷線。
- **WAF 補強：** 可限制異常 query 長度，但 `null` 等連線內訊息仍要由程式處理。
- **限制／誤報排除：** 真正 attachment 使用 structured clone，並非 JSON byte count；平台 URL 長度上限及失敗連線的自動關閉可能減輕超長 ID 路徑。因此未宣稱已證明線上永久癱瘓，也沒有沿用舊的 2KB 上限。

[Cloudflare WebSocket attachment 文件](https://developers.cloudflare.com/durable-objects/best-practices/websockets/#extended-methods)。

### 04 — 已離線玩家占用名額，單一人可阻止其他人入場

- **嚴重度：Medium；信心：高（本機重現）。**
- **類型：CWE-770／名額生命週期。**
- **位置：** `multiplayer/worker.mjs:22,25,32,41`。
- **證據：** 加入上限檢查使用 `state.players.length`；lobby 離線時未清除真人名額。清除發生在房主 start 時，而不是入場檢查前。
- **重現：** 原有 2 位在線真人，另外反覆新增並離線 14 個 ID 後，名單為 16、在線只有 2，新真人卻收到 429。
- **影響：** 知道房號者可用很少請求占滿房間；一般玩家反覆換分頁／身分也可能誤觸。
- **建議修法：** 未開賽的離線名額設短暫保留期限，過期釋放；有效連線與待恢復名額分開計算；加入及重連限流，補上房主移除玩家的能力。
- **補強／限制：** 房主開賽時會移除離線者，因此不是永遠無法復原，但開賽後新玩家又不能加入。需保留短暫斷線恢復 UX。

### 05 — workers.dev／Preview 入口可能避開自訂網域的安全規則

- **嚴重度：Medium（設定風險）；信心：原始碼確定、線上暴露待查。**
- **類型：CWE-693／入口保護不一致。**
- **位置：** `wrangler.jsonc:31`，`multiplayer/worker.mjs:44–50`。
- **證據：** `workers_dev: true`；沒有明確停用 preview URLs；Worker 沒有允許 hostname 清單。DO 以房號命名，同一 deployment 的不同 hostname 會使用相同 binding／房號對應。
- **影響：** 若替代網址可公開存取，不能假設只綁在 `ai-apps.work` 網域上的 WAF 規則也涵蓋它。公開玩家 API 可能從另一入口進入同房間。
- **建議修法：** 確認正式 Custom Domain 工作正常後，停用不用的 workers.dev 與 Preview URL；或為所有保留入口配置等效保護，並在 Worker 設正式 hostname allowlist（本機開發另有明確例外）。
- **誤報排除：** 這不是已證明的 Access 繞過。即使從另一 hostname 進入，`/host` 的程式內 JWT 驗證仍然存在。Dashboard 可能已另外保護替代入口，本次未讀到設定，不應直接宣稱線上有裸露網址。

[Wrangler 官方 routing／preview 設定](https://developers.cloudflare.com/workers/wrangler/configuration/#inheritable-keys)。

## 依賴維護

### 06 — 開發／部署工具依賴有已知安全告警

- **應用風險：需安排更新；npm 分級：5 個 high、1 個 low 的受影響套件項目，0 critical。** 這是套件計數，包含相依影響，不是 6 個互不相關的線上可利用漏洞。
- **位置：** `package.json:24–27` 與 `package-lock.json`。
- **證據：** 完整 `npm audit --ignore-scripts --json` 列出 `esbuild`、`wrangler`、`miniflare`、`sharp`、`undici`、`ws`；lockfile 中全部標示為 dev dependencies。版本分別為 0.28.0、4.92.0、4.20260515.0、0.34.5、7.24.8、8.18.0。
- **線上依賴：** `npm audit --omit=dev --ignore-scripts --json` 為 **0 項已知告警**。不等於不存在未知漏洞或應用邏輯問題。
- **影響與可達性：** 線上 DO 使用 Cloudflare 原生 WebSocket／fetch，不部署 Miniflare 模擬伺服器；esbuild 只執行 build，Windows dev-server 路徑不符合目前 Linux 建置。其餘告警要按開發工具實际啟用的功能判斷，不能直接宣稱可遠端攻入正式 Worker。CI／本機工具仍值得更新，Access／WAF 不保護開發機與依賴安裝流程。
- **建議修法：** 一起升級相容的 Wrangler／Miniflare／esbuild 與 lockfile，重新執行部署 dry-run、Access 測試及多人測試；不要直接用 audit fix --force。此處未改版本。

## 尚待查證的防護

- Access 應用程式是否只允許預期房主，而非 Everyone／Bypass；AUD 是否唯一對應本遊戲；所有實際 hostname 的 `/host` 與 `/host/*` 是否一致保護。
- WAF Managed Rules、Custom Rules、Rate Limiting 各自啟用哪些規則，是否有 Skip 規則或漏掉替代入口。
- 原始碼未設定 CSP／frame-ancestors／nosniff 等完整應用 headers。請檢查登入後的實際 app shell；本次取得的是 challenge 頁，不能拿它的 headers 代替遊戲頁面。
- 房主 token 與玩家 resume 出現在 WebSocket query（`app/page.tsx:31`），可能進入存取紀錄；宜遮蔽 query 或改一次性連線票券。房主 token 單獨洩漏仍不足以跳過 Access subject 驗證。
- 計費告警、失控時停用入口的程序、每房間／每房主的總資源預算。目前介面 counters 並非 Cloudflare 帳單，也不是全站硬性支出上限。

## 修補順序與驗收

1. 修 01：不能因重連延長 created-based TTL 或房主離線期限；超時請求在任何入口都被拒絕；手動關房後不能 rearm。
2. 修 02–04：Worker 握手限制、DO 訊息預算、完整 schema、名額回收，保留 16 人共用 Wi-Fi 與正常重連。
3. 驗證 05：確認正式網域後才關替代入口，避免把現有邀請連結一起關掉。
4. 更新 06 與補齊應用 headers，再做真實 Workerd／手機多人驗收。

修補應保留：掃 QR 免登入加入、房主 Access 驗證、20Hz 正常輸入、2× 點擊與 9× 跳板、短暫斷線恢復，以及已完賽成績鎖定。

## 本機驗證摘要

| 項目 | 結果 |
|---|---|
| 既有 RSA 簽章／AUD／issuer／exp／偽造簽章測試 | 通過 |
| 既有 Worker Access routing／偽造內部 header 測試 | 通過 |
| 正確房主 token + 不同 subject | 主控／關房皆 403 |
| 錯誤玩家 resume | 403 |
| 未知 type 訊息突發 | 200/200 處理，未斷線 |
| JSON null | 未捕捉 TypeError |
| 持續重連、房主已離線 | 3,610 秒仍存活，alarm 再延 15 秒 |
| 超長 ID + 模擬 attachment 限制 | 接納例外、後續 alarm 例外；真實 runtime 待驗 |
| 14 個已離線新身分 + 原有 2 真人 | 在線 2、占位 16，下位玩家 429 |
| 匿名非 WebSocket 房號查詢 | 32/32 轉進 DO binding |
| npm audit，全部依賴 | 受影響套件：high 5、low 1 |
| npm audit，排除 dev dependencies | 0 已知告警 |

## 審查依據

- [OpenAI security-best-practices skill](https://github.com/openai/skills/blob/main/skills/.curated/security-best-practices/SKILL.md)
- [JavaScript 前端安全指引](https://github.com/openai/skills/blob/main/skills/.curated/security-best-practices/references/javascript-general-web-frontend-security.md)
- [React 安全指引](https://github.com/openai/skills/blob/main/skills/.curated/security-best-practices/references/javascript-typescript-react-web-frontend-security.md)
- Cloudflare 官方文件連結已就近附於各項發現；依賴資訊來自本次 npm registry audit 回應。
