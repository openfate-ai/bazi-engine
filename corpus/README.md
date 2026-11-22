# OpenFate 八字命盤庫

**1900 年 1 月 1 日至 2026 年 11 月 22 日**，涵蓋 46,347 個公曆日期、1,112,328 組出生輸入。每筆附四柱、藏干、十神、合沖關係、13 章生活解讀及 65 個情境問題。可以先讀一張完整的樣稿，再決定要下載哪個年份。[1900 年首筆](examples/1900-01-01T00-30-female.md) · [1991 年工作與關係樣稿](examples/1991-10-18T08-30-female.md) · [下載 v2.0.0](https://github.com/openfate-ai/bazi-engine/releases/tag/corpus-v2.0.0)

OpenFate Bazi Corpus contains 1,112,328 representative birth inputs through November 22, 2026. Each includes 13 full Traditional Chinese life chapters, with five conditional cases per chapter, plus 13 technical readings. Resolved luck cycles have 90 yearly observations. The offline reader works without an account. Original dataset and readings are CC BY 4.0. Code is MIT.

## 讀自己的出生年份

1. 下載 Release 裡的 `reader.html`，用近期版本的瀏覽器開啟，可直接閱讀六張樣稿。
2. 下載出生年份的排盤檔，例如 `1991.jsonl.gz`，在閱讀器選「從年度檔查盤」。輸入日期、代表時刻和排運性別。
3. 「生活解讀」可選 13 章，展開章內問題就能讀到完整情境與盤面依據。「逐年對讀」可選大運範圍內的年份。「排盤與起運」保留技術解讀。

## 資料檔如何搭配

每組資料都用同一個 `id` 對讀。Release 提供逐年檔案，以及三個能解到同一資料夾的 TAR 檔。依需要下載。

| 檔案 | 內容 |
|---|---|
| `core.tar`（檔名尾碼） | `years/YYYY.jsonl.gz`、出生與起運事實、標籤、13 段技術解讀、離線閱讀器、重現工具、清單 |
| `books.tar` | `books/YYYY.book.jsonl.zst`，逐盤已寫好的 13 章生活正文、65 個問題和每段引用 |
| `yearbooks.tar` | `yearbooks/YYYY.yearbook.jsonl.zst`，逐盤已寫好的年中觀察、週歲、歲運干支、對應關係及引用 |
| `manifest.json`、`edition-manifest.json` | 排盤與成稿分開計數，含各年度筆數、檢查範圍、雜湊及抽樣篇幅 |
| `calendar-reference.json` | 外部曆表的核對口徑、檔案雜湊與所有差異 |

生活章節涵蓋性格、工作、金錢、親密關係、家庭、朋友、學習、表達、居住、轉換環境、休息、照顧晚輩與人生取捨。章內問題有共用的情境與追問。每盤依十神是否透干、日干同字根、月令本氣是否透出及地支實際牽連選取解讀。不同出生輸入可以共用四柱和原局正文。同一原局的男女輸入可有不同大運。

每個技術或解讀欄位所列的 `ref` 或 `evidence` 都指向同 ID 的排盤資料。生活例子用來討論選擇，沒有使用真人病歷、收入或家庭史。引擎未能確定起運的交節輸入保留完整原局，對應的逐年清單為空。[交節樣稿](examples/1932-02-05T08-30-female.md)

## 排盤與年中觀察

每天取固定 UTC+08:00、東經 120 度、無夏令時間下的 00:30、02:30，依序到 22:30，共 12 個民用代表時刻。每個時刻各排女、男兩組，採真太陽時、子初 23:00 換日與 `DAYUN_SECOND_V2`。這組固定設定也用於 1900 年，並未重建各地當年的法定時區。2026 年截至 11 月 22 日，最後一天含完整 12 個代表時刻。

逐年觀察取每步大運內十個 7 月 1 日中午，九步共 90 筆。第一個年中觀察點在起運以後。週歲依出生月日計算，歲支對四柱與運支逐一查六合、正沖與同支。每筆以該年中時點為準。出生樣本截止日只限制出生日期，推演的年份可超過 2026 年。[1991 樣本在 2026 年的對讀](examples/1991-midyear-2026.md)

## 查詢、驗證與重現

解開三個 TAR 後，在資料根目錄執行下列指令。使用 Python 3.9+ 與 zstd 命令列工具。只看技術欄位可以只下載 core。

```sh
python3 lookup.py . 1900-01-01 00:30 female --kind technical --json
python3 lookup.py . 1991-10-18 08:30 female --kind book
python3 lookup.py . 1991-10-18 08:30 female --kind yearbook --year 2026
shasum -a 256 -c SHA256SUMS
```

從原始碼的 `corpus/` 可單獨重算一年，或重現全庫。完整流程使用 Node.js 20.19.5、Python 3.9+、zstd、Poppler 的 `pdftotext`，並需要磁碟空間存放壓縮檔及工作檔。

```sh
npm ci --ignore-scripts
node generate.mjs facts 1900 /tmp/openfate-facts
node generate.mjs readings 1900 /tmp/openfate-facts /tmp/openfate-data/years
node export-volume.mjs book 1900 /tmp/openfate-facts /tmp/openfate-data/books
node export-volume.mjs yearbook 1900 /tmp/openfate-facts /tmp/openfate-data/yearbooks
python3 reproduce.py /path/to/new-directory --workers 3
```

`verify.py` 核對代表時刻、四柱欄位、十神、藏干、標籤、地支關係及大運。`verify-edition.py` 開啟實際出版的壓縮檔，核對三種檔案的出生 ID、各章與條件分支、盤面引用、逐年歲運欄位及檔案雜湊。另以每天中午的一筆排盤核對農曆年、月、日及閏月。1900 年參照紫金山天文台編製的曆表，並核對該年的紀日干支；1901 年起參照香港天文台的公曆農曆對照表。[紫金山天文台曆表](https://pmo.cas.cn/xwdt2019/kpdt2019/202203/P020250414456381274062.pdf) · [香港天文台曆表](https://www.hko.gov.hk/en/gts/time/conversion1_text.htm)

排盤依賴鎖定 `@openfate/bazi-engine@2.0.0`、`@openfate/true-solar-time@4.0.2`、`lunar-javascript@1.7.7`。資料與原創解讀可商用，須署名並標示修改。[資料授權](DATASET-LICENSE.md)
