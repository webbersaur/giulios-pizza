# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static website for Giulio's Pizza Restaurant in North Haven, CT (owner Sal Gagliardi). No build system, bundler, or package manager - plain HTML/CSS/JS. It replaces the old WordPress/Divi site on SiteGround.

**Preview (Vercel):** https://giulios-pizza.vercel.app (project `giulios-pizza`, team chris-projects-5c36607c)
**Production domain:** giuliospizza.com - DNS NOT CUT yet (still points at SiteGround 35.208.10.153). See "Launch / DNS cutover" below.
**Repository:** https://github.com/webbersaur/giulios-pizza

## Development

- `vercel dev` previews clean URLs and redirects exactly as production. `python3 -m http.server` works for pages but every asset path is root-absolute (`/images/...`), so open it at the server root.
- Deploy: **push to `main`** - the Vercel project is Git-connected and auto-deploys production. Don't follow a push with a manual deploy.
- GitHub Pages (webbersaur.github.io/giulios-pizza/) was the original preview. It now renders unstyled, because root-absolute paths don't work under the `/giulios-pizza/` subpath. Turn Pages off; don't "fix" the paths.

## Routing (vercel.json)

`cleanUrls: true` + `trailingSlash: true`, so `menu.html` is served at `/menu/`, matching the old WordPress URLs (`/menu/`, `/catering/`, `/contact/`). Internal links use the `/menu/` form. All asset paths are root-absolute, because a relative `images/x.jpg` breaks on `/menu/`.

Redirect sources must be written in normalized form, with a trailing slash. Legacy WordPress URLs:
- `/top-shelf-lounge/` -> https://topshelfct.com/ (308). **The Top Shelf Lounge Google Business Profile website link points at `giuliospizza.com/top-shelf-lounge/`**, so never remove this redirect. Better still, change that GBP's website to topshelfct.com.
- `/photo-gallery/` -> `/about/`; `/menu-test/` -> `/menu/`; WordPress junk (`/hello-world/`, `/hello-world-2/`, `/sample-page/`, `/category/uncategorized/`, `/feed/`) -> `/`.

## Catering inquiries

No form, by decision (2026-11-04): Sal doesn't check email. The catering page sends people to the phone ((203) 239-3515) and EZCater. The old WordPress form went to giuliospizza87@gmail.com and got about 1 real submission a month. Don't add a form back unless someone will actually read it.

## Business facts

- Giulio's Pizza Restaurant & Catering, 126 Middletown Ave., North Haven, CT 06473, (203) 239-3515.
- Hours (from the GBP, 2026-11-04): Sun-Thu 11 AM - 10 PM, Fri-Sat 11 AM - 11 PM. They appear in every footer, on the contact page and in the index.html schema; keep all three in sync.
- Top Shelf Lounge (same address, (203) 239-0083) has its own site, topshelfct.com (Divi on SiteGround). The homepage partner card links there.
- Email is Microsoft 365 (MX giuliospizza-com.mail.protection.outlook.com). DNS is at GoDaddy.

## Launch / DNS cutover

1. Add `giuliospizza.com` + `www` to the Vercel project; pick apex as primary (canonicals use apex).
2. At GoDaddy, change ONLY the apex A record and the `www` record. **Do not touch MX, autodiscover, or any TXT/SPF/DKIM records** - email is live on Microsoft 365.
3. Add a host-scoped redirect in vercel.json so `giulios-pizza.vercel.app` doesn't stay indexable as a duplicate:
   `{ "source": "/(.*)", "has": [{"type":"host","value":"giulios-pizza.vercel.app"}], "destination": "https://giuliospizza.com/$1", "permanent": true }`
4. Verify with `curl -o /dev/null -w '%{http_code} %{url_effective}' -L` on every old URL above, then submit sitemap.xml in Search Console.
5. Turn off GitHub Pages.

## Architecture

### Pages
- `index.html` - Homepage with hero, featured menu, partner links
- `menu.html` - Full menu with sticky category navigation
- `about.html` - Story, values, photo gallery (Meet Our Chefs section currently hidden)
- `catering.html` - Event types, packages, EZCater + call CTA (no form)
- `contact.html` - Contact info, Google Maps, photo gallery
- `pizza-trailer.html` - Wood-fired pizza trailer service (uses `Giulioswfpt.png` header logo)
- `mobile-bar.html` - Top Shelf Mobile Bar service
- `404.html` - noindex not-found page (Vercel serves it automatically)

### Styling
- `css/styles.css` - All styles using CSS variables for theming
- Colors: Deep red primary (#8B0000), warm cream (#FFF8E7), gold accents (#D4AF37)
- Typography: Playfair Display for headings, system fonts for body
- Mobile-first responsive design (breakpoint: 768px)

### JavaScript
- `js/main.js` - Mobile nav toggle, smooth scroll, menu nav active states

### Logos
- `images/giulios-web.png` - Main site header logo (all pages except pizza trailer)
- `images/Giulioswfpt.png` - Pizza trailer page header logo
- `images/giulios-pizza-logo-white.png` - Footer logo

## External Services

- **Online ordering:** Slicelife (https://slicelife.com/restaurants/ct/north-haven/06473/giulio-s-pizza-restaurant/menu)
- **Catering orders:** EZCater (https://www.ezcater.com/catering/pvt/giulios-pizza-restaurant-north-haven)
- **Pizza trailer site:** https://giuliospizzatrailer.com/

## Navigation Structure

All pages share the same nav: Home | Menu | About | Pizza Trailer | Mobile Bar | Catering | Contact

When adding/removing pages, update navigation in all HTML files (both header nav and footer links).
