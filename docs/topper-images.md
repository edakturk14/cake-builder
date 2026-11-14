# Custom topper image service

Custom text edits commit immediately as a quoted plaque. Image generation is a separate asynchronous request, never awaited by the serial Jev edit queue. Failures preserve the text, cake, price and Undo history.

## Configuration and cost

Set `OPENROUTER_API_KEY` only in ignored `.env.local`. Health reports `imageConfigured` as a boolean, never the key. Health/image requests reload newly supplied missing environment values, so adding the key does not require restarting the running server.

The configurable `OPENROUTER_IMAGE_MODEL` defaults to `black-forest-labs/flux-3-image-klein`. The verified OpenRouter endpoint supports reference images, `resolution:"768"`, `aspect_ratio:"3:4"` and PNG. Its published 768-tier price is **$0.008 per output image**. No unsupported transparency/quality parameter is sent to Klein.

- [Official Image API](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
- [Verified Klein endpoint capabilities/pricing](https://openrouter.ai/api/v1/images/models/black-forest-labs/flux-3-image-klein/endpoints)

The response includes actual `costUsd` when OpenRouter supplies `usage.cost`, plus `estimatedCostUsd:0.008` for uncached default-model requests. Cache hits report zero additional cost and zero generation time. There are no automatic provider retries. At most two distinct previews run concurrently; identical in-flight requests share a single generation.

## Routes

`POST /api/topper-image` accepts only `{request:string}`, 1–120 characters. It returns:

```json
{"assetId":"64-character-sha256","imageGenerationMs":1234,"cached":false,"model":"black-forest-labs/flux-3-image-klein","estimatedCostUsd":0.008}
```

Generation has a 120-second upstream timeout. Missing credentials return 503; upstream status codes remain visible (including 402 for insufficient credits). Responses never expose provider bodies, credentials or submitted request text through error messages.

`GET /api/topper-image/:assetId` serves only a valid hash-named cached PNG. Invalid/missing assets return 404. Files live under gitignored `.cache/toppers`. Cache identity includes normalized request text, model, prompt/processing version and princess reference hash, not raw text in filenames.

## Artwork contract

The server sends `public/art/toppers/princess.png` as a base64 style reference. The prompt requests one original fondant/sugar-paste object, 3/4 view, plain flat white background, no cake/plate/text/logo/shadow. Trademarked characters become generic original counterparts. Real-person/relative faces become generic non-identifiable figurines; the original customer request remains unchanged in the UI.

Sharp removes only edge-connected near-white background, unmattes opaque white-fringed boundary pixels, and preserves enclosed white details. It trims visible bounds, fits within 216×280 and composites onto a **transparent 256×320 PNG**. Horizontal center is 128 and the bottom contact boundary is 306, normalized anchor **(0.5, 0.95625)**, matching the prepared topper manifest.

## Client lifecycle

The hook exposes `imagePending`, `imageError`, `retryImage`, and `readyAssets` keyed by shared `normalizeCustomRequest`. Image generation never sets the Jev `pending` flag.

Asset completion updates the confirmed matching request and matching existing Undo entries without adding a history step. Reset/cancel epochs and current-request matching prevent stale images replacing a new cake. Every successful generation still calls `onAssetReady({request,assetId})` after reset or request replacement, allowing saved basket items to receive their pending image. A later same-request edit reuses `readyAssets`.

The timing table records image generation separately via `imageGenerationMs`, `imageCached` and `imageError`. These are not speech or final-word latency measurements.

## Validation status

Mocked/local tests cover geometry, transparent corners, enclosed white details, cache/in-flight deduplication, explicit errors, unsafe formats, immediate edit commit, non-history asset delivery, Undo, replacement, reset and basket notification.

Real validation used exactly two paid Klein generations, both through the browser UI:

| Request | imageGenerationMs | Actual cost | Result |
|---|---:|---:|---|
| a racing pigeon | 6649.8 | $0.008 | Fondant pigeon, plaque→image swap at 7.5 s |
| my grandma's face | 5879.0 | $0.008 | Generic non-identifiable elderly-woman figurine, swap at 5.9 s |

The exact repeat of the pigeon request hit the disk cache (`cached:true`, 0 ms, $0, HTTP 24.6 ms). Total spend $0.016; no retries. Generated PNGs live in gitignored `.cache/toppers/` as `<assetId>.png`. An earlier attempt on the previously selected OpenAI model failed with HTTP 402 (insufficient credits) in 190.5 ms and produced no asset; it was not retried.
