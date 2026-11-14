# Held-out interpretation results

**Mode: LIVE. Real default-config requests.**

## Live summary

- **Overall: 23/30 passed (76.7%)**, using the unchanged, user-approved rules. Seven semantic/rule failures, no harness abort. All30 application responses were HTTP200; exit1 indicates failed expectations, not an incomplete run.
- **Interpreter counts:**30 real Jev requests;23 Jev-only turns;7 backup attempts. Two backup outputs were accepted as edits, five attempts failed/returned no change. Final response attribution:28 `jev`,2 `fallback` (failed backup attempts retain `jev` attribution).
- **Budget audit:** health `fallbackAttempts`0→7, matching all7 recorded backup attempts, below the30 cap. One run, no retries, no image-route calls, no application/prompt/model/scoring changes.
- **Backup cost:** API-reported subtotal **$0.00161102**: m01 $0.00111060 and t01 $0.00050042. **Five calls omitted cost** (m02,m04,t03,o02,a02); the complete billed total is **unknown**, not $0.00161102 and not zero for missing calls.

### Latency

| Measurement | Samples | Median ms | Max ms |
|---|---:|---:|---:|
| Full interpretation HTTP |30|209.3|12222.1|
| Jev, server-reported |30|181.5|312.2|
| Backup, server-reported |7|1092.8|1241.1|
| HTTP, Jev-only turns |23|186.4|315.4|
| HTTP, turns attempting backup |7|1660.3|12222.1|

The fallback duration field is captured before reading the complete provider response body, so it can omit generation/body-read time. The beach request took12.22s end to end despite a reported1.12s backup duration. These are observed request measurements, not browser-paint, microphone or cold-start claims.

### Every failing case

| ID | Exact phrase | Expected under frozen rules | Actual | Interpreter/backup |
|---|---|---|---|---|
|m01|Can you make it look a bit more grown-up and fancy?|A grown-up/fancy color or appearance change, no new objects.|Added `customTopper.request="more grown-up and fancy"`; colors/styles unchanged.|fallback accepted200; semantic FAIL|
|m02|Could it have more of a beach feel?|A changed beach-appropriate color; no new objects.|No change; malformed JSON notice.|Jev result retained; backup502|
|m03|I'd like it to feel a bit like a garden, but no little figures.|A changed green/flower color, no figures.|No change; asked which topper, despite request excluding figures.|Jev only|
|m04|Can you make the colors a bit warmer, like a sunset?|A changed warm frosting/accent color.|No change; frosting-color clarification plus backup no-change notice.|Jev result retained; backup422|
|t03|Maybe some sticky toffee sauce on top?|Caramel topping; everything else preserved.|No toppings added; backup found no change.|Jev result retained; backup422|
|o02|We've just moved into our first flat. It's for that.|Housewarming occasion only.|Occasion stayed null; decoration/occasion clarification notice.|Jev result retained; backup422|
|x03|Leave the cat, shrink the bunny a bit, and put the words in the middle.|Bunny size small/medium, writing centered; cat and other fields preserved.|Writing centered, but bunny stayed large; topper-operation clarification.|Jev partial edit; no backup|

The m01 custom-topper request would be eligible for the separate client image lifecycle, but this API-only harness did not invoke that lifecycle or call any image endpoint. This remains an interpretation failure, not an image-generation test.

Passing cases were not re-scored or adjusted after seeing outputs. For example, t01 returned some unmentioned null fields that were already null in its frozen initial state; it passed the approved state-preservation rules, which do not prove preservation on a different, richly populated starting state. Ambiguous a02 correctly left state unchanged and asked for clarification, although it also spent a no-change backup attempt.

These results establish this one frozen sample's outcomes, not broad model reliability. No fixes, new retries or tuning were performed after observing failures.


Started: 2026-11-14T14:19:10.805Z. Frozen phrase/rule SHA-256: `18f1ef4afe40234761cb6dc8a34d41d8052ee969d8c1e5e576fab52abfe93335`.
Completed 30/30; passed 23/30. Counter audit completed.

Backup attempts from health: 7/30; response metadata: 7. Health: 0 → 7.
Reported backup cost subtotal: $0.00161102; 5 attempted backup(s) missing cost metadata. Missing cost is unknown, not zero.
Provider times are server-reported; HTTP times are client request-to-response, not audio or paint timings. No image endpoints are called.

| Category | Passed / executed | Not run | Pass rate |
|---|---:|---:|---:|
| themes-moods | 1/5 | 0 | 20.0% |
| inferred-toppings | 3/4 | 0 | 75.0% |
| contextual-occasions | 3/4 | 0 | 75.0% |
| removals-clears | 5/5 | 0 | 100.0% |
| multi-edit | 4/5 | 0 | 80.0% |
| paraphrases | 4/4 | 0 | 100.0% |
| ambiguity | 3/3 | 0 | 100.0% |

## Harness self-checks

## Novelty audit
Exact case-insensitive fixed-string searches across existing tests/scripts/docs. Own phrase file and generated held-out reports/review are excluded.
- m01: 0 prior matches
- m02: 0 prior matches
- m03: 0 prior matches
- m04: 0 prior matches
- m05: 0 prior matches
- t01: 0 prior matches
- t02: 0 prior matches
- t03: 0 prior matches
- t04: 0 prior matches
- o01: 0 prior matches
- o02: 0 prior matches
- o03: 0 prior matches
- o04: 0 prior matches
- c01: 0 prior matches
- c02: 0 prior matches
- c03: 0 prior matches
- c04: 0 prior matches
- c05: 0 prior matches
- x01: 0 prior matches
- x02: 0 prior matches
- x03: 0 prior matches
- x04: 0 prior matches
- x05: 0 prior matches
- p01: 0 prior matches
- p02: 0 prior matches
- p03: 0 prior matches
- p04: 0 prior matches
- a01: 0 prior matches
- a02: 0 prior matches
- a03: 0 prior matches

## Per-case rules and outcomes

### m01: themes-moods

**Phrase:** Can you make it look a bit more grown-up and fancy?

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** colors, inscriptionStyle, topperStyles. Every other state field must be preserved.
**Rules:** `[{"kind":"changedAny","paths":["colors","inscriptionStyle"]},{"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["gold","black","navy","ivory","white","blush-pink","lavender"]}]`

**FAIL**; HTTP 200; interpreter fallback; Jev 297.5ms; backup 1241.1ms (status 200); HTTP 2226.4ms; backup cost 0.0011106.
Patch: `{"exists":true,"customTopper":{"request":"more grown-up and fancy"}}`. Notices: `[]`.
- FAIL must preserve every field outside onlyChange: customTopper
- PASS must return edit action: edit
- FAIL {"kind":"changedAny","paths":["colors","inscriptionStyle"]}: colors={"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"}; inscriptionStyle={"font":"script","letterCase":"as-written","size":"medium","placement":"front"}
- FAIL {"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["gold","black","navy","ivory","white","blush-pink","lavender"]}: colors.frosting="white"; colors.accents="gold"

### m02: themes-moods

**Phrase:** Could it have more of a beach feel?

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** colors, inscriptionStyle, topperStyles. Every other state field must be preserved.
**Rules:** `[{"kind":"changedAny","paths":["colors"]},{"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["sky-blue","navy","mint","white","ivory","peach","lemon-yellow"]}]`

**FAIL**; HTTP 200; interpreter jev; Jev 166.5ms; backup 1117.7ms (status 502); HTTP 12222.1ms; backup cost unknown.
Patch: `{"addToppings":[],"removeToppings":[]}`. Notices: `["The backup interpreter returned malformed JSON. Your design is unchanged."]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- FAIL {"kind":"changedAny","paths":["colors"]}: colors={"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"}
- FAIL {"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["sky-blue","navy","mint","white","ivory","peach","lemon-yellow"]}: colors.frosting="white"; colors.accents="gold"

### m03: themes-moods

**Phrase:** I'd like it to feel a bit like a garden, but no little figures.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** colors, inscriptionStyle, topperStyles. Every other state field must be preserved.
**Rules:** `[{"kind":"changedAny","paths":["colors"]},{"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["sage-green","mint","lilac","lavender","blush-pink","peach","coral","red","lemon-yellow"]}]`

**FAIL**; HTTP 200; interpreter jev; Jev 223.5ms; backup not usedms (status not used); HTTP 229.8ms; backup cost not used.
Patch: `{"addToppings":[],"removeToppings":[]}`. Notices: `["Which topper would you like? Try a castle, unicorn, or knight."]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- FAIL {"kind":"changedAny","paths":["colors"]}: colors={"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"}
- FAIL {"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["sage-green","mint","lilac","lavender","blush-pink","peach","coral","red","lemon-yellow"]}: colors.frosting="white"; colors.accents="gold"

### m04: themes-moods

**Phrase:** Can you make the colors a bit warmer, like a sunset?

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** colors, inscriptionStyle, topperStyles. Every other state field must be preserved.
**Rules:** `[{"kind":"changedAny","paths":["colors"]},{"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["peach","coral","red","gold","chocolate-brown"]}]`

**FAIL**; HTTP 200; interpreter jev; Jev 268.7ms; backup 1092.8ms (status 422); HTTP 1660.3ms; backup cost unknown.
Patch: `{"exists":true,"addToppings":[],"removeToppings":[]}`. Notices: `["Please clarify frosting color; I kept it unchanged.","The backup interpreter found no change to make. Your design is unchanged."]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- FAIL {"kind":"changedAny","paths":["colors"]}: colors={"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"}
- FAIL {"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["peach","coral","red","gold","chocolate-brown"]}: colors.frosting="white"; colors.accents="gold"

### m05: themes-moods

**Phrase:** Could you do the icing in black and white, nothing too kiddy?

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** colors, inscriptionStyle, topperStyles. Every other state field must be preserved.
**Rules:** `[{"kind":"changedAny","paths":["colors"]},{"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["white","ivory","black"]}]`

**PASS**; HTTP 200; interpreter jev; Jev 178.9ms; backup not usedms (status not used); HTTP 186.4ms; backup cost not used.
Patch: `{"exists":true,"addToppings":[],"removeToppings":[],"colors":{"frosting":"black"}}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"changedAny","paths":["colors"]}: colors={"frosting":"black","filling":"ivory","inscription":"navy","accents":"gold"}
- PASS {"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["white","ivory","black"]}: colors.frosting="black"; colors.accents="gold"

### t01: inferred-toppings

**Phrase:** Can you put some berries on it?

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** toppings. Every other state field must be preserved.
**Rules:** `[{"kind":"includesAny","path":"toppings","values":["strawberries","raspberries"]}]`

**PASS**; HTTP 200; interpreter fallback; Jev 172.5ms; backup 855.3ms (status 200); HTTP 1466.7ms; backup cost 0.00050042.
Patch: `{"exists":true,"occasion":null,"theme":null,"toppings":["raspberries"],"customTopper":null,"addToppings":["raspberries"]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"includesAny","path":"toppings","values":["strawberries","raspberries"]}: toppings=["raspberries"]

### t02: inferred-toppings

**Phrase:** I'd like some chocolate sauce on top, not a different cake flavor.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** toppings. Every other state field must be preserved.
**Rules:** `[{"kind":"includesAll","path":"toppings","values":["ganache"]}]`

**PASS**; HTTP 200; interpreter jev; Jev 226.0ms; backup not usedms (status not used); HTTP 234.9ms; backup cost not used.
Patch: `{"exists":true,"flavor":"chocolate","addToppings":["ganache"],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"includesAll","path":"toppings","values":["ganache"]}: toppings=["ganache"]

### t03: inferred-toppings

**Phrase:** Maybe some sticky toffee sauce on top?

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** toppings. Every other state field must be preserved.
**Rules:** `[{"kind":"includesAll","path":"toppings","values":["caramel"]}]`

**FAIL**; HTTP 200; interpreter jev; Jev 184.1ms; backup 1108.9ms (status 422); HTTP 2137.3ms; backup cost unknown.
Patch: `{"exists":true,"addToppings":[],"removeToppings":[]}`. Notices: `["The backup interpreter found no change to make. Your design is unchanged."]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- FAIL {"kind":"includesAll","path":"toppings","values":["caramel"]}: toppings=[]

### t04: inferred-toppings

**Phrase:** Can you sprinkle those little gold bits over it?

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** toppings. Every other state field must be preserved.
**Rules:** `[{"kind":"includesAll","path":"toppings","values":["gold-stars"]}]`

**PASS**; HTTP 200; interpreter jev; Jev 186.7ms; backup not usedms (status not used); HTTP 189.8ms; backup cost not used.
Patch: `{"exists":true,"addToppings":["gold-stars"],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"includesAll","path":"toppings","values":["gold-stars"]}: toppings=["gold-stars"]

### o01: contextual-occasions

**Phrase:** My sister just got engaged, so it's for her.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** occasion. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"occasion","value":"engagement"}]`

**PASS**; HTTP 200; interpreter jev; Jev 152.0ms; backup not usedms (status not used); HTTP 155.0ms; backup cost not used.
Patch: `{"occasion":"engagement","addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"occasion","value":"engagement"}: occasion="engagement"

### o02: contextual-occasions

**Phrase:** We've just moved into our first flat. It's for that.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** occasion. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"occasion","value":"housewarming"}]`

**FAIL**; HTTP 200; interpreter jev; Jev 239.5ms; backup 874.9ms (status 422); HTTP 1525.2ms; backup cost unknown.
Patch: `{"addToppings":[],"removeToppings":[]}`. Notices: `["Please clarify the decoration or occasion you want. Your design is unchanged."]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- FAIL {"kind":"equals","path":"occasion","value":"housewarming"}: occasion=null

### o03: contextual-occasions

**Phrase:** It's for my dad, he's retiring next week.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** occasion. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"occasion","value":"retirement"}]`

**PASS**; HTTP 200; interpreter jev; Jev 175.8ms; backup not usedms (status not used); HTTP 179.4ms; backup cost not used.
Patch: `{"occasion":"retirement","addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"occasion","value":"retirement"}: occasion="retirement"

### o04: contextual-occasions

**Phrase:** My parents have been married twenty years. It's for them.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** occasion. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"occasion","value":"anniversary"}]`

**PASS**; HTTP 200; interpreter jev; Jev 166.5ms; backup not usedms (status not used); HTTP 170.1ms; backup cost not used.
Patch: `{"occasion":"anniversary","addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"occasion","value":"anniversary"}: occasion="anniversary"

### c01: removals-clears

**Phrase:** Take all the toppings off, but keep the two figures.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":["strawberries","raspberries","caramel"],"toppers":["castle","princess"],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** toppings. Every other state field must be preserved.
**Rules:** `[{"kind":"length","path":"toppings","value":0}]`

**PASS**; HTTP 200; interpreter jev; Jev 163.5ms; backup not usedms (status not used); HTTP 168.6ms; backup cost not used.
Patch: `{"exists":true,"addToppings":[],"removeToppings":["strawberries","raspberries","caramel"]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"length","path":"toppings","value":0}: toppings=[]

### c02: removals-clears

**Phrase:** Get rid of the robot and the rocket, but leave the fruit.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":["strawberries"],"toppers":["robot","rocket"],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{"rocket":{"size":"medium","position":"right","tint":null},"robot":{"size":"medium","position":"left","tint":null}},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** toppers, topperStyles. Every other state field must be preserved.
**Rules:** `[{"kind":"length","path":"toppers","value":0},{"kind":"equals","path":"topperStyles","value":{}}]`

**PASS**; HTTP 200; interpreter jev; Jev 176.6ms; backup not usedms (status not used); HTTP 181.6ms; backup cost not used.
Patch: `{"exists":true,"removeToppers":["robot","rocket"],"addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"length","path":"toppers","value":0}: toppers=[]
- PASS {"kind":"equals","path":"topperStyles","value":{}}: topperStyles={}

### c03: removals-clears

**Phrase:** Put the icing color back to normal, but leave the purple middle and gold writing.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"navy","filling":"lavender","inscription":"gold","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** colors.frosting. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"colors.frosting","value":null}]`

**PASS**; HTTP 200; interpreter jev; Jev 312.2ms; backup not usedms (status not used); HTTP 315.4ms; backup cost not used.
Patch: `{"exists":true,"addToppings":[],"removeToppings":[],"colors":{"frosting":null}}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"colors.frosting","value":null}: colors.frosting=null

### c04: removals-clears

**Phrase:** Get rid of the words, but don't change the font or size.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"print","letterCase":"upper","size":"large","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** inscription. Every other state field must be preserved.
**Rules:** `[{"kind":"length","path":"inscription","value":0}]`

**PASS**; HTTP 200; interpreter jev; Jev 174.6ms; backup not usedms (status not used); HTTP 179.2ms; backup cost not used.
Patch: `{"exists":true,"inscription":"","addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"length","path":"inscription","value":0}: inscription=""

### c05: removals-clears

**Phrase:** Clear the occasion and take the tennis theme off. That's all.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":"anniversary","theme":"tennis","toppings":[],"toppers":["castle"],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** occasion, theme. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"occasion","value":null},{"kind":"equals","path":"theme","value":null}]`

**PASS**; HTTP 200; interpreter jev; Jev 163.8ms; backup not usedms (status not used); HTTP 169.1ms; backup cost not used.
Patch: `{"exists":true,"occasion":null,"theme":null,"addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"occasion","value":null}: occasion=null
- PASS {"kind":"equals","path":"theme","value":null}: theme=null

### x01: multi-edit

**Phrase:** Actually, red velvet, three layers, and some raspberries, please.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** flavor, layers, toppings. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"flavor","value":"red-velvet"},{"kind":"equals","path":"layers","value":3},{"kind":"includesAll","path":"toppings","values":["raspberries"]}]`

**PASS**; HTTP 200; interpreter jev; Jev 202.7ms; backup not usedms (status not used); HTTP 207.0ms; backup cost not used.
Patch: `{"exists":true,"flavor":"red-velvet","layers":3,"addToppings":["raspberries"],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"flavor","value":"red-velvet"}: flavor="red-velvet"
- PASS {"kind":"equals","path":"layers","value":3}: layers=3
- PASS {"kind":"includesAll","path":"toppings","values":["raspberries"]}: toppings=["raspberries"]

### x02: multi-edit

**Phrase:** Swap the robot for a panda and write 'Bravo, Inez!' instead.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":["robot","castle"],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** toppers, topperStyles, inscription. Every other state field must be preserved.
**Rules:** `[{"kind":"includesAll","path":"toppers","values":["panda","castle"]},{"kind":"excludesAll","path":"toppers","values":["robot"]},{"kind":"equals","path":"inscription","value":"Bravo, Inez!"}]`

**PASS**; HTTP 200; interpreter jev; Jev 215.0ms; backup not usedms (status not used); HTTP 219.6ms; backup cost not used.
Patch: `{"exists":true,"removeToppers":["robot"],"addToppers":["panda"],"inscription":"Bravo, Inez!","addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"includesAll","path":"toppers","values":["panda","castle"]}: toppers=["castle","panda"]
- PASS {"kind":"excludesAll","path":"toppers","values":["robot"]}: toppers=["castle","panda"]
- PASS {"kind":"equals","path":"inscription","value":"Bravo, Inez!"}: inscription="Bravo, Inez!"

### x03: multi-edit

**Phrase:** Leave the cat, shrink the bunny a bit, and put the words in the middle.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":["cat","bunny"],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{"bunny":{"size":"large","position":"auto","tint":null}},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** topperStyles.bunny.size, inscriptionStyle.placement. Every other state field must be preserved.
**Rules:** `[{"kind":"oneOf","path":"topperStyles.bunny.size","values":["small","medium"]},{"kind":"equals","path":"inscriptionStyle.placement","value":"center"}]`

**FAIL**; HTTP 200; interpreter jev; Jev 239.2ms; backup not usedms (status not used); HTTP 244.1ms; backup cost not used.
Patch: `{"exists":true,"addToppings":[],"removeToppings":[],"inscriptionStyle":{"placement":"center"}}`. Notices: `["Please clarify topper operation; I kept it unchanged."]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- FAIL {"kind":"oneOf","path":"topperStyles.bunny.size","values":["small","medium"]}: topperStyles.bunny.size="large"
- PASS {"kind":"equals","path":"inscriptionStyle.placement","value":"center"}: inscriptionStyle.placement="center"

### x04: multi-edit

**Phrase:** Can you do mint green icing, coral writing, and four normal candles?

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** colors.frosting, colors.inscription, candles. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"colors.frosting","value":"mint"},{"kind":"equals","path":"colors.inscription","value":"coral"},{"kind":"equals","path":"candles.style","value":"plain"},{"kind":"equals","path":"candles.count","value":4},{"kind":"equals","path":"candles.number","value":null}]`

**PASS**; HTTP 200; interpreter jev; Jev 167.0ms; backup not usedms (status not used); HTTP 171.3ms; backup cost not used.
Patch: `{"exists":true,"candles":{"style":"plain","number":null,"count":4},"addToppings":[],"removeToppings":[],"colors":{"frosting":"mint","inscription":"coral"}}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"colors.frosting","value":"mint"}: colors.frosting="mint"
- PASS {"kind":"equals","path":"colors.inscription","value":"coral"}: colors.inscription="coral"
- PASS {"kind":"equals","path":"candles.style","value":"plain"}: candles.style="plain"
- PASS {"kind":"equals","path":"candles.count","value":4}: candles.count=4
- PASS {"kind":"equals","path":"candles.number","value":null}: candles.number=null

### x05: multi-edit

**Phrase:** Let's do a lemon cheesecake instead, and lose the candles.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"number","number":"8","count":null},"inscription":"Nora"}`

**May change only:** base, flavor, layers, candles. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"base","value":"cheesecake"},{"kind":"equals","path":"flavor","value":"classic"},{"kind":"equals","path":"layers","value":1},{"kind":"equals","path":"candles.style","value":"none"},{"kind":"equals","path":"candles.number","value":null},{"kind":"equals","path":"candles.count","value":null}]`

**PASS**; HTTP 200; interpreter jev; Jev 236.2ms; backup not usedms (status not used); HTTP 240.7ms; backup cost not used.
Patch: `{"exists":true,"base":"cheesecake","flavor":"lemon","candles":{"style":"none","number":null,"count":null},"addToppings":[],"removeToppings":[]}`. Notices: `["Cheesecake has one baked layer in this demo. Sponge cakes support up to three layers."]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"base","value":"cheesecake"}: base="cheesecake"
- PASS {"kind":"equals","path":"flavor","value":"classic"}: flavor="classic"
- PASS {"kind":"equals","path":"layers","value":1}: layers=1
- PASS {"kind":"equals","path":"candles.style","value":"none"}: candles.style="none"
- PASS {"kind":"equals","path":"candles.number","value":null}: candles.number=null
- PASS {"kind":"equals","path":"candles.count","value":null}: candles.count=null

### p01: paraphrases

**Phrase:** Can you stack the sponge three high? Not three whole cakes.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** layers. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"layers","value":3}]`

**PASS**; HTTP 200; interpreter jev; Jev 251.6ms; backup not usedms (status not used); HTTP 255.7ms; backup cost not used.
Patch: `{"exists":true,"base":"sponge","layers":3,"addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"layers","value":3}: layers=3

### p02: paraphrases

**Phrase:** I need the candle number ninety-two, not ninety-two separate candles.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** candles. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"candles.style","value":"number"},{"kind":"equals","path":"candles.number","value":"92"},{"kind":"equals","path":"candles.count","value":null}]`

**PASS**; HTTP 200; interpreter jev; Jev 189.5ms; backup not usedms (status not used); HTTP 194.0ms; backup cost not used.
Patch: `{"exists":true,"candles":{"style":"number","number":"92","count":null},"addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"candles.style","value":"number"}: candles.style="number"
- PASS {"kind":"equals","path":"candles.number","value":"92"}: candles.number="92"
- PASS {"kind":"equals","path":"candles.count","value":null}: candles.count=null

### p03: paraphrases

**Phrase:** Just eight normal candles, none of those number ones.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** candles. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"candles.style","value":"plain"},{"kind":"equals","path":"candles.count","value":8},{"kind":"equals","path":"candles.number","value":null}]`

**PASS**; HTTP 200; interpreter jev; Jev 165.1ms; backup not usedms (status not used); HTTP 168.8ms; backup cost not used.
Patch: `{"exists":true,"candles":{"style":"plain","number":null,"count":8},"addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"candles.style","value":"plain"}: candles.style="plain"
- PASS {"kind":"equals","path":"candles.count","value":8}: candles.count=8
- PASS {"kind":"equals","path":"candles.number","value":null}: candles.number=null

### p04: paraphrases

**Phrase:** Can the words say 'CHEERS, ZOË'? Keep the accent on the E.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** inscription. Every other state field must be preserved.
**Rules:** `[{"kind":"equals","path":"inscription","value":"CHEERS, ZOË"}]`

**PASS**; HTTP 200; interpreter jev; Jev 206.9ms; backup not usedms (status not used); HTTP 211.5ms; backup cost not used.
Patch: `{"exists":true,"inscription":"CHEERS, ZOË","addToppings":[],"removeToppings":[]}`. Notices: `[]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS must return edit action: edit
- PASS {"kind":"equals","path":"inscription","value":"CHEERS, ZOË"}: inscription="CHEERS, ZOË"

### a01: ambiguity

**Phrase:** Can you stick some kind of animal on it?

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** nothing (must clarify without editing). Every other state field must be preserved.
**Rules:** `[{"kind":"clarify"}]`

**PASS**; HTTP 200; interpreter jev; Jev 149.5ms; backup not usedms (status not used); HTTP 152.1ms; backup cost not used.
Patch: `{"exists":true,"addToppings":[],"removeToppings":[]}`. Notices: `["Which topper would you like? Try a castle, unicorn, or knight."]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS valid clarification action: edit
- PASS {"kind":"clarify"}: edit; Which topper would you like? Try a castle, unicorn, or knight.

### a02: ambiguity

**Phrase:** Uh, make the candles the other type, you know?

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"plain","number":null,"count":5},"inscription":"Nora"}`

**May change only:** nothing (must clarify without editing). Every other state field must be preserved.
**Rules:** `[{"kind":"clarify"}]`

**PASS**; HTTP 200; interpreter jev; Jev 171.7ms; backup 877.4ms (status 422); HTTP 1567.4ms; backup cost unknown.
Patch: `{"addToppings":[],"removeToppings":[]}`. Notices: `["Please clarify candles; I kept it unchanged.","The backup interpreter found no change to make. Your design is unchanged."]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS valid clarification action: edit
- PASS {"kind":"clarify"}: edit; Please clarify candles; I kept it unchanged.; The backup interpreter found no change to make. Your design is unchanged.

### a03: ambiguity

**Phrase:** Swap that thing on top for something else.

**Starting state:** `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":["cat","dragon"],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

**May change only:** nothing (must clarify without editing). Every other state field must be preserved.
**Rules:** `[{"kind":"clarify"}]`

**PASS**; HTTP 200; interpreter jev; Jev 161.5ms; backup not usedms (status not used); HTTP 167.8ms; backup cost not used.
Patch: `{"exists":true,"addToppings":[],"removeToppings":[]}`. Notices: `["Which topper would you like? Try a castle, unicorn, or knight."]`.
- PASS must preserve every field outside onlyChange: No unrelated state changes
- PASS valid clarification action: edit
- PASS {"kind":"clarify"}: edit; Which topper would you like? Try a castle, unicorn, or knight.

## Constraints
- A backup is optional; scoring never rewards a particular interpreter.
- Canonical values on individual explicitly requested fields are required, but open-ended mood/topping rules accept multiple valid choices.
- Run live only after user approval of this SHA. No changes to application prompts/models/normalization or scoring after seeing outcomes.
- Live budget assumes this server retains its one-backup-per-turn invariant and runs without concurrent interpretation traffic or restarts. Counter discrepancies abort immediately; health GETs do not spend model budget.
- No retries, no microphone, no browser paint claims, no image generation.
