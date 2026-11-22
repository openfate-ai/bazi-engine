# OpenFate 八字命盤庫 · 1930–2026

850,296 組出生輸入，340,343 種四柱組合。每筆附四柱、十神、藏干、地支關係、標籤，以及 13 段繁體中文主題解讀。讀到一段文字，可以點開它引用的柱位、藏干或起運紀錄。資料依年份下載，也可整包離線使用。[下載 v1.0.0](https://github.com/openfate-ai/bazi-engine/releases/tag/corpus-v1.0.0)

**OpenFate Bazi Corpus** covers every Gregorian date from January 1, 1930 through December 31, 2026 at 12 representative civil times for each of two traditional luck-cycle inputs. Each record includes machine-readable facts, labels, and a Traditional Chinese reading with pointers back to the same chart. Original dataset and annotations are licensed under CC BY 4.0. Code is MIT.

## 打開第一張盤

直接在 GitHub 讀兩張完整樣稿：[辰酉合與辰戌沖共用時支](examples/1991-10-18T08-30-female.md) · [1932 年立春交節樣本](examples/1932-02-05T08-30-female.md)。

- 先下載 `reader.html`，用瀏覽器開啟，就能閱讀內建樣稿。展開「從年度檔查盤」，選取下載的年度檔（例如 `1991.jsonl.gz`），即可查該年任一代表時刻。
- 整包 `OpenFate-Bazi-Corpus-1930-2026-v1.0.0.tar` 解開後有 97 個年度檔。每一行都是一個可單獨使用的 JSON 物件，編碼為 UTF-8。
- 使用 Python 查單筆可執行 `python3 lookup.py . 1991-10-18 08:30 female`。附上 `--json` 可查看原始欄位。命令從解開後的資料夾執行。

## 一張盤怎麼讀

十個原局主題依序看日主與月柱、月令、與日干同字的藏干、印星、食傷、官殺、財星、比劫、日支，以及原局地支互動。後三段交代起運依據、首運與下一步大運。解讀由固定規則寫成，每次執行都能追查同一句話從哪個欄位而來。

例如「官殺僅藏支」表示年、月、時干均未透正官或七殺，至少一個地支藏有其中一種。若年支與日支相沖，標籤會帶上兩個柱位與支字。在同一柱出現合與沖時，解讀列出相交的兩組關係。十神的文字說明採傳統取象，工作、合作與關係段落提供可在生活中檢視的問題。

| 欄位 | 內容 |
|---|---|
| `id` | 固定偏移的民用出生時刻及排運性別 |
| `fourPillars`、`dayMaster`、`pillars` | 年、月、日、時四柱，以及各柱干支、藏干、十神等 |
| `trueSolarDateTime`、`lunar` | 真太陽時及引擎給出的農曆日期 |
| `interactions` | 原局六合、半合、三合、三會、沖、刑、害、破。每筆保留涉及的柱位；合化狀態另列 |
| `daYun`、`cycleRelations` | 起運計算依據、順逆、九步大運，另列前兩步運支與原局的關係 |
| `labels` | 可直接篩選的標籤，如 `財星:僅藏支`、`起運:交節待定` |
| `readings` | 13 個主題各含標題、正文和指向本筆資料的 JSON Pointer |
| `manifest.json` | 逐年筆數、壓縮前後位元組數、SHA-256、標籤分布與全文去重計數 |

## 出生條件與適用範圍

35,429 天，每日取 00:30、02:30，依序到 22:30。每個時刻各跑女、男兩組排運輸入，合計 850,296 筆。固定東經 120 度、UTC+08:00、無夏令時間，開啟真太陽時，採子初 23:00 換日及 `DAYUN_SECOND_V2`。使用者若出生於不同經度、時區、夏令時間，或接近時辰、交節邊界，應以原始出生時間重新計算。這套網格包括 2026 全年。

全庫共有 822 個不同標籤、11,053,848 個主題欄位。以正文逐字去重，十個原局主題合計有 340,129 種組合，連同大運三段則有 850,223 種。

850,150 筆取得可追查的起運時間。另有 146 筆落在引擎標記的交節歧義附近。這些樣本保留原局，起運日和順逆留空，三個大運主題說明缺項原因。標籤是依規則產生的命理分類。資料沒有真人生平、專家逐筆批註或預測命中率。全文按同一套規則撰寫，重複使用取象與建議；其中的日期與柱位也會影響去重數。

## 核對與重算

全量驗證檢查日期次序、雙性別網格、十神和藏干、五虎遁月干與五鼠遁時干、標籤、地支柱位、起運方向、運序及正文引用。另取每日中午 12:30 的一筆，與香港天文台的農曆年、月、日、閏月標記比對，35,429 天全部相符。可在 `calendar-reference.json` 查核對範圍與各原始曆表的 SHA-256。[香港天文台公曆與農曆日期對照表](https://www.hko.gov.hk/en/gts/time/conversion1_text.htm)

從程式碼的 `corpus/` 目錄執行。本次封裝使用 Node.js 20.19.5（zlib 1.3.1-470d3a2）與 Python 3.9.6。壓縮函式庫版本若不同，請另外比較解壓後的內容。重算與驗證均在本機執行。

```sh
npm ci --ignore-scripts
node generate.mjs facts 1932 /tmp/bazi-facts
node generate.mjs readings 1932 /tmp/bazi-facts /tmp/bazi-data/years
```

`python3 reproduce.py /path/to/new-directory --workers 4` 會從頭建立 97 年資料、驗證後寫入清單，並打包。它會下載香港天文台曆表供比對；若已有曆表，加上 `--calendar-cache /path/to/tables` 可重用。重建時建議預留 5 GB 的可用空間。驗證已解開的正式資料可直接執行 `python3 verify.py /path/to/extracted-data --workers 4`。檢查封裝內檔案可使用 `shasum -a 256 -c SHA256SUMS`。

引擎鎖定 `@openfate/bazi-engine@2.0.0`、`@openfate/true-solar-time@4.0.2`、`lunar-javascript@1.7.7`。引擎輸出的原始術語保留原字形，標籤與解讀使用繁體中文。程式採 MIT，資料及原創解讀採 CC BY 4.0，可商用，須署名並說明修改。[資料授權](DATASET-LICENSE.md)
