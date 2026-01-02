# Edit Scheduled Gmail Chrome Extension

A Chrome extension that adds an "Edit send" button to Gmail scheduled emails, allowing you to edit scheduled emails without canceling and reselecting the scheduled time.

## Features

- Adds an "Edit send" button next to the "Cancel send" button on scheduled emails
- Automatically detects when viewing a scheduled email
- Minimal, unobtrusive UI that matches Gmail's design

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `edit-scheduled-gmail` directory
5. The extension should now be active

### Icons Setup

The extension requires icons in the `icons/` directory:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can create these using any image editor, or use online tools to generate them. For now, you can use placeholder icons - the extension will still work, but you'll see a default Chrome extension icon.

## Project Structure

```
edit-scheduled-gmail/
├── manifest.json       # Chrome extension manifest (v3)
├── content.js          # Main content script that injects the button
├── styles.css          # Styles for the Edit send button
├── popup.html          # Extension popup UI
├── icons/              # Extension icons (16, 48, 128px)
└── README.md           # This file
```

## How It Works

The extension uses a content script that:
1. Monitors the Gmail page for scheduled email banners
2. Detects when you're viewing a scheduled email
3. Injects an "Edit send" button next to the "Cancel send" button
4. Responds to Gmail's dynamic page navigation

## Development Notes

- The `handleEditSendClick` function in `content.js` is currently a placeholder
- The button detection uses selectors that may need adjustment as Gmail updates
- The extension watches for DOM changes using MutationObserver for dynamic content

## TODO

- [ ] Implement edit functionality (extract scheduled time, allow editing, preserve schedule)
- [ ] Add proper icons
- [ ] Test with various Gmail layouts
- [ ] Add error handling and edge cases
- [ ] Add options page for user preferences

## License

MIT
