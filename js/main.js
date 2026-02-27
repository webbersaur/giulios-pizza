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

    cateringForm.addEventListener('submit', function(e) {
      e.preventDefault();

      // Collect form data
      const formData = new FormData(cateringForm);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });

      // Basic validation
      if (!data.name || !data.email || !data.phone) {
        alert('Please fill in all required fields.');
        return;
      }

      // In production, this would send to a server
      // For now, show a success message
      alert('Thank you for your inquiry! We will contact you shortly to discuss your event.');

      // Reset form
      cateringForm.reset();
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
   * Rate Us Modal
   */
  function initRateUsModal() {
    var overlay = document.getElementById('rateUsModal');
    if (!overlay) return;

    var closeBtn = document.getElementById('closeRateUsModal');
    var openBtn = document.getElementById('openRateUsModal');
    var footerBtn = document.getElementById('footerRateUsBtn');

    function openModal() {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (footerBtn) {
      footerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openModal();
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeModal();
      }
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
    initRateUsModal();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
