/** Bump Email component - SC26_0060 Wk35-36 Bump email template.

 *  Implements the Figma design from ioB3sP8LwBiTUPQN7jlF81 node 583:3.
 *  Full email with hero, product listings, and category cards.
 */

import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import { useEdits, textOf } from '../../../edit/store';

// Brand colors from the design
const ink = '#333';
const green = '#79ac41';
const cream = '#f5ecdf';
const lightGray = '#f5f5f5';

/** Product listing component. */
function ProductListing({
  id, brand, name, salePrice, originalPrice, image, zone
}: {
  id: string; brand: string; name: string; salePrice: string; originalPrice: string; image: string; zone: ReturnType<typeof photoFor>;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 30, alignItems: 'center', justifyContent: 'center',
      width: 475,
    }}>
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '500/500',
      }}>
        <img
          src={image}
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: 25, justifyContent: 'center',
        fontFamily: stack('Quiet Sans'), fontWeight: 700,
        fontSize: 28, color: ink, textAlign: 'center',
        lineHeight: 1,
      }}>
        <Editable id={`${id}/brand`}>{brand}</Editable>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: 25, justifyContent: 'center',
        fontFamily: stack('Quiet Sans'), fontWeight: 400,
        fontSize: 28, color: ink, textAlign: 'center',
        lineHeight: 1,
      }}>
        <Editable id={`${id}/name`}>{name}</Editable>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: 25, justifyContent: 'center',
        fontFamily: stack('Quiet Sans'), fontSize: 28,
        color: ink, textAlign: 'center', lineHeight: 1,
      }}>
        <span style={{ fontWeight: 700 }}>{salePrice}</span>
        <span> </span>
        <span style={{
          fontWeight: 400, textDecoration: 'line-through',
          textDecorationSkipInk: 'none',
        }}>{originalPrice}</span>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: 25, justifyContent: 'center',
        fontFamily: stack('Quiet Sans'), fontWeight: 400,
        fontSize: 28, color: ink, textAlign: 'center',
        lineHeight: 1,
      }}>
        <Editable id={`${id}/link`} style={{ textDecoration: 'underline' }}>Shop Now</Editable>
      </div>
    </div>
  );
}

/** Category card component with discount badge. */
function CategoryCard({
  id, title, image, zone
}: {
  id: string; title: string; image: string; zone: ReturnType<typeof photoFor>;
}) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: 335,
      borderRadius: 25, overflow: 'hidden',
    }}>
      <Picture
        id={`${id}/image`}
        zone={zone}
        initialSrc={image}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
        }}
      />

      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 25,
        background: 'linear-gradient(180deg, rgba(51,51,51,0.48) 4%, rgba(51,51,51,0) 43%)',
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }} />

      {/* Category title */}
      <Editable
        id={`${id}/title`}
        style={{
          position: 'absolute', left: 37, top: 228,
          fontFamily: stack('Quiet Sans'), fontWeight: 800,
          fontSize: 84, color: '#fff',
          lineHeight: 0.9,
          textTransform: title.includes('\'S') ? undefined : 'uppercase',
        }}
      >
        {title}
      </Editable>

      {/* Arrow icon */}
      <Media
        id={`${id}/arrow`}
        src="/graphics/arrow-right.svg"
        alt="Arrow"
        style={{
          position: 'absolute', left: 993, top: 228,
          width: 96, height: 3,
        }}
      />

      {/* Discount badge */}
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
    </div>
  );
}

/** Section header component (green banner with white cutout text). */
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

      {/* Title text with white cutout effect */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -28.25px) skewX(-0.22deg)',
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
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: ink, borderRadius: 25,
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
 * Bump Email component
 *
 * Full email template with:
 * - Email meta info (sender, subject, preview)
 * - Nav header with logo
 * - Hero section with framed design
 * - "Your Top Picks" product grid
 * - "Top Categories" section
 * - Footer
 */
export function BumpEmail({ asset }: { asset: SheetAsset }) {
  const { edits } = useEdits();

  // Extract text values from edits or use defaults
  const senderName = textOf(edits, `${asset.id}/sender-name`, 'Sender Name');
  const senderCompany = textOf(edits, `${asset.id}/sender-company`, 'Steep & Cheap');
  const subject = textOf(edits, `${asset.id}/subject`, '🚨 Last day: CHILLY20 expires tonight');
  const preview = textOf(edits, `${asset.id}/preview`,
    'Final day to take an extra 20% off clothing, camp, ski & snowboard gear');

  const urgency = textOf(edits, `${asset.id}/urgency`, 'ENDS TODAY');
  const offer = textOf(edits, `${asset.id}/offer`, 'EXTRA 20% OFF');
  const code = textOf(edits, `${asset.id}/code`, 'CHILLY20');
  const bodyText = textOf(edits, `${asset.id}/body`,
    "Today's forecast: 100% chance the code expires at midnight. Use CHILLY20 for an extra 20% off fall and winter gear one last day.");

  // Product data
  const products = [
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$50', originalPrice: '$100', image: '/reference/product-1.jpg' },
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$75', originalPrice: '$150', image: '/reference/product-2.jpg' },
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$100', originalPrice: '$200', image: '/reference/product-3.jpg' },
    { brand: 'Brand Name', name: 'Product Name', salePrice: '$125', originalPrice: '$250', image: '/reference/product-4.jpg' },
  ];

  // Category data
  const categories = [
    { title: 'MEN\'S APPAREL', image: '/reference/category-mens-apparel.png' },
    { title: 'WOMEN\'S APPAREL', image: '/reference/category-womens-apparel.png' },
    { title: 'FOOTWEAR', image: '/reference/category-footwear.png' },
    { title: 'CAMP', image: '/reference/category-camp-gear.png' },
    { title: 'SKI', image: '/reference/category-climb-gear.png' },
    { title: 'SNOWBOARD', image: '/reference/category-climb-gear.png' },
  ];

  return (
    <Ground id={`${asset.id}/fill`} style={{ width: 1200 }}>
      <div style={{ width: 1200, fontFamily: stack('Quiet Sans') }}>

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
                  whiteSpace: 'nowrap',
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
                  whiteSpace: 'nowrap',
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
                  whiteSpace: 'nowrap',
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
                  whiteSpace: 'nowrap',
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
                  whiteSpace: 'nowrap',
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
            src="/logos/sac-logo-light.svg"
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
            transform: 'translateY(-5.14px)',
            display: 'flex', gap: 77,
            alignItems: 'center',
            fontFamily: stack('Quiet Sans'),
            fontWeight: 600,
            fontSize: 30,
            textTransform: 'capitalize',
            whiteSpace: 'nowrap',
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
          width: 1199, height: 1689,
          background: cream,
          overflow: 'hidden',
        }}>
          {/* Grain texture overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url('/graphics/topo-grain.png')`,
            backgroundSize: '376px 251px',
            backgroundPosition: 'top left',
            mixBlendMode: 'darken',
            opacity: 0.4,
            pointerEvents: 'none',
          }} />

          {/* Framed hero */}
          <div style={{
            position: 'absolute',
            left: '50%', top: 'calc(50% - 229.44px)',
            transform: 'translateX(-0.4px)',
            width: 1091.312, height: 1133.499,
          }}>
            <div style={{
              position: 'absolute',
              left: -0.4, top: -0.31,
              width: 1091.312, height: 1133.499,
              border: '7px solid',
              borderColor: green,
              borderRadius: 30,
              overflow: 'hidden',
              background: '#fff',
            }}>
              <Picture
                id={`${asset.id}/hero`}
                zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0)}
                initialSrc="/reference/bump-hero-framed.jpg"
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                }}
              />
            </div>
          </div>

          {/* Urgency text */}
          <Editable
            id={`${asset.id}/urgency`}
            style={{
              position: 'absolute', left: 76.4, top: 294.77,
              fontFamily: stack('Quiet Sans'), fontWeight: 800,
              fontSize: 53.553, color: green,
              letterSpacing: 5.9503,
              whiteSpace: 'nowrap',
            }}
          >
            {urgency}
          </Editable>

          {/* Offer text */}
          <Editable
            id={`${asset.id}/offer`}
            style={{
              position: 'absolute', left: 64.66, top: 373.41,
              fontFamily: stack('Quiet Sans'), fontWeight: 800,
              fontSize: 166.61, color: ink,
              letterSpacing: -1.4876,
              lineHeight: '68.37%',
              whiteSpace: 'nowrap',
            }}
          >
            {offer}
          </Editable>

          {/* Code line */}
          <div style={{
            position: 'absolute', left: 64.66, top: 647.77,
            width: 751.439,
          }}>
            <span style={{
              fontFamily: stack('Quiet Sans'), fontWeight: 400,
              fontSize: 102.973, color: ink,
              lineHeight: 1,
            }}>CODE </span>
            <span style={{
              fontFamily: stack('Quiet Sans'), fontWeight: 700,
              fontSize: 102.973, color: green,
              lineHeight: 1,
            }}>{code}</span>
          </div>

          {/* Hero CTA button */}
          <div style={{
            position: 'absolute',
            left: 76.6, top: 809.07,
            width: 482.481, height: 123.187,
            background: ink,
            borderRadius: 30.797,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Editable
              id={`${asset.id}/cta-hero`}
              style={{
                fontFamily: stack('Quiet Sans'),
                fontWeight: 700,
                fontSize: 65.7,
                color: '#fff',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
                letterSpacing: -0.657,
              }}
            >
              Shop Now
            </Editable>
          </div>

          {/* Body text */}
          <div style={{
            position: 'absolute',
            left: -1, top: 1247,
            width: 1200,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
          }}>
            <Editable
              id={`${asset.id}/body`}
              style={{
                fontFamily: stack('Quiet Sans'), fontWeight: 400,
                fontSize: 54, color: ink,
                textAlign: 'center',
                maxWidth: 1044,
                lineHeight: 1.4,
              }}
            >
              {bodyText}
            </Editable>
          </div>

          {/* Bottom CTA button */}
          <div style={{
            position: 'absolute',
            left: 359, top: 1478,
            width: 482.481, height: 123.187,
            background: ink,
            borderRadius: 30.797,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Editable
              id={`${asset.id}/cta-bottom`}
              style={{
                fontFamily: stack('Quiet Sans'),
                fontWeight: 700,
                fontSize: 65.7,
                color: '#fff',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
                letterSpacing: -0.657,
              }}
            >
              Shop Now
            </Editable>
          </div>
        </div>

        {/* "Your Top Picks" section header */}
        <SectionHeader id={`${asset.id}/products`} title="Your Top Picks" />

        {/* Product grid */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '5px 100px',
          background: '#fff',
        }}>
          <div style={{ height: 10 }} />
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            gap: '50px 100px',
            height: 1500,
            alignItems: 'center', justifyContent: 'center',
            overflow: 'clip',
            paddingTop: 5, paddingBottom: 5,
          }}>
            {products.map((product, i) => (
              <ProductListing
                key={i}
                id={`${asset.id}/product-${i}`}
                {...product}
                zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('product', i)}
              />
            ))}
          </div>
        </div>

        {/* "See More" CTA */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          height: 250, alignItems: 'center', justifyContent: 'center',
          padding: '0 100px',
          background: '#fff',
        }}>
          <CtaButton id={`${asset.id}/see-more`} text="See More" />
        </div>

        {/* "Top Categories" section header */}
        <SectionHeader id={`${asset.id}/categories`} title="Top Categories" />

        {/* Category cards */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 17, paddingLeft: 36, paddingRight: 36,
          background: '#fff',
          width: 1199,
        }}>
          <div style={{
            display: 'flex',
            flex: '1 0 0',
            flexDirection: 'column',
            gap: 32,
            alignItems: 'flex-start',
            minWidth: 0,
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
        </div>

        {/* Footer */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 460.839,
          background: lightGray,
          overflow: 'hidden',
        }}>
          <Media
            id={`${asset.id}/footer-logo`}
            src="/logos/sac-logo-light.svg"
            alt="SAC Logo"
            style={{
              position: 'absolute',
              left: 65.32, top: 46.02,
              width: 395.015, height: 179.72,
            }}
          />

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
    </Ground>
  );
}
