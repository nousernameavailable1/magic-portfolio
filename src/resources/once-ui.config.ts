import type {
  DataStyleConfig,
  DisplayConfig,
  EffectsConfig,
  FontsConfig,
  RoutesConfig,
  SocialSharingConfig,
  StyleConfig,
} from "@/types";

// IMPORTANT: Replace with your own domain address - it's used for SEO in meta tags and schema
const baseURL = "https://talal.kadli.org";

const routes: RoutesConfig = {
  "/": true,
  "/about": true,
  "/projects": true,
  "/blog": true,
  "/notes": true,
  "/gallery": true,
  "/wall": true,
  "/jumpscare": true,
  "/rickroll": true,
  "/terminal": true,
  "/statistics": true,
};

const display: DisplayConfig = {
  location: true,
  time: true,
  themeSwitcher: true,
};

// Keep the existing font families available without network access during builds.
import localFont from "next/font/local";

const heading = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-heading",
  weight: "100 900",
  display: "swap",
});

const body = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-body",
  weight: "100 900",
  display: "swap",
});

const label = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-label",
  weight: "100 900",
  display: "swap",
});

const code = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-code",
  weight: "100 900",
  display: "swap",
});

const fonts: FontsConfig = {
  heading: heading,
  body: body,
  label: label,
  code: code,
};

// default customization applied to the HTML in the main layout.tsx
const style: StyleConfig = {
  theme: "system", // dark | light | system
  neutral: "gray", // sand | gray | slate | mint | rose | dusk | custom
  brand: "cyan", // blue | indigo | violet | magenta | pink | red | orange | yellow | moss | green | emerald | aqua | cyan | custom
  accent: "red", // blue | indigo | violet | magenta | pink | red | orange | yellow | moss | green | emerald | aqua | cyan | custom
  solid: "contrast", // color | contrast
  solidStyle: "flat", // flat | plastic
  border: "playful", // rounded | playful | conservative | sharp
  surface: "translucent", // filled | translucent
  transition: "all", // all | micro | macro
  scaling: "100", // 90 | 95 | 100 | 105 | 110
};

const dataStyle: DataStyleConfig = {
  variant: "gradient", // flat | gradient | outline
  mode: "categorical", // categorical | divergent | sequential
  height: 24, // default chart height
  axis: {
    stroke: "var(--neutral-alpha-weak)",
  },
  tick: {
    fill: "var(--neutral-on-background-weak)",
    fontSize: 11,
    line: false,
  },
};

const effects: EffectsConfig = {
  mask: {
    cursor: false,
    x: 50,
    y: 0,
    radius: 100,
  },
  gradient: {
    display: false,
    opacity: 100,
    x: 50,
    y: 60,
    width: 100,
    height: 50,
    tilt: 0,
    colorStart: "accent-background-strong",
    colorEnd: "page-background",
  },
  dots: {
    display: true,
    opacity: 40,
    size: "2",
    color: "brand-background-strong",
  },
  grid: {
    display: false,
    opacity: 100,
    color: "neutral-alpha-medium",
    width: "0.25rem",
    height: "0.25rem",
  },
  lines: {
    display: false,
    opacity: 100,
    color: "neutral-alpha-weak",
    size: "16",
    thickness: 1,
    angle: 45,
  },
};

// Sharing buttons shown below blog posts.
const socialSharing: SocialSharingConfig = {
  display: true,
  platforms: {
    x: true,
    linkedin: true,
    facebook: false,
    pinterest: false,
    whatsapp: false,
    reddit: false,
    telegram: false,
    email: true,
    copyLink: true,
  },
};

export { display, routes, baseURL, fonts, style, socialSharing, effects, dataStyle };
