# Gmail Schedule Send Enhancer

A Chrome extension that enhances Gmail's schedule send functionality by saving cancelled scheduled times and adding convenient scheduling options to the date picker menu.

## Features

- **Saves cancelled scheduled times**: Automatically saves the scheduled date/time when you click "Cancel send" on a scheduled email
- **Last cancelled time option**: Adds a "Last cancelled time" option to Gmail's schedule send date picker menu, allowing you to quickly reschedule using your most recently cancelled time (only appears if the saved time is in the future)
- **Tomorrow morning random**: Adds a "Tomorrow morning random" option that schedules for a random time between 8:00 AM and 8:59 AM (tomorrow, or today if it's before 8 AM). Includes a refresh button to generate a new random time without closing the menu
- **Automatic scheduling**: When you click either custom option, the extension automatically fills the date/time inputs and clicks "Schedule send" for you

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `edit-scheduled-gmail` directory
5. The extension should now be active on Gmail

## Project Structure

```
edit-scheduled-gmail/
├── manifest.json       # Chrome extension manifest (v3)
├── content.js          # Main content script that enhances the schedule send UI
├── styles.css          # Styles for the injected menu items and refresh button
├── popup.html          # Extension popup UI
├── icons/              # Extension icons (16, 48, 128px)
└── README.md           # This file
```

## How It Works

The extension uses a content script that:

1. **Monitors for "Cancel send" clicks**: When you cancel a scheduled email, it extracts and saves the scheduled time to `chrome.storage.local`

2. **Detects the date picker menu**: Uses a `MutationObserver` to detect when Gmail's schedule send date picker menu appears

3. **Injects custom options**: Adds two new menu items to the date picker:
   - "Tomorrow morning random" (with refresh button)
   - "Last cancelled time" (only if saved time is in the future)

4. **Handles scheduling**: When a custom option is clicked, it:
   - Opens the custom date/time picker dialog
   - Fills in the date and time inputs
   - Dispatches appropriate events to trigger Gmail's handlers
   - Clicks the "Schedule send" button

## Usage

1. **Saving a cancelled time**: Simply click "Cancel send" on any scheduled email. The extension automatically saves the scheduled time in the background.

2. **Using Last cancelled time**: 
   - Compose a new email or open an existing draft
   - Click the schedule send button (clock icon)
   - If you've cancelled a scheduled email and the saved time is in the future, you'll see "Last cancelled time" as an option
   - Click it to automatically schedule with that time

3. **Using Tomorrow morning random**:
   - Click the schedule send button
   - Select "Tomorrow morning random" for a random time between 8:00-8:59 AM
   - Click the refresh button (🔄) next to the time to generate a new random time without closing the menu

## Technical Details

- Uses `MutationObserver` to handle Gmail's dynamic DOM updates
- Implements duplicate injection prevention using dataset flags
- Uses `chrome.storage.local` for persistent storage of cancelled times
- Simulates user events (click, input, change, blur) to interact with Gmail's components
- Includes retry logic with exponential backoff for finding dynamically loaded elements

## Development Notes

- The extension watches for DOM changes using `MutationObserver` to handle Gmail's dynamic content
- Button detection uses selectors that may need adjustment as Gmail updates
- Debug logging can be disabled by setting `CONFIG.debug = false` in `content.js`
