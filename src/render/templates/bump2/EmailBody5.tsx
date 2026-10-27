/** Bump Email Body component - full email template implementing Figma design.
 *
 * Template ID: sc26_0060 (Bump)
 * Format: email-body (1200px wide)
 * Figma Source: ioB3sP8LwBiTUPQN7jlF81 node 585:14
 */

import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Picture } from '../../../edit/Picture';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import { useEdits, textOf, type Edits } from '../../../edit/store';
import { fitText } from '../../../model/textContracts';

// Brand colors from the design
const ink = '#333';
const green = '#79ac41';
const cream = '#f5ecdf';
const lightGray = '#f5f5f5';
const white = '#fff';

/** Product card component with image and details. */
function ProductCard({
  id, image, brand, name, salePrice, originalPrice, zone
}: {
  id: string; image: string; brand: string; name: string;
  salePrice: string; originalPrice: string; zone: ReturnType<typeof photoFor>;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 30,
      alignItems: 'center', justifyContent: 'center',
      width: 475, flexShrink: 0,
    }}>
      {/* Product image - 500x500 aspect ratio */}
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '1/1',
        maxWidth: 500,
      }}>
        <Picture
          id={`${id}/image`}
          zone={zone}
          initialSrc={image}
          initialScale={1}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Brand name */}
      <Editable
        id={`${id}/brand`}
        style={{
          fontFamily: stack('Quiet Sans'), fontWeight: 700,
          fontSize: 28, color: ink, textAlign: 'center',
          lineHeight: 1,
        }}
      >
        {brand}
      </Editable>

      {/* Product name */}
      <Editable
        id={`${id}/name`}
        style={{
          fontFamily: stack('Quiet Sans'), fontWeight: 400,
          fontSize: 28, color: ink, textAlign: 'center',
          lineHeight: 1,
        }}
      >
        {name}
      </Editable>

      {/* Price with strikethrough original */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        fontFamily: stack('Quiet Sans'), fontSize: 28, color: ink,
        textAlign: 'center', lineHeight: 1,
      }}>
        <span style={{ fontWeight: 700 }}>{salePrice}</span>
        <span style={{
          fontWeight: 400, textDecoration: 'line-through',
          textDecorationSkipInk: 'none',
        }}>{originalPrice}</span>
      </div>

      {/* Shop Now link */}
      <Editable
        id={`${id}/shop-link`}
        style={{
          fontFamily: stack('Quiet Sans'), fontWeight: 400,
          fontSize: 28, color: ink, textAlign: 'center',
          lineHeight: 1, textDecoration: 'underline',
        }}
      >
        Shop Now
      </Editable>
    </div>
  );
}

/** Section header banner with textured background. */
function SectionHeader({
  id, title, textureSrc
}: {
  id: string; title: string; textureSrc?: string;
}) {
  const { fontSize } = fitText(title, 'section.header', { widthBudget: 1035, fontMax: 85 });

  return (
    <div style={{
      position: 'relative', width: '100%', height: 159,
      background: white,
    }}>
      {/* Header banner with texture */}
      <div style={{
        position: 'absolute',
        left: 'calc(50% - 0.5px)', top: 'calc(50% - 9.38px)',
        transform: 'translate(-50%, -50%)',
        width: 1199, height: 140, overflow: 'hidden',
        background: green,
      }}>
        {/* Texture overlay */}
        {textureSrc && (
          <div style={{
            position: 'absolute', inset: 0,
            mixBlendMode: 'screen', opacity: 0.2, overflow: 'hidden',
          }}>
            <img
              src={textureSrc}
              alt=""
              style={{
                position: 'absolute',
                left: '2.09%', top: '-216.93%',
                width: '95.91%', height: '533.5%',
                maxWidth: 'none',
              }}
            />
          </div>
        )}

        {/* Title text with skew effect */}
        <div style={{
          position: 'absolute',
          left: 'calc(50% - 0.11px)', top: 'calc(50% - 28.25px)',
          transform: 'translate(-50%, -50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 1035,
        }}>
          <div style={{ transform: 'skewX(-0.22deg)' }}>
            <Editable
              id={`${id}/title`}
              as="p"
              style={{
                margin: 0,
                background: 'linear-gradient(to right, #fff, #fff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: stack('Quiet Sans'), fontWeight: 700,
                fontSize: fontSize || 85,
                color: 'transparent',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                lineHeight: 1.77663,
                fontFeatureSettings: '"dlig" 1',
              }}
            >
              {title}
            </Editable>
          </div>
        </div>
      </div>
    </div>
  );
}

/** CTA button component. */
function CtaButton({ id, text }: { id: string; text: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 250, alignItems: 'center', justifyContent: 'center',
      padding: '0 100px', background: white,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 100px', borderRadius: 25,
        background: ink,
      }}>
        <Editable
          id={`${id}/text`}
          style={{
            fontFamily: stack('Quiet Sans'), fontWeight: 700,
            fontSize: 50, color: white,
            textAlign: 'center', whiteSpace: 'nowrap',
            lineHeight: 1, textTransform: 'capitalize',
          }}
        >
          {text}
        </Editable>
      </div>
    </div>
  );
}

/** Footer component. */
function Footer() {
  return (
    <div style={{
      position: 'relative', width: '100%', height: 461,
      background: lightGray, overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        position: 'absolute',
        left: 65.32, top: 46.02,
        width: 395.015, height: 179.72,
      }}>
        <img
          src="/logos/sac-logo-light.svg"
          alt="Steep & Cheap"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none' }}
        />
      </div>

      {/* Social icons */}
      <div style={{
        position: 'absolute',
        left: 986.01, top: 45.44,
        width: 59.441, height: 59.203,
      }}>
        <img
          src="/graphics/facebook-logo.svg"
          alt="Facebook"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none' }}
        />
      </div>

      <div style={{
        position: 'absolute',
        left: 1066.43, top: 45.32,
        width: 59.441, height: 59.441,
      }}>
        <img
          src="/graphics/instagram-logo.svg"
          alt="Instagram"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none' }}
        />
      </div>

      {/* Footer links - right side */}
      <Editable
        id="footer/unsubscribe"
        as="p"
        style={{
          position: 'absolute',
          left: 1153.26, top: 329.23,
          transform: 'translateX(-100%)',
          fontFamily: stack('Quiet Sans'), fontWeight: 600,
          fontSize: 25, color: ink,
          textAlign: 'right', whiteSpace: 'nowrap',
          textDecoration: 'underline', textTransform: 'capitalize',
        }}
      >
        Unsubscribe
      </Editable>

      <Editable
        id="footer/gearhead"
        as="p"
        style={{
          position: 'absolute',
          left: 1153.05, top: 363.5,
          transform: 'translateX(-100%)',
          fontFamily: stack('Quiet Sans'), fontWeight: 600,
          fontSize: 25, color: ink,
          textAlign: 'right', whiteSpace: 'nowrap',
          textDecoration: 'underline',
        }}
      >
        Talk to a Gearhead
      </Editable>

      {/* Address - left side */}
      <Editable
        id="footer/address"
        as="p"
        style={{
          position: 'absolute',
          left: 65.04, top: 329.23,
          width: 611.888,
          fontFamily: stack('Quiet Sans'), fontWeight: 600,
          fontSize: 25, color: ink,
          textTransform: 'capitalize',
        }}
      >
        2607 South 3200 West, Suite A, Salt Lake City, UT
      </Editable>

      {/* Copyright */}
      <Editable
        id="footer/copyright"
        as="p"
        style={{
          position: 'absolute',
          left: 65.04, top: 363.5,
          width: 611.888,
          fontFamily: stack('Quiet Sans'), fontWeight: 600,
          fontSize: 25, color: ink,
        }}
      >
        © 2024 SteepandCheap.com. All rights reserved
      </Editable>
    </div>
  );
}

/** Hero section with outlines shader effect. */
function HeroSection({ id, asset, edits }: { id: string; asset: SheetAsset; edits: Edits }) {
  const urgency = textOf(edits, `${id}/urgency`, 'LAST CHANCE');
  const offerLead = textOf(edits, `${id}/offer-lead`, 'EXTRA');
  const offerValue = textOf(edits, `${id}/offer-value`, '20% OFF');
  const codeLabel = textOf(edits, `${id}/code-label`, 'CODE');
  const code = textOf(edits, `${id}/code`, 'CHILLY20');
  const endsText = textOf(edits, `${id}/ends`, 'ENDS TODAY');
  const cta = textOf(edits, `${id}/cta`, 'Shop Now');

  return (
    <div style={{
      position: 'relative', width: 1200, height: 1329,
      background: cream,
      backgroundImage: `
        linear-gradient(90deg, ${cream} 0%, ${cream} 100%),
        linear-gradient(90deg, #6d6d6d 0%, #6d6d6d 100%)
      `,
    }}>
      {/* Texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: cream }} />
        <img
          src="/graphics/bump-texture.png"
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            maxWidth: 'none',
            objectFit: 'cover',
            mixBlendMode: 'screen',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(/graphics/bump-texture-2.png)`,
          backgroundSize: '785.0000352859497px 523.3333568572998px',
          backgroundPosition: 'top left',
          mixBlendMode: 'darken',
          opacity: 0.32,
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(245,236,223,0.22)',
          mixBlendMode: 'multiply',
        }} />
      </div>

      {/* Urgency text - top right */}
      <Editable
        id={`${id}/urgency`}
        style={{
          position: 'absolute',
          left: 724, top: 88,
          fontFamily: stack('Quiet Sans'), fontWeight: 800,
          fontSize: 52.168, color: green,
          letterSpacing: 5.7964,
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        {urgency}
      </Editable>

      {/* CTA button */}
      <div style={{
        position: 'absolute',
        left: 644, top: 1120.6,
        width: 470, height: 120,
        background: ink, borderRadius: 30,
        overflow: 'hidden',
      }}>
        <Editable
          id={`${id}/cta`}
          style={{
            position: 'absolute',
            left: '50%', top: 39,
            transform: 'translateX(-50%)',
            fontFamily: stack('Quiet Sans'), fontWeight: 700,
            fontSize: 64, color: white,
            textAlign: 'center', whiteSpace: 'nowrap',
            letterSpacing: -0.64,
            lineHeight: 1, textTransform: 'capitalize',
          }}
        >
          {cta}
        </Editable>
      </div>

      {/* Main copy block - left side */}
      <div style={{ position: 'absolute', left: 83, top: 353 }}>
        {/* ENDS TODAY */}
        <Editable
          id={`${id}/ends`}
          style={{
            position: 'absolute',
            left: 83, top: 736,
            fontFamily: stack('Quiet Sans'), fontWeight: 800,
            fontSize: 52.168, color: ink,
            letterSpacing: 5.7964,
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          {endsText}
        </Editable>

        {/* EXTRA 20% OFF */}
        <Editable
          id={`${id}/offer`}
          style={{
            position: 'absolute',
            left: 83, top: 353,
            fontFamily: stack('Quiet Sans'), fontWeight: 800,
            fontSize: 162.3, color: ink,
            letterSpacing: -1.4491,
            whiteSpace: 'nowrap',
            lineHeight: 0.6837,
          }}
        >
          {`${offerLead}\n${offerValue}`}
        </Editable>

        {/* CODE CHILLY20 */}
        <div style={{
          position: 'absolute',
          left: 83, top: 620.27,
          width: 732,
          fontFamily: stack('Quiet Sans'), fontSize: 100.309,
          color: ink, lineHeight: 1,
        }}>
          <span style={{ fontWeight: 400 }}>{codeLabel} </span>
          <span style={{ fontWeight: 700, color: green }}>{code}</span>
        </div>
      </div>

      {/* Outlines effect - applied over the hero content */}
      <div style={{
        position: 'absolute',
        left: 57, top: 57,
        width: 1086.5, height: 1215,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
        opacity: 0.8,
      }}>
        <svg
          viewBox="0 0 1086 1215"
          style={{ width: '100%', height: '100%', maxWidth: 'none' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="outlineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={green} />
              <stop offset="100%" stopColor="#f2d9a4" />
            </linearGradient>
          </defs>
          {/* Decorative outline paths representing the outline effect */}
          <path
            d="M 100 100 L 986 100 L 986 1115 L 100 1115 Z"
            fill="none"
            stroke="url(#outlineGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
          <path
            d="M 150 150 L 936 150 L 936 1065 L 150 1065 Z"
            fill="none"
            stroke="url(#outlineGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
          <path
            d="M 200 200 L 886 200 L 886 1015 L 200 1015 Z"
            fill="none"
            stroke="url(#outlineGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
}

/** Header with navigation links. */
function EmailHeader() {
  return (
    <div style={{
      position: 'relative', width: '100%', height: 170,
      background: white,
    }}>
      {/* Navigation links - centered */}
      <div style={{
        position: 'absolute',
        left: '50%', top: 'calc(50% - 5.14px)',
        transform: 'translate(-50%, -50%)',
        display: 'flex', gap: 77, alignItems: 'center',
        fontFamily: stack('Quiet Sans'), fontWeight: 600,
        fontSize: 30, color: ink,
        whiteSpace: 'nowrap', lineHeight: 1,
      }}>
        <span style={{ color: ink }}>Men</span>
        <span style={{ color: ink }}>Women</span>
        <span style={{ color: ink }}>New Arrivals</span>
        <span style={{ color: green }}>Shop All</span>
      </div>

      {/* Logo */}
      <div style={{
        position: 'absolute',
        left: 92, top: 29.86,
        width: 219.795, height: 100,
      }}>
        <img
          src="/logos/sac-logo.svg"
          alt="Steep & Cheap"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none' }}
        />
      </div>
    </div>
  );
}

/** Preview text section at the top. */
function PreviewSection({ asset, edits }: { asset: SheetAsset; edits: Edits }) {
  const senderName = textOf(edits, 'preview/sender', 'Sender Name');
  const senderLine = textOf(edits, 'preview/sender-line', 'Steep & Cheap');
  const subject = textOf(edits, 'preview/subject', 'Subject Line');
  const subjectText = textOf(edits, 'preview/subject-text', '🔥 Final hours: extra 20% off');
  const preview = textOf(edits, 'preview/label', 'Preview');
  const previewText = textOf(edits, 'preview/text', 'Code CHILLY20 clocks out tonight');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '50px 46px',
      background: white,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 48,
        alignItems: 'flex-start',
      }}>
        {/* Sender Name */}
        <Editable
          id="preview/sender"
          style={{
            fontFamily: stack('Quiet Sans'), fontWeight: 700,
            fontSize: 70, color: ink,
            textAlign: 'center', whiteSpace: 'nowrap',
            letterSpacing: -0.7, lineHeight: 1.27,
            textTransform: 'capitalize',
          }}
        >
          {senderName}
        </Editable>

        {/* Sender Line */}
        <Editable
          id="preview/sender-line"
          style={{
            fontFamily: stack('Quiet Sans'), fontWeight: 400,
            fontSize: 50, color: ink,
            whiteSpace: 'nowrap', letterSpacing: -0.5,
          }}
        >
          {senderLine}
        </Editable>

        {/* Subject Line */}
        <Editable
          id="preview/subject"
          style={{
            fontFamily: stack('Quiet Sans'), fontWeight: 700,
            fontSize: 70, color: ink,
            textAlign: 'center', whiteSpace: 'nowrap',
            letterSpacing: -0.7, lineHeight: 1.27,
            textTransform: 'capitalize',
          }}
        >
          {subject}
        </Editable>

        {/* Subject Text */}
        <Editable
          id="preview/subject-text"
          style={{
            fontFamily: stack('Inter'), fontWeight: 400,
            fontSize: 50, color: ink,
            whiteSpace: 'nowrap', letterSpacing: -0.5,
          }}
        >
          {subjectText}
        </Editable>

        {/* Preview Label */}
        <Editable
          id="preview/label"
          style={{
            fontFamily: stack('Quiet Sans'), fontWeight: 700,
            fontSize: 70, color: ink,
            textAlign: 'center', whiteSpace: 'nowrap',
            letterSpacing: -0.7, lineHeight: 1.27,
            textTransform: 'capitalize',
          }}
        >
          {preview}
        </Editable>

        {/* Preview Text */}
        <Editable
          id="preview/text"
          style={{
            fontFamily: stack('Quiet Sans'), fontWeight: 400,
            fontSize: 50, color: ink,
            width: 1063, letterSpacing: -0.5,
          }}
        >
          {previewText}
        </Editable>
      </div>
    </div>
  );
}

/** Main Bump Email component. */
export function EmailBody5({ asset }: { asset: SheetAsset }) {
  const { edits } = useEdits();
  const id = asset.id;

  // Product data for top picks section
  const topPicks = [
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$Sale Price', originalPrice: '$Original Price', image: '/reference/bump-product-1.jpg' },
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$Sale Price', originalPrice: '$Original Price', image: '/reference/bump-product-2.jpg' },
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$Sale Price', originalPrice: '$Original Price', image: '/reference/bump-product-3.jpg' },
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$Sale Price', originalPrice: '$Original Price', image: '/reference/bump-product-4.jpg' },
  ];

  // Product data for bestsellers section
  const bestsellers = [
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$Sale Price', originalPrice: '$Original Price', image: '/reference/bump-product-1.jpg' },
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$Sale Price', originalPrice: '$Original Price', image: '/reference/bump-product-2.jpg' },
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$Sale Price', originalPrice: '$Original Price', image: '/reference/bump-product-3.jpg' },
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$Sale Price', originalPrice: '$Original Price', image: '/reference/bump-product-4.jpg' },
  ];

  return (
    <Ground
      id={`${id}/fill`}
      className="sheet"
      style={{
        width: 1200,
        display: 'flex',
        flexDirection: 'column',
        background: white,
      }}
    >
      {/* Preview section */}
      <PreviewSection asset={asset} edits={edits} />

      {/* Email header with nav */}
      <EmailHeader />

      {/* Hero section */}
      <HeroSection id={id} asset={asset} edits={edits} />

      {/* Top Picks section */}
      <SectionHeader id={`${id}/top-picks`} title="Extra 20% Off Your Top Picks" textureSrc="/graphics/texture.png" />

      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 100px', background: white,
      }}>
        {/* Spacer */}
        <div style={{ width: '100%', height: 10 }} />

        {/* Product grid */}
        <div style={{
          display: 'flex', flexWrap: 'wrap',
          gap: '100px 50px', alignItems: 'center', justifyContent: 'center',
          padding: '5px 0', overflow: 'clip',
        }}>
          {topPicks.map((product, i) => (
            <ProductCard
              key={i}
              id={`${id}/top-picks/${i}`}
              image={product.image}
              brand={product.brand}
              name={product.name}
              salePrice={product.salePrice}
              originalPrice={product.originalPrice}
              zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', i)}
            />
          ))}
        </div>
      </div>

      {/* CTA */}
      <CtaButton id={`${id}/cta-1`} text="See More" />

      {/* Bestsellers section */}
      <SectionHeader id={`${id}/bestsellers`} title="Extra 20% Off Bestsellers" textureSrc="/graphics/texture.png" />

      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 100px', background: white,
      }}>
        {/* Spacer */}
        <div style={{ width: '100%', height: 10 }} />

        {/* Product grid */}
        <div style={{
          display: 'flex', flexWrap: 'wrap',
          gap: '100px 50px', alignItems: 'center', justifyContent: 'center',
          padding: '5px 0', overflow: 'clip',
        }}>
          {bestsellers.map((product, i) => (
            <ProductCard
              key={i}
              id={`${id}/bestsellers/${i}`}
              image={product.image}
              brand={product.brand}
              name={product.name}
              salePrice={product.salePrice}
              originalPrice={product.originalPrice}
              zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', i + 4)}
            />
          ))}
        </div>
      </div>

      {/* CTA */}
      <CtaButton id={`${id}/cta-2`} text="See More" />

      {/* Footer */}
      <Footer />
    </Ground>
  );
}
