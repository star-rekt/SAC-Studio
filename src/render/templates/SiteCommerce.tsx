/** The site-placement frames from the Bump and AUTUMN20 boards.
 * Both boards show the same live-site chrome: a centered green CB and phone
 * mockups whose promotion lives inside a PDP/PLP, not on a blank badge canvas.
 * Flash has no badging/CB frames, so it inherits the structure with its own
 * campaign accent. Text and merchandise photography remain editable layers. */
import type { SheetAsset } from '../../sheet/types';
import { Editable, Ground } from '../../edit/Editable';
import { Media } from '../../edit/Media';
import { stack } from '../../fonts';
import { fitText, type Contract } from '../../model/textContracts';

const green = '#7ea63f', ink = '#333333';
const products = {
  jackets: ['/reference/badge-jacket-blue.png', '/reference/badge-jacket-yellow.png',
    '/reference/badge-jacket-black.png'],
  shoes: ['/reference/badge-boot-brown.jpg', '/reference/badge-shoe-beige.jpg',
    '/reference/badge-boot-grey.jpg', '/reference/badge-boot-grey.jpg'],
};

const editable = (id: string, value: string, style: React.CSSProperties, fit?: Contract) =>
  <Editable id={id} fit={fit} style={style}>{value}</Editable>;

/** Display casing only, for fields that arrive upper-cased ('UP TO 70% OFF',
 *  '3 DAYS ONLY') but render Title Case on this board's own site chrome. */
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

function promotion(asset: SheetAsset) {
  const offer = asset.copy.offer || '20% OFF';
  const noCode = !asset.copy.code;
  const minimum = asset.copy.qualifier?.match(/\b(\d+)\+\s+eligible\s+items/i)?.[1];
  return noCode ? `Extra ${offer}${minimum ? ` on ${minimum}+ Eligible Items` : ' on Eligible Gear'}`
    : `Extra ${offer} Code ${asset.copy.code}${/end/i.test(asset.scope.phase ?? '') ? ' | Ends Today' : ''}`;
}

export function CampaignBanner({ asset, templateId }: {
  asset: SheetAsset; templateId: string }) {
  const [w,h] = asset.size;
  const accent = templateId === 'sc26_0021' ? '#f14222' : green;
  const ends = asset.variant === 'ends-today' ||
    (asset.variant === 'base' && /end/i.test(asset.scope.phase ?? ''));
  // This board's own reference example happened to say "70% Off" and that
  // literal string stayed hardcoded here regardless of what any brief since
  // actually asked for -- a 75%-off brief still rendered the board's number.
  const offerPhrase = titleCase(asset.copy.body
    || `${asset.copy.lead || 'EXTRA'} ${asset.copy.offer || '20% OFF'}`);
  const message = templateId === 'sc26_0021' && !asset.scope.topic
    ? `${titleCase(ends ? 'Ends Today' : (asset.copy.marquee || '3 Days Only'))}: ${offerPhrase} Sitewide`
    : asset.scope.topic || `${ends ? 'Ends Today: ' : ''}${asset.copy.body
      || `${asset.copy.lead || 'EXTRA'} ${asset.copy.offer || '20% OFF'}`}`;
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{ width:w, height:h, background:accent,
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    gap: 22, fontFamily:stack('Sofia Pro'), color:'#fff' }}>
    {editable(`${asset.id}/message`, message, { fontSize:Math.min(50, Math.floor(w / (message.length * .57))), fontWeight:700,
      lineHeight:1.1, textAlign:'center' })}
    {(() => { const details = [asset.copy.code ? `Code ${asset.copy.code}` : '', asset.copy.dates].filter(Boolean).join(' · ');
      if (!details) return null;
      const fit = fitText(details, 'banner.details', { widthBudget: w * .8, fontMax: 30 });
      const { fontSize } = fit;
      return editable(`${asset.id}/details`, details, { fontSize, fontWeight:500, lineHeight:1.1, textAlign:'center', whiteSpace:'nowrap' }, fit.contract); })()}
    {(() => { const cta = asset.copy.cta || 'Shop Now';
      const fit = fitText(cta, 'banner.cta', { widthBudget: w * .7, fontMax: 50 });
      const { fontSize } = fit;
      return editable(`${asset.id}/cta`, cta, { fontSize, lineHeight:1, textDecoration:'underline', textAlign:'center', whiteSpace:'nowrap' }, fit.contract); })()}
    <div style={{ display:'flex', gap:70, marginTop:0 }} aria-label="Carousel position">
      {[0,1,2].map(n=><i key={n} style={{ width:18, height:18, borderRadius:'50%',
        background:n===0?'#fff':'#ffffff66' }} />)}
    </div>
  </Ground>;
}

export function GlobalText({ asset, templateId }: { asset: SheetAsset; templateId: string }) {
  const [w,h] = asset.size;
  const offer = asset.copy.offer || '20% OFF';
  const flash = templateId === 'sc26_0021';
  const ends = /end/i.test(asset.scope.phase ?? '');
  // Same bug as CampaignBanner above: a hardcoded "70% Off" regardless of the
  // brief's actual percent.
  const first = asset.scope.topic || (flash
    ? `${titleCase(ends ? 'Ends Today' : (asset.copy.marquee || '3 Days Only'))}: ${
        titleCase(asset.copy.body || `Up To ${offer}`)} ${ends ? 'Flash Sale' : 'Sitewide'}`
    : asset.copy.qualifier?.match(/\b(\d+)\+\s+eligible\s+items/i)
      ? `Extra ${offer} on ${asset.copy.qualifier.match(/\b(\d+)\+/)![1]}+ Eligible Items`
    : asset.copy.body && asset.copy.body.length < 65
      ? asset.copy.body : `Extra ${offer} Select Gear`);
  const last = [asset.copy.code ? `Use Code ${asset.copy.code}`
    : asset.copy.cta || (flash && !ends ? 'Shop Flash Sale' : 'Shop Now'),
    asset.copy.dates].filter(Boolean).join(' · ');
  const fontSize = Math.min(48, Math.floor(1250 / Math.max(1, (first.length + last.length) * .51)));
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{ width:w,height:h,background:'#fff',
    display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 58px',
    fontFamily:stack('Sofia Pro'),color:'#121212' }}>
    <Media id={`${asset.id}/chevron-left/mark`} src="/reference/chevron-left.svg"
      alt="Previous promotion" style={{width:20,height:44,objectFit:'contain'}} />
    <div style={{display:'flex',alignItems:'baseline',gap:12,whiteSpace:'nowrap'}}>
      {editable(`${asset.id}/message`,first,{fontSize,fontWeight:700,lineHeight:1})}
      {editable(`${asset.id}/link`,last,{fontSize,fontWeight:400,textDecoration:'underline',lineHeight:1})}
    </div>
    <Media id={`${asset.id}/chevron-right/mark`} src="/reference/chevron-right.svg"
      alt="Next promotion" style={{width:20,height:44,objectFit:'contain'}} />
  </Ground>;
}

function Phone({ asset, children }: { asset: SheetAsset; children: React.ReactNode }) {
  const [w,h] = asset.size;
  const scale = Math.min(w/679,h/1403);
  return <div className="sheet" style={{ width:w,height:h,background:'#efefef',
    position:'relative',overflow:'hidden' }}>
    <div style={{ position:'absolute', left:(w-679*scale)/2, top:(h-1403*scale)/2,
      width:679,height:1403,transform:`scale(${scale})`, transformOrigin:'top left' }}>
      <div style={{ position:'absolute', left:9,top:2,width:660,height:1398,
        border:'8px solid #1c1c1c',borderRadius:89,background:'#fff',
        boxShadow:'inset 0 0 0 3px #777, 1px 0 0 2px #888',overflow:'hidden' }}>
        <div style={{ position:'absolute',left:0,right:0,top:0,height:27,
          background:'#fff',zIndex:3 }} />
        <div style={{ position:'absolute',left:153,top:0,width:340,height:72,
          borderRadius:'0 0 42px 42px',background:'#000',zIndex:5 }} />
        <div style={{ position:'absolute',left:0,right:0,top:0,height:105,
          background:'#fff',zIndex:2 }} />
        <div style={{ position:'absolute',left:58,top:43,zIndex:6,
          fontFamily:stack('Sofia Pro'),fontSize:23,fontWeight:700 }}>9:19</div>
        <div style={{ position:'absolute',right:28,top:43,zIndex:6,
          fontFamily:stack('Sofia Pro'),fontSize:20,fontWeight:700 }}>▮▮ 5G ▰</div>
        <div style={{ position:'absolute',left:0,right:0,top:89,bottom:90,
          overflow:'hidden',background:'#fff',fontFamily:stack('Sofia Pro'),color:'#222' }}>
          {children}
        </div>
        <div style={{ position:'absolute',left:0,right:0,bottom:0,height:87,
          background:'#fff',zIndex:4,textAlign:'center',fontFamily:stack('Sofia Pro'),
          fontSize:18,fontWeight:400,paddingTop:19,
          color:'#444' }}>♙ backcountry.com <span style={{color:'#aaa'}}>— Private</span>
          <div style={{height:6,width:168,borderRadius:4,background:'#000',margin:'21px auto 0'}} />
        </div>
      </div>
    </div>
  </div>;
}

const siteText = (size:number, weight=400, extra?:React.CSSProperties):React.CSSProperties =>
  ({fontFamily:stack('Sofia Pro'),fontSize:size,fontWeight:weight,lineHeight:1.18,...extra});

function PDP({ asset, accent }: { asset: SheetAsset; accent: string }) {
  const id = `${asset.id}/pdp`;
  const promo = promotion(asset);
  return <Phone asset={asset}>
    <div style={{height:58,display:'flex',alignItems:'center',justifyContent:'center',
      gap:22,color:'#aaa',fontSize:30}}>‹ <span style={{fontSize:27}}>● ◌ ◌ ◌ ◌</span> ›</div>
    <div style={{padding:'12px 34px'}}>
      {editable(`${id}/brand`,'Backcountry',siteText(25,400,{marginBottom:22}))}
      {editable(`${id}/title`,'Cottonwoods Gore-Tex Jacket - Women’s',
        siteText(36,700,{width:550,marginBottom:20}))}
      <div style={siteText(31,700,{marginBottom:39})}>★★★★<span style={{color:'#aaa'}}>★</span>
        <span style={siteText(26,400,{color:'#777',textDecoration:'underline',marginLeft:24})}>11 reviews</span>
      </div>
      {editable(`${id}/price`,'$449.00',siteText(36,700,{marginBottom:16}))}
      {editable(`${id}/promo`,promo,siteText(25,700,{display:'inline-block',
        background:accent,color:'#fff',padding:'11px 15px',marginBottom:36}))}
      <div style={siteText(25,400,{marginBottom:28})}><b>Color:</b> Blue Haze</div>
      <div style={{display:'flex',gap:25,marginBottom:20}}>
        {products.jackets.map((file,n)=><Media key={file} id={`${id}/product/${n}`}
          src={file} alt={`Jacket color ${n+1}`} style={{width:114,height:114,objectFit:'cover',
            border:n===0?'3px solid #333':undefined,borderRadius:4}} />)}
      </div>
      <div style={siteText(25,700,{display:'flex',justifyContent:'space-between',
        marginBottom:35})}>Size <span style={siteText(24,400,{textDecoration:'underline',color:'#666'})}>Size chart</span></div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:36}}>
        {['XS','S','M','L','XL','XXL'].map(s=><span key={s} style={siteText(27,s==='M'?700:400,
          {width:94,height:90,border:'2px solid #333',borderRadius:5,
            background:s==='M'?'#111':'#fff',color:s==='M'?'#fff':'#333',
            display:'grid',placeItems:'center'})}>{s}</span>)}
      </div>
      <div style={siteText(25,700,{marginBottom:25})}>Quantity</div>
      <div style={{display:'flex',gap:7,marginBottom:24}}>
        {['−','1','+'].map(s=><span key={s} style={siteText(28,700,{width:66,height:77,
          display:'grid',placeItems:'center',border:'2px solid #777',borderRadius:5})}>{s}</span>)}
      </div>
      {editable(`${id}/cart`,'Add to Cart',siteText(35,700,{background:'#368783',
        color:'#fff',textAlign:'center',padding:'18px 0',borderRadius:5}))}
    </div>
  </Phone>;
}

function ProductCard({ id, img, label, brand, name, price, promo, accent }: {
  id:string; img:string; label:string; brand:string; name:string; price:string;
  promo?:string; accent:string;
}) {
  return <div style={{width:290,background:'#fff',padding:'16px 13px 22px',
    minHeight:690,overflow:'hidden'}}>
    {editable(`${id}/label`,label,siteText(20,400,{display:'inline-block',
      border:'1px solid #ccc',padding:'8px 5px'}))}
    <Media id={`${id}/product/0`} src={img} alt={name}
      style={{display:'block',width:270,height:285,objectFit:'contain'}} />
    {editable(`${id}/brand`,brand,siteText(25,700,{margin:'12px 0 8px'}))}
    {editable(`${id}/name`,name,siteText(25,400,{minHeight:78}))}
    <div style={siteText(24,400,{color:'#777',margin:'5px 0 20px'})}>5 Colors</div>
    {editable(`${id}/price`,price,siteText(25,700,{marginBottom:15}))}
    {promo && editable(`${id}/promo`,promo,siteText(22,400,{color:accent,lineHeight:1.35,
      marginBottom:17}))}
    <div style={siteText(24,700)}>★★★★<span style={{color:'#aaa'}}>★</span> <span style={{fontWeight:400,color:'#777'}}>(00)</span></div>
    {editable(`${id}/cart`,'Add to Cart',siteText(35,700,{background:'#368783',
      color:'#fff',textAlign:'center',padding:'18px 0',borderRadius:5,marginTop:15}))}
  </div>;
}

function PLP({ asset, accent }: { asset: SheetAsset; accent: string }) {
  const id = `${asset.id}/plp`;
  const promo = promotion(asset);
  return <Phone asset={asset}>
    <div style={siteText(24,700,{height:60,textAlign:'center',paddingTop:5,
      borderBottom:'1px solid #bbb'})}>Men’s Rain &amp; Wind Jackets</div>
    <div style={{display:'flex',height:95,borderBottom:'2px solid #bbb',
      alignItems:'center',textAlign:'center',background:'#fff'}}>
      <div style={{flex:1,borderRight:'1px solid #bbb',padding:25,fontSize:25}}>☷ &nbsp; Filters</div>
      <div style={{flex:1,padding:25,fontSize:25}}>Sort By &nbsp;⌄</div>
    </div>
    <div style={{background:'#f3f3f3',padding:'15px 10px',display:'grid',
      gridTemplateColumns:'1fr 1fr',gap:13}}>
      <ProductCard id={`${id}/card/0`} img={products.shoes[0]} label="Curation Badge"
        brand="The North Face" name="AdventurePro Hiking Boots" price="$159.99"
        promo={promo} accent={accent} />
      <ProductCard id={`${id}/card/1`} img={products.shoes[1]} label="Curation Badge"
        brand="EcoGear" name="Unisex Trail Running Shoes" price="$129.99"
        accent={accent} />
      <ProductCard id={`${id}/card/2`} img={products.shoes[2]} label="Exclusive"
        brand="Sorel" name="Waterproof Boots" price="$189.99" accent={accent} />
      <ProductCard id={`${id}/card/3`} img={products.shoes[3]} label="Exclusive"
        brand="Sorel" name="Waterproof Boots" price="$189.99" accent={accent} />
    </div>
  </Phone>;
}

export function BadgingMock({ asset, templateId }: {
  asset: SheetAsset; templateId: string }) {
  const accent = templateId === 'sc26_0021' ? '#f14222' : green;
  return asset.format === 'pdp-badging-mock'
    ? <PDP asset={asset} accent={accent} /> : <PLP asset={asset} accent={accent} />;
}
