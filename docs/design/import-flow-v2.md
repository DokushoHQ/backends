# Import Flow v2 - Progressive Multi-Step Design

## Overview

A redesigned import flow that works consistently on mobile and desktop, supports multi-source bulk selection, and provides smart duplicate detection with cross-source matching.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         STEP 1: ENTRY                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Browse       │  │ Paste URL(s) │  │ Upload CSV   │          │
│  │ Sources      │  │              │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              SELECTION CART (persists)                   │   │
│  │  Shows: X series selected from Y sources                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 2: SEARCH & SELECT                      │
│  (Per-source browsing, can return to Step 1 to switch)          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Search: [____________________] [🔍]                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ ☑ Title │ │ ☐ Title │ │ 🔒 Title│ │ ☐ Title │   ...        │
│  │ [cover] │ │ [cover] │ │ [cover] │ │ [cover] │              │
│  │         │ │         │ │ Already │ │         │              │
│  │         │ │         │ │ Imported│ │         │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                 │
│  [← Back to Sources]              [Review Selection (5)] →      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STEP 3: REVIEW                             │
│  (All selected series with duplicate detection)                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [cover] One Piece (MangaDex)                             │   │
│  │         ○ Import as new                                  │   │
│  │         ● Link to: "One Piece" (WeebCentral) - 95% match │   │
│  │         [Remove]                                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ [cover] Solo Leveling (WeebCentral)                      │   │
│  │         ● Import as new (no similar found)               │   │
│  │         [Remove]                                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ [cover] Attack on Titan (Japscan)                        │   │
│  │         ○ Import as new                                  │   │
│  │         ○ Link to: "Shingeki no Kyojin" (MangaDex) - 87% │   │
│  │         ⚠️ Please select an option                       │   │
│  │         [Remove]                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [← Back to Selection]                    [Confirm Import] →    │
│                                    (disabled until all valid)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 4: PROCESSING                           │
│                                                                 │
│  Importing 5 series...                                          │
│                                                                 │
│  ✓ One Piece - Linked to existing                               │
│  ✓ Solo Leveling - Import queued                                │
│  ◐ Attack on Titan - Importing...                               │
│  ○ Naruto - Pending                                             │
│  ○ Bleach - Pending                                             │
│                                                                 │
│  [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] 60%               │
│                                                                 │
│  [Close] (exits and clears cart)                                │
└─────────────────────────────────────────────────────────────────┘
```

## Step 1: Entry Point

### Layout (Mobile & Desktop identical)

```
┌──────────────────────────────────────┐
│ Import Series                    [X] │
├──────────────────────────────────────┤
│                                      │
│  How would you like to import?       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🔍 Browse Sources              │  │
│  │    Search and select from      │  │
│  │    available manga sources     │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🔗 Paste URLs                  │  │
│  │    Import from direct links    │  │
│  │    (one per line)              │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 📄 Upload File                 │  │
│  │    CSV or TXT with URLs        │  │
│  │    (max 100 URLs)              │  │
│  └────────────────────────────────┘  │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  🛒 Selection Cart                   │
│  ┌────────────────────────────────┐  │
│  │ 3 series from 2 sources        │  │
│  │ [View Selection →]             │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

### URL Paste Mode (Step 1 sub-view)

```
┌──────────────────────────────────────┐
│ ← Back                 Paste URLs    │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ https://mangadex.org/title/... │  │
│  │ https://weebcentral.com/...    │  │
│  │ https://japscan.me/manga/...   │  │
│  │                                │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│  Paste one URL per line              │
│                                      │
│  [Parse URLs]                        │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  Parsed Results:                     │
│  ┌────────────────────────────────┐  │
│  │ ☑ One Piece (MangaDex)         │  │
│  │ ☑ Solo Leveling (WeebCentral)  │  │
│  │ ⚠ Invalid URL: bad-url.com     │  │
│  │ 🔒 Naruto (MangaDex) - Already │  │
│  └────────────────────────────────┘  │
│                                      │
│  [Add 2 to Selection]                │
│                                      │
└──────────────────────────────────────┘
```

## Step 2: Search & Select

### Source Selection (sub-step)

```
┌──────────────────────────────────────┐
│ ← Back                 Select Source │
├──────────────────────────────────────┤
│                                      │
│  ┌────────┐  ┌────────┐  ┌────────┐  │
│  │ [icon] │  │ [icon] │  │ [icon] │  │
│  │MangaDex│  │Weeb    │  │Japscan │  │
│  │        │  │Central │  │        │  │
│  │   ●    │  │   ●    │  │   ●    │  │
│  └────────┘  └────────┘  └────────┘  │
│                                      │
│  ┌────────┐  ┌────────┐              │
│  │ [icon] │  │ [icon] │              │
│  │Suwayomi│  │ ...    │              │
│  │ Source │  │        │              │
│  │   ○    │  │        │              │
│  └────────┘  └────────┘              │
│                                      │
│  ● = healthy  ○ = degraded           │
│                                      │
└──────────────────────────────────────┘
```

### Browse & Search (main sub-step)

```
┌──────────────────────────────────────┐
│ ← Sources    MangaDex    🛒 Cart (3) │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🔍 Search series...            │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ☑ ┌─────┐ One Piece            │  │
│  │   │cover│ Manga • Ongoing      │  │
│  │   └─────┘ 1089 chapters        │  │
│  ├────────────────────────────────┤  │
│  │ ☐ ┌─────┐ Naruto               │  │
│  │   │cover│ Manga • Completed    │  │
│  │   └─────┘ 700 chapters         │  │
│  ├────────────────────────────────┤  │
│  │ 🔒 ┌─────┐ Bleach              │  │
│  │   │cover│ Already in Library   │  │
│  │   └─────┘ [View →]             │  │
│  ├────────────────────────────────┤  │
│  │ ☐ ┌─────┐ Dragon Ball          │  │
│  │   │cover│ Manga • Completed    │  │
│  │   └─────┘ 520 chapters         │  │
│  └────────────────────────────────┘  │
│                                      │
│  [Load More]                         │
│                                      │
│  ─────────────────────────────────   │
│  [Continue to Review (3 selected)]   │
└──────────────────────────────────────┘
```

### Detail Preview (tap/click on item)

On mobile: slides in from right or bottom sheet
On desktop: could be side panel or modal

```
┌──────────────────────────────────────┐
│ ← Back                    [☑ Select] │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │         [Cover Image]        │    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  One Piece                           │
│  ワンピース                           │
│                                      │
│  Manga • Ongoing • 1089 chapters     │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Gol D. Roger, a man referred   │  │
│  │ to as the "Pirate King," is... │  │
│  └────────────────────────────────┘  │
│                                      │
│  Authors: Eiichiro Oda               │
│  Genres: Action, Adventure, Comedy   │
│                                      │
└──────────────────────────────────────┘
```

## Step 3: Review Selection

### Main Review View

```
┌──────────────────────────────────────┐
│ ← Back               Review (5)      │
├──────────────────────────────────────┤
│                                      │
│  Ready to import 5 series from       │
│  3 sources. Please review:           │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ [img] One Piece                │  │
│  │       MangaDex                 │  │
│  │                                │  │
│  │   ⚠️ Similar series found:     │  │
│  │   ┌──────────────────────────┐ │  │
│  │   │ ○ Import as new series   │ │  │
│  │   │ ● Link to existing:      │ │  │
│  │   │   "One Piece" from       │ │  │
│  │   │   WeebCentral (95%)      │ │  │
│  │   │   [Show more matches]    │ │  │
│  │   │ ○ Link to other series   │ │  │
│  │   │   [Search library...]    │ │  │
│  │   └──────────────────────────┘ │  │
│  │                        [Remove]│  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ [img] Solo Leveling            │  │
│  │       WeebCentral              │  │
│  │                                │  │
│  │   ✓ No similar series found    │  │
│  │   ┌──────────────────────────┐ │  │
│  │   │ ● Import as new series   │ │  │
│  │   │ ○ Link to other series   │ │  │
│  │   │   [Search library...]    │ │  │
│  │   └──────────────────────────┘ │  │
│  │                        [Remove]│  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ [img] L'Attaque des Titans     │  │
│  │       Japscan (French)         │  │
│  │                                │  │
│  │   ⚠️ Similar series found:     │  │
│  │   ┌──────────────────────────┐ │  │
│  │   │ ○ Import as new series   │ │  │
│  │   │ ○ Link to existing:      │ │  │
│  │   │   "Attack on Titan"      │ │  │
│  │   │   from MangaDex (72%)    │ │  │
│  │   │   [Show more matches]    │ │  │
│  │   │ ○ Link to other series   │ │  │
│  │   │   [Search library...]    │ │  │
│  │   └──────────────────────────┘ │  │
│  │   ❌ Please select an option   │  │
│  │                        [Remove]│  │
│  └────────────────────────────────┘  │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  [Confirm Import]                    │
│  (Disabled: 1 item needs selection)  │
│                                      │
└──────────────────────────────────────┘
```

### Manual Library Search (Sub-modal)

When user clicks "Search library..." to manually link a series:

```
┌──────────────────────────────────────┐
│ ← Back           Link to Existing    │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🔍 Search your library...      │  │
│  └────────────────────────────────┘  │
│                                      │
│  Recently Imported:                  │
│  ┌────────────────────────────────┐  │
│  │ [img] Shingeki no Kyojin       │  │
│  │       MangaDex • 139 chapters  │  │
│  │                       [Select] │  │
│  ├────────────────────────────────┤  │
│  │ [img] Attack on Titan          │  │
│  │       WeebCentral • 139 ch     │  │
│  │                       [Select] │  │
│  ├────────────────────────────────┤  │
│  │ [img] Chainsaw Man             │  │
│  │       MangaDex • 97 chapters   │  │
│  │                       [Select] │  │
│  └────────────────────────────────┘  │
│                                      │
│  Search Results:                     │
│  (shows when user types in search)   │
│                                      │
└──────────────────────────────────────┘
```

This allows manual linking when:
- Auto-matching fails due to language differences (French ↔ Japanese)
- User knows the correct series but titles don't match
- Similarity threshold is too low for auto-suggestion

## Step 4: Processing

```
┌──────────────────────────────────────┐
│              Importing...            │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ✓ One Piece                    │  │
│  │   Linked to existing series    │  │
│  ├────────────────────────────────┤  │
│  │ ✓ Solo Leveling                │  │
│  │   Import job queued            │  │
│  ├────────────────────────────────┤  │
│  │ ◐ Attack on Titan              │  │
│  │   Importing chapters...        │  │
│  ├────────────────────────────────┤  │
│  │ ○ Naruto                       │  │
│  │   Waiting...                   │  │
│  ├────────────────────────────────┤  │
│  │ ○ Bleach                       │  │
│  │   Waiting...                   │  │
│  └────────────────────────────────┘  │
│                                      │
│  [━━━━━━━━━━━━━━━━━━━━━━━━━━] 60%    │
│                                      │
│  3 of 5 complete                     │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  [Close]                             │
│  (closes dialog, import continues    │
│   in background)                     │
│                                      │
└──────────────────────────────────────┘
```

### Completion State

```
┌──────────────────────────────────────┐
│            Import Complete           │
├──────────────────────────────────────┤
│                                      │
│            ✓                         │
│                                      │
│  Successfully processed 5 series     │
│                                      │
│  • 2 linked to existing              │
│  • 3 imported as new                 │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  [View Library]         [Close]      │
│                                      │
└──────────────────────────────────────┘
```

---

## State Management

### New Composable: `useImportWizard`

```typescript
interface SelectedSerie {
  // Identification
  sourceId: string
  sourceName: string
  externalId: string

  // Display data
  title: string
  cover: string | null
  type: string
  status: string[]
  chapterCount?: number

  // Duplicate detection (populated in review step)
  similarMatches?: SimilarMatch[]

  // User decision
  action?: 'import' | 'link'
  linkToSerieId?: string  // If action === 'link'

  // Processing state
  processingState?: 'pending' | 'processing' | 'success' | 'error'
  processingMessage?: string
}

interface SimilarMatch {
  serieId: string
  title: string
  sources: string[]
  similarity: number  // 0-1
  cover: string | null
}

interface ImportWizardState {
  // Current step
  step: 'entry' | 'source-select' | 'browse' | 'review' | 'processing'

  // Entry mode (for step 1)
  entryMode: 'browse' | 'url' | 'csv' | null

  // Source browsing (for step 2)
  selectedSource: Source | null
  searchQuery: string
  searchResults: SearchResult[]
  searching: boolean
  hasMore: boolean

  // Selection cart (persists across steps)
  selectedSeries: Map<string, SelectedSerie>  // key: `${sourceId}:${externalId}`

  // URL parsing
  urlInput: string
  parsedUrls: ParsedUrlItem[]

  // Review state
  loadingSimilarities: boolean
  allDecisionsMade: boolean

  // Processing
  processingProgress: number
  processingComplete: boolean
}
```

### Cart Key Logic

```typescript
// Unique key for each serie in cart
function getCartKey(sourceId: string, externalId: string): string {
  return `${sourceId}:${externalId}`
}

// Adding to cart
function addToCart(serie: SelectedSerie) {
  const key = getCartKey(serie.sourceId, serie.externalId)
  selectedSeries.value.set(key, serie)
}

// Check if in cart
function isInCart(sourceId: string, externalId: string): boolean {
  return selectedSeries.value.has(getCartKey(sourceId, externalId))
}

// Remove from cart
function removeFromCart(sourceId: string, externalId: string) {
  selectedSeries.value.delete(getCartKey(sourceId, externalId))
}
```

---

## New API Endpoints

### `GET /api/v1/serie/find-similar`

Finds existing series that might be duplicates based on title similarity.

**Request:**
```
GET /api/v1/serie/find-similar?title=One%20Piece&excludeSourceId=mangadex
```

Can also accept multiple titles for better matching:
```
GET /api/v1/serie/find-similar?titles=One%20Piece,ワンピース,海贼王&excludeSourceId=mangadex
```

**Response:**
```json
{
  "matches": [
    {
      "serieId": "uuid-123",
      "title": "One Piece",
      "sources": [
        { "id": "weebcentral", "name": "WeebCentral" }
      ],
      "similarity": 0.95,
      "cover": "https://s3.../cover.jpg"
    },
    {
      "serieId": "uuid-456",
      "title": "One Piece (Full Color)",
      "sources": [
        { "id": "mangadex", "name": "MangaDex" }
      ],
      "similarity": 0.82,
      "cover": "https://s3.../cover2.jpg"
    }
  ]
}
```

**Implementation Notes:**
- Use Meilisearch for fuzzy title matching against flattened title index
- Search ALL title variants: primary title + alternate titles in ALL languages
- Filter out series already linked to the source being imported from
- Apply similarity threshold from `IMPORT_SIMILARITY_THRESHOLD` env var (default: 0.8)
- Limit to top 5 matches
- Return only top match by default, frontend requests more via `limit` param

### `GET /api/v1/serie/recent`

Returns recently imported series for quick-pick manual linking.

**Request:**
```
GET /api/v1/serie/recent?limit=10
```

**Response:**
```json
{
  "series": [
    {
      "id": "uuid-123",
      "title": "Chainsaw Man",
      "cover": "https://s3.../cover.jpg",
      "sources": ["MangaDex", "WeebCentral"],
      "chapterCount": 97,
      "importedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### `GET /api/v1/serie/search` (existing, for library search)

Used by manual link search. Already exists via Meilisearch integration.

---

## Environment Variables

```env
# Similarity threshold for duplicate detection (0-1)
# Series with title similarity above this threshold will be shown as potential duplicates
IMPORT_SIMILARITY_THRESHOLD=0.8
```

---

## Component Structure

```
app/components/import/
├── ImportWizard.vue           # Main container, step router
├── steps/
│   ├── EntryStep.vue          # Step 1: Choose method (browse/url/csv)
│   ├── UrlPasteStep.vue       # Step 1 sub: Paste URLs textarea
│   ├── SourceSelectStep.vue   # Step 2a: Pick source grid
│   ├── BrowseStep.vue         # Step 2b: Search & select from source
│   ├── ReviewStep.vue         # Step 3: Review all selections with duplicates
│   └── ProcessingStep.vue     # Step 4: Progress & completion
├── shared/
│   ├── CartBadge.vue          # Header cart indicator (count badge)
│   ├── SerieCard.vue          # Selectable serie card (checkbox, cover, title)
│   ├── SerieDetailSheet.vue   # Detail bottom sheet/modal on tap
│   ├── ReviewItemCard.vue     # Review step card with radio options
│   ├── SimilarMatchOption.vue # Single match radio option with "show more"
│   ├── LibrarySearchSheet.vue # Manual link: search library with recent imports
│   └── UrlParseResults.vue    # Parsed URL list with status badges
└── composables/
    └── useImportWizard.ts     # Global state management for wizard
```

---

## Mobile vs Desktop Differences

| Aspect | Mobile | Desktop |
|--------|--------|---------|
| Container | Full screen | Modal (max-w-2xl) |
| Navigation | Full-width header with back | Same |
| Search results | Vertical list | Vertical list |
| Detail preview | Bottom sheet (slides up) | Side panel or modal |
| Cart indicator | Header badge + count | Header badge + count |
| Step transitions | Slide left/right | Fade |

**Key principle**: Same flow, same steps, same interactions - only container and detail preview differ.

---

## Exit Warning

When user attempts to close the wizard with items in cart:

```
┌──────────────────────────────────────┐
│         Discard Selection?           │
├──────────────────────────────────────┤
│                                      │
│  You have 5 series selected.         │
│  Closing will discard your           │
│  selection.                          │
│                                      │
│  [Cancel]              [Discard]     │
│                                      │
└──────────────────────────────────────┘
```

---

## Design Decisions (Validated)

| Decision | Choice |
|----------|--------|
| Detail preview trigger | Tap on item shows detail |
| Cart visibility | Header only (badge + count) |
| Back during processing | Disabled - user can only close (imports continue in background via BullMQ) |
| Batch error handling | Continue with others, show errors in summary |
| Similarity matches | Top match with "Show more", always show "Link to other series" option |
| Similarity matching | Use all titles + alternate titles from all languages |
| Manual linking | Search library with recently imported as default quick picks |

---

## Cross-Language Matching Strategy

Since auto-matching French ↔ Japanese titles is unreliable, the system provides:

1. **Best-effort auto-matching**: Uses ALL available titles (primary + alternates in all languages) from Meilisearch
2. **Manual fallback**: "Link to other series → Search library" always available
3. **Recently imported quick picks**: Shows last ~10 imported series for fast manual linking

The `find-similar` endpoint should search against a flattened index of all title variants:
```
"One Piece" + "ワンピース" + "海贼王" → all searchable as one document
```
