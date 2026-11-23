# OpenFate 八字引擎

**111 萬筆八字排盤樣本，1,446 萬章生活解讀，超過 1 億筆流年推演。**

從 1900 年排到 2026 年，命盤庫收錄 **402,736 種不同四柱**。每筆樣本附 13 章繁體中文解讀，涵蓋工作、感情與家庭等主題。想看解讀怎麼來？打開同一天 08:30 與 12:30 的兩張盤，看看換了哪個字，讓感情章問了另一個問題。點進規則原始碼，就能改完再排一次。

**[打開雙盤對照](https://openfate-ai.github.io/bazi-engine/compare/)** · [跟著命例學八字](learn/README.md) · [下載八字命盤庫](https://github.com/openfate-ai/bazi-engine/releases/tag/corpus-v2.1.0) · [English / API reference](README.en.md)

[![npm 版本](https://img.shields.io/npm/v/@openfate/bazi-engine)](https://www.npmjs.com/package/@openfate/bazi-engine) [![SDK 測試與建置](https://github.com/openfate-ai/bazi-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/openfate-ai/bazi-engine/actions/workflows/ci.yml)

## 看一張盤怎麼變成一段解讀

1997 年 8 月 15 日，女命，東經 120°、UTC+8。兩張盤都採真太陽時、子初換日，年、月、日三柱都是 **丁丑、戊申、己丑**。換了出生時刻，日支「丑」遇到的時支就不同了。

| 出生時刻 | 時柱 | 日支與時支 | 感情章問的第一個問題 |
| --- | --- | --- | --- |
| 08:30 | 戊辰 | 丑、辰相破 | 約好了還是落空，交接在哪一步斷掉？ |
| 12:30 | 庚午 | 丑、午相害 | 你幫上的忙，有沒有動到對方想自己決定的事？ |

第一篇寫兩個人約好輪流買菜，到了週末，冰箱卻還是空的。第二篇裡，菜已經買好了，問題出在有人順便答應朋友來家裡吃飯。這些是編寫的生活情境。打開範例後，可以從每篇下方的「這段依據」查到日支、時支，以及引擎選用的關係。[互動範例](https://openfate-ai.github.io/bazi-engine/compare/) · [感情章規則](src/readings/relationship.ts)

[![雙盤實際畫面。左側是辰時的交接問題，右側是午時的決定權問題。點圖可更換時間重新排盤。](learn/relationship-comparison.webp)](https://openfate-ai.github.io/bazi-engine/compare/)

## 跟著命例學八字

| 你想弄懂的問題 | 從這裡開始 |
| --- | --- |
| 四個天干都沒有辛，為什麼這張甲日盤還讀得到正官？ | [在 1900 年元旦的盤上找藏干](learn/reading-pillars.md) |
| 同一個時支，怎麼可以一邊合、一邊沖？ | [看兩張關係圖，把每一條線接回它所在的柱](learn/interactions.md) |
| 《子平真詮》和《窮通寶鑑》看同一張盤，各自先問什麼？ | [對讀原書命式與現代命例](learn/schools.md) · [查卷次、篇名與影印頁](learn/sources.md) |
| 換一個時辰，職涯建議會具體改在哪裡？ | [讀卯時與辰時的完整職涯章](learn/career-readings.md) |
| 換一張沒見過的盤，我還看得出來嗎？ | [先做三題，再展開答案](learn/practice.md) |

[七堂入門課](learn/README.md) · [六對同日異時的完整試讀稿](learn/reader-pilot/readings.md) · [圖解與練習](learn/reader-pilot/lessons.md) · [讀者回饋與試讀方法](learn/reader-pilot/README.md)

## 下載 1900–2026 八字命盤庫

1900 年 1 月 1 日至 2026 年 11 月 22 日，共 46,347 天。每天取 12 個代表時刻，各排女、男兩組，合計 **1,112,328 筆樣本**。整庫採固定 UTC+8、東經 120°、無夏令時間。[排盤規格](corpus/README.md)

逐筆加總，發行檔共收錄 **14,460,264 章生活解讀**，每章附 5 個情境問題。相同四柱可共用原局文字。起運可確定的樣本各收錄 90 筆年中觀察，合計 **100,092,240 筆流年推演**。各年度的筆數與檔案雜湊都可下載核對。[逐年統計清單](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.1.0/edition-manifest.json)

| 想做的事 | 要打開的檔案 |
| --- | --- |
| 先讀一張完整的盤 | [1991 年 10 月 18 日樣稿](corpus/examples/1991-10-18T08-30-female.md)，可以直接在 GitHub 閱讀。 |
| 離線查自己的出生年份 | 下載 [reader.html](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.1.0/reader.html) 和[所需年份的排盤檔](https://github.com/openfate-ai/bazi-engine/releases/tag/corpus-v2.1.0)，用瀏覽器開啟即可。 |
| 分析或重製整庫 | `core` 收排盤、標籤與技術解讀，`books` 收每筆 13 章生活解讀與 65 個情境問題，`yearbooks` 收起運可確定的逐年觀察。三類檔案以出生輸入 ID 對讀。[查詢指令與檔案校驗](corpus/README.md) |

發行版附外部曆表核對紀錄。1900 年使用紫金山天文台曆表，1901 年起使用香港天文台對照表，逐日比對中午的農曆日期與閏月。生活章節另外核對引用的盤面欄位。讀者對文字的評價收在試讀教材裡。[曆表核對紀錄](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.1.0/calendar-reference.json) · [成稿核對清單](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.1.0/edition-manifest.json)

## 用 JavaScript 重現首頁的兩張盤

```sh
npm install @openfate/bazi-engine@^2.1.0
```

```js
const { calculateBaziChart, readBaziRelationship } = require('@openfate/bazi-engine');

for (const hour of [8, 12]) {
  const chart = calculateBaziChart({
    year: 1997, month: 8, day: 15, hour, minute: 30, gender: 'female',
    timezone: 8, dstOffset: 0, longitude: 120,
    dayBoundaryMode: 'ZI_HOUR_23', daYunTimingVersion: 'DAYUN_SECOND_V2'
  });
  const reading = readBaziRelationship(chart);
  console.log(reading.ruleId, reading.title);
  console.log(reading.evidence);
}
```

兩次依序得到 `day-hour-destruction`、`day-hour-harm`。第一張盤的 `/interactions/1/id` 指向 `DESTRUCTION:day:丑|hour:辰`。省略出生時辰時，感情章回傳 `status: 'unknown-hour'`，時柱留白。這個 API 在本機產生繁體中文感情章，無需金鑰。命盤庫的 13 章成稿可以從上方的資料發行版下載。

| 引擎功能 | 可查閱的結果 |
| --- | --- |
| 國曆、農曆與真太陽時 | 四柱、校正後時間、採用的時區與夏令時間。支援 IANA 時區或明訂數值偏移。 |
| 換日與起運 | 可選子初或午夜換日。第二版起運算法保留出生瞬間、交節瞬間、時間差與取整方式。 |
| 地支關係 | 八種關係保留每個地支所在的柱。多組合沖可並存，合化與強弱須另行判讀。 |
| MCP 工具 | 在支援 MCP 的客戶端排盤，也能取得同一套感情章、規則編號與盤面依據。[安裝 OpenFate MCP](https://github.com/openfate-ai/openfate-mcp) |

SDK 預設午夜換日及舊版起運算法。要重現上例，請保留程式碼中的兩個選項。[完整 API、時區優先順序與 v2 遷移說明](README.en.md#api-reference)

## 改規則，再跑一次

感情章的選用順序、內文與練習都在同一份[規則檔](src/readings/relationship.ts)。修改條件或段落後，請更新解讀規則版本，並在[回歸命例](tests/relationship-reading.test.ts)放入兩張盤：一張應該選到新規則，另一張應該保留原來的建議。從專案根目錄執行：

```sh
npm ci
npm test
npm run build
npm run build:pages
```

若是教材勘誤，請附課名、原書頁次或可重現的出生輸入。若是排盤差異，請一併附上時區、經度、換日與起運設定。[回報問題](https://github.com/openfate-ai/bazi-engine/issues)

## 授權與引用

引擎程式碼採 [MIT](LICENSE)。OpenFate Bazi Corpus 的資料與原創解讀採 CC BY 4.0，可商用及改作，使用時請標明作者 OpenFate、來源、授權與修改內容。[資料授權與署名範例](corpus/DATASET-LICENSE.md)
