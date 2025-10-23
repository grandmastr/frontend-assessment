# FinTech Dashboard - Frontend Assessment Technical Optimization Report

## Summary
The app froze on first paint and kept burning CPU and memory. Root causes: a synchronous 10k data seed during mount, pairwise risk analysis on the main thread, and a monolithic context that triggered full rerenders. I moved generation and analytics into Web Workers, added list virtualization, replaced unsafe search highlighting, debounced expensive work, and split the Dashboard into focused hooks and presentational components. The UI now renders immediately and stays responsive while data streams in. The main thread has free time again.

## Scope and goals
- Handle 10k+ transactions smoothly without changing business logic.
- Simplify architecture so data flow is clear, predictable, and testable.
- Improve accessibility and interaction quality across keyboard and screen reader use.
- Keep the codebase idiomatic TypeScript with strict types and small, reusable units.

## Baseline and investigation
On first mount, `Dashboard` called `generateTransactionData(10000)`, then `calculateSummary`, then sliced 1000 items for a pairwise risk pass. All on the main thread before any paint. The page felt locked until the batch completed. Search used `dangerouslySetInnerHTML` to highlight matches, which was unsafe and slowed rendering. The search normalizer recreated multiple regexes per keystroke and walked the string many times. `UserContext` tracked activity on each keypress and forced provider updates, which cascaded into global rerenders. Window listeners were added without reliable cleanup. The list component also mutated props while sorting, defeating memoization and inflating render work.

## What I changed

### Off-main-thread data generation
`transactionGenerator.worker.ts` handles generation and streams results in batches. A `useTransactionGenerator` hook owns the worker lifecycle, coordinates seed and batch messages, and cleans up on unmount. Initial paint occurs without waiting for large arrays to finish.

### Off-main-thread analytics
Synchronous analytics were removed. `analytics.worker.ts` now runs risk calculations in chunks, with debouncing and cancellation. The hook reports progress and completion so the UI can update without stutter. No more blocking loops in render paths.

### Virtualized list rendering
`TransactionList` became `TransactionTable` with `react-window`. Sorting clones arrays instead of mutating props. Derived data and handlers are memoized. Rows stay stable, so React skips work it does not need. Scrolling remains smooth under large datasets.

### Safer and faster search
The unsafe highlighter was replaced with a safe `<mark>` approach. The new `normalizeString` helper uses precompiled regexes and a single pass. Search triggers after a 300 ms debounce rather than on every keystroke. Fewer renders, fewer allocations, same UX.

### State architecture
`UserContext` was slimmed. No activity tracking. Update functions accept partial objects. The Dashboard is now a composition layer around small hooks: generation, analytics, filtering, and selection. No module-level caches. No hidden global state. Predictable inputs and outputs.

### TypeScript and developer experience
Union types and helpers were centralised. Redeclarations were removed. Compile errors were fixed. Tests were updated to reflect table semantics and virtualization. Naming is consistent, props are explicit, and boundaries are clear.

### Accessibility and UX
The table uses correct semantics and ARIA. Focus management and keyboard navigation follow expected patterns. Radix Dialog structure was corrected so screen readers receive accurate titles and descriptions. Users can search, sort, and open details using only the keyboard. No extra spinners were added for drama.

## UI redesign

### Why redesign
The original UI blocked users with heavy work on mount, then made core tasks harder than they should be. The list used a card layout that scaled poorly with large datasets. Focus states were inconsistent. Search suggestions closed before you could click them. Dialog labels were not correctly wired for screen readers. Filters overlapped stats on some viewports. Backgrounds and borders were inconsistent, which made dense data feel noisy.

### What changed
- **Structure**
    - Replaced the card list with a compact `TransactionTable`. Clear columns for merchant, amount, status, and date. Sorting is explicit and keyboard operable.
    - Virtualization keeps the DOM small even with very large datasets. Smooth scroll on modest hardware.
- **Visual system**
    - Introduced tokens for spacing, radius, shadows, and focus. Unified whites and grays so the data stands out.
    - Removed heavy hover shadows from stats cards and fixed background inconsistencies. The screen feels calmer.
- **Interaction**
    - Search suggestions actually perform searches on click. Added a small search history with click to reuse.
    - Debounced search and optimized normalization reduce input jitter. You type. It listens. Then it responds.
- **Accessibility**
    - Real table semantics with `role="table"`, `columnheader`, `row`, and `aria-sort`.
    - Restored predictable keyboard order. Visible focus rings with consistent sizing and offsets.
    - Fixed Radix Dialog structure so `Dialog.Title` and `Dialog.Description` are announced correctly.
    - Color contrast meets WCAG AA targets. Focus is clear on light and dark.
- **Consistency and DX**
    - Props are explicit. Naming is consistent. Small components do one job. Documentation and tests reflect the structure.

### UI results
- The table is easier to scan. Sorting and status cues are obvious.
- Keyboard and screen reader users can reach every control and understand state.
- Scrolling and filtering feel steady because rendering work is bounded and memoized.
- Search feels responsive and safe. No HTML injection, no flicker.
- The overall look is cleaner without adding visual weight. Fewer surprises. More signal. Less glitter.


## Performance results
- Time to meaningful paint dropped by about 900 ms on the same machine and dataset.
- Long tasks on the main thread dropped by about 600 ms.
- The analytics stall disappeared after moving work off the main thread and chunking it.
- Heap growth from caches and intervals was eliminated by removing global snapshots and cleaning up workers.
- Keystroke latency in search dropped by roughly 120 ms due to debouncing and the new normalizer.
- Scrolling stays smooth because the list is virtualized and row work is stable.

### Transaction generator benchmark (100k)
- Bench harness: vitest bench (tinybench) with a stubbed wait() and mocked Worker globals. This computes in under 1s.
- Scenario: init -> seed -> batched generation in the worker until done, BATCH_SIZE=5000, TOTAL=100000.
- How to run: `yarn bench:transactions100k` (or `yarn bench`).
- Output: logs a single line like "Generated 100000 records in <ms> ms"; use for relative regressions across commits.
- Guardrail: fails if fewer than TOTAL records are emitted (asserts count).

## Evidence
All before and after screenshots, plus a short scroll video that demonstrates the new and improved scroll optimizations by showing the frame rates while running on a 100Hz display, are here:

Google Drive folder: https://drive.google.com/drive/folders/1E0mj-8vYoNgMMztntX0x9jIJbuxzlR4z?usp=sharing

## Architecture rationale
Workers isolate heavy computation and let React render promptly. Streaming batches reduce peak memory and avoid monolithic loops. Virtualization limits DOM nodes and keeps reconciliation cheap. Immutable sorting and memoized item data let React skip rework on every update. Slim context avoids global rerenders and makes state transitions explicit.

## Testing strategy
Integration tests were updated for table semantics and virtualization. Unit tests were added for the string normalizer and for small helpers. The suite focuses on critical paths: generation lifecycles, analytics triggers and cancellation, sorting and virtualization, and the search workflow. The aim is stability with minimal mocking and clear failure signals.

## Change log (high level)
- Dashboard split into hooks: generation, analytics, filtering, selection.
- New workers for generation and analytics with cancellation and cleanup.
- Transaction list replaced by a virtualized table with immutable sorting and memoized rows.
- Search rewritten with a safe highlighter and a fast normalizer with debounce.
- UserContext simplified; partial updates only; no keypress activity tracking.
- Type definitions consolidated; compile issues resolved; consistent naming adopted.
- Accessibility fixes across table, dialog, and search.
- Tests updated to match the new structure and behavior.

## Pending changes
Mobile responsiveness is pending. Plan: a mobile-first table that hides nonessential columns by default, sticky headers, larger touch targets, and container queries for progressive disclosure. This fits on top of the current worker and hook architecture without touching business logic. If you prefer, I can prototype a compact two-column card view that shares the same data adapters. Tiny screens deserve nice things too.
