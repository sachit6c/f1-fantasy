// Quick qualifying data debug — call debugF1.qualifying() in browser console
window.debugF1 = {
  qualifying() {
    // dynamically import so we can use ES modules
    import('/lib/data-store.js').then(m => {
      const ds = m.dataStore;
      console.log('[debugF1] dataStore.loaded:', ds.loaded);
      console.log('[debugF1] dataStore.season:', ds.season, typeof ds.season);
      console.log('[debugF1] qualifying.length:', ds.data.qualifying.length);
      console.log('[debugF1] raceResults.length:', ds.data.raceResults.length);
      if (ds.data.qualifying.length > 0) {
        console.log('[debugF1] first qualifying entry:', ds.data.qualifying[0]);
        const russell = ds.data.qualifying.filter(q => q.driverId === 'russell');
        console.log('[debugF1] russell qualifying:', russell);
      }
    });
  },
  rosters() {
    import('/lib/draft-store.js').then(m => {
      const ds = m.draftStore;
      console.log('[debugF1] draft:', ds.draft);
      console.log('[debugF1] season:', ds.currentSeason, typeof ds.currentSeason);
      if (ds.draft) ds.draft.players.forEach(p => console.log('[debugF1]', p.name, '→', p.roster));
    });
  }
};

// Debug utility for tooltips
window.debugTooltips = {
  logAllTooltips() {
    const allTooltips = document.querySelectorAll('.stat-tooltip');
    console.log(`[DEBUG] Found ${allTooltips.length} tooltip elements in DOM`);
    
    allTooltips.forEach((tooltip, i) => {
      const computed = window.getComputedStyle(tooltip);
      console.log(`[DEBUG] Tooltip ${i}:`, {
        text: tooltip.textContent.substring(0, 30),
        display: computed.display,
        opacity: computed.opacity,
        position: computed.position,
        zIndex: computed.zIndex,
        left: tooltip.style.left,
        top: tooltip.style.top,
        width: tooltip.offsetWidth,
        height: tooltip.offsetHeight,
        visible: computed.display !== 'none' && parseInt(computed.opacity) > 0
      });
    });
  },

  highlightTooltips() {
    const allTooltips = document.querySelectorAll('.stat-tooltip');
    allTooltips.forEach((tooltip, i) => {
      if (tooltip.style.display !== 'none' && tooltip.style.opacity !== '0') {
        tooltip.style.border = '3px solid lime';
        tooltip.style.background = 'yellow';
        tooltip.style.color = '#000';
        console.log(`[DEBUG] Highlighted visible tooltip ${i}`);
      }
    });
  },

  testTooltip(index = 0) {
    const tooltip = document.querySelector('.stat-tooltip');
    if (!tooltip) {
      console.log('[DEBUG] No tooltips found');
      return;
    }

    console.log('[DEBUG] Testing first tooltip:', tooltip.textContent.substring(0, 40));
    
    // Force visible
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
    tooltip.style.left = '200px';
    tooltip.style.top = '200px';
    tooltip.style.zIndex = '999999';
    tooltip.style.border = '3px solid red';
    
    setTimeout(() => {
      this.logAllTooltips();
      this.highlightTooltips();
    }, 100);
  },

  testHover() {
    const statItems = document.querySelectorAll('.stat-item, .driver-stat-item');
    if (statItems.length === 0) {
      console.log('[DEBUG] No stat items found');
      return;
    }

    const firstItem = statItems[0];
    console.log('[DEBUG] Testing hover on first stat item');
    
    // Simulate hover
    const mouseenterEvent = new MouseEvent('mouseenter', { bubbles: true });
    mouseenterEvent.currentTarget = firstItem;
    
    // Trigger manually
    const listeners = getEventListeners(firstItem);
    console.log('[DEBUG] Event listeners on first stat item:', listeners);
    
    firstItem.dispatchEvent(mouseenterEvent);
    
    setTimeout(() => {
      this.logAllTooltips();
    }, 100);
  }
};

// Auto-log on page load
window.addEventListener('load', () => {
  setTimeout(() => {
    console.log('[DEBUG] Page loaded, checking tooltips...');
    window.debugTooltips.logAllTooltips();
  }, 500);
});

console.log('[DEBUG] Tooltip debug utility loaded. Use window.debugTooltips.testTooltip() or testHover()');
