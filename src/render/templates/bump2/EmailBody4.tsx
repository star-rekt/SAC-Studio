/** Bump Email Body 4 component - variant with framed hero, categories, and brand cards.
 *
 * Template ID: sc26_0060 (Bump)
 * Format: email-body-4 (1200px wide)
 * Features: Hero with green-bordered frame, categories section, brand cards
 */

import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from '../../../model/textContracts';

// Constants
const ink = '#333';
const green = '#79ac41';
const bg = '#f5ecdf';
const lightGray = '#f5f5f5';
const cardBg = '#ebebeb';

/** Text styled for Figma's cap-height trimming. */
const txt = (left: number, top: number, fontSize: number,
  extra?: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', left, top,
    fontFamily: stack('Quiet Sans'), fontSize, lineHeight: 1,
    textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic', ...extra
  } as React.CSSProperties);

/** Category card component. */
function CategoryCard({
  id, title, image, hasDiscount, zone
}: {
  id: string; title: string; image: string; hasDiscount?: boolean; zone: ReturnType<typeof photoFor>;
}) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: 335,
      borderRadius: 25, overflow: 'hidden',
    }}>
      {/* Background image */}
      <Picture
        id={`${id}/image`}
        zone={zone}
        initialSrc={image}
        initialScale={1}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
        }}
      />

      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 25,
        background: 'linear-gradient(180deg, rgba(51,51,51,0.48) 10%, rgba(51,51,51,0) 40%)',
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }} />

      {/* Category title */}
      <Editable
        id={`${id}/title`}
        style={txt(37, 228, 84, {
          fontFamily: stack('Quiet Sans'),
          fontWeight: 800,
          color: '#fff',
          textTransform: title.includes('\'S') ? undefined : 'uppercase',
          lineHeight: 0.9,
        })}
      >
        {title}
      </Editable>

      {/* Discount badge */}
      {hasDiscount && (
        <>
          <div style={{
            position: 'absolute',
            left: 815.56, top: -31.58,
            width: 355.5, height: 190.456,
            transform: 'rotate(24.96deg)',
          }}>
            <div style={{
              position: 'absolute',
              width: 375.713, height: 35.229,
              background: green,
            }} />
            <div style={{
              position: 'absolute',
              left: 70.39, top: 6.16,
              width: 224.64, height: 119.453,
              transform: 'rotate(-24.96deg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Editable
                id={`${id}/discount`}
                style={{
                  fontFamily: stack('Quiet Sans'),
                  fontWeight: 800,
                  fontSize: 32.086,
                  color: '#fff',
                  textTransform: 'capitalize',
                  lineHeight: 0.9,
                  whiteSpace: 'nowrap',
                }}
              >
                EXTRA 20% OFF
              </Editable>
            </div>
          </div>

          {/* Arrow icon */}
          <Media
            id={`${id}/arrow`}
            src="/graphics/arrow-right.svg"
            alt="Arrow"
            style={{
              position: 'absolute',
              left: 993, top: 228,
              width: 96, height: 2.743,
            }}
          />
        </>
      )}
    </div>
  );
}

/** Brand card component with angled background. */
function BrandCard({
  id, brandName, logo, hasSubtitle, subtitle
}: {
  id: string; brandName: string; logo: string; hasSubtitle?: boolean; subtitle?: string;
}) {
  return (
    <div style={{
      position: 'relative',
      width: 527, height: 527,
      background: cardBg,
      borderRadius: 25,
      overflow: 'hidden',
    }}>
      {/* Angled background image */}
      <div style={{
        position: 'absolute',
        width: 3822.752, height: 1090.662,
        transform: 'rotate(-5.57deg)',
        left: -200, top: -600,
      }}>
        <img
          src="/graphics/brand-bg-texture.png"
          alt=""
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {/* Brand logo */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {hasSubtitle && (
          <div style={{
            position: 'absolute',
            bottom: '24.48%',
            left: '13.19%',
            right: '15.63%',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
            fontFamily: stack('Sofia Pro'),
            fontWeight: 500,
            fontSize: 37.43,
            color: '#fff',
            textAlign: 'center',
            lineHeight: 0.79,
            letterSpacing: '-1.68px',
          }}>
            <p>{subtitle}</p>
          </div>
        )}
        <Media
          id={`${id}/logo`}
          src={logo}
          alt={brandName}
          style={{
            width: hasSubtitle ? 350 : 400,
            height: hasSubtitle ? 80 : 100,
          }}
        />
      </div>
    </div>
  );
}

/** Section header component (green banner with white text). */
function SectionHeader({ id, title }: { id: string; title: string }) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: 140,
      background: green,
      overflow: 'hidden',
    }}>
      {/* Texture overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: 0.2, mixBlendMode: 'screen',
        backgroundImage: `url('/graphics/section-header-texture.png')`,
        backgroundSize: 'cover',
        pointerEvents: 'none',
      }} />

      {/* Title text */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: `translate(-50%, -28.25px) skewX(-0.22deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Editable
          id={`${id}/title`}
          style={{
            fontFamily: stack('Quiet Sans'),
            fontWeight: 700,
            fontSize: 85,
            color: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            backgroundImage: 'linear-gradient(to bottom, #fff, #fff)',
            textAlign: 'center',
            lineHeight: 177.663,
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Editable>
      </div>
    </div>
  );
}

/** CTA button component. */
function CtaButton({ id, text }: { id: string; text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: ink,
      borderRadius: 25,
      padding: '40px 100px',
    }}>
      <Editable
        id={`${id}/text`}
        style={{
          fontFamily: stack('Quiet Sans'),
          fontWeight: 700,
          fontSize: 50,
          color: '#fff',
          textTransform: 'capitalize',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        {text}
      </Editable>
    </div>
  );
}

/**
 * Bump Email Body 4 component
 *
 * Full email template with:
 * - Email meta info (sender, subject, preview)
 * - Nav header
 * - Hero section with green-bordered framed hero
 * - "Top Categories" section
 * - "Extra 20% Off Top Brands" section with brand cards
 * - Footer
 */
export function EmailBody4({ asset }: { asset: SheetAsset }) {
  const { edits } = useEdits();

  // Extract text values
  const senderName = textOf(edits, `${asset.id}/sender-name`, 'Sender Name');
  const senderCompany = textOf(edits, `${asset.id}/sender-company`, 'Steep & Cheap');
  const subject = textOf(edits, `${asset.id}/subject`, '⏰ Extra 20% off ends tomorrow');
  const preview = textOf(edits, `${asset.id}/preview`, 'Code CHILLY20 clocks out soon, fall gear doesn\'t wait');

  const urgency = textOf(edits, `${asset.id}/urgency`, 'ENDS TOMORROW');
  const offer = textOf(edits, `${asset.id}/offer`, 'EXTRA 20% OFF');
  const code = textOf(edits, `${asset.id}/code`, asset.copy.code ? `CODE ${asset.copy.code}` : 'CODE CHILLY20');
  const bodyText = textOf(edits, `${asset.id}/body`,
    'Temps are dropping and so are the prices. Grab clothing, camp, ski, and snowboard gear before code CHILLY20 packs up for the season.');

  // Fit text sizes
  const { fontSize: urgencyFontSize } = fitText(urgency, 'hero.urgency', { widthBudget: 400, fontMax: 48 });
  const { fontSize: offerFontSize } = fitText(offer, 'hero.title', { widthBudget: 600, fontMax: 150 });
  const { fontSize: codeFontSize } = fitText(code, 'hero.code', { widthBudget: 677, fontMax: 93 });

  // Category data
  const categories = [
    { title: 'MEN\'S APPAREL', image: '/reference/mens-apparel.jpg', hasDiscount: true },
    { title: 'WOMEN\'S APPAREL', image: '/reference/womens-apparel.jpg', hasDiscount: true },
    { title: 'FOOTWEAR', image: '/reference/footwear.jpg', hasDiscount: true },
    { title: 'CAMP', image: '/reference/camp.jpg', hasDiscount: true },
    { title: 'SKI', image: '/reference/ski.jpg', hasDiscount: true },
    { title: 'SNOWBOARD', image: '/reference/snowboard.jpg', hasDiscount: true },
  ];

  // Brand data
  const brands = [
    { name: 'Patagonia', logo: '/graphics/patagonia-white.svg', hasSubtitle: true, subtitle: 'Past season styles' },
    { name: 'Mountain Hardwear', logo: '/graphics/mountain-hardwear-white.svg' },
    { name: 'The North Face', logo: '/graphics/north-face-white.svg' },
    { name: 'Rab', logo: '/graphics/rab-white.svg' },
  ];

  return (
    <div style={{
      width: 1200,
      margin: '0 auto',
      fontFamily: stack('Quiet Sans'),
    }}>
      {/* Email meta info section */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: '50px 46px',
        background: '#fff',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 48,
        }}>
          <div>
            <Editable
              id={`${asset.id}/sender-name`}
              style={{
                fontFamily: stack('Quiet Sans'), fontWeight: 700,
                fontSize: 70, color: ink, textAlign: 'center',
                lineHeight: 88.95, letterSpacing: -0.7,
                textTransform: 'capitalize',
              }}
            >
              {senderName}
            </Editable>
            <Editable
              id={`${asset.id}/sender-company`}
              style={{
                fontFamily: stack('Quiet Sans'), fontWeight: 400,
                fontSize: 50, color: ink,
                letterSpacing: -0.5,
              }}
            >
              {senderCompany}
            </Editable>
          </div>

          <div>
            <Editable
              id={`${asset.id}/subject-label`}
              style={{
                fontFamily: stack('Quiet Sans'), fontWeight: 700,
                fontSize: 70, color: ink, textAlign: 'center',
                lineHeight: 88.95, letterSpacing: -0.7,
                textTransform: 'capitalize',
              }}
            >
              Subject Line
            </Editable>
            <Editable
              id={`${asset.id}/subject`}
              style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 400,
                fontSize: 50, color: ink,
                letterSpacing: -0.5,
              }}
            >
              {subject}
            </Editable>
          </div>

          <div>
            <Editable
              id={`${asset.id}/preview-label`}
              style={{
                fontFamily: stack('Quiet Sans'), fontWeight: 700,
                fontSize: 70, color: ink, textAlign: 'center',
                lineHeight: 88.95, letterSpacing: -0.7,
                textTransform: 'capitalize',
              }}
            >
              Preview
            </Editable>
            <Editable
              id={`${asset.id}/preview`}
              style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 400,
                fontSize: 50, color: ink,
                letterSpacing: -0.5,
                maxWidth: 1063,
              }}
            >
              {preview}
            </Editable>
          </div>
        </div>
      </div>

      {/* Nav header */}
      <div style={{
        position: 'relative',
        width: '100%', height: 170,
        background: '#fff',
      }}>
        <Media
          id={`${asset.id}/logo`}
          src="/graphics/sac-logo-light.svg"
          alt="SAC Logo"
          style={{
            position: 'absolute',
            left: 92, top: 29.86,
            width: 219.795, height: 100,
          }}
        />

        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -5.14px)',
          display: 'flex', gap: 77,
          alignItems: 'center',
          fontFamily: stack('Quiet Sans'),
          fontWeight: 600,
          fontSize: 30,
          textTransform: 'capitalize',
        }}>
          <Editable id={`${asset.id}/nav-men`} style={{ color: ink }}>men</Editable>
          <Editable id={`${asset.id}/nav-women`} style={{ color: ink }}>Women</Editable>
          <Editable id={`${asset.id}/nav-new`} style={{ color: ink }}>New Arrivals</Editable>
          <Editable id={`${asset.id}/nav-shop-all`} style={{ color: green }}>Shop All</Editable>
        </div>
      </div>

      {/* Hero section */}
      <div style={{
        position: 'relative',
        width: 1200, height: 1526,
        background: bg,
        overflow: 'hidden',
      }}>
        {/* Texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url('/graphics/bump-texture.png')`,
          backgroundSize: '785px 523.33px',
          backgroundPosition: 'top left',
          mixBlendMode: 'darken',
          opacity: 0.4,
          pointerEvents: 'none',
        }} />

        {/* Framed hero with green border */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(0.16px, -269.5px)',
          width: 1060.324, height: 873,
          border: `7px solid ${green}`,
          borderRadius: 30,
          overflow: 'hidden',
          background: '#fff',
        }}>
          {/* Background image inside frame */}
          <Picture
            id={`${asset.id}/hero-background`}
            zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0)}
            initialSrc="/reference/bump-hero-framed.jpg"
            initialScale={1}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
            }}
          />

          {/* Foreground overlay image (mask) */}
          <Picture
            id={`${asset.id}/hero-foreground`}
            zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 1)}
            initialSrc="/reference/bump-hero-mask.png"
            initialScale={1}
            style={{
              position: 'absolute',
              left: 152, top: 119,
              width: 755.5, height: 635.5,
            }}
          />

          {/* Copy block overlay */}
          <div style={{
            position: 'absolute',
            left: '50%', top: 141.5,
            transform: 'translate(-0.41px, 0)',
            width: 1060,
          }}>
            {/* Urgency */}
            <Editable
              id={`${asset.id}/urgency`}
              style={txt(0, 0, urgencyFontSize!, {
                fontFamily: stack('Quiet Sans'),
                fontWeight: 800,
                color: green,
                letterSpacing: '5.36px',
                whiteSpace: 'nowrap',
              })}
            >
              {urgency}
            </Editable>

            {/* Offer */}
            <Editable
              id={`${asset.id}/offer`}
              style={txt(530.5, 70.83, offerFontSize!, {
                fontFamily: stack('Quiet Sans'),
                fontWeight: 800,
                color: ink,
                textAlign: 'center',
                letterSpacing: '-1.34px',
                whiteSpace: 'nowrap',
                lineHeight: '68.37%',
                transform: 'translateX(-50%)',
              })}
            >
              {offer}
            </Editable>

            {/* Code */}
            <div style={{
              position: 'absolute',
              left: 192, top: 317.97,
              width: 676.859,
            }}>
              <span style={{
                fontFamily: stack('Quiet Sans'),
                fontWeight: 400,
                fontSize: codeFontSize!,
                color: ink,
                lineHeight: 1,
              }}>CODE </span>
              <span style={{
                fontFamily: stack('Quiet Sans'),
                fontWeight: 700,
                fontSize: codeFontSize!,
                color: green,
                lineHeight: 1,
              }}>CHILLY20</span>
            </div>

            {/* CTA button */}
            <div style={{
              position: 'absolute',
              left: 313, top: 463.26,
              width: 434.595, height: 110.96,
              background: ink,
              borderRadius: 27.74,
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Editable
                id={`${asset.id}/cta-hero`}
                style={{
                  fontFamily: stack('Quiet Sans'),
                  fontWeight: 700,
                  fontSize: 59.179,
                  color: '#fff',
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.59px',
                }}
              >
                Shop Now
              </Editable>
            </div>
          </div>
        </div>

        {/* Brand logos row */}
        <div style={{
          position: 'absolute',
          left: '50%', top: 964,
          transform: 'translateX(0.12px)',
          width: 1200,
        }}>
          <Media
            id={`${asset.id}/brand-sac`}
            src="/graphics/sac-logo-dark.svg"
            alt="SAC"
            style={{ position: 'absolute', inset: '63.31% 77.56% 32.18% 9.42%' }}
          />
          <Media
            id={`${asset.id}/brand-mountain`}
            src="/graphics/mountain-hardwear.svg"
            alt="Mountain Hardwear"
            style={{ position: 'absolute', left: 713.35, top: 0, width: 136.072, height: 74.43 }}
          />
          <div style={{
            position: 'absolute',
            left: 'calc(50% - 108.69px)',
            top: 'calc(50% + 247.06px)',
            transform: 'translate(-50%, -50%)',
            width: 238.076, height: 65.163,
          }}>
            <div style={{
              position: 'absolute',
              inset: '75.52% 15.63% -0.29% 13.19%',
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center',
              fontFamily: stack('Sofia Pro'),
              fontWeight: 500,
              fontSize: 9.06,
              color: ink,
              textAlign: 'center',
              lineHeight: 0.79,
              letterSpacing: '-0.41px',
            }}>
              <p>Past season styles</p>
            </div>
            <Media
              id={`${asset.id}/brand-patagonia`}
              src="/graphics/patagonia.svg"
              alt="Patagonia"
              style={{ position: 'absolute', inset: '0 3.66% 33.4% 0' }}
            />
          </div>
          <p style={{
            position: 'absolute',
            left: 1019.83, top: 23.21,
            transform: 'translateX(-50%)',
            fontFamily: stack('Quiet Sans'),
            fontWeight: 700,
            fontSize: 40.823,
            color: ink,
            textAlign: 'center',
            textTransform: 'capitalize',
            letterSpacing: '-0.41px',
          }}>
            & More
          </p>
        </div>

        {/* Body text */}
        <Editable
          id={`${asset.id}/body`}
          style={{
            position: 'absolute',
            left: 0, top: 1097.66,
            width: 1200,
            fontFamily: stack('Quiet Sans'),
            fontWeight: 400,
            fontSize: 54,
            color: ink,
            textAlign: 'center',
            lineHeight: 1.4,
            maxWidth: 1044,
            margin: '0 auto',
          }}
        >
          {bodyText}
        </Editable>

        {/* Bottom CTA button */}
        <div style={{
          position: 'absolute',
          left: '50%', top: 1319,
          transform: 'translateX(-50%)',
          width: 470, height: 120,
          background: ink,
          borderRadius: 30,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Editable
            id={`${asset.id}/cta-bottom`}
            style={{
              fontFamily: stack('Quiet Sans'),
              fontWeight: 700,
              fontSize: 64,
              color: '#fff',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.64px',
            }}
          >
            Shop Now
          </Editable>
        </div>
      </div>

      {/* "Top Categories" section header */}
      <SectionHeader id={`${asset.id}/categories`} title="Top Categories" />

      {/* Category cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        padding: '17px 36px',
        background: '#fff',
      }}>
        {categories.map((category, i) => (
          <CategoryCard
            key={i}
            id={`${asset.id}/category-${i}`}
            {...category}
            zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('category', i)}
          />
        ))}
      </div>

      {/* "Shop All" CTA */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 250,
        alignItems: 'center', justifyContent: 'center',
        padding: '0 100px',
        background: '#fff',
      }}>
        <CtaButton id={`${asset.id}/shop-all`} text="Shop All" />
      </div>

      {/* "Extra 20% Off Top Brands" section header */}
      <SectionHeader id={`${asset.id}/brands`} title="Extra 20% Off Top Brands" />

      {/* Brand cards grid */}
      <div style={{
        position: 'relative',
        width: 1200,
        height: 1196,
        background: '#fff',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 38,
          padding: '52px 48px',
        }}>
          {/* Row 1: Patagonia + Mountain Hardwear */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '527px 527px',
            columnGap: 576,
          }}>
            <BrandCard
              id={`${asset.id}/brand-0`}
              brandName="Patagonia"
              logo="/graphics/patagonia-white.svg"
              hasSubtitle
              subtitle="Past season styles"
            />
            <BrandCard
              id={`${asset.id}/brand-1`}
              brandName="Mountain Hardwear"
              logo="/graphics/mountain-hardwear-white.svg"
            />
          </div>

          {/* Row 2: The North Face + Rab */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '527px 527px',
            columnGap: 576,
          }}>
            <BrandCard
              id={`${asset.id}/brand-2`}
              brandName="The North Face"
              logo="/graphics/north-face-white.svg"
            />
            <BrandCard
              id={`${asset.id}/brand-3`}
              brandName="Rab"
              logo="/graphics/rab-white.svg"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 460.839,
        background: lightGray,
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <Media
          id={`${asset.id}/footer-logo`}
          src="/graphics/sac-logo-footer.svg"
          alt="SAC Logo"
          style={{
            position: 'absolute',
            left: 65.32, top: 46.02,
            width: 395.015, height: 179.72,
          }}
        />

        {/* Social icons */}
        <Media
          id={`${asset.id}/footer-facebook`}
          src="/graphics/facebook.svg"
          alt="Facebook"
          style={{
            position: 'absolute',
            left: 986.01, top: 45.44,
            width: 59.441, height: 59.203,
          }}
        />
        <Media
          id={`${asset.id}/footer-instagram`}
          src="/graphics/instagram.svg"
          alt="Instagram"
          style={{
            position: 'absolute',
            left: 1066.43, top: 45.32,
            width: 59.441, height: 59.441,
          }}
        />

        {/* Footer text */}
        <p style={{
          position: 'absolute',
          left: 65.04, top: 329.23,
          fontFamily: stack('Quiet Sans'),
          fontWeight: 600,
          fontSize: 25,
          color: ink,
          textTransform: 'capitalize',
          maxWidth: 611.888,
        }}>
          2607 South 3200 West, Suite A, Salt Lake City, UT
        </p>
        <p style={{
          position: 'absolute',
          left: 65.04, top: 363.5,
          fontFamily: stack('Quiet Sans'),
          fontWeight: 600,
          fontSize: 25,
          color: ink,
          maxWidth: 611.888,
        }}>
          © 2024 SteepandCheap.com. All rights reserved
        </p>
        <p style={{
          position: 'absolute',
          left: 1153.26, top: 329.23,
          transform: 'translateX(-100%)',
          fontFamily: stack('Quiet Sans'),
          fontWeight: 600,
          fontSize: 25,
          color: ink,
          textAlign: 'right',
          textDecoration: 'underline',
          textTransform: 'capitalize',
          whiteSpace: 'nowrap',
        }}>
          Unsubscribe
        </p>
        <p style={{
          position: 'absolute',
          left: 1153.05, top: 363.5,
          transform: 'translateX(-100%)',
          fontFamily: stack('Quiet Sans'),
          fontWeight: 600,
          fontSize: 25,
          color: ink,
          textAlign: 'right',
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}>
          Talk to a Gearhead
        </p>
      </div>
    </div>
  );
}
