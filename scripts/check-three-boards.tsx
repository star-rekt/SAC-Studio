import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSheet, migrateSheet, resolveBrief, sendsOf } from '../src/sheet/build';
import { readBrief } from '../src/model/brief';
import { readSends } from '../src/model/sections';
import { compose } from '../src/model/compose';
import { TEMPLATES, templateById } from '../src/templates/registry';
import { specById } from '../src/templates/spec';
import { One } from '../src/render/One';
import { Ctx, EMPTY, FRESH_PIC, type Api } from '../src/edit/store';
import { LibraryPanel, Media, MediaControls } from '../src/edit/Media';
import { Picture, PicturePanel } from '../src/edit/Picture';
import { PositionRow, TextRow } from '../src/edit/Controls';
import type { UserMedia } from '../src/model/userMedia';
import type { AiParse } from '../src/ai/types';
import { matchImage } from '../src/model/matchImage';
import { photoFor } from '../src/model/compose';
import { PARSE } from '../server/prompts';

const preview: Api = {
  edits: EMPTY, mode: 'preview', selected: null, selectedGroup: [], library: [],
  select: () => {}, toggleGroup: () => {}, addToGroup: () => {}, setGroup: () => {}, clearGroup: () => {},
  setText: () => {}, nudge: () => {}, resize: () => {},
  setPic: () => {}, setPaint: () => {}, reset: () => {}, resetAll: () => {},
  addLibrary: async () => { throw new Error('preview is read only'); },
  retagLibrary: async () => {}, removeLibrary: async () => {},
  addGraphic: () => '', removeGraphic: () => {},
  addCustomText: () => '', removeCustomText: () => {}, setCustomBackground: () => {},
};

assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'),
  /<title>SAC Studio<\/title>/);
assert.match(readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  /<strong>SAC Studio<\/strong>/);

const brief = 'Launch: Extra 20% off select outdoor gear. Email x1. Paid Social x1. Campaign Banner x1.';
const upload: UserMedia = {
  id: 'user-00000000-0000-4000-8000-000000000000', kind: 'photo',
  name: 'Trail socks', file: 'data:image/png;base64,AAAA', vector: false,
  tags: ['trail', 'socks'], userAdded: true, addedAt: '2026-10-13T00:00:00Z',
};
const counted: AiParse = {
  name: 'BUNDLE DEALS', type: 'bump', offer: 'Buy 3+, Save an Extra 20%',
  percent: '20', code: '', noCode: true, duration: '', pursuit: '',
  categories: [], phases: [], concepts: [], sends: [{
    id: 'E1', label: 'Launch', angle: 'launch', leadOn: '', uptoPercent: '',
    showStack: false, pursuit: '', because: 'Launch email',
    copy: { headline: 'Buy 3+ Socks, Save an Extra 20%',
      body: 'Add three eligible socks and your extra 20% applies in cart.',
      subject: 'Socks are better in threes', preview: 'Save on every sock drawer', cta: 'Shop Socks' },
  }],
  assets: ['cb', 'email-hero', 'email-body', 'text-link', 'paid-social-1x1',
    'homepage-card-4x3'],
  deliverables: [
    { format: 'cb', count: 3, evidence: 'Campaign Banner x3',
      messages: ['Buy 3+ Socks, Save 20%', 'Buy 3+ Kids Items, Save 20%',
        'Buy 3+ Hats, Save 20%'] },
    { format: 'email-body', count: 3, evidence: '3x Secondaries' },
    { format: 'email-hero', count: 1, evidence: 'Email launch' },
    { format: 'text-link', count: 3, evidence: '1 text link per offer' },
    { format: 'paid-social-1x1', count: 1, evidence: 'Paid Social',
      messages: ['Trail socks'] },
    { format: 'homepage-card-4x3', count: 3, evidence: 'Homepage row — 3 cards',
      messages: ['Socks', 'Kids items', 'Hats and beanies'] },
  ],
};
const spookyBrief = `Top Brand Cards:
· The North Face – up to 50% off
· Patagonia – up to 60% off

Summary of Site Changes / Promo Overview:
SAC Bump — Spooky Good Deals: Extra 20% Off Select Gear (October 29–November 1, 2026)

Dates: October 29–November 1, 2026
Coupon Code: SPOOKY20
Creative Direction
Keep a subtle Halloween nod. Use fall or winter outdoor imagery.

Hero x1
Global Text x1
Campaign Banner x1
Email:
E1: 10/29 – Launch
· TB: Countdown Timer (simple text "Sale Starts Now" option as backup)
· Hero: Fall outdoor lifestyle with Spooky Good Deals and code SPOOKY20
· Bluecore SKUs with header and CTA
· Category Tiles: Men's Clothing, Women's Clothing, Footwear
· T&C Disclaimer
`;
const spookyRead = readBrief(spookyBrief, '', spookyBrief);
for (const field of ['dates', 'creativeDirection', 'brands', 'keyMessages', 'tb', 'designDirection',
  'eyebrow', 'marquee', 'qualifier'])
  assert.match(PARSE(spookyBrief), new RegExp(`"${field}"`),
    `Claude parse prompt does not request ${field}`);
assert.equal(spookyRead.percent, '20', 'brand-card markdown displaced the campaign extra discount');
assert.equal(spookyRead.dates, 'October 29–November 1, 2026');
assert.deepEqual(spookyRead.brands, ['The North Face', 'Patagonia']);
assert.match(spookyRead.creativeDirection || '', /Halloween nod/);
const spookySends = readSends(spookyBrief);
assert.equal(spookySends[0]?.tb, 'Sale Starts Now');
assert.deepEqual(spookySends[0]?.sections.map(section => section.kind),
  ['hero', 'productRecs', 'categoryTiles', 'terms']);
const spookyAi: AiParse = { ...counted, name: 'SPOOKY GOOD DEALS', type: 'bump',
  offer: 'EXTRA 20% OFF SELECT GEAR', percent: '20', code: 'SPOOKY20', noCode: false,
  duration: '4 DAYS ONLY', dates: 'October 29–November 1, 2026',
  creativeDirection: 'Keep a subtle Halloween nod. Use fall or winter outdoor imagery.',
  brands: ['The North Face', 'Patagonia'],
  assets: ['hero-desktop', 'gt', 'cb', 'email-hero', 'email-body'],
  deliverables: ['hero-desktop', 'gt', 'cb', 'email-hero', 'email-body']
    .map(format => ({ format, count: 1, evidence: `${format} requested` })),
  sends: [{ ...counted.sends[0], label: 'Launch', copy: undefined }],
};
for (const selected of TEMPLATES) {
  const template = templateById(selected.id);
  const outlook = specById(selected.id);
  assert.ok(template && outlook, `${selected.id}: missing registry or design spec`);
  const spooky = buildSheet(spookyBrief, selected.id, 'Spooky', undefined, spookyAi);
  const resolved = resolveBrief(spookyBrief, undefined, spookyAi);
  const spookyDoc = compose(spookyBrief, sendsOf(spooky), resolved);
  assert.equal(spookyDoc.brief.name, 'SPOOKY GOOD DEALS');
  assert.equal(spookyDoc.brief.percent, '20');
  assert.equal(spookyDoc.sends[0]?.tb, 'Sale Starts Now');
  assert.equal(spookyDoc.sends[0]?.sections.length, 4);
  assert.ok(spooky.assets.every(asset => asset.copy.offer !== '50% OFF'),
    `${selected.id}: a brand markdown became the primary offer`);
  const spookyHero = spooky.assets.find(asset => asset.format === 'email-hero')!;
  assert.equal(spookyHero.copy.dates, 'October 29–November 1, 2026',
    `${selected.id}: campaign dates were not carried into the asset copy`);
  const spookyHtml = renderToStaticMarkup(<Ctx.Provider value={preview}>
    <One asset={spookyHero} doc={spookyDoc} template={template} outlook={outlook} />
  </Ctx.Provider>);
  assert.match(spookyHtml, /20% OFF/, `${selected.id}: email lost the primary offer`);
  assert.match(spookyHtml, /SPOOKY20/, `${selected.id}: email lost the promo code`);
  assert.doesNotMatch(spookyHtml, /50% OFF/, `${selected.id}: email used brand markdown`);
  const oldSpooky = { ...spooky, v: 5, assets: spooky.assets.map(asset => ({ ...asset,
    copy: { ...asset.copy, offer: '50% OFF' } })) };
  const migrated = migrateSheet(oldSpooky);
  assert.equal(migrated.v, 8);
  assert.ok(migrated.assets.every(asset => asset.copy.offer !== '50% OFF'),
    `${selected.id}: saved campaign did not repair stale copy`);
  const migrated7 = migrateSheet({ ...spooky, v: 7,
    assets: spooky.assets.map(asset => ({ ...asset,
      copy: { ...asset.copy, dates: undefined } })),
    edits: { ...EMPTY, text: { 'E1/flash-email/cta': 'Shop selected gear' } } });
  assert.equal(migrated7.assets.find(asset => asset.format === 'email-hero')?.copy.dates,
    'October 29–November 1, 2026');
  assert.equal(migrated7.edits.text['E1/flash-email/cta'], 'Shop selected gear',
    `${selected.id}: campaign migration lost a manual text edit`);
  const fallback = buildSheet('Homepage "Bundle Deals" Row — 3 Cards (4:3 ratio)\n'
    + 'Campaign Banner x3\nPLP & PDP Badging\nRules Pages (one per offer)\n'
    + 'Email\nLifecycle Assets: 3x Text Banners, 3x Secondaries\n'
    + 'Affiliates: 1 text link per offer (3 total)\nPaid Social: 3 sets of ads and copy\n',
    selected.id);
  assert.equal(fallback.assets.filter(asset => asset.format === 'homepage-card-4x3').length, 3,
    `${selected.id}: parser fallback lost the three custom homepage cards`);
  assert.equal(fallback.assets.filter(asset => asset.format === 'hero-desktop').length, 0,
    `${selected.id}: homepage card row was misclassified as a hero`);
  for (const format of ['cb','text-banner','email-body','text-link','rules-page',
    'paid-social-1x1','paid-social-4x5','paid-social-9x16'])
    assert.equal(fallback.assets.filter(asset => asset.format === format).length, 3,
      `${selected.id}/${format}: fallback did not carry the requested count`);
  assert.equal(fallback.assets.filter(asset => asset.format === 'email-hero').length, 0,
    `${selected.id}: lifecycle secondaries became full email heroes`);
  const countedSheet = buildSheet('Campaign Banner x3. 3x Secondaries. 1 text link per offer.',
    selected.id, undefined, undefined, counted);
  for (const format of ['cb', 'email-body', 'text-link'])
    assert.equal(countedSheet.assets.filter(asset => asset.format === format).length, 3,
      `${selected.id}/${format}: Claude count not respected`);
  const custom = countedSheet.assets.filter(asset => asset.format === 'homepage-card-4x3');
  assert.equal(custom.length, 3, `${selected.id}: custom homepage count`);
  assert.ok(custom.every(asset => asset.custom && asset.size[0] / asset.size[1] === 4 / 3),
    `${selected.id}: custom cards should be separate 4:3 boards`);
  const customHtml = renderToStaticMarkup(<Ctx.Provider value={{ ...preview,
    edits: { ...EMPTY, customText: { [custom[0].id]: [{ id:'intro', text:'Type here',
      left:40, top:50, width:800, height:120 }] },
      customBackground: { [custom[0].id]: '#f0e0c0' } } }}>
    <One asset={custom[0]} doc={compose(countedSheet.brief.text, sendsOf(countedSheet))}
      template={template} outlook={outlook} />
  </Ctx.Provider>);
  assert.match(customHtml, /data-custom-board="homepage-card-4x3"/);
  assert.doesNotMatch(customHtml, /Arial/i,
    `${selected.id}: custom text used an off-brand font`);
  assert.match(customHtml, /background:#f0e0c0/);
  assert.match(customHtml, /custom-text\/intro/);
  assert.doesNotMatch(customHtml, /bump-window|autumn-ticket|flash-social-brush/,
    `${selected.id}: custom board imported unrelated template artwork`);
  assert.deepEqual(countedSheet.assets.filter(asset => asset.format === 'cb')
    .map(asset => asset.copy.body), counted.deliverables![0].messages,
    `${selected.id}: offer text not scoped to counted banners`);
  const bannerHtml = renderToStaticMarkup(<Ctx.Provider value={preview}>
    <One asset={countedSheet.assets.find(asset => asset.format === 'cb')!}
      doc={compose(countedSheet.brief.text, sendsOf(countedSheet))}
      template={template} outlook={outlook} />
  </Ctx.Provider>);
  assert.match(bannerHtml, /Buy 3\+ Socks, Save 20%/,
    `${selected.id}: banner did not render the exact brief offer`);
  assert.doesNotMatch(bannerHtml, /Select Gear|3 Days Only|Shop Flash Sale/,
    `${selected.id}: banner retained unrelated template copy`);
  const emailHero = countedSheet.assets.find(asset => asset.format === 'email-hero')!;
  const emailDoc = compose(countedSheet.brief.text, sendsOf(countedSheet));
  const emailHtml = renderToStaticMarkup(<Ctx.Provider value={preview}>
    <One asset={emailHero} doc={emailDoc} template={template} outlook={outlook} />
  </Ctx.Provider>);
  assert.match(emailHtml, /Buy 3\+ Socks, Save an Extra 20%/,
    `${selected.id}: email did not render Claude's brief headline`);
  assert.doesNotMatch(emailHtml, /Summer is not done/,
    `${selected.id}: email retained old campaign copy`);
  const social = countedSheet.assets.find(asset => asset.format === 'paid-social-1x1')!;
  assert.equal(matchImage(social, [upload]), upload.file,
    `${selected.id}: matching tagged upload not selected`);
  assert.equal(matchImage(social, []), undefined,
    `${selected.id}: unmatched library image must preserve template photo`);
  const matchedHtml = renderToStaticMarkup(<Ctx.Provider value={{ ...preview, library: [upload] }}>
    <One asset={social} doc={compose(countedSheet.brief.text, sendsOf(countedSheet))}
      template={template} outlook={outlook} />
  </Ctx.Provider>);
  assert.match(matchedHtml, /data:image\/png;base64,AAAA/,
    `${selected.id}: matched photo not rendered`);
  const squaredHtml = renderToStaticMarkup(<Ctx.Provider value={preview}>
    <One asset={social} doc={compose(countedSheet.brief.text, sendsOf(countedSheet))}
      template={template} outlook={outlook}
      formatDirections={{ 'paid-social-1x1':'b' }} />
  </Ctx.Provider>);
  assert.match(squaredHtml, /data-design-direction="b"/,
    `${selected.id}: per-format design direction not applied`);
  assert.match(squaredHtml, /border:8px solid/,
    `${selected.id}: direction did not change the visible treatment`);
  if (selected.id === 'sc26_0060') {
    assert.match(squaredHtml, /M 30 30 H 1050 V 1050 H 30 Z/,
      'Bump squared direction did not change the stepped crop');
  }
  for (const directed of [countedSheet.assets.find(asset => asset.format === 'cb')!, emailHero]) {
    const directedHtml = renderToStaticMarkup(<Ctx.Provider value={preview}>
      <One asset={directed} doc={emailDoc} template={template} outlook={outlook}
        formatDirections={{ [directed.format]:'c' }} />
    </Ctx.Provider>);
    assert.match(directedHtml, /data-design-direction="c"/,
      `${selected.id}/${directed.format}: direction did not apply to this type`);
  }
  const squareBanner = renderToStaticMarkup(<Ctx.Provider value={preview}>
    <One asset={countedSheet.assets.find(asset => asset.format === 'cb')!}
      doc={emailDoc} template={template} outlook={outlook}
      formatDirections={{ cb:'b' }} />
  </Ctx.Provider>);
  assert.match(squareBanner, /background:#101010/i,
    `${selected.id}: square banner did not adopt its ink palette`);
  const sheet = buildSheet(brief, selected.id, 'Three-board smoke test', undefined,
    undefined, { formats: template.formats.map(format => format.format) });
  const doc = compose(sheet.brief.text, sendsOf(sheet));
  const rendered = new Set<string>();
  for (const asset of sheet.assets) {
    const html = renderToStaticMarkup(
      <Ctx.Provider value={preview}>
        <One asset={asset} doc={doc} template={template} outlook={outlook} />
      </Ctx.Provider>);
    assert.ok(html.length > 50, `${selected.id}/${asset.format}: empty render`);
    assert.doesNotMatch(html, /Arial/i,
      `${selected.id}/${asset.format}: off-brand Arial in rendered asset`);
    for (const [, style] of html.matchAll(/style="([^"]+)"/g))
      assert.ok(!(/font-family:&quot;quiet-sans&quot;/i.test(style)
        && /font-weight:500(?:;|$)/.test(style)),
        `${selected.id}/${asset.format}: unavailable Quiet Sans 500`);
    rendered.add(asset.format);
  }
  for (const format of template.formats)
    assert.ok(rendered.has(format.format), `${selected.id}/${format.format}: not rendered`);
  const libraryHtml = renderToStaticMarkup(
    <Ctx.Provider value={{ ...preview, library: [upload] }}>
      <LibraryPanel selected={null} assets={sheet.assets.slice(0, 1).map(asset =>
        ({ id: asset.id, label: asset.label, size: asset.size }))} />
    </Ctx.Provider>);
  assert.match(libraryHtml, /Trail socks/);
  assert.match(libraryHtml, /trail, socks/);
  assert.equal((libraryHtml.match(/Remove upload/g) ?? []).length, 1,
    `${selected.id}: only user-added media may be removed`);
  assert.match(libraryHtml, /Add to/,
    `${selected.id}: library cannot add a graphic to the board`);
  const first = sheet.assets[0];
  const withGraphic = renderToStaticMarkup(
    <Ctx.Provider value={{ ...preview, edits: { ...EMPTY, graphics: {
      [first.id]: [{ id: 'test-graphic', src: '/graphics/bolt.svg', name: 'Bolt',
        left: 40, top: 40, width: 120, height: 120 }],
    } } }}>
      <One asset={first} doc={doc} template={template} outlook={outlook} />
    </Ctx.Provider>);
  assert.match(withGraphic, /\/graphics\/bolt\.svg/,
    `${selected.id}: added graphic is not rendered`);
  assert.match(withGraphic, /test-graphic\/mark/,
    `${selected.id}: added graphic is not an editable media slot`);
  const firstText = withGraphic.match(/class="ed[^"]*" data-id="([^"]+)"/)?.[1];
  assert.ok(firstText, `${selected.id}: no editable type to position`);
  const moved = { ...preview, edits: { ...EMPTY, move: {
    [firstText]: { dx: 17, dy: 23 },
  } } };
  const movedHtml = renderToStaticMarkup(<Ctx.Provider value={moved}>
    <One asset={first} doc={doc} template={template} outlook={outlook} />
  </Ctx.Provider>);
  assert.match(movedHtml, /translate\(17px, 23px\)/,
    `${selected.id}: text offset was not applied inside the component`);
  const controls = renderToStaticMarkup(<Ctx.Provider value={moved}>
    <PositionRow id={firstText} />
  </Ctx.Provider>);
  assert.match(controls, /X offset \(px\)/);
  assert.match(controls, /Y offset \(px\)/);
  const textControl = renderToStaticMarkup(<Ctx.Provider value={moved}>
    <TextRow id={firstText} />
  </Ctx.Provider>);
  assert.match(textControl, /<textarea/, `${selected.id}: selected text lacks a direct edit field`);
  console.log(`${selected.id}: ${rendered.size} formats rendered`);
}

const removedApi: Api = { ...preview, mode: 'edit', selected: 'test/photo', edits: {
  ...EMPTY, pic: { 'test/photo': { ...FRESH_PIC, hidden: true },
    'test/brand/0': { ...FRESH_PIC, hidden: true } },
} };
const removedPicture = renderToStaticMarkup(<Ctx.Provider value={removedApi}>
  <Picture id="test/photo" zone={photoFor('hike', 0)} initialSrc="/reference/flash-email-photo.jpg"
    style={{ width: 200, height: 100 }} />
  <PicturePanel id="test/photo" />
</Ctx.Provider>);
assert.match(removedPicture, /Image removed/);
assert.doesNotMatch(removedPicture.split('<h4>')[0], /<img/);
assert.match(removedPicture, /Restore image on this asset/);
const removedMedia = renderToStaticMarkup(<Ctx.Provider value={{ ...removedApi,
  selected: 'test/brand/0' }}>
  <Media id="test/brand/0" src="/logos/brand-patagonia.svg" style={{ width: 100, height: 50 }} />
  <MediaControls id="test/brand/0" />
</Ctx.Provider>);
assert.doesNotMatch(removedMedia, /src="\/logos\/brand-patagonia.svg"/);
assert.match(removedMedia, /Restore image on this asset/);
