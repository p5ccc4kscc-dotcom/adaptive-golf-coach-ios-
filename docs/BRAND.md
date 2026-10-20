# BadGolfer — brand

_Adopted 2026-10-19 (owner instruction, M0.1). Replaces the working name “Adaptive Golf Coach”._

## Name and philosophy

**BadGolfer** is the customer-facing product name: the app display name, the iPhone Home Screen name,
the browser title, onboarding and screen copy.

The name is self-aware, not a label. Every golfer has something to work on, from a first lesson to a
scratch handicap. Copy never calls the golfer bad. It talks about improvement, progress and evidence.

**Tagline (proposed, not approved):** “BadGolfer — Get Better.” It appears only on the Welcome screen
and is defined in one place (`BRAND.tagline` in `src/ui/Brand.tsx`), so it can be changed or removed
in one edit.

## Visual identity

| Element | Value | Where |
|---|---|---|
| Mark | A white golf ball whose lime flight line climbs into an upward arrow (“get better”). Original artwork. | `assets/brand/mark.svg`, `src/ui/Brand.tsx` |
| App icon | The mark on a deep-green gradient (`#0E4A33` → `#062618`), opaque full-bleed square (iOS applies the mask) | `assets/icon.png` (1024²) |
| Primary | Fairway green `#1E6B47` (dark mode `#5BC48D`) | `src/ui/theme.ts` |
| Accent | Lime `#C6F15A` (mark only; not used for text, because of contrast on white) | mark |
| Wordmark | “Bad” regular + “Golfer” extra-bold in the primary green | `Wordmark` component |
| Tab icons | Original 24 pt line icons | `src/ui/TabIcons.tsx` |

Regenerate every icon size from the SVGs with `npm run brand:icons` (renders with the Playwright
Chromium): iOS icon, favicon, Safari `apple-touch-icon` (180²), web-manifest icons, splash and Android
adaptive layers.

## What did **not** change (data preservation)

- The GitHub repository name and history, and therefore the browser-preview address
  `https://p5ccc4kscc-dotcom.github.io/adaptive-golf-coach-ios-/`.
- Storage identifiers: IndexedDB name `adaptive-golf-coach`, the iPhone SQLite file
  `adaptive-golf-coach.db`, and the export format tag `adaptive-golf-coach-export`. Renaming any of
  them would orphan saved data. They are pinned in `src/data/db/storageIds.ts` and guarded by
  `tests/unit/storageIds.test.ts`.
- **The iOS bundle identifier** is now `com.badgolfer.app` (see below).

The Expo `slug` became `badgolfer` and the URL scheme `badgolfer`. No EAS project or installed app
exists yet, so nothing depends on the old values.

## iOS bundle identifier — `com.badgolfer.app` (provisionally approved 2026-10-20)

**Set in `app.json` on the M1a branch.** The owner approved it provisionally, subject to Apple
confirming availability when the owner registers it (TestFlight setup, step A3). The TestFlight
workflow refuses to build under any other identifier. If Apple rejects it, we stop and choose
again together. The Android package is unchanged (Android is not in scope).

Original proposal:

The bundle identifier becomes permanent once an App ID or App Store Connect record is created with
it. It does not need to change for the browser preview. It must be decided **before the first
device build** (M1a, after Apple Developer membership).

| Option | Identifier | When it fits |
|---|---|---|
| **Recommended** | `com.badgolfer.app` | You register `badgolfer.com` (or already control it). Reverse-DNS of a domain you control is Apple's convention. |
| If you register a different domain | e.g. `app.badgolfer.ios` for `badgolfer.app`, `uk.co.badgolfer.app` for `badgolfer.co.uk` | Same convention |
| No domain | `io.github.p5ccc4kscc-dotcom.badgolfer` | Tied to the GitHub account; works, but is less tidy to show |

Apple confirms uniqueness only when the identifier is registered in the developer portal.


## Naming-conflict investigation (preliminary — not legal clearance)

Done on 2026-10-19 with web searches only. It is **not** a trademark search or legal advice, and
domain and App Store availability were **not** verified directly.

| Check | Finding | Status |
|---|---|---|
| US trademarks | “BADGOLFER” (serial 85422652, 2011, apparel and golf-tournament services) is listed as **abandoned** ([record](https://trademarks.justia.com/854/22/badgolfer-85422652.html)). “BAD GOLFER” (serial 97449458, 2022, golf shirts, skull logo) was at an early stage when last indexed; its **current status is unknown** ([record](https://trademark.justia.com/974/49/bad-97449458.html)). | Needs a USPTO TSDR check |
| UK trademarks | No UK IPO result named BadGolfer or Bad Golfer appeared in search results. The register itself was not queried. | Needs a UK IPO search (classes 9, 41, and probably 25 and 28) |
| App Store | No app named “BadGolfer” was found. A different scoring app called “Bad Golf” may exist; it is unconfirmed. | Search the App Store on the iPhone |
| Domains | No live site for `badgolfer.com` appeared in search results. Availability was not checked. | Check with a domain registrar |

Before public release (M6), commission a proper clearance search in the UK and in any other launch
countries. Treat the name as provisional for legal purposes until then. See `docs/RELEASE_CHECKLIST.md`.
