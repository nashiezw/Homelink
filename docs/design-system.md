# Design System

HouseLink Zimbabwe should feel **premium, modern, trustworthy, and simple** - inspired by Airbnb, Property24, Zillow, and Booking.com, localized for Zimbabwe.

## Brand

| Token | Value | Usage |
| --- | --- | --- |
| Tagline | Find Your Next Home with Confidence. | Hero, meta, onboarding |
| Primary ink | `#102024` | Headings, body text |
| Ocean blue | `#155e75` | Primary actions, links |
| Emerald accent | `#059669` / `#10b981` | Verification badges, success |
| Mist background | `#f4f8f7` | Section backgrounds |
| Sand | `#f8f5ef` | Warm alternate sections |

Tailwind tokens are defined in `tailwind.config.ts` as `ink`, `ocean`, `mist`, and `sand`.

## Typography

- **Font**: Inter (system fallback: Segoe UI, sans-serif)
- **Scale**: Large hero headings (3xl-5xl), card titles (lg-xl), body (base), captions (sm)
- **Weight**: Semibold for headings, medium for labels, regular for body

## Layout

- **Max width**: `max-w-7xl` (1280px) for main content
- **Spacing**: Generous padding (`py-16`, `gap-6`-`gap-8`) for breathing room
- **Cards**: `rounded-2xl`, `shadow-soft`, white background
- **Images**: Large property photos, 16:10 or 4:3 aspect ratios, `object-cover`

## Components

### Buttons

- Primary: ocean background, white text, rounded-full or rounded-xl
- Secondary: white background, border, ink text
- Ghost: transparent, hover mist background

### Listing Card

- Hero image with verified badge overlay
- Price prominent (USD)
- Suburb + city, bedroom/bath count
- Amenity chips (solar, Wi-Fi, parking)
- Soft shadow on hover

### Badges

| Badge | Color | Meaning |
| --- | --- | --- |
| Verified | Emerald | Property or landlord verified |
| New | Blue | Listed within 7 days |
| Featured | Amber | Paid promotion |
| Available now | Green | Immediate move-in |

### Forms

- Visible labels (accessibility requirement)
- Large touch targets (min 44px height on mobile)
- Inline validation messages
- Search bar as primary CTA on homepage

## Dark Mode

`tailwind.config.ts` sets `darkMode: "class"`. Future implementation:

```css
.dark {
  --bg: #0f172a;
  --surface: #1e293b;
  --text: #f1f5f9;
}
```

Toggle in header; persist preference in `localStorage`. Public listing pages should default to light for photo accuracy; dashboards may respect system preference.

## Motion

- Subtle fade-in on hero content
- Card hover: `translate-y-[-2px]` + shadow increase
- Skeleton loaders for slow networks (Zimbabwe mobile)
- Avoid heavy animations; respect `prefers-reduced-motion`

## Mobile-First Rules

1. Sticky header collapses to hamburger below `md`
2. Search filters become bottom sheet on mobile
3. Map toggle: list default, map overlay on tap
4. WhatsApp and call buttons fixed at bottom of property detail
5. Images use `sizes` attribute and Cloudinary responsive transforms

## Iconography

Lucide React icons throughout. Pair icons with text labels except in compact toolbars (use `aria-label`).

## Zimbabwe UX Patterns

- **USD pricing** displayed prominently; ZWL note in footer FAQ when relevant
- **WhatsApp** as primary contact channel (green CTA)
- **Amenity chips** for solar, borehole, generator - critical local differentiators
- **CBD distance** shown in km for Harare, Bulawayo, Gweru, Mutare, Kwekwe, etc.
- **Low-bandwidth mode**: lazy images, no autoplay video, skeleton states
