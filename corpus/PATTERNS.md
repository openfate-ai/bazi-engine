# OpenFate Bazi pattern index

[Search in the browser](https://openfate-ai.github.io/bazi-engine/library/search/) or query the checked-in index with Node.js 20+. The CLI reads local files and needs no dependencies.

```sh
node corpus/find-pattern.mjs mixed --year 1991 --pillar hour --size 5
node corpus/find-pattern.mjs gap --year 1991 --page 2
node corpus/find-pattern.mjs boundary --year 1932
```

The CLI returns JSON with the total number of matching time slots, the page, both original sample IDs, the mixed pillar roles and the genders whose onset is withheld. The default page size is 12, with a maximum of 100. Use the IDs in the online library or in the MCP tool `read_bazi_corpus_chapter`.

## Definitions and units

The v2.1.0 corpus covers January 1, 1900 through November 22, 2026 inclusive. Its 1,112,328 representative inputs form 556,164 female/male pairs. Each pair shares one civil date and even hour at :30 under UTC+8, 120° E, no DST. All counts describe this fixed corpus grid.

| Key | Match | Full corpus |
| --- | --- | ---: |
| `mixed` | The same natal pillar position appears in at least one `COMBINATION_2` and at least one `CLASH` in each paired chart. Each matching time counts once, even if several positions qualify. Filter by `year`, `month`, `day` or `hour` pillar. | 75,159 time slots |
| `gap` | Both first Da Yun onset receipts are calculated. The absolute difference between their civil calendar dates is at least 1,096 days. Fractional days are ignored. | 391,676 paired slots |
| `boundary` | Either gender has the explicit `PILLAR_TERM_BOUNDARY_MISMATCH` receipt and a null start date. The result records which genders qualify. | 96 time slots, 192 records |

The categories overlap. Repeated four-pillar combinations at different civil times remain distinct samples. The first query reports structural relationships; it does not score or cancel them.

## Data format

[Download the manifest](https://openfate-ai.github.io/bazi-engine/library/search/data/index.json). Its `file` field gives the binary filename in the same directory, and `sha256` covers the entire uncompressed file. The manifest lists yearly byte offsets, slot counts and totals.

Format 1 uses one unsigned byte per chronological time slot. Slot zero is 1900-01-01T00:30:00+08:00. Add twelve slots per civil day. Bits 0–3 flag a qualifying year, month, day and hour pillar respectively. Bit 4 flags the onset gap, bit 5 the female boundary receipt, and bit 6 the male receipt. Bit 7 is reserved and zero. Example: byte value 96 has both boundary bits set.

## Rebuild from the release

Download the core archive from the [published corpus v2.1.0](https://github.com/openfate-ai/bazi-engine/releases/tag/corpus-v2.1.0) and extract the directory containing `manifest.json` and `years/`. The core manifest in that release carries the original facts edition number, 2.0.0. The generator verifies the pinned manifest SHA-256 and the checksum of every yearly gzip file before indexing. It checks the expected birth IDs and ordering, confirms both inputs share the same four pillars and qualifying pillar positions and reconciles all withheld timing records with the release totals.

```sh
python3 corpus/index_patterns.py /path/to/extracted-core /tmp/bazi-patterns --workers 4
diff -r docs/library/search/data /tmp/bazi-patterns
python3 corpus/verify_patterns.py /path/to/extracted-core /tmp/bazi-patterns --workers 4
```

The independent verifier checks each index bit against the Chinese pillar-position labels and civil onset dates in all 1,112,328 records.

The three shareable case pages are generated during `npm run build:pages` from the frozen corpus reader. Their previews can be refreshed with ImageMagick 7 and a Traditional Chinese font:

```sh
node corpus/build-pattern-cases.mjs --covers /path/to/chinese-font.ttc
```

Credit OpenFate, *OpenFate Bazi Corpus v2.1.0, pattern index*. The index and reading extracts are available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The query and generation code uses the repository's MIT license.
