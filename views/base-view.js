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
   * @returns {HTMLElement}
   */
  createEmptyState(svgIcon, title, subtitle) {
    const el = this.createElement('div', 'empty-state');
    el.innerHTML = `
      <div class="empty-state-icon">${svgIcon}</div>
      <h3>${title}</h3>
      <p>${subtitle}</p>
    `;
    return el;
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
