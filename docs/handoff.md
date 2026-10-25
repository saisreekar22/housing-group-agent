# Session Handoff — housing-group-agent

## Stop point

Stopped after writing `tests/filters.test.ts`. No file was left mid-write. The last code edits were:

- `src/lib/extraction/llm.ts`: rent extraction now handles comma-formatted amounts (e.g. `$1,025/month`) via `parseAmount`.
- `tests/geocoder.test.ts`, `tests/bot.test.ts`, `tests/filters.test.ts`: newly created.

No tests, typecheck, or production build have been run yet.

## What is implemented

All 14 OpenSpec tasks have implementation files, but **none are verified and no checkboxes in `openspec/changes/housing-group-agent/tasks.md` have been marked**.

- Project scaffold/config: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `.gitignore`.
- Env/SQL: `.env.example`, `supabase/schema.sql`, `supabase/seed.sql`. `supabase/seed.sql` includes the 8 required Tempe complexes. The DB has not been provisioned/executed from this session.
- Domain/data: `src/lib/types.ts`, `src/lib/seed-data.ts` (18 listings), `src/lib/db/supabase.ts`, `src/lib/db/listings.ts`, `src/lib/db/tracked-groups.ts`, `src/lib/filters.ts`.
- Pipeline: `src/lib/geocoding/tempe-apartments.ts`, `src/lib/geocoding/geocoder.ts`, `src/lib/whatsapp/parser.ts`, `src/lib/whatsapp/bot.ts`, `src/lib/whatsapp/manager.ts`, `src/lib/extraction/llm.ts`, `src/lib/ingest.ts`.
- API routes: `/api/listings`, `/api/geocode`, `/api/seed`, `/api/whatsapp/status`, `/api/whatsapp/connect`, `/api/whatsapp/groups`, `/api/whatsapp/import`.
- UI: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/MapApp.tsx`, `HousingMap.tsx`, `FilterBar.tsx`, `ListingBottomSheet.tsx`, `WhatsAppSetupDrawer.tsx`.
- Tests: `tests/listings.test.ts`, `tests/parser.test.ts`, `tests/extraction.test.ts`, `tests/geocoder.test.ts`, `tests/bot.test.ts`, `tests/filters.test.ts`.

## Next steps (in order)

1. Fix the known likely failures listed below.
2. Run:
   ```bash
   npm test
   npm run typecheck
   npm run build
   ```
3. Add route-level coverage or manually smoke-test `/api/listings`, `/api/geocode`, and `/api/seed` (task 2.4 expects them verified).
4. Apply `supabase/schema.sql` and `supabase/seed.sql` to the Supabase project, then smoke-test `GET /api/seed` and `GET /api/listings?zip=85281`.
5. Only after the relevant tasks pass, run:
   ```bash
   openspec instructions apply --change "housing-group-agent" --json
   ```
   Mark completed task checkboxes at the returned `sourcePath`/`line` by changing `- [ ]` to `- [x]`. Re-run the command to confirm progress. Do not archive until the user asks.

## Known likely failures / review points

- `supabase/schema.sql:42`: `generated always as (posted_at + interval '60 days') stored` may be rejected by Postgres because the expression must be immutable. If it fails, replace with a trigger-maintained `expires_at`, or drop the generated column and index/query on `posted_at` (still satisfies the 60-day TTL requirement).
- `tests/filters.test.ts:29`: invalid amenity key `laundry: undefined`; amenity keys come from `emptyAmenities()` (e.g. `in_unit_laundry`). Remove it or use a valid key.
- `src/components/FilterBar.tsx:132`: `React.FormEvent` is used without importing React. Replace with `import type { FormEvent } from "react"` and `FormEvent`.
- `src/lib/whatsapp/manager.ts:242`: pino logger may not satisfy Baileys `ILogger` typing for `makeCacheableSignalKeyStore`. Cast if typecheck complains.
- `src/lib/whatsapp/manager.ts`: verify Baileys `messages.upsert` event typing, `sendMessage` content shape, and `GroupMetadata.size` optionality.
- `next.config.ts:5`: confirm `eslint.ignoreDuringBuilds` is still valid in Next 16; remove the `eslint` block if the config type rejects it.
- `src/lib/ingest.ts`: verify the Supabase client and candidate/extraction types line up after typecheck.
- Tests use `vi.mocked(fetcher)`; if TS complains, type the fetcher as `Mock` from Vitest.
- Route tests for `/api/listings`, `/api/geocode`, and `/api/seed` are not written yet.
- No custom `server.ts` was created despite the design mentioning a unified Node process. Standard `next start` is a persistent Node process, so decide whether a custom server is actually required.
- Dedup requires non-null `rent_monthly`; listings without a detected rent may not deduplicate. Acceptable fallback behavior, but confirm against the spec.
- Ensure the heuristic extraction fallback date expectations (e.g. `Nov 15` → 2026, `July 31` → 2027) match `tests/extraction.test.ts` when the suite runs.

## Environment notes

- Repo: `/mnt/s/Work/Projects/devhacks2026/housing-group-agent`; the surrounding workspace is a git repo, but this project directory is currently untracked (`git status` shows `?? ./`). Do not stage unrelated sibling directories.
- `.env.local` exists and contains real Supabase URL/publishable/service-role values. It is gitignored. No Groq/OpenRouter keys are set, so the heuristic extraction fallback is expected locally.
- Supabase is configured but the schema may not have been applied. DB helpers intentionally fall back to seed data when Supabase is missing/errors/empty.
- Node `v22.22.3`, npm `10.9.8`. Dependencies are installed.
- No git commits were made in this session.
