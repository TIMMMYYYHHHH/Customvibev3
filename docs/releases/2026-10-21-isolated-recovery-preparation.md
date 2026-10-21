# Isolated recovery preparation, 21 October 2026

The owner approved a disposable synthetic setup capped below 232 KB: D1 `cv-tech19-rehearsal-20261021` and private Standard R2 buckets `cv-tech19-primary-20261021` and `cv-tech19-copy-20261021`. All three were created through the existing provider UI. No production write, application binding or paid upgrade occurred. Application source remains `dc8e9328e2d6ea3c5ef3718525d61115d3af63d4`.

## Verified setup

- D1 UUID: `cd622e57-d54a-458d-a1f5-bca434ab63e4`. Twelve pinned migrations, the synthetic seed and the post-bookmark mutation each executed once. The eight recorded table counts changed from `4/4/3/3/3/3/3/2` to `5/5/4/4/4/4/4/2`; synthetic ID 1 reached version 2 with its token NULL.
- Distinct chronological B0 and B1 bookmarks were retained in `ROOT-D1-B0.json` and `ROOT-D1-B1.json`. Independent review was CLEAR for this setup evidence only, with no independent provider restore audit or completed recovery claim.
- The primary bucket received four synthetic images; the copy bucket received three. Upload observations establish presence, not recovered byte identity. The final fourth copy upload was not attempted.
- One actual primary ID 1 download matched its expected **23,129 bytes** and SHA-256 `3dd79be385247785f39f592b26bd337696338f52645e1d3a24f69c3abc8c8290`. Other uploaded objects were not independently byte-verified.

## Current limit and next step

Operator file transfer took roughly 100 to 802 seconds for a 23 KB file, and a download wait reset. This transport limitation prevented completing the paired byte-verification exercise. The existing private helper does not support R2 binary transfer or new-resource operations; no helper expansion or credential-reading workaround was attempted.

No `/restore` or deletion occurred. Customer recovery copies were not enabled. This preparation proves neither zero loss nor restoration time and does not complete the recovery work. A narrowly scoped D1-only restore and teardown of the three named temporary resources remain for explicit owner approval. Production data, retention deadlines, customer mail and existing security controls remain unchanged.

Operator evidence: `audit/fix-plan/recovery-followup-20261021/ROOT-D1-*.json`, `ROOT-D1-*-COUNTS.txt`, `ROOT-PRIMARY-ID1-DOWNLOADED-HASH.json` and the R2 creation receipts; independent review: `audit/fix-plan/runtime-followup-20261021/D1-SETUP-INDEPENDENT-REVIEW.json`. This note adds documentation only; no source change, build or test rerun accompanies it.
