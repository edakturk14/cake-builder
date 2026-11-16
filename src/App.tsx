import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { CakeScene } from './components/CakeScene';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { PALETTE_BY_ID } from './shared/appearance';
import { BAKERY_COLORS, BAKERY_FLAVORS, BAKERY_TEMPLATES, BAKERY_TOPPERS, BAKERY_TOPPINGS, createTemplateCake, type TemplateId } from './shared/bakery';
import { applyCakePatch, cakeReducer, cloneCake, createBasketItem, estimateCake, formatMoney, parseBasket, type BasketItem, type CakeHistory, type CakePatch, type CakeState } from './shared/cake';
import { interpretLocalCommand } from './shared/localCommands';
import './styles/builder.css';
import './integration.css';
import './styles/customizer.css';

const BASKET_KEY = 'cake-gallery:basket:v1';
type DesignAction = { type: 'select'; cake: CakeState } | { type: 'edit'; patch: CakePatch } | { type: 'undo' };
function designReducer(state: CakeHistory, action: DesignAction): CakeHistory {
  if (action.type === 'select') return { cake: cloneCake(action.cake), history: [] };
  if (action.type === 'undo') return cakeReducer(state, { type: 'undo' });
  return cakeReducer(state, { type: 'apply', patch: action.patch });
}
function readBasket(): BasketItem[] {
  try { return parseBasket(localStorage.getItem(BASKET_KEY)); } catch { return []; }
}
const STARTER_DESIGN = createTemplateCake('classic');

export default function App() {
  const [selected, setSelected] = useState<TemplateId>('classic');
  const [design, dispatch] = useReducer(designReducer, { cake: STARTER_DESIGN, history: [] });
  const cake = design.cake;
  const estimate = estimateCake(cake);
  const [basket, setBasket] = useState<BasketItem[]>(readBasket);
  const [basketOpen, setBasketOpen] = useState(false);
  const basketDialog = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [command, setCommand] = useState('');
  const [messageDraft, setMessageDraft] = useState(cake.inscription);
  const [candleNumber, setCandleNumber] = useState('6');
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState('');
  const [request, setRequest] = useState({ description: '', name: '', email: '', date: '', details: '' });
  const [storageNotice, setStorageNotice] = useState('');

  function chooseTemplate(id: TemplateId) {
    if (id === selected) return;
    dispatch({ type: 'select', cake: createTemplateCake(id) });
    setSelected(id);
    setNotice('Selected a new design. Customize it below.');
  }
  function edit(patch: CakePatch, confirmation = '') {
    const next = applyCakePatch(cake, patch).state;
    if (next.toppings.filter(topping => BAKERY_TOPPINGS.some(item => item.id === topping)).length > 2) {
      setNotice('Choose up to two decorations so your cake stays balanced. Remove one to add another.');
      return;
    }
    dispatch({ type: 'edit', patch });
    setNotice(confirmation);
  }
  function handleCommand(text: string) {
    setLastCommand(text);
    const result = interpretLocalCommand(text, cake);
    if (result.kind === 'edit') edit(result.patch, result.message);
    else setNotice(result.message);
    if (result.kind === 'undo') dispatch({ type: 'undo' });
    if (result.kind === 'reset') { setSelected('classic'); dispatch({ type: 'select', cake: createTemplateCake('classic') }); }
    if (result.kind === 'custom') { setRequest(previous => ({ ...previous, description: text })); setQuoteOpen(true); }
  }
  const speech = useSpeechRecognition({ onFinal: handleCommand });

  function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (command.trim()) handleCommand(command.trim());
    setCommand('');
  }
  function applyMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (messageDraft.trim().length > 30) { setNotice('Please keep the cake message to 30 characters.'); return; }
    edit({ inscription: messageDraft.trim() });
  }
  function addToBasket() {
    if (basket.length >= 20) { setNotice('The basket is full. Remove a saved cake first.'); return; }
    setBasket(items => [...items, createBasketItem(cake)]);
    setBasketOpen(true);
  }
  useEffect(() => { setMessageDraft(cake.inscription); }, [cake.inscription]);
  useEffect(() => {
    try { localStorage.setItem(BASKET_KEY, JSON.stringify(basket)); setStorageNotice(''); }
    catch { setStorageNotice('Your basket could not be saved on this browser.'); }
  }, [basket]);
  useEffect(() => {
    const dialog = basketDialog.current;
    if (basketOpen && dialog && !dialog.open) dialog.showModal();
    if (!basketOpen && dialog?.open) dialog.close();
  }, [basketOpen]);

  async function copyCustomRequest() {
    if (!request.description.trim()) { setQuoteStatus('Please describe the cake first.'); return; }
    const draft = [
      'CUSTOM CAKE REQUEST (draft, not submitted)',
      'Cake idea: ' + request.description,
      'Name: ' + request.name,
      'Email: ' + request.email,
      'Preferred date: ' + request.date,
      'Other notes: ' + request.details,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(draft);
      setQuoteStatus('Copied. This is a draft and was not sent to a bakery.');
    } catch { setQuoteStatus('Could not copy automatically. Please copy your request manually.'); }
  }
  const template = BAKERY_TEMPLATES.find(item => item.id === selected) ?? BAKERY_TEMPLATES[0];
  const count = basket.reduce((sum, item) => sum + item.quantity, 0);
  const numberValid = /^\d{1,2}$/.test(candleNumber) && Number(candleNumber) > 0;

  return <div className="builder-page">
    <header className="site-header">
      <a className="brand" href="/" aria-label="Cake Gallery home">
        <svg viewBox="0 0 38 44" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17q12-7 24 0v14q-12 7-24 0Zm0 0q12 7 24 0M7 24q3 5 6 0 3 5 6 0 3 5 6 0M4 33q15 8 30 0M19 37v5m-5 0h10M11 10q8-5 16 0v7M11 10q8 5 16 0M15 7V4m8 3V4M15 2v1m8-1v1" /></g></svg>
        <span>Cake Gallery</span>
      </a>
      <button type="button" className="basket-trigger" onClick={() => setBasketOpen(true)}>
        <svg viewBox="0 0 20 21" aria-hidden="true"><path d="M4 7h12l1 12H3L4 7Zm3 0V5a3 3 0 0 1 6 0v2" /></svg>
        Basket <span>({count})</span>
      </button>
    </header>
    <main className="customizer-main">
      <div className="customizer-heading">
        <p className="eyebrow">A LITTLE CAKE, MADE YOUR WAY</p>
        <h1>Let's make your cake.</h1>
        <p className="heading-caption">Choose a cake we can make, then add your own little touches.</p>
      </div>

      <div className="customizer-workspace">
      <section className="template-picker" aria-labelledby="template-title">
        <div className="section-intro"><div><span className="step-label">01 / CHOOSE YOUR CAKE</span><h2 id="template-title">Start with a favorite</h2></div><p>Three designs to get you started</p></div>
        <div className="template-grid">
          {BAKERY_TEMPLATES.map(item => <button type="button" key={item.id} className={'template-card' + (selected === item.id ? ' is-selected' : '')}
            onClick={() => chooseTemplate(item.id)} aria-pressed={selected === item.id}>
            <CakeScene cake={createTemplateCake(item.id)} compact label={item.name} />
            <span className="template-card-copy"><strong>{item.name}</strong><small>{item.description}</small>
              <span>From {formatMoney(estimateCake(createTemplateCake(item.id)).totalCents)}</span></span>
          </button>)}
        </div>
      </section>


        <section className="customizer-preview" aria-label="Live cake preview">
          <span className="step-label">YOUR CAKE, SO FAR</span>
          <CakeScene cake={cake} />
          <div className="preview-summary">
            <p className="preview-name">{template.name}</p>
            <span className="preview-price">{formatMoney(estimate.totalCents)}</span>
          </div>
          {cake.inscription && <p className="preview-inscription" role="status">On your cake: <strong>{cake.inscription}</strong></p>}
          <p className="preview-hint">{cake.layers} sponge layer{cake.layers === 1 ? '' : 's'} · Illustrative preview</p>
          <div className="preview-actions">
            <button type="button" className="text-button" onClick={() => { dispatch({ type: 'undo' }); setNotice('Undid the last edit.'); }} disabled={!design.history.length}>Undo last change</button>
            <button type="button" className="text-button" onClick={() => { dispatch({ type: 'select', cake: createTemplateCake(selected) }); setNotice('Restored the original design.'); }}>Reset design</button>
          </div>

        <section className="voice-section" aria-labelledby="voice-title">
          <div className="section-intro"><div><span className="step-label">OR JUST TELL IT</span><h2 id="voice-title">Talk to your cake</h2></div><p>No extra API key needed</p></div>
          <p className="voice-examples">Try “Make it lavender,” “Add a layer,” or “Write Happy Birthday, Eda.”</p>
          <form className="composer" onSubmit={submitCommand}>
            <button type="button" className={'mic-button' + (speech.listening ? ' is-listening' : '')}
              onClick={speech.toggle} disabled={!speech.supported} aria-pressed={speech.listening}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
                <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3m-3 0h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span>{speech.listening ? 'Stop listening' : 'Talk now'}</span></button>
            <label htmlFor="cake-command" className="sr-only">Type a cake change</label>
            <input id="cake-command" className="composer-input" value={command} onChange={event => setCommand(event.target.value)}
              maxLength={250} placeholder="Or type an edit..."/>
            <button type="submit" className="secondary-button" disabled={!command.trim()}>Apply</button>
          </form>
          <div className="voice-quick-actions" aria-label="Try a cake edit">
            <button type="button" onClick={() => handleCommand('Make it three layers')}>3 layers</button>
            <button type="button" onClick={() => handleCommand('Make it pink')}>Pink frosting</button>
            <button type="button" onClick={() => handleCommand('Write Eda')}>Write Eda</button>
          </div>
          {!speech.supported && <p className="subtle-caption">Voice isn't supported here; controls and text still work.</p>}
          {speech.listening && <p className="subtle-caption">Listening for a cake change…</p>}
          {speech.interimTranscript && <p className="voice-transcript">“{speech.interimTranscript}”</p>}
          {lastCommand && !speech.interimTranscript && <p className="voice-transcript">You said: “{lastCommand}”</p>}
          {notice && <p className="user-notice" role="status">{notice}</p>}
          {speech.error && <p className="error-note" role="alert">{speech.error}</p>}
        </section>
        </section>

        <section className="customizer-editor" aria-labelledby="personalize-title">
          <span className="step-label">02 / PERSONALIZE IT</span><h2 id="personalize-title">The fun part</h2>
          <div className="edit-group">
            <label htmlFor="flavor">Cake flavor</label>
            <select id="flavor" value={cake.flavor} onChange={event => edit({ flavor: event.target.value as CakeState['flavor'] })}>
              {BAKERY_FLAVORS.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
          </div>
          <fieldset className="edit-group layer-picker">
            <legend>How many layers?</legend>
            <div className="layer-options">
              {([1, 2, 3] as const).map(layers => <button type="button" key={layers}
                className={'layer-choice' + (cake.layers === layers ? ' is-selected' : '')}
                aria-pressed={cake.layers === layers} onClick={() => edit({ layers })}>
                <strong>{layers}</strong> <span>{layers === 1 ? 'layer' : 'layers'}</span>
              </button>)}
            </div>
            <small className="subtle-caption">Sponge layers, not stacked tiers. Up to three.</small>
          </fieldset>
          <fieldset className="edit-group">
            <legend>Frosting color</legend>
            <div className="color-options">{BAKERY_COLORS.map(color => <button type="button" key={color}
              className={'color-choice' + (cake.colors.frosting === color ? ' is-selected' : '')}
              aria-pressed={cake.colors.frosting === color} aria-label={PALETTE_BY_ID[color].label} title={PALETTE_BY_ID[color].label}
              onClick={() => edit({ colors: { frosting: color } })}><span style={{ backgroundColor: PALETTE_BY_ID[color].hex }} /></button>)}</div>
            <small className="subtle-caption">{cake.colors.frosting ? PALETTE_BY_ID[cake.colors.frosting].label : 'Natural frosting'}</small>
          </fieldset>
          <div className="edit-group">
            <label htmlFor="writing">Message on your cake <span className="quiet">(up to 30 characters)</span></label>
            <form className="inline-edit" onSubmit={applyMessage}>
              <input id="writing" value={messageDraft} maxLength={30} onChange={event => setMessageDraft(event.target.value)} placeholder="Happy birthday, Eda!"/>
              <button type="submit" className="secondary-button">Apply</button>
            </form>
            {cake.inscription && <button type="button" className="text-button" onClick={() => edit({ inscription: '' })}>Clear writing</button>}
          </div>
          <fieldset className="edit-group">
            <legend>Add something sweet <span className="quiet">(up to two)</span></legend>
            <div className="option-chips">{BAKERY_TOPPINGS.map(item => <button type="button" key={item.id}
              className={'option-chip' + (cake.toppings.includes(item.id) ? ' is-selected' : '')}
              aria-pressed={cake.toppings.includes(item.id)}
              onClick={() => edit(cake.toppings.includes(item.id) ? { removeToppings: [item.id] } : { addToppings: [item.id] })}>
              {cake.toppings.includes(item.id) ? '✓ ' : '+ '}{item.label}
            </button>)}</div>
          </fieldset>
          <fieldset className="edit-group">
            <legend>One little topper <span className="quiet">(optional)</span></legend>
            <div className="option-chips">
              <button type="button" className={'option-chip' + (!cake.toppers.length ? ' is-selected' : '')}
                aria-pressed={!cake.toppers.length} onClick={() => edit({ toppers: [] })}>None</button>
              {BAKERY_TOPPERS.map(item => <button type="button" key={item.id}
                className={'option-chip topper-choice' + (cake.toppers[0] === item.id ? ' is-selected' : '')}
                aria-pressed={cake.toppers[0] === item.id} onClick={() => edit({ toppers: [item.id] })}>
                <img src={`/art/toppers/${item.id}.png`} alt="" width="36" height="40" loading="lazy"/>
                <span>{item.label}</span>
              </button>)}
            </div>
          </fieldset>
          <div className="edit-group">
            <label htmlFor="candle-style">Candles</label>
            <select id="candle-style" value={cake.candles.style} onChange={event => {
              if (event.target.value === 'none') edit({ candles: { style: 'none' } });
              if (event.target.value === 'plain') edit({ candles: { style: 'plain', count: 5 } });
              if (event.target.value === 'number') {
                if (numberValid) edit({ candles: { style: 'number', number: candleNumber } });
                else setNotice('Choose a candle number from 1 to 99.');
              }
            }}>
              <option value="none">No candles</option><option value="plain">5 birthday candles</option><option value="number">Number candles</option>
            </select>
            {cake.candles.style === 'number' && <div className="inline-edit candle-edit">
              <label htmlFor="candle-number">Number</label>
              <input id="candle-number" inputMode="numeric" value={candleNumber} maxLength={2} onChange={event => setCandleNumber(event.target.value.replace(/\D/g, ''))}/>
              <button type="button" className="secondary-button" disabled={!numberValid} onClick={() => edit({ candles: { style: 'number', number: candleNumber } })}>Apply</button>
            </div>}
          </div>

          <div className="order-summary">
            <div><span>Estimated total</span><strong>{formatMoney(estimate.totalCents)}</strong></div>
            <details><summary>See price breakdown</summary><ul>{estimate.lines.map(item => <li key={item.id}><span>{item.label}</span><span>{formatMoney(item.amountCents)}</span></li>)}</ul></details>
            <button type="button" className="primary-button" onClick={addToBasket}>Save cake to basket</button>
            <small>Demo prices only. No payment or order has been placed.</small>
          </div>
        </section>
      </div>

      <section className="custom-request" id="custom-request" aria-labelledby="custom-request-title">
        <div><span className="step-label">SOMETHING MORE COMPLICATED?</span><h2 id="custom-request-title">Dreaming of a castle-shaped cake?</h2>
          <p>For sculpted cakes, special shapes or decorations we don't offer above, describe your idea and ask the baker for a quote.</p></div>
        <button type="button" className="secondary-button" onClick={() => setQuoteOpen(value => !value)}
          aria-expanded={quoteOpen} aria-controls="quote-panel">{quoteOpen ? 'Close request' : 'Describe your idea'}</button>
        {quoteOpen && <div id="quote-panel" className="quote-form">
          <p className="quote-warning">This is a request draft only, not a live inquiry. A bakery must connect its ordering system to receive it.</p>
          <label htmlFor="quote-description">Your cake idea</label>
          <textarea id="quote-description" rows={4} value={request.description} maxLength={1000}
            onChange={event => setRequest(previous => ({ ...previous, description: event.target.value }))} placeholder="A castle-shaped cake with pink towers..."/>
          <div className="quote-fields">
            <label htmlFor="quote-name">Name<input id="quote-name" value={request.name} onChange={event => setRequest(previous => ({ ...previous, name: event.target.value }))}/></label>
            <label htmlFor="quote-email">Email<input id="quote-email" type="email" value={request.email} onChange={event => setRequest(previous => ({ ...previous, email: event.target.value }))}/></label>
            <label htmlFor="quote-date">Preferred date<input id="quote-date" type="date" value={request.date} onChange={event => setRequest(previous => ({ ...previous, date: event.target.value }))}/></label>
          </div>
          <label htmlFor="quote-notes">Anything else?</label>
          <textarea id="quote-notes" rows={2} maxLength={500} value={request.details}
            onChange={event => setRequest(previous => ({ ...previous, details: event.target.value }))} placeholder="Servings, allergy information, references..."/>
          <button type="button" className="secondary-button" onClick={copyCustomRequest}>Copy request draft</button>
          {quoteStatus && <p className="user-notice" role="status">{quoteStatus}</p>}
        </div>}
      </section>
      <p className="page-footnote">Cake Gallery prototype. Actual options, prices, delivery and pickup are set by the bakery.</p>
    </main>

    <dialog ref={basketDialog} className="basket-drawer" onCancel={() => setBasketOpen(false)} aria-labelledby="basket-title">
      <div className="basket-header"><h2 id="basket-title">Your basket ({count})</h2><button type="button" className="text-button" onClick={() => setBasketOpen(false)}>Close ×</button></div>
      {basket.length === 0 ? <p>Nothing here yet. Save a cake to keep its design.</p> :
        basket.map(item => <article className="basket-item" key={item.id}>
          <CakeScene cake={item.design} compact label="Saved cake preview" />
          <div className="basket-item-info">
            <h3>{item.design.inscription || 'Personalized cake'}</h3>
            <p>{item.design.flavor.replaceAll('-', ' ')} · {formatMoney(item.estimate.totalCents)} each</p>
            {item.estimate.requiresQuote && <p>Custom details need a separate bakery quote.</p>}
            <label>Quantity <select value={item.quantity} onChange={event => setBasket(previous => previous.map(saved =>
              saved.id === item.id ? { ...saved, quantity: Number(event.target.value) } : saved))}>
              {Array.from({ length: 10 }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}</option>)}
            </select></label>
            <button type="button" className="text-button" onClick={() => setBasket(previous => previous.filter(saved => saved.id !== item.id))}>Remove</button>
          </div>
        </article>)}
      {basket.length > 0 && <p className="basket-total">Estimated total <strong>{formatMoney(basket.reduce((sum, item) => sum + item.estimate.totalCents * item.quantity, 0))}</strong></p>}
      <p className="basket-disclaimer">Saved only in this browser. This demo does not submit orders, take payments or reserve pickup dates.</p>
      {storageNotice && <p role="status">{storageNotice}</p>}
    </dialog>
  </div>;
}
