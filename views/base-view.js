// views/base-view.js
// Base view class with common functionality

export class BaseView {
  constructor() {
    this.root = null;
  }

  /**
   * Renders the view into a container.
   * @param {HTMLElement} container - Container element
   * @param {Array} params - Route parameters
   */
  async render(container, params) {
    this.root = container;
    // Override in subclass
  }

  /**
   * Cleans up view resources.
   */
  destroy() {
    if (this.root) {
      this.root.innerHTML = '';
      this.root = null;
    }
  }

  /**
   * Helper: Creates an element with classes and optional text.
   * @param {string} tag - HTML tag name
   * @param {string|Array<string>} classes - Class name(s)
   * @param {string} text - Optional text content
   * @returns {HTMLElement}
   */
  createElement(tag, classes = [], text = '') {
    const el = document.createElement(tag);
    if (typeof classes === 'string') classes = [classes];
    // Filter out empty strings to avoid DOMTokenList errors
    const validClasses = classes.filter(c => c && c.trim());
    if (validClasses.length > 0) {
      el.classList.add(...validClasses);
    }
    if (text) el.textContent = text;
    return el;
  }

  /**
   * Helper: Creates a loading spinner element.
   * @returns {HTMLElement}
   */
  createLoadingSpinner() {
    const spinner = this.createElement('div', 'loading-spinner');
    spinner.innerHTML = `
      <div class="spinner"></div>
      <p>Loading data...</p>
    `;
    return spinner;
  }

  /**
   * Helper: Creates an error message element.
   * @param {string} message - Error message
   * @returns {HTMLElement}
   */
  createErrorMessage(message) {
    const error = this.createElement('div', 'error-message');
    error.innerHTML = `
      <p class="error-icon">⚠️</p>
      <p class="error-text">${message}</p>
    `;
    return error;
  }

  /**
   * Helper: Creates a polished empty state element.
   * @param {string} svgIcon - SVG string for the icon
   * @param {string} title - Heading text
   * @param {string} subtitle - Subtext description
   * @param {{label: string, href: string}|null} [cta] - Optional call-to-action button
   * @returns {HTMLElement}
   */
  createEmptyState(svgIcon, title, subtitle, cta = null) {
    const el = this.createElement('div', 'empty-state');
    el.innerHTML = `
      <div class="empty-state-icon">${svgIcon}</div>
      <h3>${title}</h3>
      <p>${subtitle}</p>
    `;
    if (cta) {
      const btn = document.createElement('a');
      btn.href = cta.href;
      btn.className = 'btn-primary';
      btn.style.cssText = 'display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1.125rem;border-radius:0.5rem;font-weight:600;font-size:0.875rem;text-decoration:none;background:var(--color-primary);color:#fff;border:1px solid var(--color-primary);';
      btn.textContent = cta.label;
      el.appendChild(btn);
    }
    return el;
  }

  /**
   * Helper: Creates a SaaS-style page header bar with title, optional subtitle, and optional actions.
   * @param {string} title
   * @param {string} [subtitle]
   * @param {HTMLElement[]} [actions] - Optional action elements (buttons, etc.)
   * @returns {HTMLElement}
   */
  createPageHeader(title, subtitle = '', actions = []) {
    const bar = document.createElement('div');
    bar.className = 'page-header-bar';

    const left = document.createElement('div');
    left.className = 'page-header-left';

    const h1 = document.createElement('h1');
    h1.className = 'page-title';
    h1.textContent = title;
    left.appendChild(h1);

    if (subtitle) {
      const sub = document.createElement('p');
      sub.className = 'page-subtitle';
      sub.textContent = subtitle;
      left.appendChild(sub);
    }

    bar.appendChild(left);

    if (actions.length > 0) {
      const right = document.createElement('div');
      right.className = 'page-header-right';
      actions.forEach(a => right.appendChild(a));
      bar.appendChild(right);
    }

    return bar;
  }

  /**
   * Helper: Creates a breadcrumb nav element.
   * @param {Array<{label: string, href?: string}>} items - Crumb items; last item is current page
   * @returns {HTMLElement}
   */
  createBreadcrumb(items) {
    const nav = document.createElement('nav');
    nav.className = 'breadcrumb';
    nav.setAttribute('aria-label', 'breadcrumb');

    const ol = document.createElement('ol');
    ol.className = 'breadcrumb-list';

    items.forEach((item, i) => {
      const li = document.createElement('li');
      const isCurrent = i === items.length - 1;
      li.className = isCurrent ? 'breadcrumb-item breadcrumb-current' : 'breadcrumb-item';
      if (isCurrent) {
        li.setAttribute('aria-current', 'page');
        li.textContent = item.label;
      } else {
        const a = document.createElement('a');
        a.href = item.href || '#';
        a.textContent = item.label;
        li.appendChild(a);
      }
      ol.appendChild(li);
    });

    nav.appendChild(ol);
    return nav;
  }
}
