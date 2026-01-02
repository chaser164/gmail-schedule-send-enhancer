// Content script for Edit Scheduled Gmail extension
// This script saves the scheduled time when Cancel send is clicked,
// and injects a "Last cancelled send time" option in the date picker menu

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // MutationObserver options
    observerOptions: {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'class']
    },
    debug: true // Set to false to disable console logs
  };

  // State management
  let observer = null;

  /**
   * Debug logging helper
   */
  function log(...args) {
    if (CONFIG.debug) {
      console.log('[Edit Scheduled Gmail]', ...args);
    }
  }

  /**
   * Saves the scheduled time when Cancel send is clicked
   * @param {string} scheduledTime - The scheduled time string
   */
  function saveScheduledTime(scheduledTime) {
    chrome.storage.local.set({ 'scheduled time': scheduledTime }, () => {
      if (chrome.runtime.lastError) {
        log('Error saving scheduled time:', chrome.runtime.lastError);
      } else {
        log('Scheduled time saved:', scheduledTime);
      }
    });
  }

  /**
   * Sets up a click listener on the Cancel send button to save the scheduled time
   */
  function setupCancelButtonListener() {
    const cancelButton = findCancelSendButton();
    if (!cancelButton) {
      return;
    }

    // Check if we've already added a listener (avoid duplicates)
    if (cancelButton.dataset.scheduledTimeListener) {
      return;
    }

    cancelButton.dataset.scheduledTimeListener = 'true';
    
    // Add click listener that runs before Gmail's handler
    cancelButton.addEventListener('click', (e) => {
      log('Cancel send button clicked, saving scheduled time');
      
      // Find the scheduled time element
      const scheduledTimeElement = document.querySelector('span.g3[title]');
      if (scheduledTimeElement) {
        const scheduledTime = scheduledTimeElement.getAttribute('title');
        log('Found scheduled time:', scheduledTime);
        saveScheduledTime(scheduledTime);
      } else {
        log('Could not find scheduled time element');
      }
    }, true); // Use capture phase to run before Gmail's handler
  }

  /**
   * Finds the Cancel send button by locating the span element and returning its parent button
   * @returns {HTMLElement|null} The Cancel send button or null
   */
  function findCancelSendButton() {
    // Find the span element with the specific Gmail structure
    const cancelSpan = document.querySelector('span[jsname="V67aGc"], span.mUIrbf-anl');
    if (!cancelSpan) {
      return null;
    }

    const spanText = cancelSpan.textContent?.trim();
    if (spanText !== 'Cancel send' && !spanText.toLowerCase().includes('cancel')) {
      return null;
    }

    // Find the parent element with role="button" or a clickable parent
    let parent = cancelSpan.parentElement;
    const maxDepth = 5; // Limit search depth
    
    for (let i = 0; i < maxDepth && parent && parent !== document.body; i++) {
      const role = parent.getAttribute('role');
      const hasClickHandler = parent.onclick || parent.getAttribute('jsaction');
      
      // Return if it's a button or has click handling
      if (role === 'button' || hasClickHandler) {
        log('Found Cancel send button');
        return parent;
      }
      
      parent = parent.parentElement;
    }

    // Fallback: return the span's immediate parent if no button found
    log('No button parent found, using span parent');
    return cancelSpan.parentElement;
  }


  /**
   * Calculates tomorrow morning random time (8-9 AM)
   * Returns tomorrow 8-9 AM, or same day 8-9 AM if it's past midnight (before 8 AM)
   * @returns {Date} The calculated date with random time between 8:00 AM and 9:00 AM
   */
  function calculateTomorrowMorningRandom() {
    const now = new Date();
    const targetDate = new Date(now);
    
    // If it's past midnight but before 8 AM, use same day 8-9 AM
    // Otherwise, use tomorrow 8-9 AM
    if (now.getHours() >= 0 && now.getHours() < 8) {
      // Still early morning (past midnight), use today at 8-9 AM
      targetDate.setHours(8, 0, 0, 0);
    } else {
      // Use tomorrow at 8-9 AM
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(8, 0, 0, 0);
    }
    
    // Add random minutes between 0-60 to get a time between 8:00 AM and 9:00 AM
    const randomMinutes = Math.floor(Math.random() * 60);
    targetDate.setMinutes(randomMinutes);
    
    return targetDate;
  }

  /**
   * Formats a date for display in the menu
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string like "Jan 2, 8:34 AM"
   */
  function formatTimeForDisplay(date) {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const hours12 = date.getHours() % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    return `${month} ${day}, ${hours12}:${minutes} ${ampm}`;
  }

  /**
   * Fills in the date/time picker with a given date and clicks Schedule send
   * @param {Date} targetDate - The date/time to schedule
   */
  function fillDatePickerAndSchedule(targetDate) {
    const pickDateTimeItem = document.querySelector('.ZkmAeb[role="menu"] .AM[role="menuitem"]');
    if (!pickDateTimeItem) {
      log('Could not find "Pick date & time" item');
      return;
    }

    log('Attempting to use "Pick date & time" flow with date:', targetDate);
    
    // Click to open the date/time picker
    pickDateTimeItem.click();
    
    // Wait for the picker UI to load, then set the date and time
    const tryToSetDate = (attempt = 1, maxAttempts = 15) => {
      setTimeout(() => {
        // Find the specific date and time input fields
        const dateInput = document.querySelector('input#c5[aria-label="Date"], input[aria-label="Date"][jsname="YPqjbf"]');
        const timeInput = document.querySelector('input#c6[aria-label="Time"], input[aria-label="Time"][jsname="YPqjbf"]');
        
        log(`Attempt ${attempt}: Date input found: ${!!dateInput}, Time input found: ${!!timeInput}`);
        
        if (dateInput && timeInput) {
          try {
            // Format date: MM/DD/YYYY
            const month = String(targetDate.getMonth() + 1).padStart(2, '0');
            const day = String(targetDate.getDate()).padStart(2, '0');
            const year = targetDate.getFullYear();
            const dateStr = `${month}/${day}/${year}`;
            
            // Format time: 12-hour format with AM/PM
            const hours12 = targetDate.getHours() % 12 || 12;
            const minutes = String(targetDate.getMinutes()).padStart(2, '0');
            const ampm = targetDate.getHours() >= 12 ? 'PM' : 'AM';
            const timeStr = `${hours12}:${minutes} ${ampm}`;
            
            // Set the date input
            log('Setting date input to:', dateStr);
            dateInput.focus();
            dateInput.value = dateStr;
            dateInput.dispatchEvent(new Event('input', { bubbles: true }));
            dateInput.dispatchEvent(new Event('change', { bubbles: true }));
            dateInput.dispatchEvent(new Event('blur', { bubbles: true }));
            if (dateInput.getAttribute('jsaction')) {
              dateInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Set the time input
            setTimeout(() => {
              log('Setting time input to:', timeStr);
              timeInput.focus();
              timeInput.value = timeStr;
              timeInput.dispatchEvent(new Event('input', { bubbles: true }));
              timeInput.dispatchEvent(new Event('change', { bubbles: true }));
              timeInput.dispatchEvent(new Event('blur', { bubbles: true }));
              if (timeInput.getAttribute('jsaction')) {
                timeInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
              
              // Click Schedule send button
              setTimeout(() => {
                const scheduleButton = Array.from(document.querySelectorAll('button span[jsname="V67aGc"]')).find(span => 
                  span.textContent?.trim() === 'Schedule send'
                )?.closest('button');
                
                if (scheduleButton) {
                  log('Found Schedule send button, clicking it');
                  scheduleButton.click();
                } else {
                  log('Schedule send button not found');
                }
              }, 300);
            }, 200);
            
            return; // Success
          } catch (err) {
            log('Error setting date/time inputs:', err);
          }
        } else if (attempt < maxAttempts) {
          tryToSetDate(attempt + 1, maxAttempts);
        } else {
          log('Max attempts reached, date/time inputs not found');
        }
      }, 200 * attempt);
    };
    
    tryToSetDate();
  }

  /**
   * Injects "Last cancelled send time" option into the datetime picker menu
   */
  function injectLastCancelledTimeOption() {
    // Find the datetime picker menu first
    const datePickerMenu = document.querySelector('.ZkmAeb[role="menu"]');
    if (!datePickerMenu) {
      return; // Menu not visible
    }

    // Check if we already added the option in THIS specific menu
    // Use a data attribute on the menu itself to track injection
    // This prevents race conditions with async chrome.storage calls
    if (datePickerMenu.dataset.lastCancelledInjected === 'true' || 
        datePickerMenu.querySelector('.last-cancelled-time-option')) {
      return; // Already injected in this menu instance
    }
    
    // Set flag immediately to prevent concurrent injections
    datePickerMenu.dataset.lastCancelledInjected = 'true';

    const firstMenuItem = datePickerMenu.querySelector('.Az[role="menuitem"]');
    if (!firstMenuItem) {
      return; // No menu items to clone
    }

    // Check if we have a saved scheduled time from chrome.storage
    chrome.storage.local.get(['scheduled time'], (result) => {
      // Double-check the menu still exists and hasn't been recreated
      const currentMenu = document.querySelector('.ZkmAeb[role="menu"]');
      if (!currentMenu || currentMenu !== datePickerMenu) {
        // Menu changed, reset flag
        datePickerMenu.dataset.lastCancelledInjected = '';
        return; // Menu changed or disappeared
      }
      
      // Check again if already injected (in case another injection happened)
      if (currentMenu.querySelector('.last-cancelled-time-option')) {
        return; // Already injected
      }
      
      const savedTimeStr = result['scheduled time'];
      
      if (!savedTimeStr) {
        // Reset flag if we're not injecting
        datePickerMenu.dataset.lastCancelledInjected = '';
        return; // No saved time to inject
      }
      
      // Parse the saved time and check if it's in the future
      let savedTimeDate;
      try {
        savedTimeDate = new Date(savedTimeStr);
        if (isNaN(savedTimeDate.getTime())) {
          log('Invalid saved time format:', savedTimeStr);
          datePickerMenu.dataset.lastCancelledInjected = '';
          return;
        }
      } catch (e) {
        log('Error parsing saved time:', e);
        datePickerMenu.dataset.lastCancelledInjected = '';
        return;
      }
      
      // Check if current time is ahead of (after) the saved time
      const now = new Date();
      if (now >= savedTimeDate) {
        log('Saved time is in the past, not displaying option. Current:', now, 'Saved:', savedTimeDate);
        // Reset flag if we're not injecting
        datePickerMenu.dataset.lastCancelledInjected = '';
        return; // Don't show past times
      }
      
      // Time is in the future, inject it
      injectMenuItemWithTime(datePickerMenu, firstMenuItem, savedTimeStr);
    });
  }

  /**
   * Actually injects the menu item with the saved time
   * @param {HTMLElement} datePickerMenu - The date picker menu element
   * @param {HTMLElement} firstMenuItem - The first menu item to use as template
   * @param {string} savedTime - The saved scheduled time
   */
  function injectMenuItemWithTime(datePickerMenu, firstMenuItem, savedTime) {

    // Clone the first menu item structure DEEPLY (including all attributes and data)
    const newMenuItem = firstMenuItem.cloneNode(true);
    newMenuItem.classList.add('last-cancelled-time-option');
    
    // Copy all data attributes and properties from the original
    Array.from(firstMenuItem.attributes).forEach(attr => {
      if (!newMenuItem.hasAttribute(attr.name) || attr.name !== 'class') {
        newMenuItem.setAttribute(attr.name, attr.value);
      }
    });
    
    // Copy any data properties
    if (firstMenuItem.dataset) {
      Object.keys(firstMenuItem.dataset).forEach(key => {
        newMenuItem.dataset[key] = firstMenuItem.dataset[key];
      });
    }
    
    // Update the content
    const titleDiv = newMenuItem.querySelector('.Aj');
    const timeDiv = newMenuItem.querySelector('.Ay');
    
    if (titleDiv) {
      titleDiv.textContent = 'Last cancelled time';
    }
    if (timeDiv) {
      timeDiv.textContent = savedTime;
    }

    // Set autofocus and tabindex like the first item
    newMenuItem.setAttribute('tabindex', '0');
    newMenuItem.setAttribute('autofocus', '');

    // Remove autofocus from the first item
    if (firstMenuItem) {
      firstMenuItem.removeAttribute('autofocus');
      firstMenuItem.setAttribute('tabindex', '-1');
    }

    // First, let's spy on a real menu item to understand what happens
    if (firstMenuItem && !firstMenuItem.dataset.spied) {
      firstMenuItem.dataset.spied = 'true';
      firstMenuItem.addEventListener('click', (e) => {
        log('Real menu item clicked - inspecting event:', {
          target: e.target,
          currentTarget: e.currentTarget,
          bubbles: e.bubbles,
          cancelable: e.cancelable,
          detail: e.detail
        });
        log('Real menu item element:', firstMenuItem);
        log('Real menu item attributes:', Array.from(firstMenuItem.attributes).map(attr => `${attr.name}="${attr.value}"`));
        log('Real menu item classes:', firstMenuItem.className);
      }, true); // Use capture phase
    }

    // Add click handler to fill in the date/time picker with saved time
    newMenuItem.addEventListener('click', (e) => {
      log('Last cancelled time option clicked, time:', savedTime);
      
      // Parse the saved date
      let parsedDate;
      try {
        parsedDate = new Date(savedTime);
        if (isNaN(parsedDate.getTime())) {
          log('Failed to parse date:', savedTime);
          return;
        }
        log('Parsed date:', parsedDate);
      } catch (err) {
        log('Error parsing date:', err);
        return;
      }
      
      // Use the reusable function to fill in the date picker
      fillDatePickerAndSchedule(parsedDate);
    }, false);
    
    // Also handle mousedown - Gmail might listen to this
    newMenuItem.addEventListener('mousedown', (e) => {
      log('Last cancelled time option mousedown');
    }, false);

    // Insert after "Tomorrow morning random" if it exists, otherwise at the beginning
    const tomorrowRandomOption = datePickerMenu.querySelector('.tomorrow-morning-random-option');
    if (tomorrowRandomOption) {
      tomorrowRandomOption.insertAdjacentElement('afterend', newMenuItem);
    } else {
      datePickerMenu.insertBefore(newMenuItem, datePickerMenu.firstChild);
    }
    
    // Mark this menu as having the option injected
    datePickerMenu.dataset.lastCancelledInjected = 'true';
    
    log('Injected last cancelled send time option into date picker');
  }

  /**
   * Injects "Tomorrow morning random" option into the datetime picker menu
   */
  function injectTomorrowMorningRandomOption() {
    // Find the datetime picker menu first
    const datePickerMenu = document.querySelector('.ZkmAeb[role="menu"]');
    if (!datePickerMenu) {
      return; // Menu not visible
    }

    // Check if we already added the option in THIS specific menu
    // Use a data attribute on the menu itself to track injection
    if (datePickerMenu.dataset.tomorrowRandomInjected === 'true') {
      return; // Already injected in this menu instance
    }
    
    // Also check if the element exists (belt and suspenders)
    if (datePickerMenu.querySelector('.tomorrow-morning-random-option')) {
      datePickerMenu.dataset.tomorrowRandomInjected = 'true';
      return; // Already injected in this menu
    }

    const firstMenuItem = datePickerMenu.querySelector('.Az[role="menuitem"]');
    if (!firstMenuItem) {
      return; // No menu items to clone
    }

    // Calculate the tomorrow morning random time
    const tomorrowMorning = calculateTomorrowMorningRandom();
    const displayTime = formatTimeForDisplay(tomorrowMorning);

    // Clone the first menu item structure
    const newMenuItem = firstMenuItem.cloneNode(true);
    newMenuItem.classList.add('tomorrow-morning-random-option');
    
    // Store the current random time in data attribute
    newMenuItem.dataset.randomTime = tomorrowMorning.getTime().toString();
    
    // Copy all data attributes and properties from the original
    Array.from(firstMenuItem.attributes).forEach(attr => {
      if (!newMenuItem.hasAttribute(attr.name) || attr.name !== 'class') {
        newMenuItem.setAttribute(attr.name, attr.value);
      }
    });
    
    if (firstMenuItem.dataset) {
      Object.keys(firstMenuItem.dataset).forEach(key => {
        if (key !== 'randomTime') { // Don't overwrite our stored time
          newMenuItem.dataset[key] = firstMenuItem.dataset[key];
        }
      });
    }
    
    // Update the content
    const titleDiv = newMenuItem.querySelector('.Aj');
    const timeDiv = newMenuItem.querySelector('.Ay');
    
    if (titleDiv) {
      titleDiv.textContent = 'Tomorrow morning random';
    }
    if (timeDiv) {
      // Clear any existing content first (Gmail might have pre-populated it)
      timeDiv.textContent = '';
      
      // Create a text node container for the time (so we can update just the text)
      const timeTextNode = document.createTextNode(displayTime);
      timeDiv.appendChild(timeTextNode);
      
      // Create refresh button (positioned absolutely in the reserved space)
      const refreshBtn = document.createElement('span');
      refreshBtn.className = 'random-time-refresh-btn';
      refreshBtn.setAttribute('aria-label', 'Get new random time');
      refreshBtn.setAttribute('title', 'Get new random time');
      refreshBtn.innerHTML = '↻'; // Refresh symbol
      
      // Add click handler for refresh
      refreshBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Calculate new random time
        const newTime = calculateTomorrowMorningRandom();
        const newDisplayTime = formatTimeForDisplay(newTime);
        
        // Update stored time
        newMenuItem.dataset.randomTime = newTime.getTime().toString();
        
        // Update display - replace just the text node, not all content
        timeTextNode.textContent = newDisplayTime;
        
        log('Random time refreshed:', newDisplayTime);
      });
      
      // Append refresh button to timeDiv (will be positioned by CSS)
      timeDiv.appendChild(refreshBtn);
    }

    // Set tabindex (don't set autofocus for this one)
    newMenuItem.setAttribute('tabindex', '0');

    // Add click handler (for the menu item itself, not the refresh button)
    newMenuItem.addEventListener('click', (e) => {
      // Don't trigger if clicking the refresh button
      if (e.target.classList.contains('random-time-refresh-btn') || 
          e.target.closest('.random-time-refresh-btn')) {
        return;
      }
      
      // Get the current stored time
      const storedTime = new Date(parseInt(newMenuItem.dataset.randomTime));
      log('Tomorrow morning random option clicked, time:', formatTimeForDisplay(storedTime));
      fillDatePickerAndSchedule(storedTime);
    }, false);

    // Insert at the beginning (random option should be first)
    datePickerMenu.insertBefore(newMenuItem, datePickerMenu.firstChild);
    
    // Mark this menu as having the option injected
    datePickerMenu.dataset.tomorrowRandomInjected = 'true';
    
    log('Injected tomorrow morning random option into date picker');
  }

  /**
   * Watches for the datetime picker menu to appear and injects our options
   */
  function watchForDateTimePicker() {
    let injectionTimeout = null;
    
    const injectOptions = () => {
      // Clear any pending injection
      if (injectionTimeout) {
        clearTimeout(injectionTimeout);
      }
      
      // Debounce to prevent multiple rapid injections
      // Inject random option first so it appears above cancelled time
      injectionTimeout = setTimeout(() => {
        injectTomorrowMorningRandomOption();
        injectLastCancelledTimeOption();
      }, 100);
    };

    // Check immediately (will be debounced)
    injectOptions();

    // Also watch for it to appear dynamically
    const pickerObserver = new MutationObserver((mutations) => {
      const datePickerMenu = document.querySelector('.ZkmAeb[role="menu"]');
      if (datePickerMenu) {
        // Only inject if options don't exist
        const hasLastCancelled = datePickerMenu.querySelector('.last-cancelled-time-option');
        const hasTomorrowRandom = datePickerMenu.querySelector('.tomorrow-morning-random-option');
        
        if (!hasLastCancelled || !hasTomorrowRandom) {
          injectOptions();
        }
      }
    });

    pickerObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Checks if we're on a scheduled email page and sets up the cancel button listener
   */
  function checkAndSetupCancelButton() {
    const cancelButton = findCancelSendButton();
    if (cancelButton) {
      setupCancelButtonListener();
    }
  }

  /**
   * Initializes the extension
   */
  function init() {
    log('Extension initialized');
    
    // Wait a bit for Gmail to fully load
    setTimeout(() => {
      checkAndSetupCancelButton();
    }, 500);

    // Watch for datetime picker menu
    watchForDateTimePicker();

    // Set up MutationObserver to watch for DOM changes
    // This handles Gmail's dynamic content loading and Cancel button appearance
    observer = new MutationObserver(() => {
      // Debounce rapid DOM changes
      clearTimeout(observer.timeout);
      observer.timeout = setTimeout(() => {
        checkAndSetupCancelButton();
      }, 200);
    });

    // Start observing
    observer.observe(document.body, CONFIG.observerOptions);

    // Also listen for navigation events (Gmail uses History API)
    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(history, arguments);
      setTimeout(checkAndSetupCancelButton, 800);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
      originalReplaceState.apply(history, arguments);
      setTimeout(checkAndSetupCancelButton, 800);
    };

    window.addEventListener('popstate', () => {
      setTimeout(checkAndSetupCancelButton, 800);
    });

    // Periodic check as fallback (in case MutationObserver misses something)
    setInterval(() => {
      checkAndSetupCancelButton();
    }, 3000);
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
