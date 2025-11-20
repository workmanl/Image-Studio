// Effects: sharpening, noise reduction, vignette, grain

export function applySharpening(ctx, width, height, amount) {
    if (amount === 0) return;

    const intensity = amount / 100;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const original = new Uint8ClampedArray(data);

    // Simple 3x3 sharpen kernel
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                        sum += original[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                const idx = (y * width + x) * 4 + c;
                data[idx] = data[idx] + (sum - data[idx]) * intensity;
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

export function applyNoiseReduction(ctx, width, height, amount) {
    if (amount === 0) return;

    const intensity = amount / 100;
    const radius = Math.ceil(intensity * 3);
    if (radius === 0) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const original = new Uint8ClampedArray(data);

    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                let count = 0;
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                        sum += original[idx];
                        count++;
                    }
                }
                const idx = (y * width + x) * 4 + c;
                data[idx] = sum / count;
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

export function applyVignette(ctx, width, height, amount) {
    const intensity = amount / 100;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.sqrt(centerX * centerX + centerY * centerY);

    const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.2,
        centerX, centerY, radius
    );

    if (intensity > 0) {
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.7})`);
    } else {
        gradient.addColorStop(0, `rgba(255, 255, 255, ${-intensity * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

export function applyGrain(ctx, width, height, amount) {
    const intensity = amount / 100;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * intensity * 50;
        data[i] += noise;
        data[i + 1] += noise;
        data[i + 2] += noise;
    }

    ctx.putImageData(imageData, 0, 0);
}
