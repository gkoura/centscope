# Archived monthly analysis

This private folder preserves the old `/dashboard/accounts/[id]/analysis` page
without exposing a route. Next.js excludes folders beginning with `_` from routing.

The page, async wrapper, shared `CachedMonthlyAnalysis` component, monthly-analysis
calculations, and authorized `analysis` workspace resource are retained for future use.
The new `/analytics` page is the active reporting destination.

To restore this screen, rename this folder to `analysis` and deliberately restore
its navigation entry. The preserved component still targets the original URL.
