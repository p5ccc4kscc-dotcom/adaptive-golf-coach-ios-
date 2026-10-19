# Privacy & security

## Current behaviour (M0)

- **No network use by the app.** No analytics, crash reporting, accounts or cloud sync. (The
  browser preview's files are served from the hosting provider; your data is not sent to it.)
- **Storage:**
  - iPhone app: SQLite file in the app's private sandbox, covered by iOS data protection.
  - Browser preview: IndexedDB in that browser only.
- **No device permissions requested.** Photos/video access arrives in M1 via the system picker,
  which grants access to the chosen clip only.
- **Golfer controls:** export all data as JSON, and *Delete all my data*, which removes every
  owner-scoped row.
- Body measurements and comfort/accessibility notes are optional, marked sensitive, and never
  used to calculate club specifications or medical judgements. Height and wrist-to-floor have an
  explicit “I don't know”. No age question is asked: the spec allows one only for a demonstrated
  coaching purpose, and none exists yet.
- **iOS file protection:** the app requests the `NSFileProtectionComplete` default data-protection
  entitlement, so its files are encrypted while the device is locked. This is set in `app.json` and
  is **not yet verified** in an EAS build.
- No secrets are in the repository. The repository is **public**: never commit personal golf data, real swing videos, credentials or tokens. Fixtures are fictional. Any `EXPO_TOKEN` lives only in GitHub Actions secrets.

## Before any public release (not done)

- Privacy policy, App Store privacy “nutrition label”, UK GDPR review by a qualified person. This
  project does **not** claim legal compliance.
- Data-retention and account-deletion flows once accounts exist (M4).
- Decide the video backup provider with explicit opt-in; videos are sensitive personal media.
