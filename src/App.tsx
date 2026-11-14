import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BuilderPage } from './components/BuilderPage';
import { CakeScene } from './components/CakeScene';
import { useCakeDesigner } from './hooks/useCakeDesigner';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { EMPTY_CAKE, LABELS, cakeReducer, cloneCake, createBasketItem, estimateCake, formatMoney, fulfillBasketAsset, normalizeCustomRequest, parseBasket, type BasketItem, type CakePatch, type CakeState } from './shared/cake';
import { CAKE_FIXTURES, DEMO_TURNS } from './shared/fixtures';
import { TOPPER_BY_ID } from './shared/toppers';
import { getAskOptions, getCakeSuggestions } from './shared/discoverability';
import { COLOR_TARGETS, DEFAULT_INSCRIPTION_STYLE, PALETTE_BY_ID } from './shared/appearance';
import { OCCASION_BY_ID } from './shared/occasions';
import './integration.css';

const BASKET_KEY = 'cake-gallery:basket:v1';
function readBasket(): BasketItem[] {
  try { return parseBasket(localStorage.getItem(BASKET_KEY)); } catch { return []; }
}
function milliseconds(value: number | undefined) { return value === undefined ? '—' : `${Math.round(value)} ms`; }

export default function App() {
  const [basket, setBasket] = useState<BasketItem[]>(readBasket);
  const designer = useCakeDesigner({ onAssetReady: ({ request, assetId }) => setBasket(items => fulfillBasketAsset(items, request, assetId)) });
  const [command, setCommand] = useState('');
  const [lastTyped, setLastTyped] = useState('');
  const speech = useSpeechRecognition({ onFinal: (text, meta) => { setLastTyped(text); designer.submit(text, meta); } });
  const [basketOpen, setBasketOpen] = useState(false);
  const [storageNotice, setStorageNotice] = useState('');
  const [debug, setDebug] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [replay, setReplay] = useState<CakeState | null>(null);
  const [replayHistory, setReplayHistory] = useState<CakeState[]>([]);
  const [replayKind, setReplayKind] = useState<'demo' | 'fixture'>('demo');
  const [replayStep, setReplayStep] = useState(0);
  const [fixtureId, setFixtureId] = useState('02');
  const [fixtureTurn, setFixtureTurn] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const basketTrigger = useRef<HTMLElement | null>(null);
  const cake = replay ?? designer.cake;
  const estimate = estimateCake(cake);
  const pending = replay === null && designer.pending;
  const basketCount = basket.reduce((sum, item) => sum + item.quantity, 0);
  const suggestions = getCakeSuggestions(cake);

  useEffect(() => {
    try { localStorage.setItem(BASKET_KEY, JSON.stringify(basket)); setStorageNotice(''); }
    catch { setStorageNotice('Your basket is available for this visit, but could not be saved on this browser.'); }
  }, [basket]);
  useEffect(() => {
    if (basketOpen) {
      basketTrigger.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
      basketTrigger.current?.focus();
    }
  }, [basketOpen]);

  function reset() {
    speech.stop();
    designer.reset();
    setReplay(null);
    setReplayHistory([]);
    setReplayStep(0);
    setFixtureTurn(0);
    setLastTyped('');
    setCommand('');
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!command.trim()) return;
    setLastTyped(command.trim());
    designer.submit(command.trim(), { source: 'typed' });
    setCommand('');
  }
  function submitSuggestion(text: string) {
    if (pending || replay !== null) return;
    setLastTyped(text);
    designer.submit(text, { source: 'typed' });
  }
  function enterReplay() {
    speech.stop();
    designer.reset();
    setReplay(cloneCake(EMPTY_CAKE));
    setReplayHistory([]);
    setReplayKind('demo');
    setReplayStep(0);
    setFixtureTurn(0);
  }
  function applyReplay(patch: CakePatch, fresh: boolean) {
    const next = cakeReducer({ cake: fresh ? cloneCake(EMPTY_CAKE) : replay ?? EMPTY_CAKE, history: fresh ? [] : replayHistory }, { type: 'apply', patch });
    setReplay(next.cake);
    setReplayHistory(next.history);
  }
  function undoReplay() {
    const previous = cakeReducer({ cake: replay ?? EMPTY_CAKE, history: replayHistory }, { type: 'undo' });
    setReplay(previous.cake);
    setReplayHistory(previous.history);
    if (replayKind === 'demo') setReplayStep(step => Math.max(0, step - 1));
    else setFixtureTurn(turn => Math.max(0, turn - 1));
  }
  function demoNext() {
    if (replayStep >= DEMO_TURNS.length) return;
    applyReplay(DEMO_TURNS[replayStep].patch, replayStep === 0 || replayKind !== 'demo');
    setReplayKind('demo');
    setFixtureTurn(0);
    setReplayStep(step => step + 1);
  }
  function fixtureNext() {
    const fixture = CAKE_FIXTURES.find(item => item.id === fixtureId)!;
    if (fixtureTurn >= fixture.turns.length) return;
    applyReplay(fixture.turns[fixtureTurn].patch, fixtureTurn === 0 || replayKind !== 'fixture');
    setReplayKind('fixture');
    setReplayStep(0);
    setFixtureTurn(turn => turn + 1);
  }
  function addToBasket() {
    if (!cake.exists || pending || basket.length >= 100) return;
    const saved = cloneCake(cake);
    if (saved.customTopper && saved.customTopper.assetId === null) {
      saved.customTopper.assetId = designer.readyAssets.get(normalizeCustomRequest(saved.customTopper.request)) ?? null;
    }
    setBasket(items => [...items, createBasketItem(saved)]);
    setBasketOpen(true);
  }

  const composer = <div className="composer-wrap">
    <form className="composer" onSubmit={submit}>
      <button type="button" className={`mic-button${speech.listening ? ' is-listening' : ''}`} onClick={speech.toggle}
        disabled={!speech.supported || replay !== null} aria-pressed={speech.listening}
        aria-label={speech.listening ? 'Stop listening' : 'Start listening'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3m-3 0h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
        <span>{speech.listening ? 'Stop listening' : 'Start listening'}</span>
      </button>
      <label className="sr-only" htmlFor="cake-command">Describe your cake or an edit</label>
      <input id="cake-command" className="composer-input" value={command} onChange={event => setCommand(event.target.value)}
        maxLength={1000} placeholder="Or type your cake idea…" autoComplete="off" disabled={replay !== null} />
      <button type="submit" className="send-button" disabled={!command.trim() || replay !== null} aria-label="Send cake request">↑</button>
    </form>
    {speech.listening && <p className="composer-hint">Listening. Tell us what to change, one thought at a time.</p>}
    {!speech.supported && <p className="status-note">Voice recognition is unavailable here. Try desktop Chrome, or use the text field.</p>}
  </div>;
  const specs = cake.exists ? [
    cake.base === 'cheesecake' ? 'Classic cheesecake' : LABELS[cake.flavor],
    `${cake.layers} layer${cake.layers === 1 ? '' : 's'}`,
    cake.occasion ? OCCASION_BY_ID[cake.occasion].label : null,
    cake.theme ? LABELS[cake.theme] : null,
    ...cake.toppings.map(topping => LABELS[topping]),
    ...cake.toppers.map(topper => `${TOPPER_BY_ID[topper].label} topper`),
    cake.customTopper ? `Custom: ${cake.customTopper.request}` : null,
    ...COLOR_TARGETS.flatMap(target => cake.colors[target.id] ? [`${target.label}: ${PALETTE_BY_ID[cake.colors[target.id]!].label}`] : []),
    ...cake.toppers.flatMap(id => cake.topperStyles[id] ? [`${TOPPER_BY_ID[id].label}: ${cake.topperStyles[id]!.size}, ${cake.topperStyles[id]!.position}${cake.topperStyles[id]!.tint ? `, ${PALETTE_BY_ID[cake.topperStyles[id]!.tint!].label}` : ''}`] : []),
    cake.inscription && JSON.stringify(cake.inscriptionStyle) !== JSON.stringify(DEFAULT_INSCRIPTION_STYLE)
      ? `Writing: ${cake.inscriptionStyle.font}, ${cake.inscriptionStyle.letterCase}, ${cake.inscriptionStyle.size}, ${cake.inscriptionStyle.placement}` : null,
    cake.candles.style === 'number' ? `${cake.candles.number} candle (numeral)` : cake.candles.style === 'plain' ? `${cake.candles.count} candles` : null,
    cake.inscription ? `“${cake.inscription}”` : null,
  ].filter(Boolean) : [];
  const transcript = speech.interimTranscript || lastTyped;
  const details = <div className="builder-details">
    <div className="specs" aria-label="Current cake specifications">{specs.map((spec, index) => <span className="spec-pill" key={`${index}-${spec}`}>{spec}</span>)}</div>
    {replay === null && <div className="cake-discovery" aria-busy={pending}>
      <div className="suggestion-row" aria-label="Suggested cake requests"><span className="suggestion-label">Try:</span>{suggestions.map(text => <button type="button" className="suggestion-chip" key={text} disabled={pending} onClick={() => submitSuggestion(text)}>{text}</button>)}</div>
      <button type="button" className="text-button options-toggle" disabled={pending} aria-expanded={optionsOpen} aria-controls="ask-options" onClick={() => setOptionsOpen(value => !value)}>See everything you can ask for <span aria-hidden="true">{optionsOpen ? '−' : '+'}</span></button>
      <section id="ask-options" className="ask-options" aria-label="Supported cake options and sample prices" hidden={!optionsOpen}>
        <p className="options-intro">Ask naturally, or use a suggestion above. Sample estimates, not bakery quotes.</p>
        {getAskOptions().map(group => <div className="ask-option-group" key={group.id}>
          <h2>{group.label}</h2>
          <ul>{group.options.map(option => <li key={option.id}><span>{option.label}</span><span className="option-price">{option.priceCents === null ? `→ ${option.detail}` : option.priceCents === 0 && option.detail ? option.detail : `${formatMoney(option.priceCents)}${option.detail === 'additional' ? ' extra' : ''}`}</span></li>)}</ul>
        </div>)}
      </section>
    </div>}
    <div className="transcript" aria-live="polite">
      {transcript && replay === null && <p className={speech.interimTranscript ? 'interim' : ''}>“{transcript}”</p>}
      {pending && <p className="status-note">Interpreting with Jev{designer.pendingCount > 1 ? ` · ${designer.pendingCount} requests queued` : '…'}</p>}
      {pending && !cake.exists && <button type="button" className="text-button" onClick={reset}>Cancel pending edits</button>}
    </div>
    {replay === null && designer.notices.map((notice, index) => <p className="status-note" key={`${index}-${notice}`}>{notice}</p>)}
    {replay === null && designer.imagePending && <p className="status-note image-status" role="status">Creating your topper… You can keep editing or save this design.</p>}
    {replay === null && designer.imageError && <p className="status-note image-status" role="status">{designer.imageError} <button type="button" className="text-button" disabled={pending || designer.imagePending} onClick={designer.retryImage}>Try again</button></p>}
    {replay === null && designer.error && <p className="error-note" role="alert">{designer.error}</p>}
    {replay === null && speech.error && <p className="error-note" role="alert">{speech.error}</p>}
  </div>;
  const footer = <div className="builder-footer">
    {cake.exists && <>
      <div className="estimate-row">
        <div><span className="estimate-label">Estimated total</span><strong className="estimate-amount">{formatMoney(estimate.totalCents)}</strong></div>
        <button type="button" className="primary-button" disabled={pending || basket.length >= 100} onClick={addToBasket}>Add to basket</button>
      </div>
      {estimate.requiresQuote && <p className="status-note">Custom decoration to be quoted. Showing the known subtotal.</p>}
      <details className="price-breakdown"><summary>Estimate breakdown</summary><ul>{estimate.lines.map(line => <li key={line.id}><span>{line.label}</span><span>{formatMoney(line.amountCents)}</span></li>)}</ul><p>Sample prices, not a bakery quote. No tax, shipping, or payment.</p></details>
      <button type="button" className="text-button undo-button" onClick={replay !== null ? undoReplay : designer.undo} disabled={(replay !== null ? replayHistory.length === 0 : !designer.canUndo) || pending}>Undo last edit</button>
    </>}
    <button type="button" className="text-button debug-toggle" onClick={() => setDebug(value => !value)} aria-expanded={debug}>Local demo tools {debug ? '−' : '+'}</button>
    {debug && <section className="debug-panel" aria-label="Local demo tools">
      <h2>Live request timing</h2>
      <p>Browser times use performance.now(). Paint is approximated by two animation frames. These are not last-audible-word measurements.</p>
      {designer.timings.length === 0 ? <p>No live requests measured yet.</p> : <div className="timing-scroll"><table><thead><tr><th>Turn</th><th>Provider</th><th>Image generation</th><th>Request</th><th>Final transcript → paint</th></tr></thead><tbody>{designer.timings.map((timing, index) => <tr key={timing.turnId}><td title={timing.phrase}>{index === 0 ? '1 (first)' : index + 1}{timing.error ? ' · failed' : ''}</td><td>{milliseconds(timing.providerMs)}</td><td title={timing.imageError}>{timing.imageCached ? 'cached' : timing.imageError ? 'failed' : milliseconds(timing.imageGenerationMs)}</td><td>{milliseconds(timing.responseAt === undefined ? undefined : timing.responseAt - timing.fetchStartAt)}</td><td>{milliseconds(timing.approximatePaintAt === undefined ? undefined : timing.approximatePaintAt - timing.finalAt)}</td></tr>)}</tbody></table></div>}
      <h2>Local fixture replay, not Jev</h2>
      <p>Opt-in visual and pricing checks only. Fixture buttons never send commands to the model.</p>
      {replay === null ? <button type="button" className="text-button" disabled={pending} onClick={enterReplay}>Enter local fixture replay</button> : <div className="fixture-controls">
        <button type="button" className="text-button" onClick={reset}>Exit replay and start fresh live</button>
        <button type="button" className="text-button" disabled={replayStep >= DEMO_TURNS.length} onClick={demoNext}>Six-step demo: {replayStep < DEMO_TURNS.length ? `apply turn ${replayStep + 1}` : 'complete'}</button>
        <p>Turns 5–6 change Eda to Ada, then remove the princess. Undo restores the previous confirmed fixture and estimate.</p>
        {replayStep > 0 && <p>{DEMO_TURNS[replayStep - 1].text}</p>}
        <label htmlFor="fixture-select">Example fixture</label>
        <select id="fixture-select" value={fixtureId} onChange={event => { setFixtureId(event.target.value); setFixtureTurn(0); setReplayStep(0); setReplayKind('fixture'); setReplayHistory([]); setReplay(cloneCake(EMPTY_CAKE)); }}>
          {CAKE_FIXTURES.map(fixture => <option value={fixture.id} key={fixture.id}>{fixture.id}. {fixture.title}</option>)}
        </select>
        <button type="button" className="text-button" disabled={fixtureTurn >= CAKE_FIXTURES.find(item => item.id === fixtureId)!.turns.length} onClick={fixtureNext}>Apply example {fixtureId}{fixtureTurn ? ' follow-up' : ''}</button>
      </div>}
    </section>}
  </div>;
  const basketView = <dialog className="basket-drawer" ref={dialog} onCancel={() => setBasketOpen(false)} aria-labelledby="basket-title" onClick={event => { if (event.target === event.currentTarget) setBasketOpen(false); }}>
    <div className="basket-header"><h2 id="basket-title">Your basket ({basketCount})</h2><button type="button" className="text-button" onClick={() => setBasketOpen(false)} aria-label="Close basket">Close ×</button></div>
    {basket.length === 0 ? <p>Your basket is waiting for a cake.</p> : basket.map(item => <article className="basket-item" key={item.id}>
      <CakeScene cake={item.design} compact label={`Saved cake: ${item.design.inscription || LABELS[item.design.flavor]}`} />
      <div className="basket-item-info">
        <h3>{item.design.inscription || `${LABELS[item.design.flavor]} cake`}</h3>
        <p>{item.design.layers} layer{item.design.layers === 1 ? '' : 's'} · {formatMoney(item.estimate.totalCents)} each</p>
        {item.estimate.requiresQuote && <p className="status-note">Custom decoration to be quoted: {item.estimate.quoteItems.join(', ')}</p>}
        <label>Quantity <select value={item.quantity} onChange={event => setBasket(items => items.map(saved => saved.id === item.id ? { ...saved, quantity: Number(event.target.value) } : saved))}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
        <button type="button" className="text-button" onClick={() => setBasket(items => items.filter(saved => saved.id !== item.id))}>Remove</button>
      </div>
    </article>)}
    {basket.length > 0 && <p className="basket-total">Total estimate <strong>{formatMoney(basket.reduce((sum, item) => sum + item.estimate.totalCents * item.quantity, 0))}</strong></p>}
    {basket.some(item => item.estimate.requiresQuote) && <p className="status-note">Custom items are additional and subject to a quote.</p>}
    <p className="basket-disclaimer">Your designs are saved on this browser. This is a demo, not an order.</p>
    {storageNotice && <p className="status-note">{storageNotice}</p>}
  </dialog>;
  return <BuilderPage cake={cake} basketCount={basketCount} composer={composer} details={details} footer={footer} basket={basketView}
    onOpenBasket={() => setBasketOpen(true)} onReset={reset} notice={replay !== null ? <span>Local fixture replay · not live Jev</span> : undefined} />;
}
