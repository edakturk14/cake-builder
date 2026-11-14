# Interpretation fixes after the fresh retest

Date: 2026-11-14. Scope: `server/fallback.ts` and interpretation tests/documentation. No new paid text or image calls were made.

## Fixed and checked offline

### 1. Explicit keep versus reset semantics

The old recursive sanitizer discarded both empty arrays and all null values. This lost valid whole-list removals and nullable CakePatch resets. It also made null ambiguous: the model used it for “unchanged,” while the shared patch contract uses it for “clear” in several places.

The structured-output wire schema now distinguishes these operations:

| Field | Unchanged wire value | Explicit reset / clear |
|---|---|---|
| `occasion`, `theme`, `customTopper` | `"keep"` | `null` |
| Whole `toppings` / `toppers` list | `null` | `[]` |
| Each color within `colors` | `"keep"` | `null` |
| Each prepared-topper entry within `topperStyles` | `"keep"` | `null` resets the whole entry |
| `topperStyles.<id>.tint` | `"keep"` | `null` |
| `candles.number` / `candles.count` | `"keep"` | `null`, subject to valid candle composition |
| `inscription` | `null` | `""` |
| Nonnullable fields and unchanged object containers | `null` | Use a valid explicit value |

The sentinel exists only in the server/provider wire format. It is decoded to an absent key and never reaches CakeState or client responses. Literal inscription text `"keep"` remains literal text. Empty arrays survive decoding. Nullable reset values survive only at paths where the CakePatch contract supports them.

Structured output is validated against the same restricted schema locally before decoding, so omitted required fields, unknown fields, invalid enums and wrong types do not get silently sanitized away. The decoded result still passes shared `validateCakePatch` and `applyCakePatch`; composition errors are now bounded fallback errors rather than uncaught application exceptions. Model-supplied custom asset ids are still stripped before validation; they never attach a model-chosen image.

Fifteen parameterized rich-state regressions cover full-list clears, explicit removal lists, nullable scalar resets, all four color resets, tint/whole-style resets, writing clear and candle removal. Separate cases cover keep preservation, partial-style preservation, plain-count reset, literal `"keep"` writing and invalid numeral composition. Every test starts with a richly configured cake so unrelated changes cannot hide behind default/null values.

### 2. Less prompt anchoring, conservative support checks

Safe inspection found that the prompt included a tuned scene-to-object example and catalog labels without their meanings. Earlier diagnostic output also showed the model inventing `customTopper:{"request":"Snowman"}`. The deterministic remap converted that name to a catalog topper without checking whether the user's request supported it.

The fresh midnight-masquerade evidence contains the normalized API patch, not the raw provider message. It therefore cannot establish whether that particular snowman came directly from `addToppers` or through the remap. Both paths lacked a source-support check and are now covered by regressions.

Changes:

- Removed the tuned winter-to-snowman and other phrase-to-decoration instructions. The prompt describes general palette/style inference and preserving unmentioned state.
- Added bounded topper meanings, palette meanings and the existing Jev spaceship alias to model context.
- Validate newly introduced objects against catalog names, aliases or descriptive concepts in an explicit scene/theme request. Loose meaning tokens do not justify adding a figurine to a palette/mood-only request.
- Validate custom-object descriptions against the source phrase. Remapped catalog objects undergo the same support checks as direct additions.
- Check new occasion/theme labels for source support, including catalog occasion aliases and birthday-age context.
- Unsupported object/event output is rejected as a whole with a clarification notice. The server does not silently substitute an arbitrary object, retain only its favorite fields or make another provider call.
- Inferred fruit toppings and palette/style choices remain allowed. The check never chooses the cake edit itself; the provider still proposes bounded choices.

Mocked regressions accept fruity-category → berries, spaceship → rocket, anniversary context, birthday-age context, mood → palette, a named snowman and a supported winter scene. They reject unrelated direct/remapped snowmen for a masquerade, unsolicited figurines for palette/gown/cloud requests, invented custom descriptions and an unrequested just-because label.

## Validation and limits

At the validation checkpoint, **53/53 focused fallback tests** and **182/182 full-suite tests** passed. `npm run typecheck` and `npm run build` passed. The full suite includes other agents' concurrent fixes; 53 is the interpretation-specific count at this checkpoint.

All new provider responses in these tests were mocked. **No new live semantic accuracy, live structured-output-provider compatibility, latency or cost result is claimed.** The two failed live generalization cases in `retest-interpretation.md` remain the latest real-provider evidence.

The support check is conservative lexical validation, not proof of semantic relevance or a general-purpose language interpreter. It can reject a valid indirect metaphor or accept a related but still aesthetically poor object for an explicit scene. Negation, long-distance references, complex mixed requests and model preservation remain areas where fresh real-provider evaluation is needed. The application can reject a demonstrably unsupported object, but it cannot locally prove that a newly generated palette captures the user's intended mood.

The prompt/catalog payload changed, so the former approximately $0.0004-per-call measurement is historical, not a measurement of this version. The paid-call budget is exhausted; further live evaluation requires a new explicit budget.

## Offline reproduction

Run `node --import tsx --test tests/fallback.test.ts`, then `npm test` and `npm run build`. These checks do not call paid providers. Relevant tests exercise the real `interpret` → `runFallback` → shared validation/application pipeline with mocked fetch responses, not a second sanitizer implementation.
