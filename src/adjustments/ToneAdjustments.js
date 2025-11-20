// Tone adjustments: temperature, tint, curves

export function applyTemperatureAndTint(data, adjustments) {
    const len = data.length;
    const temperature = adjustments.temperature;
    const tint = adjustments.tint;

    if (temperature === 0 && tint === 0) return;

    for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Temperature
        if (temperature !== 0) {
            if (temperature > 0) {
                r += temperature * 0.6;
                g += temperature * 0.2;
                b -= temperature * 0.5;
            } else {
                r += temperature * 0.5;
                g += temperature * 0.1;
                b -= temperature * 0.6;
            }
        }

        // Tint
        if (tint !== 0) {
            g -= tint * 0.3;
            if (tint > 0) {
                r += tint * 0.15;
            } else {
                b -= tint * 0.15;
            }
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
    }
}

export function applyCurve(data, curve) {
    if (curve === 'linear') return;

    const len = data.length;

    const applyCurveValue = (v) => {
        const t = v / 255;
        let result;
        if (curve === 'contrast') {
            result = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
        } else if (curve === 'fade') {
            result = 0.1 + t * 0.8;
        } else {
            result = t;
        }
        return result * 255;
    };

    for (let i = 0; i < len; i += 4) {
        data[i] = applyCurveValue(data[i]);
        data[i + 1] = applyCurveValue(data[i + 1]);
        data[i + 2] = applyCurveValue(data[i + 2]);
    }
}

export function drawToneCurve(canvas, curve) {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(w * i / 4, 0);
        ctx.lineTo(w * i / 4, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, h * i / 4);
        ctx.lineTo(w, h * i / 4);
        ctx.stroke();
    }

    // Curve
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x <= w; x++) {
        const t = x / w;
        let y;

        if (curve === 'linear') {
            y = t;
        } else if (curve === 'contrast') {
            y = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
        } else if (curve === 'fade') {
            y = 0.1 + t * 0.8;
        } else {
            y = t;
        }

        const py = h - y * h;
        if (x === 0) {
            ctx.moveTo(x, py);
        } else {
            ctx.lineTo(x, py);
        }
    }

    ctx.stroke();
}
