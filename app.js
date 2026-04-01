// app.js - Application bootstrap

import { initTheme } from './lib/theme.js';
import { ViewManager } from './views/view-manager.js';
import { DraftView } from './views/draft-view.js';
import { TeamComparisonView } from './views/team-comparison-view.js';
import { CalendarView } from './views/calendar-view.js';
import { RaceDetailView } from './views/race-detail-view.js';
import { DriverProfileView } from './views/driver-profile-view.js';
import { ConstructorProfileView } from './views/constructor-profile-view.js';
import { DriversListView } from './views/drivers-list-view.js';
import { ConstructorsListView } from './views/constructors-list-view.js';

// Apply theme immediately at module parse time — avoids flash of wrong theme
initTheme();

async function init() {
  console.log('[App] Starting F1 Fantasy League...');

  try {
    // Initialize view manager
    const viewManager = new ViewManager();

    // Register views
    viewManager.registerView('draft', new DraftView());
    viewManager.registerView('teams', new TeamComparisonView());
    viewManager.registerView('calendar', new CalendarView());
    viewManager.registerView('race', new RaceDetailView());
    viewManager.registerView('driver', new DriverProfileView());
    viewManager.registerView('constructor', new ConstructorProfileView());
    viewManager.registerView('drivers', new DriversListView());
    viewManager.registerView('constructors', new ConstructorsListView());

    // Initialize routing
    viewManager.init();

    console.log('[App] Application initialized');

  } catch (err) {
    console.error('[App] Initialization failed:', err);

    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `
      <div class="error-message">
        <p class="error-icon">⚠️</p>
        <p class="error-text">Failed to load application: ${err.message}</p>
        <p style="margin-top: 1rem;">Check console for details.</p>
      </div>
    `;
  }
}

// Start app
init();
