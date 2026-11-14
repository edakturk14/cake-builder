import { useEffect, type ReactNode } from 'react';
import type { CakeState } from '../shared/cake';
import { CakeScene } from './CakeScene';
import TOPPER_ART from '../art/toppersManifest.json';
import '../styles/builder.css';

export interface BuilderPageProps {
  cake: CakeState;
  basketCount: number;
  composer: ReactNode;
  details: ReactNode;
  footer: ReactNode;
  basket?: ReactNode;
  onOpenBasket: () => void;
  onReset?: () => void;
  notice?: ReactNode;
}

export function BuilderPage({ cake, basketCount, composer, details, footer, basket, onOpenBasket, onReset, notice }: BuilderPageProps) {
  useEffect(() => {
    const assets = ['princess', 'cheesecake', 'mushroom', 'coins', 'race-car', 'checkered-flag', 'football', 'tennis-racket', 'tennis-ball', 'strawberry-fan',
      ...['chocolate', 'vanilla', 'lemon', 'red-velvet'].flatMap(flavor => [1, 2, 3].map(layers => `${flavor}-${layers}`))];
    assets.forEach(asset => { const image = new Image(); image.src = `/art/${asset}.png`; });
    Object.values(TOPPER_ART.items).forEach(asset => { const image = new Image(); image.src = asset.file; });
    [1,2,3,'cheesecake'].forEach(variant=>['frosting','filling','accents'].forEach(part=>{const image=new Image();image.src=`/art/masks/${part}-${variant}.png`;}));
  }, []);
  return <div className="builder-page">
    <header className="site-header">
      <a className="brand" href="/" aria-label="Cake Gallery home">
        <svg viewBox="0 0 38 44" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17q12-7 24 0v14q-12 7-24 0Zm0 0q12 7 24 0M7 24q3 5 6 0 3 5 6 0 3 5 6 0 3 5 6 0M4 33q15 8 30 0M19 37v5m-5 0h10M11 10q8-5 16 0v7M11 10q8 5 16 0M15 7V4m8 3V4M15 2v1m8-1v1" /></g></svg>
        <span>Cake Gallery</span>
      </a>
      <button type="button" className="basket-trigger" onClick={onOpenBasket}><svg viewBox="0 0 20 21" aria-hidden="true"><path d="M4 7h12l1 12H3L4 7Zm3 0V5a3 3 0 0 1 6 0v2" /></svg>Basket <span>({basketCount})</span></button>
    </header>
    <main className="builder-main">
      <div className="page-heading"><p className="eyebrow">MADE OF YOUR IMAGINATION</p><h1>Describe your cake</h1><p className="heading-caption">You dream it. We make it delicious.</p></div>
      <CakeScene cake={cake} />
      <section className="builder-controls" aria-label="Design your cake">
        {composer}
        <div className="composer-hint">{cake.exists ? 'Keep dreaming. You can change any little detail.' : <>Try “I want a chocolate cake.”</>}</div>
        {notice && <div className="builder-notice" role="status">{notice}</div>}
        <div className="builder-details">{details}</div>
        {cake.exists && onReset && <button className="reset-button text-button" type="button" onClick={onReset}>Start afresh</button>}
        <div className="builder-footer">{footer}</div>
      </section>
      <p className="page-footnote">A cake as individual as you. <span>Sample designs & estimates.</span></p>
    </main>
    {basket}
  </div>;
}
export default BuilderPage;
