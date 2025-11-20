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

// Interpolate curve value using cubic spline-like interpolation
function interpolateCurve(points, t) {
    if (points.length < 2) return t;

    // Find the two points that bracket t
    let p1 = points[0];
    let p2 = points[points.length - 1];

    for (let i = 0; i < points.length - 1; i++) {
        if (t >= points[i].x && t <= points[i + 1].x) {
            p1 = points[i];
            p2 = points[i + 1];
            break;
        }
    }

    // Linear interpolation between the two points
    if (p2.x === p1.x) return p1.y;
    const ratio = (t - p1.x) / (p2.x - p1.x);

    // Smooth interpolation (ease in-out)
    const smoothRatio = ratio * ratio * (3 - 2 * ratio);
    return p1.y + (p2.y - p1.y) * smoothRatio;
}

export function applyCurvePoints(data, curvePoints) {
    // Check if curve is linear (just two endpoints at diagonal)
    if (curvePoints.length === 2 &&
        curvePoints[0].x === 0 && curvePoints[0].y === 0 &&
        curvePoints[1].x === 1 && curvePoints[1].y === 1) {
        return;
    }

    const len = data.length;

    // Build lookup table for performance
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        const result = interpolateCurve(curvePoints, t);
        lut[i] = Math.max(0, Math.min(255, Math.round(result * 255)));
    }

    for (let i = 0; i < len; i += 4) {
        data[i] = lut[data[i]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
    }
}

export function drawToneCurve(canvas, curvePoints) {
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

    // Diagonal reference line
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();

    // Draw curve
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x <= w; x++) {
        const t = x / w;
        const y = interpolateCurve(curvePoints, t);
        const py = h - y * h;

        if (x === 0) {
            ctx.moveTo(x, py);
        } else {
            ctx.lineTo(x, py);
        }
    }
    ctx.stroke();

    // Draw control points
    curvePoints.forEach(point => {
        const px = point.x * w;
        const py = h - point.y * h;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0088ff';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// Preset curve points
export const CURVE_PRESETS = {
    linear: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    contrast: [{ x: 0, y: 0 }, { x: 0.25, y: 0.15 }, { x: 0.75, y: 0.85 }, { x: 1, y: 1 }],
    fade: [{ x: 0, y: 0.1 }, { x: 1, y: 0.9 }]
};
