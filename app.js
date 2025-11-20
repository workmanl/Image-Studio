// Image Studio - Professional Photo Editor
// 100% Client-Side Processing
(function() {
    'use strict';

    // Constants
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    const MIN_CROP_SIZE = 20;
    const MAX_HISTORY = 30;

    // State
    let originalImage = null;
    let displayScale = 1;
    let cropBox = { x: 0, y: 0, width: 100, height: 100 };
    let aspectRatio = null;
    let exportWidth = null;
    let exportHeight = null;
    let isDragging = false;
    let isResizing = false;
    let activeHandle = null;
    let dragStart = { x: 0, y: 0 };
    let cropStart = { x: 0, y: 0, width: 0, height: 0 };
    let isProcessing = false;
    let renderTimeout = null;
    let historySaveTimeout = null;
    let originalResizeRatio = 1;

    // Transform state
    let rotation = 0;
    let flipH = false;
    let flipV = false;
    let zoomScale = 1;

    // History
    let history = [];
    let historyIndex = -1;

    // Adjustments - Lightroom-style
    let adjustments = {
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

    // Presets
    const presets = {
        'instagram-square': { ratio: 1, width: 1080, height: 1080 },
        'instagram-portrait': { ratio: 4/5, width: 1080, height: 1350 },
        'instagram-story': { ratio: 9/16, width: 1080, height: 1920 },
        'youtube-thumbnail': { ratio: 16/9, width: 1280, height: 720 },
        'facebook-post': { ratio: 1.91, width: 1200, height: 630 },
        'twitter-post': { ratio: 16/9, width: 1600, height: 900 }
    };

    // HSL color names
    const hslColors = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
    let currentHslMode = 'hue';

    // DOM Elements
    const el = {
        // Sections
        uploadSection: document.getElementById('upload-section'),
        editorSection: document.getElementById('editor-section'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingText: document.getElementById('loading-text'),
        progressBar: document.getElementById('progress-bar'),
        progressFill: document.getElementById('progress-fill'),
        errorMessage: document.getElementById('error-message'),

        // Upload
        dropZone: document.getElementById('drop-zone'),
        fileInput: document.getElementById('file-input'),

        // Canvas
        canvas: document.getElementById('main-canvas'),
        canvasWrapper: document.getElementById('canvas-wrapper'),
        cropOverlay: document.getElementById('crop-overlay'),
        cropBox: document.getElementById('crop-box'),

        // Toolbar
        backBtn: document.getElementById('back-btn'),
        undoBtn: document.getElementById('undo-btn'),
        redoBtn: document.getElementById('redo-btn'),
        rotateLeftBtn: document.getElementById('rotate-left-btn'),
        rotateRightBtn: document.getElementById('rotate-right-btn'),
        flipHorizontalBtn: document.getElementById('flip-horizontal-btn'),
        flipVerticalBtn: document.getElementById('flip-vertical-btn'),
        zoomInBtn: document.getElementById('zoom-in-btn'),
        zoomOutBtn: document.getElementById('zoom-out-btn'),
        zoomFitBtn: document.getElementById('zoom-fit-btn'),
        zoomLevel: document.getElementById('zoom-level'),
        beforeAfterBtn: document.getElementById('before-after-btn'),
        exportBtn: document.getElementById('export-btn'),

        // Info
        infoDimensions: document.getElementById('info-dimensions'),
        infoExport: document.getElementById('info-export'),

        // Export
        formatSelect: document.getElementById('format-select'),
        qualitySlider: document.getElementById('quality-slider'),
        qualityValue: document.getElementById('quality-value'),
        qualityRow: document.getElementById('quality-row'),
        resizeToggle: document.getElementById('resize-toggle'),
        resizeOptions: document.getElementById('resize-options'),
        resizeWidth: document.getElementById('resize-width'),
        resizeHeight: document.getElementById('resize-height'),
        resizeLock: document.getElementById('resize-lock'),
        exportFinalBtn: document.getElementById('export-final-btn'),

        // HSL
        hslSliders: document.getElementById('hsl-sliders'),

        // Curve
        curveCanvas: document.getElementById('curve-canvas')
    };

    // Initialize
    function init() {
        setupEventListeners();
        setupSliders();
        setupHSLSliders();
        setupToneCurve();
        updateQualityVisibility();
        setupErrorHandling();
        setupBeforeUnload();
    }

    // Global error handling
    function setupErrorHandling() {
        window.onerror = function(msg, url, line, col, error) {
            console.error('Error:', msg, 'at', url, line, col);
            showError('An error occurred. Please try again or refresh the page.');
            showLoading(false);
            return true;
        };

        window.onunhandledrejection = function(event) {
            console.error('Unhandled promise rejection:', event.reason);
            showError('An error occurred. Please try again.');
            showLoading(false);
        };
    }

    // Warn before leaving with unsaved changes
    function setupBeforeUnload() {
        window.onbeforeunload = function(e) {
            if (originalImage && historyIndex > 0) {
                const message = 'You have unsaved changes. Are you sure you want to leave?';
                e.returnValue = message;
                return message;
            }
        };
    }

    // Event Listeners
    function setupEventListeners() {
        // Upload - Handle click on drop zone, but not on label (which natively triggers input)
        el.dropZone.addEventListener('click', (e) => {
            // The label already triggers the input natively via 'for' attribute
            // Only programmatically trigger if clicking elsewhere in the drop zone
            const isLabel = e.target.tagName === 'LABEL' || e.target.closest('label');
            const isInput = e.target === el.fileInput;
            if (!isLabel && !isInput) {
                el.fileInput.click();
            }
        });
        el.dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.fileInput.click();
            }
        });
        el.fileInput.addEventListener('change', handleFileSelect);

        // Drag and drop
        el.dropZone.addEventListener('dragover', handleDragOver);
        el.dropZone.addEventListener('dragleave', handleDragLeave);
        el.dropZone.addEventListener('drop', handleDrop);
        document.addEventListener('dragover', e => e.preventDefault());
        document.addEventListener('drop', e => e.preventDefault());

        // Crop interactions
        el.cropBox.addEventListener('mousedown', startDrag);
        el.cropBox.addEventListener('touchstart', startDrag, { passive: false });

        document.querySelectorAll('.crop-handle').forEach(handle => {
            handle.addEventListener('mousedown', startResize);
            handle.addEventListener('touchstart', startResize, { passive: false });
        });

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('mouseup', stopInteraction);
        document.addEventListener('touchend', stopInteraction);

        // Toolbar
        el.backBtn.addEventListener('click', resetToUpload);
        el.undoBtn.addEventListener('click', undo);
        el.redoBtn.addEventListener('click', redo);
        el.rotateLeftBtn.addEventListener('click', () => rotate(-90));
        el.rotateRightBtn.addEventListener('click', () => rotate(90));
        el.flipHorizontalBtn.addEventListener('click', () => flip('horizontal'));
        el.flipVerticalBtn.addEventListener('click', () => flip('vertical'));
        el.zoomInBtn.addEventListener('click', zoomIn);
        el.zoomOutBtn.addEventListener('click', zoomOut);
        el.zoomFitBtn.addEventListener('click', zoomFit);
        el.beforeAfterBtn.addEventListener('click', toggleBeforeAfter);
        el.exportBtn.addEventListener('click', () => switchTab('export'));

        // Presets
        document.querySelectorAll('.preset-item').forEach(btn => {
            btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
        });

        // Ratios
        document.querySelectorAll('.ratio-btn').forEach(btn => {
            btn.addEventListener('click', () => setAspectRatio(btn.dataset.ratio));
        });

        // Tabs
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // HSL tabs
        document.querySelectorAll('.hsl-tab').forEach(tab => {
            tab.addEventListener('click', () => switchHSLMode(tab.dataset.hsl));
        });

        // Curve presets
        document.querySelectorAll('.curve-preset').forEach(btn => {
            btn.addEventListener('click', () => applyCurvePreset(btn.dataset.curve));
        });

        // Reset buttons
        document.getElementById('reset-basic-btn')?.addEventListener('click', resetBasic);
        document.getElementById('reset-tone-btn')?.addEventListener('click', resetTone);
        document.getElementById('reset-color-btn')?.addEventListener('click', resetColor);
        document.getElementById('reset-effects-btn')?.addEventListener('click', resetEffects);

        // Export options
        el.formatSelect.addEventListener('change', updateQualityVisibility);
        el.qualitySlider.addEventListener('input', () => {
            el.qualityValue.textContent = el.qualitySlider.value + '%';
        });
        el.resizeToggle.addEventListener('change', () => {
            el.resizeOptions.classList.toggle('hidden', !el.resizeToggle.checked);
            if (el.resizeToggle.checked) {
                // Set initial resize dimensions from current export size
                const w = exportWidth || Math.round(cropBox.width / displayScale);
                const h = exportHeight || Math.round(cropBox.height / displayScale);
                el.resizeWidth.value = w;
                el.resizeHeight.value = h;
                originalResizeRatio = w / h;
            }
        });

        // Resize lock functionality
        el.resizeWidth.addEventListener('input', () => {
            if (el.resizeLock.checked) {
                el.resizeHeight.value = Math.round(el.resizeWidth.value / originalResizeRatio);
            }
        });
        el.resizeHeight.addEventListener('input', () => {
            if (el.resizeLock.checked) {
                el.resizeWidth.value = Math.round(el.resizeHeight.value * originalResizeRatio);
            }
        });

        el.exportFinalBtn.addEventListener('click', exportImage);

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);

        // Window resize
        window.addEventListener('resize', debounce(handleWindowResize, 250));
    }

    // Setup all sliders
    function setupSliders() {
        const sliders = [
            // Basic
            { id: 'exposure', key: 'exposure' },
            { id: 'contrast', key: 'contrast' },
            { id: 'highlights', key: 'highlights' },
            { id: 'shadows', key: 'shadows' },
            { id: 'whites', key: 'whites' },
            { id: 'blacks', key: 'blacks' },
            { id: 'clarity', key: 'clarity' },
            { id: 'dehaze', key: 'dehaze' },
            { id: 'vibrance', key: 'vibrance' },
            { id: 'saturation', key: 'saturation' },
            // Tone
            { id: 'temperature', key: 'temperature' },
            { id: 'tint', key: 'tint' },
            // Effects
            { id: 'sharpening', key: 'sharpening' },
            { id: 'noise', key: 'noise' },
            { id: 'vignette', key: 'vignette' },
            { id: 'grain', key: 'grain' },
            { id: 'fade', key: 'fade' },
            { id: 'distortion', key: 'distortion' }
        ];

        sliders.forEach(({ id, key }) => {
            const slider = document.getElementById(`${id}-slider`);
            const value = document.getElementById(`${id}-value`);
            if (slider && value) {
                slider.addEventListener('input', () => {
                    adjustments[key] = parseInt(slider.value);
                    value.textContent = slider.value;
                    scheduleRender();
                });
            }
        });

        // Split toning
        const splitHighlightsColor = document.getElementById('split-highlights-color');
        const splitHighlightsAmount = document.getElementById('split-highlights-amount');
        const splitShadowsColor = document.getElementById('split-shadows-color');
        const splitShadowsAmount = document.getElementById('split-shadows-amount');
        const splitBalance = document.getElementById('split-balance');
        const splitBalanceValue = document.getElementById('split-balance-value');

        if (splitHighlightsColor) {
            splitHighlightsColor.addEventListener('input', () => {
                adjustments.splitHighlights.color = splitHighlightsColor.value;
                scheduleRender();
            });
        }
        if (splitHighlightsAmount) {
            splitHighlightsAmount.addEventListener('input', () => {
                adjustments.splitHighlights.amount = parseInt(splitHighlightsAmount.value);
                scheduleRender();
            });
        }
        if (splitShadowsColor) {
            splitShadowsColor.addEventListener('input', () => {
                adjustments.splitShadows.color = splitShadowsColor.value;
                scheduleRender();
            });
        }
        if (splitShadowsAmount) {
            splitShadowsAmount.addEventListener('input', () => {
                adjustments.splitShadows.amount = parseInt(splitShadowsAmount.value);
                scheduleRender();
            });
        }
        if (splitBalance) {
            splitBalance.addEventListener('input', () => {
                adjustments.splitBalance = parseInt(splitBalance.value);
                if (splitBalanceValue) splitBalanceValue.textContent = splitBalance.value;
                scheduleRender();
            });
        }
    }

    // Setup HSL sliders
    function setupHSLSliders() {
        updateHSLSliders();
    }

    function updateHSLSliders() {
        if (!el.hslSliders) return;

        el.hslSliders.innerHTML = '';

        hslColors.forEach(color => {
            const value = adjustments.hsl[color][currentHslMode === 'sat' ? 'sat' : currentHslMode === 'lum' ? 'lum' : 'hue'];
            const div = document.createElement('div');
            div.className = 'slider-row';
            div.innerHTML = `
                <label>${color.charAt(0).toUpperCase() + color.slice(1)}</label>
                <input type="range" min="-100" max="100" value="${value}" data-color="${color}">
                <span class="slider-value">${value}</span>
            `;

            const slider = div.querySelector('input');
            const valueSpan = div.querySelector('.slider-value');

            slider.addEventListener('input', () => {
                const prop = currentHslMode === 'sat' ? 'sat' : currentHslMode === 'lum' ? 'lum' : 'hue';
                adjustments.hsl[color][prop] = parseInt(slider.value);
                valueSpan.textContent = slider.value;
                scheduleRender();
            });

            el.hslSliders.appendChild(div);
        });
    }

    function switchHSLMode(mode) {
        currentHslMode = mode;
        document.querySelectorAll('.hsl-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.hsl === mode);
        });
        updateHSLSliders();
    }

    // Tone curve
    function setupToneCurve() {
        drawToneCurve();
    }

    function drawToneCurve() {
        if (!el.curveCanvas) return;

        const ctx = el.curveCanvas.getContext('2d');
        const w = el.curveCanvas.width;
        const h = el.curveCanvas.height;

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

        const curve = adjustments.curve;

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

    function applyCurvePreset(curve) {
        adjustments.curve = curve;
        drawToneCurve();
        scheduleRender();
    }

    // File handling
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) validateAndLoadImage(file);
    }

    function handleDragOver(e) {
        e.preventDefault();
        el.dropZone.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        el.dropZone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        el.dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) validateAndLoadImage(file);
    }

    function validateAndLoadImage(file) {
        // Check if it's an image - be more permissive
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
        const ext = file.name.toLowerCase().split('.').pop();
        const validExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif'];

        if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
            showError('Please select a valid image file (JPG, PNG, GIF, WebP, BMP, TIFF)');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            showError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
            return;
        }

        loadImage(file);
    }

    function loadImage(file) {
        showLoading(true);

        const reader = new FileReader();

        reader.onerror = () => {
            showLoading(false);
            showError('Failed to read file. Please try again.');
        };

        reader.onload = (e) => {
            const img = new Image();

            img.onerror = () => {
                showLoading(false);
                showError('Failed to load image. The file may be corrupted.');
            };

            img.onload = () => {
                originalImage = img;
                rotation = 0;
                flipH = false;
                flipV = false;
                zoomScale = 1;
                initializeEditor();
                showLoading(false);
            };

            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    function initializeEditor() {
        el.uploadSection.classList.add('hidden');
        el.editorSection.classList.remove('hidden');

        requestAnimationFrame(() => {
            setupCanvas();
        });
    }

    function setupCanvas() {
        const area = document.querySelector('.canvas-area');
        if (!area) return;

        const maxWidth = area.clientWidth - 40;
        const maxHeight = area.clientHeight - 40;

        let imgWidth = originalImage.width;
        let imgHeight = originalImage.height;

        if (rotation === 90 || rotation === 270) {
            [imgWidth, imgHeight] = [imgHeight, imgWidth];
        }

        displayScale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);

        const canvasWidth = imgWidth * displayScale;
        const canvasHeight = imgHeight * displayScale;

        el.canvas.width = canvasWidth;
        el.canvas.height = canvasHeight;

        cropBox = {
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight
        };

        aspectRatio = null;
        exportWidth = null;
        exportHeight = null;

        history = [];
        historyIndex = -1;

        resetAllAdjustments();
        saveToHistoryImmediate();

        document.querySelectorAll('.preset-item').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.ratio-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.ratio-btn[data-ratio="free"]')?.classList.add('active');

        updateInfo();
        updateZoomDisplay();
        renderCanvas();
        updateCropBoxUI();
    }

    // Rendering
    function scheduleRender() {
        if (renderTimeout) {
            cancelAnimationFrame(renderTimeout);
        }
        renderTimeout = requestAnimationFrame(() => {
            renderCanvas();
        });
    }

    function renderCanvas() {
        if (!originalImage) return;

        const ctx = el.canvas.getContext('2d');
        const width = el.canvas.width;
        const height = el.canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Apply transforms
        ctx.save();
        ctx.translate(width / 2, height / 2);

        if (rotation !== 0) {
            ctx.rotate((rotation * Math.PI) / 180);
        }
        if (flipH) ctx.scale(-1, 1);
        if (flipV) ctx.scale(1, -1);

        let drawWidth = width, drawHeight = height;
        if (rotation === 90 || rotation === 270) {
            [drawWidth, drawHeight] = [height, width];
        }

        ctx.drawImage(originalImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        // Apply all adjustments
        if (hasAnyAdjustments()) {
            const imageData = ctx.getImageData(0, 0, width, height);
            applyAllAdjustments(imageData);
            ctx.putImageData(imageData, 0, 0);
        }

        // Apply effects that need to be drawn on canvas
        if (adjustments.sharpening > 0) {
            applySharpening(ctx, width, height);
        }
        if (adjustments.noise > 0) {
            applyNoiseReduction(ctx, width, height);
        }
        if (adjustments.vignette !== 0) {
            applyVignette(ctx, width, height);
        }
        if (adjustments.grain > 0) {
            applyGrain(ctx, width, height);
        }
    }

    function hasAnyAdjustments() {
        return adjustments.exposure !== 0 ||
               adjustments.contrast !== 0 ||
               adjustments.highlights !== 0 ||
               adjustments.shadows !== 0 ||
               adjustments.whites !== 0 ||
               adjustments.blacks !== 0 ||
               adjustments.clarity !== 0 ||
               adjustments.dehaze !== 0 ||
               adjustments.vibrance !== 0 ||
               adjustments.saturation !== 0 ||
               adjustments.temperature !== 0 ||
               adjustments.tint !== 0 ||
               adjustments.sharpening !== 0 ||
               adjustments.noise !== 0 ||
               adjustments.fade !== 0 ||
               adjustments.curve !== 'linear' ||
               adjustments.splitHighlights.amount > 0 ||
               adjustments.splitShadows.amount > 0;
    }

    function applyAllAdjustments(imageData) {
        const data = imageData.data;
        const len = data.length;

        // Pre-calculate values
        const exposure = adjustments.exposure * 0.02;
        const contrast = (adjustments.contrast + 100) / 100;
        const highlights = adjustments.highlights * 0.01;
        const shadows = adjustments.shadows * 0.01;
        const whites = adjustments.whites * 0.01;
        const blacks = adjustments.blacks * 0.01;
        const clarity = adjustments.clarity * 0.005;
        const dehaze = adjustments.dehaze * 0.01;
        const vibrance = adjustments.vibrance * 0.01;
        const saturation = (adjustments.saturation + 100) / 100;
        const temperature = adjustments.temperature;
        const tint = adjustments.tint;
        const fade = adjustments.fade * 0.01;

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

            // Highlights (affect bright areas)
            if (highlights !== 0) {
                const highlightMask = Math.max(0, (lum - 128) / 128);
                const adj = highlights * highlightMask * 50;
                r += adj;
                g += adj;
                b += adj;
            }

            // Shadows (affect dark areas)
            if (shadows !== 0) {
                const shadowMask = Math.max(0, (128 - lum) / 128);
                const adj = shadows * shadowMask * 50;
                r += adj;
                g += adj;
                b += adj;
            }

            // Whites (clip point for highlights)
            if (whites !== 0) {
                const whiteMask = Math.max(0, (lum - 192) / 64);
                const adj = whites * whiteMask * 30;
                r += adj;
                g += adj;
                b += adj;
            }

            // Blacks (clip point for shadows)
            if (blacks !== 0) {
                const blackMask = Math.max(0, (64 - lum) / 64);
                const adj = blacks * blackMask * 30;
                r += adj;
                g += adj;
                b += adj;
            }

            // Dehaze (adds contrast and saturation to midtones)
            if (dehaze !== 0) {
                const hazeMult = 1 + dehaze * 0.3;
                r = 128 + (r - 128) * hazeMult;
                g = 128 + (g - 128) * hazeMult;
                b = 128 + (b - 128) * hazeMult;
            }

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

            // Convert to HSL for vibrance/saturation
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

            // Apply tone curve
            if (adjustments.curve !== 'linear') {
                const applyCurve = (v) => {
                    const t = v / 255;
                    let result;
                    if (adjustments.curve === 'contrast') {
                        result = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
                    } else if (adjustments.curve === 'fade') {
                        result = 0.1 + t * 0.8;
                    } else {
                        result = t;
                    }
                    return result * 255;
                };
                r = applyCurve(r);
                g = applyCurve(g);
                b = applyCurve(b);
            }

            // Fade effect
            if (fade > 0) {
                const fadeAmount = fade * 30;
                r = r + (128 - r) * fade * 0.3 + fadeAmount * 0.5;
                g = g + (128 - g) * fade * 0.3 + fadeAmount * 0.5;
                b = b + (128 - b) * fade * 0.3 + fadeAmount * 0.5;
            }

            // Clamp
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }
    }

    function applyVignette(ctx, width, height) {
        const amount = adjustments.vignette / 100;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.sqrt(centerX * centerX + centerY * centerY);

        const gradient = ctx.createRadialGradient(
            centerX, centerY, radius * 0.2,
            centerX, centerY, radius
        );

        if (amount > 0) {
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(0, 0, 0, ${amount * 0.7})`);
        } else {
            gradient.addColorStop(0, `rgba(255, 255, 255, ${-amount * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function applyGrain(ctx, width, height) {
        const amount = adjustments.grain / 100;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * amount * 50;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // Simple unsharp mask for sharpening
    function applySharpening(ctx, width, height) {
        if (adjustments.sharpening === 0) return;

        const amount = adjustments.sharpening / 100;
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
                    data[idx] = data[idx] + (sum - data[idx]) * amount;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // Simple box blur for noise reduction
    function applyNoiseReduction(ctx, width, height) {
        if (adjustments.noise === 0) return;

        const amount = adjustments.noise / 100;
        const radius = Math.ceil(amount * 3);
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

    // Crop handling
    function updateCropBoxUI() {
        el.cropBox.style.left = cropBox.x + 'px';
        el.cropBox.style.top = cropBox.y + 'px';
        el.cropBox.style.width = cropBox.width + 'px';
        el.cropBox.style.height = cropBox.height + 'px';
    }

    function getEventPosition(e) {
        const rect = el.canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    function startDrag(e) {
        if (e.target.classList.contains('crop-handle')) return;
        e.preventDefault();
        isDragging = true;
        dragStart = getEventPosition(e);
        cropStart = { ...cropBox };
    }

    function startResize(e) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        activeHandle = e.target.dataset.handle;
        dragStart = getEventPosition(e);
        cropStart = { ...cropBox };
    }

    function handleMove(e) {
        if (!isDragging && !isResizing) return;
        e.preventDefault();

        const pos = getEventPosition(e);
        const dx = pos.x - dragStart.x;
        const dy = pos.y - dragStart.y;

        if (isDragging) {
            cropBox.x = Math.max(0, Math.min(el.canvas.width - cropBox.width, cropStart.x + dx));
            cropBox.y = Math.max(0, Math.min(el.canvas.height - cropBox.height, cropStart.y + dy));
        } else if (isResizing) {
            resizeCropBox(dx, dy);
        }

        updateCropBoxUI();
        updateInfo();
    }

    function resizeCropBox(dx, dy) {
        let newX = cropStart.x;
        let newY = cropStart.y;
        let newWidth = cropStart.width;
        let newHeight = cropStart.height;

        const handle = activeHandle;
        const modifyLeft = handle.includes('w');
        const modifyRight = handle.includes('e');
        const modifyTop = handle.includes('n');
        const modifyBottom = handle.includes('s');

        if (modifyRight) newWidth = cropStart.width + dx;
        if (modifyLeft) {
            newWidth = cropStart.width - dx;
            newX = cropStart.x + dx;
        }
        if (modifyBottom) newHeight = cropStart.height + dy;
        if (modifyTop) {
            newHeight = cropStart.height - dy;
            newY = cropStart.y + dy;
        }

        // Enforce aspect ratio
        if (aspectRatio !== null) {
            if (modifyRight || modifyLeft) {
                newHeight = newWidth / aspectRatio;
                if (modifyTop) newY = cropStart.y + cropStart.height - newHeight;
            } else {
                newWidth = newHeight * aspectRatio;
                if (modifyLeft) newX = cropStart.x + cropStart.width - newWidth;
            }
        }

        // Enforce minimum size
        if (newWidth < MIN_CROP_SIZE) {
            newWidth = MIN_CROP_SIZE;
            if (modifyLeft) newX = cropStart.x + cropStart.width - MIN_CROP_SIZE;
        }
        if (newHeight < MIN_CROP_SIZE) {
            newHeight = MIN_CROP_SIZE;
            if (modifyTop) newY = cropStart.y + cropStart.height - MIN_CROP_SIZE;
        }

        // Enforce bounds
        if (newX < 0) { newWidth += newX; newX = 0; }
        if (newY < 0) { newHeight += newY; newY = 0; }
        if (newX + newWidth > el.canvas.width) newWidth = el.canvas.width - newX;
        if (newY + newHeight > el.canvas.height) newHeight = el.canvas.height - newY;

        cropBox = { x: newX, y: newY, width: newWidth, height: newHeight };
    }

    function stopInteraction() {
        if (isDragging || isResizing) {
            saveToHistory();
        }
        isDragging = false;
        isResizing = false;
        activeHandle = null;
    }

    // Presets and ratios
    function applyPreset(presetId) {
        const preset = presets[presetId];
        if (!preset) return;

        document.querySelectorAll('.preset-item').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-preset="${presetId}"]`)?.classList.add('active');

        aspectRatio = preset.ratio;
        exportWidth = preset.width;
        exportHeight = preset.height;

        document.querySelectorAll('.ratio-btn').forEach(btn => btn.classList.remove('active'));
        applyCropAspectRatio();
        updateInfo();
        saveToHistory();
    }

    function setAspectRatio(ratio) {
        document.querySelectorAll('.ratio-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-ratio="${ratio}"]`)?.classList.add('active');
        document.querySelectorAll('.preset-item').forEach(btn => btn.classList.remove('active'));

        if (ratio === 'free') {
            aspectRatio = null;
            exportWidth = null;
            exportHeight = null;
        } else {
            const [w, h] = ratio.split(':').map(Number);
            aspectRatio = w / h;
            exportWidth = null;
            exportHeight = null;
        }

        applyCropAspectRatio();
        updateInfo();
        saveToHistory();
    }

    function applyCropAspectRatio() {
        if (aspectRatio === null) return;

        const canvasWidth = el.canvas.width;
        const canvasHeight = el.canvas.height;
        const canvasRatio = canvasWidth / canvasHeight;

        let newWidth, newHeight;

        if (aspectRatio > canvasRatio) {
            newWidth = canvasWidth * 0.9;
            newHeight = newWidth / aspectRatio;
        } else {
            newHeight = canvasHeight * 0.9;
            newWidth = newHeight * aspectRatio;
        }

        cropBox = {
            x: (canvasWidth - newWidth) / 2,
            y: (canvasHeight - newHeight) / 2,
            width: newWidth,
            height: newHeight
        };

        updateCropBoxUI();
    }

    // Info updates
    function updateInfo() {
        if (originalImage) {
            el.infoDimensions.textContent = `${originalImage.width}×${originalImage.height}`;
        }

        if (exportWidth && exportHeight) {
            el.infoExport.textContent = `${exportWidth}×${exportHeight}`;
        } else {
            const w = Math.round(cropBox.width / displayScale);
            const h = Math.round(cropBox.height / displayScale);
            el.infoExport.textContent = `${w}×${h}`;
        }
    }

    // History - debounced to prevent excessive saves
    function saveToHistory() {
        if (historySaveTimeout) {
            clearTimeout(historySaveTimeout);
        }
        historySaveTimeout = setTimeout(() => {
            saveToHistoryImmediate();
        }, 300);
    }

    // Immediate save (used for discrete actions like button clicks)
    function saveToHistoryImmediate() {
        if (historySaveTimeout) {
            clearTimeout(historySaveTimeout);
            historySaveTimeout = null;
        }

        const state = {
            cropBox: { ...cropBox },
            adjustments: JSON.parse(JSON.stringify(adjustments)),
            aspectRatio,
            exportWidth,
            exportHeight,
            rotation,
            flipH,
            flipV
        };

        history = history.slice(0, historyIndex + 1);
        history.push(state);

        if (history.length > MAX_HISTORY) {
            history.shift();
        } else {
            historyIndex++;
        }

        updateHistoryButtons();
    }

    function undo() {
        if (historyIndex <= 0) return;
        historyIndex--;
        restoreState(history[historyIndex]);
        updateHistoryButtons();
    }

    function redo() {
        if (historyIndex >= history.length - 1) return;
        historyIndex++;
        restoreState(history[historyIndex]);
        updateHistoryButtons();
    }

    function restoreState(state) {
        cropBox = { ...state.cropBox };
        adjustments = JSON.parse(JSON.stringify(state.adjustments));
        aspectRatio = state.aspectRatio;
        exportWidth = state.exportWidth;
        exportHeight = state.exportHeight;
        rotation = state.rotation || 0;
        flipH = state.flipH || false;
        flipV = state.flipV || false;

        updateAllSliders();
        updateCropBoxUI();
        updateInfo();
        renderCanvas();
        drawToneCurve();
    }

    function updateAllSliders() {
        const sliders = [
            'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks',
            'clarity', 'dehaze', 'vibrance', 'saturation',
            'temperature', 'tint',
            'sharpening', 'noise', 'vignette', 'grain', 'fade', 'distortion'
        ];

        sliders.forEach(key => {
            const slider = document.getElementById(`${key}-slider`);
            const value = document.getElementById(`${key}-value`);
            if (slider && value) {
                slider.value = adjustments[key];
                value.textContent = adjustments[key];
            }
        });

        updateHSLSliders();
    }

    function updateHistoryButtons() {
        el.undoBtn.disabled = historyIndex <= 0;
        el.redoBtn.disabled = historyIndex >= history.length - 1;
    }

    // Transforms
    function rotate(degrees) {
        rotation = (rotation + degrees + 360) % 360;
        setupCanvas();
        saveToHistory();
    }

    function flip(direction) {
        if (direction === 'horizontal') flipH = !flipH;
        else flipV = !flipV;
        renderCanvas();
        saveToHistory();
    }

    // Zoom
    function zoomIn() {
        zoomScale = Math.min(3, zoomScale * 1.25);
        applyZoom();
    }

    function zoomOut() {
        zoomScale = Math.max(0.1, zoomScale / 1.25);
        applyZoom();
    }

    function zoomFit() {
        zoomScale = 1;
        applyZoom();
    }

    function applyZoom() {
        el.canvas.style.transform = `scale(${zoomScale})`;
        el.cropOverlay.style.transform = `scale(${zoomScale})`;
        updateZoomDisplay();
    }

    function updateZoomDisplay() {
        el.zoomLevel.textContent = Math.round(zoomScale * 100) + '%';
    }

    // Before/After toggle
    let showingOriginal = false;
    function toggleBeforeAfter() {
        showingOriginal = !showingOriginal;
        if (showingOriginal) {
            const ctx = el.canvas.getContext('2d');
            ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
            ctx.drawImage(originalImage, 0, 0, el.canvas.width, el.canvas.height);
        } else {
            renderCanvas();
        }
    }

    // Tabs
    function switchTab(tabId) {
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
    }

    // Reset functions
    function resetBasic() {
        adjustments.exposure = 0;
        adjustments.contrast = 0;
        adjustments.highlights = 0;
        adjustments.shadows = 0;
        adjustments.whites = 0;
        adjustments.blacks = 0;
        adjustments.clarity = 0;
        adjustments.dehaze = 0;
        adjustments.vibrance = 0;
        adjustments.saturation = 0;
        updateAllSliders();
        scheduleRender();
        saveToHistory();
    }

    function resetTone() {
        adjustments.temperature = 0;
        adjustments.tint = 0;
        adjustments.curve = 'linear';
        updateAllSliders();
        drawToneCurve();
        scheduleRender();
        saveToHistory();
    }

    function resetColor() {
        hslColors.forEach(color => {
            adjustments.hsl[color] = { hue: 0, sat: 0, lum: 0 };
        });
        adjustments.splitHighlights = { color: '#000000', amount: 0 };
        adjustments.splitShadows = { color: '#000000', amount: 0 };
        adjustments.splitBalance = 0;
        updateHSLSliders();
        scheduleRender();
        saveToHistory();
    }

    function resetEffects() {
        adjustments.sharpening = 0;
        adjustments.noise = 0;
        adjustments.vignette = 0;
        adjustments.grain = 0;
        adjustments.fade = 0;
        adjustments.distortion = 0;
        updateAllSliders();
        scheduleRender();
        saveToHistory();
    }

    function resetAllAdjustments() {
        adjustments = {
            exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
            clarity: 0, dehaze: 0, vibrance: 0, saturation: 0,
            temperature: 0, tint: 0, curve: 'linear',
            sharpening: 0, noise: 0, vignette: 0, grain: 0, fade: 0, distortion: 0,
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
            splitHighlights: { color: '#000000', amount: 0 },
            splitShadows: { color: '#000000', amount: 0 },
            splitBalance: 0
        };
        updateAllSliders();
        drawToneCurve();
    }

    // Export
    function exportImage() {
        if (!originalImage || isProcessing) return;

        showLoading(true, 'Exporting image...', true);
        updateProgress(0);

        setTimeout(() => {
            try {
                performExport();
            } catch (error) {
                showError('Export failed: ' + error.message);
            } finally {
                showLoading(false);
            }
        }, 50);
    }

    function performExport() {
        let finalWidth, finalHeight;

        if (el.resizeToggle.checked) {
            finalWidth = parseInt(el.resizeWidth.value);
            finalHeight = parseInt(el.resizeHeight.value);
        } else if (exportWidth && exportHeight) {
            finalWidth = exportWidth;
            finalHeight = exportHeight;
        } else {
            finalWidth = Math.round(cropBox.width / displayScale);
            finalHeight = Math.round(cropBox.height / displayScale);
        }

        updateProgress(10);

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
        if (rotation !== 0) exportCtx.rotate((rotation * Math.PI) / 180);
        if (flipH) exportCtx.scale(-1, 1);
        if (flipV) exportCtx.scale(1, -1);

        let destW = finalWidth, destH = finalHeight;
        if (rotation === 90 || rotation === 270) [destW, destH] = [destH, destW];

        exportCtx.drawImage(
            originalImage,
            sourceX, sourceY, sourceWidth, sourceHeight,
            -destW / 2, -destH / 2, destW, destH
        );
        exportCtx.restore();

        updateProgress(30);

        // Apply adjustments
        if (hasAnyAdjustments()) {
            const imageData = exportCtx.getImageData(0, 0, finalWidth, finalHeight);
            applyAllAdjustments(imageData);
            exportCtx.putImageData(imageData, 0, 0);
        }

        updateProgress(50);

        // Apply effects
        if (adjustments.sharpening > 0) {
            applySharpening(exportCtx, finalWidth, finalHeight);
        }
        updateProgress(60);

        if (adjustments.noise > 0) {
            applyNoiseReduction(exportCtx, finalWidth, finalHeight);
        }
        updateProgress(70);

        if (adjustments.vignette !== 0) {
            applyVignette(exportCtx, finalWidth, finalHeight);
        }
        if (adjustments.grain > 0) {
            applyGrain(exportCtx, finalWidth, finalHeight);
        }

        updateProgress(80);

        // Generate download
        const format = el.formatSelect.value;
        const quality = parseInt(el.qualitySlider.value) / 100;
        let mimeType = 'image/jpeg';
        if (format === 'png') mimeType = 'image/png';
        else if (format === 'webp') mimeType = 'image/webp';

        const dataURL = format === 'png'
            ? exportCanvas.toDataURL(mimeType)
            : exportCanvas.toDataURL(mimeType, quality);

        updateProgress(95);

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 10);
        link.download = `image-${timestamp}-${finalWidth}x${finalHeight}.${format}`;
        link.href = dataURL;
        link.click();

        updateProgress(100);
    }

    function updateQualityVisibility() {
        const format = el.formatSelect.value;
        el.qualityRow.style.display = format === 'png' ? 'none' : 'grid';
    }

    // Reset to upload
    function resetToUpload() {
        originalImage = null;
        el.fileInput.value = '';
        el.uploadSection.classList.remove('hidden');
        el.editorSection.classList.add('hidden');
        history = [];
        historyIndex = -1;
    }

    // Utilities
    function showLoading(show, text = 'Processing...', showProgress = false) {
        isProcessing = show;
        el.loadingOverlay.classList.toggle('hidden', !show);
        if (el.loadingText) el.loadingText.textContent = text;
        if (el.progressBar) el.progressBar.classList.toggle('hidden', !showProgress);
        if (el.progressFill) el.progressFill.style.width = '0%';
    }

    function updateProgress(percent) {
        if (el.progressFill) {
            el.progressFill.style.width = `${Math.min(100, percent)}%`;
        }
    }

    function showError(message) {
        el.errorMessage.textContent = message;
        el.errorMessage.classList.remove('hidden');
        setTimeout(() => el.errorMessage.classList.add('hidden'), 5000);
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    function handleWindowResize() {
        if (originalImage) setupCanvas();
    }

    function handleKeyboard(e) {
        if (el.editorSection.classList.contains('hidden')) return;

        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
            e.preventDefault();
            redo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            redo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            exportImage();
        }
        if (e.key === '\\') {
            toggleBeforeAfter();
        }
        if (e.key === '+' || e.key === '=') zoomIn();
        if (e.key === '-') zoomOut();
        if (e.key === '0') zoomFit();
    }

    // Start
    init();
})();
