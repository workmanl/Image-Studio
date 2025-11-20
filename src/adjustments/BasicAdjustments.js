// Basic adjustments: exposure, contrast, highlights, shadows, etc.

export function applyBasicAdjustments(data, adjustments) {
    const len = data.length;

    const exposure = adjustments.exposure * 0.02;
    const contrast = (adjustments.contrast + 100) / 100;
    const highlights = adjustments.highlights * 0.01;
    const shadows = adjustments.shadows * 0.01;
    const whites = adjustments.whites * 0.01;
    const blacks = adjustments.blacks * 0.01;
    const dehaze = adjustments.dehaze * 0.01;

    for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Exposure
        if (exposure !== 0) {
            const mult = Math.pow(2, exposure);
            r *= mult;
            g *= mult;
            b *= mult;
        }

        // Contrast
        r = ((r - 128) * contrast) + 128;
        g = ((g - 128) * contrast) + 128;
        b = ((b - 128) * contrast) + 128;

        // Calculate luminance for tonal adjustments
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Highlights
        if (highlights !== 0) {
            const highlightMask = Math.max(0, (lum - 128) / 128);
            const adj = highlights * highlightMask * 50;
            r += adj;
            g += adj;
            b += adj;
        }

        // Shadows
        if (shadows !== 0) {
            const shadowMask = Math.max(0, (128 - lum) / 128);
            const adj = shadows * shadowMask * 50;
            r += adj;
            g += adj;
            b += adj;
        }

        // Whites
        if (whites !== 0) {
            const whiteMask = Math.max(0, (lum - 192) / 64);
            const adj = whites * whiteMask * 30;
            r += adj;
            g += adj;
            b += adj;
        }

        // Blacks
        if (blacks !== 0) {
            const blackMask = Math.max(0, (64 - lum) / 64);
            const adj = blacks * blackMask * 30;
            r += adj;
            g += adj;
            b += adj;
        }

        // Dehaze
        if (dehaze !== 0) {
            const hazeMult = 1 + dehaze * 0.3;
            r = 128 + (r - 128) * hazeMult;
            g = 128 + (g - 128) * hazeMult;
            b = 128 + (b - 128) * hazeMult;
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
    }
}
