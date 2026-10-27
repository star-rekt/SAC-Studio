/**
 * Bump Email Template - Component Index
 *
 * Exports all individual components for the bump email template
 */

export { HeaderFrame } from './538-21923-header';
export { HeroBody } from './538-21950-hero';
export { EmailHeader } from './538-21990-header';
export { BrandGrid } from './538-21993-brands';
export { ProductListings } from './538-21960-products';
export { CTAButton } from './538-21987-cta';
export { Footer } from './538-22017-footer';
export { BumpEmailTemplate } from './bump-template';

/**
 * Tailwind Utility Classes for Email Template
 *
 * These classes can be used with Tailwind CSS when building emails
 * that support Tailwind.
 */

// Header styles (538:21923)
const headerStyles = `
  w-full max-w-[1200px] mb-5
  flex items-center justify-between
  px-5
  img:max-w-[220px] img:max-h-[100px] object-contain
  nav:space-x-4
  link:text-[#333] link:text-sm link:font-medium link:decoration-none
`;

// Hero styles (538:21950)
const heroStyles = `
  w-full max-w-[1200px] px-5 mb-5
  hero-section:bg-[#f8f8f8] hero-section:rounded-xl hero-section:px-5 hero-section:py-10
  hero-title:text-2xl hero-title:text-[#333] hero-title:font-bold hero-title:leading-tight
  hero-subtitle:text-lg hero-subtitle:text-[#555] hero-subtitle:leading-relaxed
  cta-btn:display-inline-block cta-btn:bg-[#0066cc] cta-btn:text-white cta-btn:font-semibold cta-btn:px-12 cta-btn:py-4 cta-btn:rounded-lg cta-btn:text-center
`;

// Product listing styles (538:21960)
const productListStyles = `
  w-full max-w-[1200px] px-5
  grid:grid-cols-4 grid:gap-5
  product-card:flex product-card:flex-col product-card:gap-2.5 product-card:px-2.5 product-card:py-2
  product-card:rounded-lg product-card:bg-white
  product-img:aspect-square product-img:bg-[#f5f5f5] product-img:overflow-hidden
  brand-name:text-xs brand-name:text-[#666] brand-name:font-medium
  product-name:text-sm product-name:text-[#333] product-name:font-semibold product-name:line-clamp-2
  price-text:text-lg price-text:text-black price-text:font-bold
  shop-cta:text-[#0066cc] shop-cta:text-sm shop-cta:font-semibold shop-cta:text-center
`;

// Footer styles (538:22017)
const footerStyles = `
  w-full max-w-[1200px] px-5 py-10
  footer-section:bg-[#1a1a1a] footer-section:text-white footer-section:mt-auto
  footer-logo:max-w-[400px] footer-logo:max-h-[180px] footer-logo:object-contain
  social-icons:flex social-icons:space-x-4
  social-link:text-white social-link:decoration-none social-link:text-xl
  contact-cta:mr-auto contact-cta:text-[#0066cc] contact-cta:text-base contact-cta:font-medium
  unsubscribe:float-right unsubscribe:text-sm unsubscribe:text-[#999]
  address-label:float-left address-label:text-xs address-label:text-[#666]
  address-content:float-left
  copyright:float-left
`;

export { headerStyles, heroStyles, productListStyles, footerStyles };
