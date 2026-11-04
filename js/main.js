/**
 * Giulio's Pizza Restaurant - Main JavaScript
 * Mobile navigation, smooth scrolling, and form handling
 */

(function() {
  'use strict';

  // DOM Elements
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  const header = document.querySelector('.header');
  const menuNavLinks = document.querySelectorAll('.menu-nav-link');
  const cateringForm = document.getElementById('catering-form');

  /**
   * Mobile Navigation Toggle
   */
  function initMobileNav() {
    if (!navToggle || !nav) return;

    navToggle.addEventListener('click', function() {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';

      navToggle.setAttribute('aria-expanded', !isExpanded);
      navToggle.classList.toggle('active');
      nav.classList.toggle('active');
    });

    // Close mobile nav when clicking a link
    const navLinks = nav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        if (window.innerWidth < 768) {
          navToggle.setAttribute('aria-expanded', 'false');
          navToggle.classList.remove('active');
          nav.classList.remove('active');
        }
      });
    });

    // Close mobile nav when clicking outside
    document.addEventListener('click', function(e) {
      if (!nav.contains(e.target) && !navToggle.contains(e.target)) {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.classList.remove('active');
        nav.classList.remove('active');
      }
    });
  }

  /**
   * Smooth Scroll for Anchor Links
   */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');

        if (href === '#') return;

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();

        // Calculate offset for sticky header
        const headerHeight = header ? header.offsetHeight : 0;
        const menuNav = document.querySelector('.menu-nav');
        const menuNavHeight = menuNav ? menuNav.offsetHeight : 0;
        const totalOffset = headerHeight + menuNavHeight + 20;

        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - totalOffset;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      });
    });
  }

  /**
   * Menu Navigation Active State (for menu page)
   */
  function initMenuNav() {
    if (!menuNavLinks.length) return;

    const menuSections = document.querySelectorAll('.menu-section');

    function setActiveMenuLink() {
      const headerHeight = header ? header.offsetHeight : 0;
      const menuNav = document.querySelector('.menu-nav');
      const menuNavHeight = menuNav ? menuNav.offsetHeight : 0;
      const scrollPosition = window.pageYOffset + headerHeight + menuNavHeight + 50;

      menuSections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          menuNavLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + sectionId) {
              link.classList.add('active');
            }
          });
        }
      });
    }

    // Debounced scroll handler
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
      }
      scrollTimeout = window.requestAnimationFrame(setActiveMenuLink);
    });

    // Set initial active state
    setActiveMenuLink();
  }

  /**
   * Catering Form Handling
   */
  function initCateringForm() {
    if (!cateringForm) return;

    // Same clock for both reads; the server drops posts made under 3 seconds.
    const renderedAt = Date.now();
    const status = document.getElementById('catering-status');
    const button = cateringForm.querySelector('button[type="submit"]');
    const CALL_US = 'Please call us at (203) 239-3515.';

    function showStatus(msg, ok) {
      status.textContent = msg;
      status.hidden = false;
      status.style.color = ok ? '#2e7d32' : '#8B0000';
      status.style.marginTop = '1rem';
      status.style.fontWeight = '600';
    }

    cateringForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const data = {};
      new FormData(cateringForm).forEach((value, key) => { data[key] = value; });

      if (!data.name || !data.email || !data.phone) {
        showStatus('Please fill in your name, email and phone number.', false);
        return;
      }

      data._elapsed = Date.now() - renderedAt;
      button.disabled = true;
      button.textContent = 'Sending...';

      try {
        const r = await fetch('/api/contact/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const body = await r.json().catch(() => ({}));
        if (r.ok) {
          cateringForm.reset();
          showStatus('Thank you! We received your inquiry and will contact you shortly to discuss your event.', true);
          if (typeof gtag === 'function') gtag('event', 'generate_lead', { form_name: 'catering' });
        } else {
          showStatus(body.error || ('Your inquiry could not be sent. ' + CALL_US), false);
        }
      } catch (err) {
        showStatus('Your inquiry could not be sent. ' + CALL_US, false);
      } finally {
        button.disabled = false;
        button.textContent = 'Send Inquiry';
      }
    });
  }

  /**
   * Add scroll shadow to header
   */
  function initHeaderScroll() {
    if (!header) return;

    function updateHeaderShadow() {
      if (window.pageYOffset > 10) {
        header.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      } else {
        header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }
    }

    window.addEventListener('scroll', updateHeaderShadow);
    updateHeaderShadow();
  }

  /**
   * Lazy Loading for Images (native browser support fallback)
   */
  function initLazyLoading() {
    // Add loading="lazy" to images that don't have it
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
      img.setAttribute('loading', 'lazy');
    });
  }

  /**
   * Initialize all functionality
   */
  function init() {
    initMobileNav();
    initSmoothScroll();
    initMenuNav();
    initCateringForm();
    initHeaderScroll();
    initLazyLoading();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
