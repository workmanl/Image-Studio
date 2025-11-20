// Core image processing and rendering
import { applyBasicAdjustments } from '../adjustments/BasicAdjustments.js';
import { applyTemperatureAndTint, applyCurve } from '../adjustments/ToneAdjustments.js';
import { applyVibranceAndSaturation, applyFade } from '../adjustments/ColorAdjustments.js';
import { applySharpening, applyNoiseReduction, applyVignette, applyGrain } from '../adjustments/EffectsAdjustments.js';

export function applyAllAdjustments(imageData, adjustments) {
    const data = imageData.data;

    // Apply pixel-based adjustments
    applyBasicAdjustments(data, adjustments);
    applyTemperatureAndTint(data, adjustments);
    applyVibranceAndSaturation(data, adjustments);
    applyCurve(data, adjustments.curve);
    applyFade(data, adjustments.fade);

    // Clamp values
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i]));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
    }
}

export function renderImage(canvas, originalImage, state) {
    if (!originalImage) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Apply transforms
    ctx.save();
    ctx.translate(width / 2, height / 2);

    if (state.rotation !== 0) {
        ctx.rotate((state.rotation * Math.PI) / 180);
    }
    if (state.flipH) ctx.scale(-1, 1);
    if (state.flipV) ctx.scale(1, -1);

    let drawWidth = width, drawHeight = height;
    if (state.rotation === 90 || state.rotation === 270) {
        [drawWidth, drawHeight] = [height, width];
    }

    ctx.drawImage(originalImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Apply all adjustments
    if (state.hasAnyAdjustments()) {
        const imageData = ctx.getImageData(0, 0, width, height);
        applyAllAdjustments(imageData, state.adjustments);
        ctx.putImageData(imageData, 0, 0);
    }

    // Apply canvas effects
    if (state.adjustments.sharpening > 0) {
        applySharpening(ctx, width, height, state.adjustments.sharpening);
    }
    if (state.adjustments.noise > 0) {
        applyNoiseReduction(ctx, width, height, state.adjustments.noise);
    }
    if (state.adjustments.vignette !== 0) {
        applyVignette(ctx, width, height, state.adjustments.vignette);
    }
    if (state.adjustments.grain > 0) {
        applyGrain(ctx, width, height, state.adjustments.grain);
    }
}

export function exportImage(canvas, originalImage, state, options) {
    const { cropBox, displayScale, format, quality, resizeWidth, resizeHeight, exportWidth, exportHeight } = options;

    let finalWidth, finalHeight;

    if (resizeWidth && resizeHeight) {
        finalWidth = resizeWidth;
        finalHeight = resizeHeight;
    } else if (exportWidth && exportHeight) {
        finalWidth = exportWidth;
        finalHeight = exportHeight;
    } else {
        finalWidth = Math.round(cropBox.width / displayScale);
        finalHeight = Math.round(cropBox.height / displayScale);
    }

    const sourceX = cropBox.x / displayScale;
    const sourceY = cropBox.y / displayScale;
    const sourceWidth = cropBox.width / displayScale;
    const sourceHeight = cropBox.height / displayScale;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = finalWidth;
    exportCanvas.height = finalHeight;
    const exportCtx = exportCanvas.getContext('2d');

    // Apply transforms
    exportCtx.save();
    exportCtx.translate(finalWidth / 2, finalHeight / 2);
    if (state.rotation !== 0) exportCtx.rotate((state.rotation * Math.PI) / 180);
    if (state.flipH) exportCtx.scale(-1, 1);
    if (state.flipV) exportCtx.scale(1, -1);

    let destW = finalWidth, destH = finalHeight;
    if (state.rotation === 90 || state.rotation === 270) [destW, destH] = [destH, destW];

    exportCtx.drawImage(
        originalImage,
        sourceX, sourceY, sourceWidth, sourceHeight,
        -destW / 2, -destH / 2, destW, destH
    );
    exportCtx.restore();

    // Apply adjustments
    if (state.hasAnyAdjustments()) {
        const imageData = exportCtx.getImageData(0, 0, finalWidth, finalHeight);
        applyAllAdjustments(imageData, state.adjustments);
        exportCtx.putImageData(imageData, 0, 0);
    }

    // Apply effects
    if (state.adjustments.sharpening > 0) {
        applySharpening(exportCtx, finalWidth, finalHeight, state.adjustments.sharpening);
    }
    if (state.adjustments.noise > 0) {
        applyNoiseReduction(exportCtx, finalWidth, finalHeight, state.adjustments.noise);
    }
    if (state.adjustments.vignette !== 0) {
        applyVignette(exportCtx, finalWidth, finalHeight, state.adjustments.vignette);
    }
    if (state.adjustments.grain > 0) {
        applyGrain(exportCtx, finalWidth, finalHeight, state.adjustments.grain);
    }

    // Generate data URL
    let mimeType = 'image/jpeg';
    if (format === 'png') mimeType = 'image/png';
    else if (format === 'webp') mimeType = 'image/webp';

    const dataURL = format === 'png'
        ? exportCanvas.toDataURL(mimeType)
        : exportCanvas.toDataURL(mimeType, quality / 100);

    return { dataURL, finalWidth, finalHeight };
}
