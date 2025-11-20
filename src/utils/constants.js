// Application constants

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MIN_CROP_SIZE = 20;
export const MAX_HISTORY = 30;

export const PRESETS = {
    'instagram-square': { ratio: 1, width: 1080, height: 1080 },
    'instagram-portrait': { ratio: 4/5, width: 1080, height: 1350 },
    'instagram-story': { ratio: 9/16, width: 1080, height: 1920 },
    'youtube-thumbnail': { ratio: 16/9, width: 1280, height: 720 },
    'facebook-post': { ratio: 1.91, width: 1200, height: 630 },
    'twitter-post': { ratio: 16/9, width: 1600, height: 900 }
};

export const HSL_COLORS = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];

export const DEFAULT_ADJUSTMENTS = {
    // Basic - Light
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    // Basic - Presence
    clarity: 0,
    dehaze: 0,
    vibrance: 0,
    saturation: 0,
    // Tone - White Balance
    temperature: 0,
    tint: 0,
    // Tone - Curve
    curve: 'linear',
    // Effects
    sharpening: 0,
    noise: 0,
    vignette: 0,
    grain: 0,
    fade: 0,
    distortion: 0,
    // Color - HSL
    hsl: {
        red: { hue: 0, sat: 0, lum: 0 },
        orange: { hue: 0, sat: 0, lum: 0 },
        yellow: { hue: 0, sat: 0, lum: 0 },
        green: { hue: 0, sat: 0, lum: 0 },
        aqua: { hue: 0, sat: 0, lum: 0 },
        blue: { hue: 0, sat: 0, lum: 0 },
        purple: { hue: 0, sat: 0, lum: 0 },
        magenta: { hue: 0, sat: 0, lum: 0 }
    },
    // Split Toning
    splitHighlights: { color: '#000000', amount: 0 },
    splitShadows: { color: '#000000', amount: 0 },
    splitBalance: 0
};
