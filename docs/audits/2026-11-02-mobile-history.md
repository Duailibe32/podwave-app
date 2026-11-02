# Mobile history and product images

Base: merged PR #12, main `144e52b`. User reported RLS denial `podwave_order_insert_boundary` while opening old history, five nonexistent pending orders, slow mobile images and apparent connection instability.

## Findings

Customer history, login refresh and administrator list refresh merged arbitrary browser cache entries back into server results and automatically inserted missing records. Legacy storage keys were scanned on every load. This recreated deleted orders and retried advanced metadata that the initial-order RLS boundary correctly rejects. A local PostgreSQL reproduction accepted the actual fresh checkout payload and rejected modified versions/payment/stock/loyalty fields.

The production database was inspected using SELECT in READ ONLY transactions. It contains three received orders linked to the open account. The user identified all three as old tests. Their inspected metadata showed no linked sale, no stock deduction and zero amount paid. No production orders have been deleted by this correction.

Eight live product cards used original Imgur images with natural width 1,254px. For one public image, measured transfer sizes were 1,794,909 bytes for the original, 28,750 bytes for the medium thumbnail and 91,375 bytes for the large thumbnail. These are sample transfer sizes, not a claim about end-to-end page load time on the user's phone.

## Changes

- Customer and admin history refreshes perform reads only, with no automatic INSERT or cleanup.
- Confirmed orders follow a successful server snapshot, including an empty list. Read errors return null and retain the previous visible history with an error message.
- Customer queries filter by authenticated customer UUID. A valid main-table response no longer triggers a duplicate query of the legacy alias. The alias is used only when the main table is missing.
- Unmarked legacy browser cache is not treated as proof of an unsent order. Old keys remain untouched for manual review. Records excluded when replacing the shared cache are retained under `podwave_order_cache_review_v1`; explicit deletion tombstones are excluded from this archival step. Storage/quota failures prevent replacement of the original cache.
- New checkouts explicitly track `pending_sync`, changing to `synced` only after the server confirms. Only untouched pending drafts for the current UUID can be retried, using an explicit button. Guest records, phone suffixes and matching emails do not assign a shared-browser order to another account.
- Product cards request documented Imgur responsive thumbnails, retain originals for details and fall back to the original if a thumbnail errors. Existing thumbnails, animations, inline images, local images and other providers are unchanged. First two cards load eagerly; remaining cards stay lazy. The catalog bootstrap avoids an additional connectivity probe before its six data requests.

## Validation

TypeScript, production build and 16 audit scripts passed. Added tests exercise five stale ghosts, pending drafts, ownership isolation, empty versus denied reads, missing-table fallback, the actual profile/admin read handlers (writes and cleanup forbidden), explicit retry behavior and thumbnail URL handling.

A disposable UI fixture renders the real CustomerProfileModal and ProductCard with synthetic context and mocked history. Five legacy local orders plus an empty server display `Pedidos (0)` and the empty-history message. At a 375px viewport, the product card loaded the medium thumbnail and displayed the expected product image. The fixture has no real account or database connection.

No new production SQL is required for this frontend correction; the existing RLS boundary remains intact. Deployment is still required. Removing the three production test records is a separate destructive action requiring confirmation after the corrected frontend is deployed, to avoid recreation by older history loaders. Old unmarked drafts are preserved for manual review rather than silently uploaded.
