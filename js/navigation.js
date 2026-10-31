/**
 * ECHOES – Navigation Module
 */

import { scrollToTop } from './utils.js';

export class Navigation {
  constructor() {
    this.nav = document.querySelector('.nav');
    this.navToggle = document.querySelector('.nav-toggle');
    this.navMobile = document.querySelector('.nav-mobile');
    this.navLinks = [...document.querySelectorAll('.nav-link[data-section]')];
    this.currentSection = 'landing';

    this.init();
  }

  init() {
    // Scroll effect
    window.addEventListener('scroll', () => {
      this.nav?.classList.toggle('scrolled', window.scrollY > 20);
    });

    // Desktop nav links
    this.navLinks.forEach(link => {
      link.addEventListener('click', () => {
        this.navigate(link.dataset.section);
        this.closeMobileNav();
      });
    });

    // Mobile toggle
    this.navToggle?.addEventListener('click', () => this.toggleMobileNav());

    // Logo → landing
    document.querySelector('.nav-logo')?.addEventListener('click', () => {
      this.navigate('landing');
    });

    // Ghost mode button
    document.querySelector('.nav-ghost-btn')?.addEventListener('click', () => {
      this.navigate('ghost');
    });
  }

  navigate(sectionId) {
    if (this.currentSection === sectionId) return;

    // Hide current section
    document.getElementById(`section-${this.currentSection}`)?.classList.remove('active');

    // Show new section
    const newSection = document.getElementById(`section-${sectionId}`);
    if (newSection) {
      newSection.classList.add('active');
      this.currentSection = sectionId;
      scrollToTop(false);

      // Update active nav link
      this.navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
      });

      // Also update mobile nav
      document.querySelectorAll('.nav-mobile .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
      });

      // Dispatch navigation event
      window.dispatchEvent(new CustomEvent('echoes:navigate', { detail: { section: sectionId } }));
    }
  }

  toggleMobileNav() {
    const isOpen = this.navMobile?.classList.toggle('open');
    this.navToggle?.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  closeMobileNav() {
    this.navMobile?.classList.remove('open');
    this.navToggle?.classList.remove('open');
    document.body.style.overflow = '';
  }

  getCurrentSection() {
    return this.currentSection;
  }
}

