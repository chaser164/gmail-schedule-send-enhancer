// Content script for Edit Scheduled Gmail extension
// This script injects custom options into Gmail's schedule send date picker menu

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
    }
  };

  // State management
  let observer = null;

  /**
   * Simple click listener for cancel send button
   */
  function setupCancelButtonListener() {
    const clickHandler = (e) => {
      let target = e.target;
      let depth = 0;
      const maxDepth = 10;
      let cancelButton = null;
      
      // Find the cancel send button
      while (target && depth < maxDepth && target !== document.body) {
        const text = target.textContent?.trim() || target.getAttribute('aria-label') || '';
        
        // Only match exact "Cancel send" text, not partial matches
        // Also check that it's not our refresh button
        if (text === 'Cancel send' && 
            !target.classList.contains('random-time-refresh-btn') &&
            !target.closest('.random-time-refresh-btn')) {
          cancelButton = target;
          break;
        }
        
        target = target.parentElement;
        depth++;
      }
      
      // If we found the cancel button, handle it
      if (cancelButton) {
        // Step 1: Prevent default behavior
        e.preventDefault();
        e.stopImmediatePropagation();
        
        // Step 2: Capture the timestamp synchronously
        const scheduledTimeElement = document.querySelector('span.g3[title]');
        let scheduledTime = null;
        
        if (scheduledTimeElement) {
          // Capture the title value
          scheduledTime = scheduledTimeElement.getAttribute('title');
          
          // Step 3: Parse the date and create ISO format
          let scheduledTimeISO = null;
          try {
            const parsedDate = new Date(scheduledTime);
            if (!isNaN(parsedDate.getTime())) {
              scheduledTimeISO = parsedDate.toISOString();
            }
          } catch (e) {
            // Error parsing date, will save string only
          }
          
          // Step 4: Store the captured timestamp in async storage
          const storageData = { 'scheduled time': scheduledTime };
          if (scheduledTimeISO) {
            storageData['scheduled time iso'] = scheduledTimeISO;
          }
          
          chrome.storage.local.set(storageData);
        }
        
        // Step 4: Temporarily remove our listener
        document.body.removeEventListener('click', clickHandler, true);
        
        // Step 5: Programmatically click the original button (without our listener)
        // Use a small delay to ensure our listener removal has taken effect
        setTimeout(() => {
          cancelButton.click();
          
          // Step 6: Re-attach our listener after a brief delay
          setTimeout(() => {
            document.body.addEventListener('click', clickHandler, true);
          }, 100);
        }, 10);
      }
    };
    
    document.body.addEventListener('click', clickHandler, true);
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
      return;
    }
    
    // Click to open the date/time picker
    pickDateTimeItem.click();
    
    // Wait for the picker UI to load, then set the date and time
    const tryToSetDate = (attempt = 1, maxAttempts = 15) => {
      setTimeout(() => {
        // Find the specific date and time input fields
        const dateInput = document.querySelector('input#c5[aria-label="Date"], input[aria-label="Date"][jsname="YPqjbf"]');
        const timeInput = document.querySelector('input#c6[aria-label="Time"], input[aria-label="Time"][jsname="YPqjbf"]');
        
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
                  scheduleButton.click();
                }
              }, 300);
            }, 200);
            
            return; // Success
          } catch (err) {
            // Error setting date/time inputs
          }
        } else if (attempt < maxAttempts) {
          tryToSetDate(attempt + 1, maxAttempts);
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
    chrome.storage.local.get(['scheduled time', 'scheduled time iso'], (result) => {
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
      
      // Prefer ISO format if available, fallback to string
      const savedTimeStr = result['scheduled time iso'] || result['scheduled time'];
      
      if (!savedTimeStr) {
        // Reset flag if we're not injecting
        datePickerMenu.dataset.lastCancelledInjected = '';
        return; // No saved time to inject
      }
      
      // Parse the saved time and check if it's in the future
      let savedTimeDate;
      try {
        // If we have ISO format, use it directly
        if (result['scheduled time iso']) {
          savedTimeDate = new Date(result['scheduled time iso']);
        } else {
          // Try parsing as-is first
          savedTimeDate = new Date(savedTimeStr);
          
          // If that fails, try to parse common Gmail date formats
          if (isNaN(savedTimeDate.getTime())) {
            const now = new Date();
            const timeMatch = savedTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (timeMatch) {
              let hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const ampm = timeMatch[3].toUpperCase();
              
              if (ampm === 'PM' && hours !== 12) hours += 12;
              if (ampm === 'AM' && hours === 12) hours = 0;
              
              // Check if it says "Tomorrow"
              if (savedTimeStr.toLowerCase().includes('tomorrow')) {
                savedTimeDate = new Date(now);
                savedTimeDate.setDate(savedTimeDate.getDate() + 1);
                savedTimeDate.setHours(hours, minutes, 0, 0);
              } else {
                // Try to parse as a date string
                savedTimeDate = new Date(savedTimeStr);
              }
            }
          }
        }
        
        if (isNaN(savedTimeDate.getTime())) {
          // Clear invalid time from storage
          chrome.storage.local.remove(['scheduled time', 'scheduled time iso']);
          datePickerMenu.dataset.lastCancelledInjected = '';
          return;
        }
      } catch (e) {
        datePickerMenu.dataset.lastCancelledInjected = '';
        return;
      }
      
      // Check if current time is ahead of (after) the saved time
      const now = new Date();
      
      if (now >= savedTimeDate) {
        // Clear past time from storage
        chrome.storage.local.remove(['scheduled time', 'scheduled time iso']);
        // Reset flag if we're not injecting
        datePickerMenu.dataset.lastCancelledInjected = '';
        return; // Don't show past times
      }
      
      // Time is in the future, inject it
      // Use ISO format if available for better reliability, otherwise use the string
      const timeToUse = result['scheduled time iso'] || savedTimeStr;
      injectMenuItemWithTime(datePickerMenu, firstMenuItem, timeToUse);
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
      // Format the time for display if it's a valid date
      let displayTime = savedTime;
      try {
        const parsedDate = new Date(savedTime);
        if (!isNaN(parsedDate.getTime())) {
          displayTime = formatTimeForDisplay(parsedDate);
        }
      } catch (e) {
        // Could not format time, using raw value
      }
      timeDiv.textContent = displayTime;
    }

    // Set autofocus and tabindex like the first item
    newMenuItem.setAttribute('tabindex', '0');
    newMenuItem.setAttribute('autofocus', '');

    // Remove autofocus from the first item
    if (firstMenuItem) {
      firstMenuItem.removeAttribute('autofocus');
      firstMenuItem.setAttribute('tabindex', '-1');
    }

    // Add click handler to fill in the date/time picker with saved time
    newMenuItem.addEventListener('click', (e) => {
      // Parse the saved date
      let parsedDate;
      try {
        parsedDate = new Date(savedTime);
        if (isNaN(parsedDate.getTime())) {
          return;
        }
      } catch (err) {
        return;
      }
      
      // Use the reusable function to fill in the date picker
      fillDatePickerAndSchedule(parsedDate);
    }, false);
    
    // Also handle mousedown - Gmail might listen to this
    newMenuItem.addEventListener('mousedown', (e) => {
      // Handle mousedown if needed
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
    if (datePickerMenu.dataset.tomorrowRandomInjected === 'true') {
      return; // Already injected in this menu instance
    }
    
    // Also check if the element exists
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
      // Clear any existing content first
      timeDiv.textContent = '';
      
      // Create a text node container for the time
      const timeTextNode = document.createTextNode(displayTime);
      timeDiv.appendChild(timeTextNode);
      
      // Create refresh button
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
        
        // Update display
        timeTextNode.textContent = newDisplayTime;
      });
      
      // Append refresh button to timeDiv
      timeDiv.appendChild(refreshBtn);
    }

    // Set tabindex
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
      fillDatePickerAndSchedule(storedTime);
    }, false);

    // Insert at the beginning (random option should be first)
    datePickerMenu.insertBefore(newMenuItem, datePickerMenu.firstChild);
    
    // Mark this menu as having the option injected
    datePickerMenu.dataset.tomorrowRandomInjected = 'true';
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
   * Initializes the extension
   */
  function init() {
    // Set up simple cancel button listener
    setupCancelButtonListener();

    // Watch for datetime picker menu
    watchForDateTimePicker();
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
