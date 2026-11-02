# First remediation batch — 2026-11-02

Base: main `50d0be351b017f75086c11f7818f9f3d64cee788`.
Branch: `fix/audit-consistency-20261102`.

## Resulting behavior

- Order status, linked sale and stock changes use one `save_order_with_sale` database transaction. A rejected order write rolls back its sale, stock allocation and audit events. An order row lock and expected revision prevent concurrent stale changes. The existing financial owner authorization remains in force for sale/stock changes.
- Missing/refused/malformed sale RPC responses never fall back to direct sales or stock writes. Deletion likewise requires the transactional RPC to confirm the deletion; it does not change unknown stock to zero or bypass a revision conflict.
- Status/payment/financial posting do not update local state or report success before a confirmed transaction. A missing new RPC fails with an installation message.
- Ordinary order saves require the affected ID and persisted version. An initial revision absent in legacy delivery_info is matched with IS NULL, not silently rebased. Insert failures never assign the order to the first available profile or another authenticated owner.
- Confirmed empty sales reads clear obsolete synced cache; failed reads preserve it. Pending local changes remain pending. Unrelated financial datasets retain their existing reconciliation behavior.
- Failed sale deletion keeps the visible sale and removes its provisional tombstone. A cache-only sale with confirmed remote absence can still be removed.
- Cleanup is administrator-only, with explicit ACL revocation and a runtime identity check. Restrictive policies contain older permissive policies; customers cannot promote their profile or perform administrative order updates. Own diagnostic probes can still be deleted.
- Expiration uses the latest valid cancellation event, including after reopen/cancel cycles. The SQL trigger skips customer checkout and only runs cleanup in an authenticated administrative session. It is event-driven; this batch does not create a scheduler guaranteeing wall-clock deletion at exactly 24 hours.
- The six TypeScript diagnostics are corrected. Notification clicks cannot navigate to a foreign origin. The existing write-confirmation harness now injects its actual dependencies, and the coupon text check normalizes CRLF.

## Production deployment requirements

The SQL files are reviewable proposals, not automatic migrations or executed production changes. The frontend now requires the order transaction RPC. Do not deploy it alone.

1. Inventory the actual schema, functions, RLS policies, table/column grants and enabled triggers in staging. Confirm customer_orders is the authoritative writable table; a separate historical orders table is not automatically migrated. Preserve existing stronger restrictions and reviewed financial-owner authorization.
2. Confirm the existing `save_sale_with_stock(jsonb,integer,text,boolean)` RPC, its finance-owner authorization and stock schema are installed and match the reviewed definitions. Do not run old migrations blindly to satisfy missing dependencies or backfill stock.
3. For an existing compatible installation, review and apply `supabase/proposals/20261102_order_access_and_cleanup_hardening.sql`, then `supabase/proposals/20261102_atomic_order_sale.sql` in staging. These files install guards/functions but do not clean historical records during installation. Validate existing triggers for compatibility. The first consolidated proposal assumes full_name and is intended only for that verified schema; it is not a converter for legacy name-based schemas.
4. Deploy this frontend in staging. Test client checkout, administrator confirmation/cancellation, insufficient stock, simultaneous updates, lost response/reload, failed deletion and cache-only deletion on two devices. New unmanaged historical sales are intentionally not inferred or created to bypass stock validation.
5. Only after staging validation and a separate production deployment decision, use the reviewed installation order: SQL dependencies/security first, transaction RPC second, matching frontend last. The branch is available in draft PR #12. An isolated PodWave Testes project was installed by the user and checked separately; production has not been modified.

## Local validation

Run `npm run lint`, `npm run build` and `npm run test:audit` with the project's dependencies. The audit suite executes 14 scripts, using mocked transports, pure functions and PGlite only; no account, notification or production database writes.

Meaningful added checks include genuine SQL rollback after a late order rejection, unchanged stock on stale retry, repeated cancellation without restocking twice, sale/order identity, administrator/anonymous access, restrictive RLS in the presence of legacy permissive policies, blocked profile promotion, latest cancellation retention, idempotent SQL installation, no direct-write fallback on RPC errors, malformed transaction responses and empty-versus-failed cache reconciliation.

Build output still warns about bundle size and the Vite config's future native-loader compatibility. These are not fixed by this batch.

## Signup confirmation finding during staging

The user's staging registration created an Auth account and linked customer profile, but the account had no confirmed email or successful sign-in. The UI nevertheless showed a connected customer until reload. Signup now explicitly returns a pending-confirmation result without an authenticated profile or client-side profile writes when Supabase returns no session. The context preserves the unauthenticated state and the form keeps confirmation guidance visible, clears its password field and switches to password login. Immediate-session signup keeps its existing behavior. The added test executes the real service, context and submit-handler bodies with controlled Auth responses, including rejection and missing-user cases. No email confirmation requirement was disabled or bypassed; authenticated staging flows remain pending user confirmation and login.

## Remaining audit work

- Enforce the advertised loyalty purchase minimum at the trusted grant path and define how historical rules are preserved.
- Centralize promotion calculations/labels; fix third-tier zero discount, fixed-value labels and consistent local/remote normalization.
- Complete arbitrary accessory CRUD and compatibility validation.
- Add trusted server-side customer pricing/discount validation; restricting initial order metadata does not validate customer-submitted prices.
- Inspect and validate the actual production Supabase configuration, Realtime publication and live two-device flows.
- Wire the local verification commands into the repository's chosen CI/deployment gate. This batch supplies a repeatable local suite, not a configured hosted workflow.
