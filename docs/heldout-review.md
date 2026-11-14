# Held-out phrase review (live not run)

Frozen SHA-256: `18f1ef4afe40234761cb6dc8a34d41d8052ee969d8c1e5e576fab52abfe93335`.

All cases start with the base state below, then apply their listed initial patch. Unlisted fields MUST stay unchanged. `onlyChange` is an allowed-change envelope, never permission to ignore the other positive rules.

Base state: `{"exists":true,"base":"sponge","flavor":"chocolate","layers":2,"occasion":null,"theme":null,"toppings":[],"toppers":[],"customTopper":null,"colors":{"frosting":"white","filling":"ivory","inscription":"navy","accents":"gold"},"topperStyles":{},"inscriptionStyle":{"font":"script","letterCase":"as-written","size":"medium","placement":"front"},"candles":{"style":"none","number":null,"count":null},"inscription":"Nora"}`

## m01 · themes-moods

Can you make it look a bit more grown-up and fancy?

Initial patch: `{}`
Only may change: colors, inscriptionStyle, topperStyles.
Required rules: `[{"kind":"changedAny","paths":["colors","inscriptionStyle"]},{"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["gold","black","navy","ivory","white","blush-pink","lavender"]}]`

## m02 · themes-moods

Could it have more of a beach feel?

Initial patch: `{}`
Only may change: colors, inscriptionStyle, topperStyles.
Required rules: `[{"kind":"changedAny","paths":["colors"]},{"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["sky-blue","navy","mint","white","ivory","peach","lemon-yellow"]}]`

## m03 · themes-moods

I'd like it to feel a bit like a garden, but no little figures.

Initial patch: `{}`
Only may change: colors, inscriptionStyle, topperStyles.
Required rules: `[{"kind":"changedAny","paths":["colors"]},{"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["sage-green","mint","lilac","lavender","blush-pink","peach","coral","red","lemon-yellow"]}]`

## m04 · themes-moods

Can you make the colors a bit warmer, like a sunset?

Initial patch: `{}`
Only may change: colors, inscriptionStyle, topperStyles.
Required rules: `[{"kind":"changedAny","paths":["colors"]},{"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["peach","coral","red","gold","chocolate-brown"]}]`

## m05 · themes-moods

Could you do the icing in black and white, nothing too kiddy?

Initial patch: `{}`
Only may change: colors, inscriptionStyle, topperStyles.
Required rules: `[{"kind":"changedAny","paths":["colors"]},{"kind":"changedToAny","paths":["colors.frosting","colors.accents"],"values":["white","ivory","black"]}]`

## t01 · inferred-toppings

Can you put some berries on it?

Initial patch: `{}`
Only may change: toppings.
Required rules: `[{"kind":"includesAny","path":"toppings","values":["strawberries","raspberries"]}]`

## t02 · inferred-toppings

I'd like some chocolate sauce on top, not a different cake flavor.

Initial patch: `{}`
Only may change: toppings.
Required rules: `[{"kind":"includesAll","path":"toppings","values":["ganache"]}]`

## t03 · inferred-toppings

Maybe some sticky toffee sauce on top?

Initial patch: `{}`
Only may change: toppings.
Required rules: `[{"kind":"includesAll","path":"toppings","values":["caramel"]}]`

## t04 · inferred-toppings

Can you sprinkle those little gold bits over it?

Initial patch: `{}`
Only may change: toppings.
Required rules: `[{"kind":"includesAll","path":"toppings","values":["gold-stars"]}]`

## o01 · contextual-occasions

My sister just got engaged, so it's for her.

Initial patch: `{}`
Only may change: occasion.
Required rules: `[{"kind":"equals","path":"occasion","value":"engagement"}]`

## o02 · contextual-occasions

We've just moved into our first flat. It's for that.

Initial patch: `{}`
Only may change: occasion.
Required rules: `[{"kind":"equals","path":"occasion","value":"housewarming"}]`

## o03 · contextual-occasions

It's for my dad, he's retiring next week.

Initial patch: `{}`
Only may change: occasion.
Required rules: `[{"kind":"equals","path":"occasion","value":"retirement"}]`

## o04 · contextual-occasions

My parents have been married twenty years. It's for them.

Initial patch: `{}`
Only may change: occasion.
Required rules: `[{"kind":"equals","path":"occasion","value":"anniversary"}]`

## c01 · removals-clears

Take all the toppings off, but keep the two figures.

Initial patch: `{"toppings":["strawberries","raspberries","caramel"],"toppers":["castle","princess"]}`
Only may change: toppings.
Required rules: `[{"kind":"length","path":"toppings","value":0}]`

## c02 · removals-clears

Get rid of the robot and the rocket, but leave the fruit.

Initial patch: `{"toppings":["strawberries"],"toppers":["robot","rocket"],"topperStyles":{"robot":{"position":"left"},"rocket":{"position":"right"}}}`
Only may change: toppers, topperStyles.
Required rules: `[{"kind":"length","path":"toppers","value":0},{"kind":"equals","path":"topperStyles","value":{}}]`

## c03 · removals-clears

Put the icing color back to normal, but leave the purple middle and gold writing.

Initial patch: `{"colors":{"frosting":"navy","filling":"lavender","inscription":"gold"}}`
Only may change: colors.frosting.
Required rules: `[{"kind":"equals","path":"colors.frosting","value":null}]`

## c04 · removals-clears

Get rid of the words, but don't change the font or size.

Initial patch: `{"inscriptionStyle":{"font":"print","letterCase":"upper","size":"large"}}`
Only may change: inscription.
Required rules: `[{"kind":"length","path":"inscription","value":0}]`

## c05 · removals-clears

Clear the occasion and take the tennis theme off. That's all.

Initial patch: `{"occasion":"anniversary","theme":"tennis","toppers":["castle"]}`
Only may change: occasion, theme.
Required rules: `[{"kind":"equals","path":"occasion","value":null},{"kind":"equals","path":"theme","value":null}]`

## x01 · multi-edit

Actually, red velvet, three layers, and some raspberries, please.

Initial patch: `{}`
Only may change: flavor, layers, toppings.
Required rules: `[{"kind":"equals","path":"flavor","value":"red-velvet"},{"kind":"equals","path":"layers","value":3},{"kind":"includesAll","path":"toppings","values":["raspberries"]}]`

## x02 · multi-edit

Swap the robot for a panda and write 'Bravo, Inez!' instead.

Initial patch: `{"toppers":["robot","castle"]}`
Only may change: toppers, topperStyles, inscription.
Required rules: `[{"kind":"includesAll","path":"toppers","values":["panda","castle"]},{"kind":"excludesAll","path":"toppers","values":["robot"]},{"kind":"equals","path":"inscription","value":"Bravo, Inez!"}]`

## x03 · multi-edit

Leave the cat, shrink the bunny a bit, and put the words in the middle.

Initial patch: `{"toppers":["cat","bunny"],"topperStyles":{"bunny":{"size":"large"}}}`
Only may change: topperStyles.bunny.size, inscriptionStyle.placement.
Required rules: `[{"kind":"oneOf","path":"topperStyles.bunny.size","values":["small","medium"]},{"kind":"equals","path":"inscriptionStyle.placement","value":"center"}]`

## x04 · multi-edit

Can you do mint green icing, coral writing, and four normal candles?

Initial patch: `{}`
Only may change: colors.frosting, colors.inscription, candles.
Required rules: `[{"kind":"equals","path":"colors.frosting","value":"mint"},{"kind":"equals","path":"colors.inscription","value":"coral"},{"kind":"equals","path":"candles.style","value":"plain"},{"kind":"equals","path":"candles.count","value":4},{"kind":"equals","path":"candles.number","value":null}]`

## x05 · multi-edit

Let's do a lemon cheesecake instead, and lose the candles.

Initial patch: `{"candles":{"style":"number","number":"8"}}`
Only may change: base, flavor, layers, candles.
Required rules: `[{"kind":"equals","path":"base","value":"cheesecake"},{"kind":"equals","path":"flavor","value":"classic"},{"kind":"equals","path":"layers","value":1},{"kind":"equals","path":"candles.style","value":"none"},{"kind":"equals","path":"candles.number","value":null},{"kind":"equals","path":"candles.count","value":null}]`

## p01 · paraphrases

Can you stack the sponge three high? Not three whole cakes.

Initial patch: `{}`
Only may change: layers.
Required rules: `[{"kind":"equals","path":"layers","value":3}]`

## p02 · paraphrases

I need the candle number ninety-two, not ninety-two separate candles.

Initial patch: `{}`
Only may change: candles.
Required rules: `[{"kind":"equals","path":"candles.style","value":"number"},{"kind":"equals","path":"candles.number","value":"92"},{"kind":"equals","path":"candles.count","value":null}]`

## p03 · paraphrases

Just eight normal candles, none of those number ones.

Initial patch: `{}`
Only may change: candles.
Required rules: `[{"kind":"equals","path":"candles.style","value":"plain"},{"kind":"equals","path":"candles.count","value":8},{"kind":"equals","path":"candles.number","value":null}]`

## p04 · paraphrases

Can the words say 'CHEERS, ZOË'? Keep the accent on the E.

Initial patch: `{}`
Only may change: inscription.
Required rules: `[{"kind":"equals","path":"inscription","value":"CHEERS, ZOË"}]`

## a01 · ambiguity

Can you stick some kind of animal on it?

Initial patch: `{}`
Only may change: nothing.
Required rules: `[{"kind":"clarify"}]`

## a02 · ambiguity

Uh, make the candles the other type, you know?

Initial patch: `{"candles":{"style":"plain","count":5}}`
Only may change: nothing.
Required rules: `[{"kind":"clarify"}]`

## a03 · ambiguity

Swap that thing on top for something else.

Initial patch: `{"toppers":["cat","dragon"]}`
Only may change: nothing.
Required rules: `[{"kind":"clarify"}]`

Live command only AFTER approval:

`npx tsx scripts/check-live-heldout.ts --live --approved-sha=18f1ef4afe40234761cb6dc8a34d41d8052ee969d8c1e5e576fab52abfe93335`

Maximum30 backup attempts; no retries/image calls. Mock pass rates are harness verification, not model accuracy.
