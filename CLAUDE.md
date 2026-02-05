# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static website for Giulio's Pizza Restaurant in North Haven, CT. No build system, bundler, or package manager - files are plain HTML/CSS/JS served statically via GitHub Pages.

**Live site:** https://webbersaur.github.io/giulios-pizza/
**Repository:** https://github.com/webbersaur/giulios-pizza

## Development

No build commands required. Open any HTML file directly in a browser to preview.

To deploy changes: commit and push to `main` branch - GitHub Pages deploys automatically.

## Architecture

### Pages
- `index.html` - Homepage with hero, featured menu, partner links
- `menu.html` - Full menu with sticky category navigation
- `about.html` - Story, values, photo gallery (Meet Our Chefs section currently hidden)
- `catering.html` - Event types, packages, inquiry form
- `contact.html` - Contact info, Google Maps, photo gallery
- `pizza-trailer.html` - Wood-fired pizza trailer service (uses `Giulioswfpt.png` header logo)
- `mobile-bar.html` - Top Shelf Mobile Bar service

### Styling
- `css/styles.css` - All styles using CSS variables for theming
- Colors: Deep red primary (#8B0000), warm cream (#FFF8E7), gold accents (#D4AF37)
- Typography: Playfair Display for headings, system fonts for body
- Mobile-first responsive design (breakpoint: 768px)

### JavaScript
- `js/main.js` - Mobile nav toggle, smooth scroll, menu nav active states, catering form handling

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
