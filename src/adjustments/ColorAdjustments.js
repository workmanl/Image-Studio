// Color adjustments: vibrance, saturation, HSL

export function applyVibranceAndSaturation(data, adjustments) {
    const len = data.length;
    const vibrance = adjustments.vibrance * 0.01;
    const saturation = (adjustments.saturation + 100) / 100;

    if (vibrance === 0 && saturation === 1) return;

    for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Convert to HSL
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

        // Vibrance (smart saturation that protects skin tones)
        if (vibrance !== 0) {
            const satMult = 1 - s;
            s += vibrance * satMult * s;
        }

        // Saturation
        s *= saturation;
        s = Math.max(0, Math.min(1, s));

        // Convert back to RGB
        if (s === 0) {
            r = g = b = l;
        } else {
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

            r = hue2rgb(p, q, h + 1/3) * 255;
            g = hue2rgb(p, q, h) * 255;
            b = hue2rgb(p, q, h - 1/3) * 255;
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
    }
}

export function applyFade(data, fade) {
    if (fade === 0) return;

    const len = data.length;
    const fadeAmount = fade * 0.01 * 30;
    const fadeMult = fade * 0.01;

    for (let i = 0; i < len; i += 4) {
        data[i] = data[i] + (128 - data[i]) * fadeMult * 0.3 + fadeAmount * 0.5;
        data[i + 1] = data[i + 1] + (128 - data[i + 1]) * fadeMult * 0.3 + fadeAmount * 0.5;
        data[i + 2] = data[i + 2] + (128 - data[i + 2]) * fadeMult * 0.3 + fadeAmount * 0.5;
    }
}
