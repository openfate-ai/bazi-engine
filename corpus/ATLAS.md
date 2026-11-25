# 八字格局圖鑑 · Classical pattern atlas

[線上查詢](https://openfate-ai.github.io/bazi-engine/library/atlas/) · [下載索引說明檔](https://openfate-ai.github.io/bazi-engine/library/atlas/data/index.json) · [公開取格程式](../docs/library/atlas/rules.mjs) · [原始資料 v2.1.0](https://github.com/openfate-ai/bazi-engine/releases/tag/corpus-v2.1.0)

這個版本採用 `openfate-ziping-atlas/1`。每張盤都有一個月令分類，特殊格局另行逐項評估。每個分類頁列出本版的判準，將條件齊備的命例和接近門檻的命例放在一起。讀者可以點回兩筆出生輸入，對照十三章和起運時間。

## 月令怎麼取

1. 取原盤的日干、月支，以及月支藏干的本氣。年、月、時三干用來看透出；日干本身不計為透出。
2. 日干遇祿月，先取建祿。月刃採五陽干帝旺，甲卯、丙午、戊午、庚酉、壬子。祿刃依月支定名。
3. 其餘各月若本氣未透、只有一個餘氣透干，就取這個餘氣。若本氣已透、無藏干透出，或兩個餘氣同透，先保留本氣。命例同時列出所有透出的藏干，方便研究兼用。
4. 再看該格指定的配合與干擾。以七殺格為例，年、月、時干須見食神或印星，又無正官混透，才列入本版的符合組。同取七殺而缺少配合，或正官也透出的盤列入對照組。各格可查到實際用過的每個條件。

同時看刑沖合會時，查詢採原局已記錄的關係。遇到三合或三會也保留原來的月令分類。月令因會局而改取、出生節後分日司令、救應位置與大運成敗，都有其他判法，可用本頁的樣本另作研究。[《子平真詮》影印本〈論雜氣如何取用〉](https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=41)

## 特殊格局怎麼讀

- 化氣先看日干是否參與五合，再核對鄰干、爭合、月令、日主通根與剋化神的明干。只在年干遙合，無法通過相鄰這一項。
- 從格分從財、從殺、從兒、從勢、從強、從旺。下表所說的「七處」是年、月、時三個明干，加上四支各自的本氣。它用來計數取樣；每一根是否足以改判，仍可回到原盤逐項辨認。從殺格另查有沒有食傷制殺，從兒格要求財星承接。從強取印勢，從旺取比劫勢。這是本版固定的用名。
- 專旺分曲直、炎上、稼穡、從革、潤下。木、火、金、水各查指定三合或三會；土取四季支辰戌丑未俱全。各格再核日主、月支本氣、明干有無剋身。月令條件會排除若干古法能另作解釋的盤。

特殊格局的「對照盤」須符合該格第一項條件，且其餘條件恰有一項未通過。「符合」指公開規則所列條件全部通過。數量、七處分布與對照門檻由 OpenFate 設定，古籍提供傳統讀法的背景。這套計數描述公開語料中的盤面分布。[《滴天髓》〈從化論〉](https://zh.wikisource.org/zh-hant/滴天髓#從化論－真) · [《三命通會》卷六](https://zh.wikisource.org/zh-hant/三命通會/卷六#曲直)

## 命例與數量

資料自 1900-01-01 至 2026-11-22，固定東經 120°、UTC+8，每兩小時取一個代表時刻。556,164 個出生時刻對應 1,112,328 筆排運輸入，共有 402,736 種不同四柱。下表的「不同四柱」只計符合組。每個時刻對應兩筆出生樣本，各列之間可以重疊。

| 格局命例 | 符合時刻 | 不同四柱 | 對照時刻 |
| --- | ---: | ---: | ---: |
| [正官格](https://openfate-ai.github.io/bazi-engine/library/atlas/officer/) | 26,615 | 19,301 | 29,039 |
| [七殺格](https://openfate-ai.github.io/bazi-engine/library/atlas/killings/) | 27,375 | 19,812 | 27,823 |
| [正財格](https://openfate-ai.github.io/bazi-engine/library/atlas/wealth/) | 24,603 | 17,832 | 30,796 |
| [偏財格](https://openfate-ai.github.io/bazi-engine/library/atlas/indirect-wealth/) | 23,639 | 17,167 | 30,157 |
| [正印格](https://openfate-ai.github.io/bazi-engine/library/atlas/seal/) | 14,291 | 10,382 | 37,808 |
| [偏印格](https://openfate-ai.github.io/bazi-engine/library/atlas/indirect-seal/) | 9,847 | 7,144 | 38,098 |
| [食神格](https://openfate-ai.github.io/bazi-engine/library/atlas/food/) | 24,961 | 18,038 | 26,579 |
| [傷官格](https://openfate-ai.github.io/bazi-engine/library/atlas/hurting/) | 32,457 | 23,461 | 22,467 |
| [比肩月令](https://openfate-ai.github.io/bazi-engine/library/atlas/peer/) | 20,738 | 15,033 | 2,317 |
| [月劫格](https://openfate-ai.github.io/bazi-engine/library/atlas/rob/) | 33,199 | 24,019 | 3,472 |
| [建祿格](https://openfate-ai.github.io/bazi-engine/library/atlas/lu/) | 43,402 | 31,376 | 3,165 |
| [月刃格](https://openfate-ai.github.io/bazi-engine/library/atlas/blade/) | 11,549 | 8,307 | 11,767 |
| [化木格](https://openfate-ai.github.io/bazi-engine/library/atlas/transform-wood/) | 176 | 129 | 2,642 |
| [化火格](https://openfate-ai.github.io/bazi-engine/library/atlas/transform-fire/) | 155 | 114 | 3,280 |
| [化土格](https://openfate-ai.github.io/bazi-engine/library/atlas/transform-earth/) | 222 | 162 | 4,622 |
| [化金格](https://openfate-ai.github.io/bazi-engine/library/atlas/transform-metal/) | 67 | 48 | 2,095 |
| [化水格](https://openfate-ai.github.io/bazi-engine/library/atlas/transform-water/) | 175 | 130 | 2,706 |
| [從財格](https://openfate-ai.github.io/bazi-engine/library/atlas/follow-wealth/) | 221 | 161 | 12,693 |
| [從殺格](https://openfate-ai.github.io/bazi-engine/library/atlas/follow-power/) | 19 | 14 | 5,909 |
| [從兒格](https://openfate-ai.github.io/bazi-engine/library/atlas/follow-output/) | 146 | 116 | 8,050 |
| [從勢格](https://openfate-ai.github.io/bazi-engine/library/atlas/follow-mixed/) | 622 | 448 | 8,156 |
| [從強格](https://openfate-ai.github.io/bazi-engine/library/atlas/follow-strength/) | 99 | 79 | 2,535 |
| [從旺格](https://openfate-ai.github.io/bazi-engine/library/atlas/follow-dominant/) | 115 | 80 | 2,591 |
| [曲直格](https://openfate-ai.github.io/bazi-engine/library/atlas/dominant-wood/) | 651 | 486 | 11,311 |
| [炎上格](https://openfate-ai.github.io/bazi-engine/library/atlas/dominant-fire/) | 624 | 423 | 10,264 |
| [稼穡格](https://openfate-ai.github.io/bazi-engine/library/atlas/dominant-earth/) | 43 | 39 | 17,317 |
| [從革格](https://openfate-ai.github.io/bazi-engine/library/atlas/dominant-metal/) | 524 | 414 | 10,547 |
| [潤下格](https://openfate-ai.github.io/bazi-engine/library/atlas/dominant-water/) | 526 | 380 | 9,912 |

## Query and reproduce

Use Node 20.19+ to query locally with no dependencies. Filters accept the eight natal interaction codes in `rules.mjs` plus `mixed`, `gap`, and `boundary` from the [existing index](PATTERNS.md). Counts refer to matched birth slots; each result includes both original sample IDs. The browser uses the same query function.

```sh
node corpus/find-frame.mjs officer --extra CLASH --size 3
node corpus/find-frame.mjs follow-power --status review --year 1991
```

Extract the core archive from corpus v2.1.0. The extractor authenticates the pinned manifest and each yearly gzip, checks both natal records and their order, and reconstructs the lookup tables from the release. The second command evaluates every slot and compares the prior pattern flags. The Python audit separately evaluates all 28 rules using the actual source hidden stems, ten gods, elements, natal interactions and onset dates. It checks every byte and reconciles both slot and distinct-pillar counts. A clean regeneration writes to a different directory.

```sh
python3 corpus/atlas_facts.py /path/to/core /tmp/bazi-facts --workers 4
node corpus/build-atlas.mjs /tmp/bazi-facts /tmp/bazi-atlas
diff -r docs/library/atlas/data /tmp/bazi-atlas/data
diff docs/library/atlas/references.mjs /tmp/bazi-atlas/references.mjs
python3 corpus/verify_atlas.py /path/to/core /tmp/bazi-atlas/data --workers 4
```

Each chronological slot occupies seven bytes. In byte 0, bits 0–3 select the month frame in manifest order and bit 4 marks a match (unset means review). Bytes 1–2 and 3–4 are little-endian 16-bit masks of special matches and special reviews. Byte 5 flags the eight source interaction types in the order exported by `rules.mjs`. Byte 6 preserves the published flags for mixed pillars, onset gaps and withheld dates. The manifest contains yearly offsets in slots, the content-addressed filename, full SHA-256, rule order, examples and counts. The checked-in source and data support offline use after cloning.

Credit OpenFate, *OpenFate Bazi Corpus v2.1.0, Classical Pattern Atlas, profile 1*. The atlas data, tables and corpus-derived examples use [CC BY 4.0](DATASET-LICENSE.md). The classifier, query tools and page generator use the [MIT license](../LICENSE).
