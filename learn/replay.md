# 重查教材裡的命例

如果只想核對一句話，打開欄位摘錄，搜尋出生日期與時刻。例如 `1932-02-05T08:30:00+08:00/female`，在排盤檔會找到起運待定的原因，在逐年檔則能找到對應的空陣列。每個以斜線開頭的鍵都是原始記錄中的 JSON Pointer 路徑；例如 `/pillars/hour/hiddenStems/0/stem` 指時柱第一個藏干的字。[查看教學摘錄](evidence.json)

## 直接重查出刊的資料

下載下列七個原檔到同一資料夾，保留檔名。已解開完整 corpus v2 三個 TAR 的讀者可直接使用解壓後的資料根目錄。

| 種類 | 所需出生年份 |
| --- | --- |
| 排盤、藏干、大運與技術解讀 | [1900](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.0.0/1900.jsonl.gz) · [1932](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.0.0/1932.jsonl.gz) · [1991](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.0.0/1991.jsonl.gz) · [2000](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.0.0/2000.jsonl.gz) |
| 生活成稿 | [1991](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.0.0/1991.book.jsonl.zst) |
| 逐年成稿 | [1932](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.0.0/1932.yearbook.jsonl.zst) · [1991](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.0.0/1991.yearbook.jsonl.zst) |

從引擎倉庫根目錄執行下列指令。需要 Python 3.9 或更新版，以及安裝在 PATH 中的 `zstd` 命令列工具。程式可離線執行，只讀取教材和下載檔。

```sh
python3 learn/replay.py "/path/to/downloaded/files"
```

程式先對每個壓縮檔比對 SHA-256，再逐筆依完整出生 ID 查找原始 JSONL，對 17 組出生輸入進行 320 次欄位比對。四個不同時辰的加薪題會核對其完整文字與條件分支；兩個排運方向的 2025 與 2026 年中觀察會比對歲運資訊。缺檔、雜湊不同、漏列或數值不符，指令會回傳失敗。[資料版本與排盤清單](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.0.0/manifest.json) · [成稿清單](https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.0.0/edition-manifest.json) · [重放程式](replay.py)

要從輸入重新計算排盤與所有成稿，請切換到資料發行版本，依其重現指令安裝鎖定的依賴。教材重放逐欄比對摘錄與出刊資料。課文內的數字可對照這份摘錄，古籍解釋則須回到各課標記的原文。[從零重現 v2.0.0](https://github.com/openfate-ai/bazi-engine/blob/corpus-v2.0.0/corpus/README.md) · [原典索引](sources.md)

[回課程目錄](README.md)
