# Image Studio - Professional Photo Editor

A professional-grade, client-side image processor built with vanilla HTML, CSS, and JavaScript. All processing happens locally in your browser - no uploads, no servers, 100% privacy.

## Features

### Core Functionality
- Drag-and-drop or click to upload images
- Support for JPG, PNG, GIF, WebP, BMP, TIFF formats
- Up to 50MB file size support

### Crop & Transform
- Free-form cropping with adjustable handles
- Aspect ratio presets (1:1, 4:3, 16:9, 3:2, 2:3)
- Social media presets (Instagram, YouTube, Facebook, Twitter)
- Rotate (90° increments)
- Flip horizontal/vertical
- Zoom controls

### Adjustments (Lightroom-style)

**Basic - Light**
- Exposure
- Contrast
- Highlights
- Shadows
- Whites
- Blacks

**Basic - Presence**
- Clarity
- Dehaze
- Vibrance
- Saturation

**Tone**
- Temperature
- Tint
- Tone curves (Linear, Contrast, Fade)

**Color**
- HSL adjustments (Hue, Saturation, Luminance) for 8 color channels
- Split toning (Highlights & Shadows)

**Effects**
- Sharpening
- Noise reduction
- Vignette
- Grain
- Fade

### Export
- JPEG, PNG, WebP formats
- Quality control (for lossy formats)
- Custom resize with aspect ratio lock
- Automatic filename with dimensions

### UX Features
- Undo/Redo with full history (30 states)
- Keyboard shortcuts
- Before/After toggle
- Unsaved changes warning
- Progress bar for exports
- Global error handling

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + S` | Export |
| `\` | Toggle Before/After |
| `+` / `=` | Zoom In |
| `-` | Zoom Out |
| `0` | Zoom to Fit |

## Running Locally

Since this uses ES modules, you need to serve it via a local server:

```bash
# Using Node.js
npx serve .

# Using Python
python -m http.server 8000

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` (or the port shown) in your browser.

## Project Structure

```
image-processor/
├── index.html              # Main HTML file
├── style.css               # Dark Lightroom-style UI
├── app.js                  # Legacy monolithic version (backup)
├── src/
│   ├── main.js             # Entry point
│   ├── core/
│   │   ├── ImageProcessor.js   # Rendering & export
│   │   ├── StateManager.js     # Centralized state
│   │   ├── HistoryManager.js   # Undo/redo
│   │   └── EventBus.js         # Pub/sub events
│   ├── adjustments/
│   │   ├── BasicAdjustments.js
│   │   ├── ToneAdjustments.js
│   │   ├── ColorAdjustments.js
│   │   └── EffectsAdjustments.js
│   └── utils/
│       ├── constants.js
│       ├── debounce.js
│       └── colorConversion.js
└── README.md
```

## Browser Support

Modern browsers with support for:
- Canvas API
- ES Modules
- FileReader API
- CSS Custom Properties

Tested on Chrome, Firefox, Safari, Edge.

## Privacy

All image processing is performed client-side using the HTML5 Canvas API. Your images never leave your device.

## License

MIT
