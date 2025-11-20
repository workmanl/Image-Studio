// Color conversion utilities

export function rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 127.5 ? d / (510 - max - min) : d / (max + min);

        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h, s, l };
}

export function hslToRgb(h, s, l) {
    if (s === 0) {
        return { r: l, g: l, b: l };
    }

    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };

    const q = l < 127.5 ? l * (1 + s) / 255 : (l + s * 255 - l * s) / 255;
    const p = 2 * l / 255 - q;

    return {
        r: hue2rgb(p, q, h + 1/3) * 255,
        g: hue2rgb(p, q, h) * 255,
        b: hue2rgb(p, q, h - 1/3) * 255
    };
}
