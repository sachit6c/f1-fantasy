// views/view-manager.js
// Client-side routing and view management

import { Header } from '../components/header.js';
import { draftStore } from '../lib/draft-store.js';

// Seasons with local CSV data available
const FIRST_SUPPORTED_SEASON = 2000;
const LAST_SUPPORTED_SEASON = 2026;

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
    const hash = window.location.hash || '#/home';
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

    // Show coming soon page for seasons without local data
    const season = draftStore.currentSeason || LAST_SUPPORTED_SEASON;
    if (season < FIRST_SUPPORTED_SEASON || season > LAST_SUPPORTED_SEASON) {
      this.renderComingSoon(contentContainer, season);
      this.currentView = null;
      return;
    }

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

    // Render footer after view content
    this._renderFooter();

    // Update active nav link
    this.header.updateActiveLink();
  }

  /**
   * Renders a "coming soon" page for seasons without local data.
   * @param {HTMLElement} container
   * @param {number} season
   */
  renderComingSoon(container, season) {
    container.innerHTML = `
      <div class="coming-soon-page">
        <div class="coming-soon-inner">
          <div class="coming-soon-icon">🏎️</div>
          <h1 class="coming-soon-title">${season} Season</h1>
          <p class="coming-soon-message">Historical data for this season is coming soon.</p>
          <p class="coming-soon-sub">We currently have data from 2000 to 2026.<br>Select a different season to continue.</p>
          <button class="coming-soon-btn" id="coming-soon-back-btn">Back to Current Season</button>
        </div>
      </div>
    `;
    container.querySelector('#coming-soon-back-btn').addEventListener('click', () => {
      draftStore.setCurrentSeason(LAST_SUPPORTED_SEASON);
      window.location.hash = '#/home';
      this.navigateTo('home');
    });
    this._renderFooter();
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
   * Renders the app footer into the view container.
   */
  _renderFooter() {
    const existing = this.viewContainer.querySelector('.app-footer');
    if (existing) existing.remove();

    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    footer.innerHTML = `
      <div class="app-footer-left">
        <a href="#/home" class="app-footer-brand" aria-label="PitWall Home">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#E10600"/>
            <text x="16" y="22" font-family="Arial Black, Arial" font-weight="900" font-size="13" fill="white" text-anchor="middle">F1</text>
          </svg>
          PitWall
        </a>
        <span class="app-footer-copy">&copy; ${new Date().getFullYear()} PitWall Fantasy</span>
      </div>
      <div class="app-footer-right">
        <div class="app-footer-links">
          <a href="#/calendar">Calendar</a>
          <a href="#/drivers">Drivers</a>
          <a href="#/constructors">Constructors</a>
        </div>
        <span class="app-footer-meta">v2.2</span>
      </div>
    `;
    this.viewContainer.appendChild(footer);
  }

  /**
   * Programmatic navigation helper.
   * @param {string} hash - Hash to navigate to (e.g., '#/draft')
   */
  static navigate(hash) {
    window.location.hash = hash;
  }
}
