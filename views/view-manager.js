// views/view-manager.js
// Client-side routing and view management

import { Header } from '../components/header.js';

export class ViewManager {
  constructor() {
    this.currentView = null;
    this.viewContainer = document.getElementById('app');
    this.views = new Map();
    this.header = new Header();
  }

  /**
   * Registers a view with a route pattern.
   * @param {string} name - View name (e.g., 'draft')
   * @param {Object} viewInstance - View instance with render() and destroy() methods
   */
  registerView(name, viewInstance) {
    this.views.set(name, viewInstance);
  }

  /**
   * Initializes routing and listens to hash changes.
   */
  init() {
    window.addEventListener('hashchange', () => this.handleRouteChange());
    this.handleRouteChange(); // Initial route
  }

  /**
   * Handles route changes based on window.location.hash.
   */
  handleRouteChange() {
    const hash = window.location.hash || '#/draft';
    const [_, route, ...params] = hash.split('/');

    this.navigateTo(route, params);
  }

  /**
   * Navigates to a specific view.
   * @param {string} viewName - View name
   * @param {Array} params - Route parameters
   */
  async navigateTo(viewName, params = []) {
    // Destroy current view
    if (this.currentView) {
      this.currentView.destroy();
    }

    // Clear container
    this.viewContainer.innerHTML = '';

    // Render header
    const headerElement = this.header.render();
    this.viewContainer.appendChild(headerElement);

    // Create content container for the view
    const contentContainer = document.createElement('div');
    contentContainer.className = 'view-content';
    this.viewContainer.appendChild(contentContainer);

    // Render new view
    const view = this.views.get(viewName);
    if (!view) {
      contentContainer.innerHTML = `<div class="error-message">View not found: ${viewName}</div>`;
      return;
    }

    // Convert params array to object based on view name
    const paramsObj = this.parseParams(viewName, params);

    this.currentView = view;
    await view.render(contentContainer, paramsObj);

    // Update active nav link
    this.header.updateActiveLink();
  }

  /**
   * Converts params array to object based on view name.
   * @param {string} viewName - View name
   * @param {Array} params - Route parameters
   * @returns {Object} - Parsed parameters object
   */
  parseParams(viewName, params) {
    const paramsObj = {};

    switch (viewName) {
      case 'race':
        paramsObj.raceId = params[0];
        break;
      case 'driver':
        paramsObj.driverId = params[0];
        break;
      case 'constructor':
        paramsObj.constructorId = params[0];
        break;
      default:
        // For views without params, return empty object
        break;
    }

    return paramsObj;
  }

  /**
   * Programmatic navigation helper.
   * @param {string} hash - Hash to navigate to (e.g., '#/draft')
   */
  static navigate(hash) {
    window.location.hash = hash;
  }
}
