// Image Studio - Professional Photo Editor
// Main entry point for modular architecture

import { state } from './core/StateManager.js';
import { historyManager } from './core/HistoryManager.js';
import { eventBus } from './core/EventBus.js';
import { debounce } from './utils/debounce.js';
import { MAX_FILE_SIZE, MIN_CROP_SIZE, PRESETS, HSL_COLORS, DEFAULT_ADJUSTMENTS } from './utils/constants.js';
import { renderImage, exportImage as processExport } from './core/ImageProcessor.js';
import { drawToneCurve } from './adjustments/ToneAdjustments.js';

(function() {
    'use strict';

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
            if (state.originalImage && historyManager.historyIndex > 0) {
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
                const w = state.exportWidth || Math.round(state.cropBox.width / state.displayScale);
                const h = state.exportHeight || Math.round(state.cropBox.height / state.displayScale);
                el.resizeWidth.value = w;
                el.resizeHeight.value = h;
                state.originalResizeRatio = w / h;
            }
        });

        // Resize lock functionality
        el.resizeWidth.addEventListener('input', () => {
            if (el.resizeLock.checked) {
                el.resizeHeight.value = Math.round(el.resizeWidth.value / state.originalResizeRatio);
            }
        });
        el.resizeHeight.addEventListener('input', () => {
            if (el.resizeLock.checked) {
                el.resizeWidth.value = Math.round(el.resizeHeight.value * state.originalResizeRatio);
            }
        });

        el.exportFinalBtn.addEventListener('click', exportImageHandler);

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);

        // Window resize
        window.addEventListener('resize', debounce(handleWindowResize, 250));
    }

    // Setup all sliders
    function setupSliders() {
        const sliders = [
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
            { id: 'temperature', key: 'temperature' },
            { id: 'tint', key: 'tint' },
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
                    state.adjustments[key] = parseInt(slider.value);
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
                state.adjustments.splitHighlights.color = splitHighlightsColor.value;
                scheduleRender();
            });
        }
        if (splitHighlightsAmount) {
            splitHighlightsAmount.addEventListener('input', () => {
                state.adjustments.splitHighlights.amount = parseInt(splitHighlightsAmount.value);
                scheduleRender();
            });
        }
        if (splitShadowsColor) {
            splitShadowsColor.addEventListener('input', () => {
                state.adjustments.splitShadows.color = splitShadowsColor.value;
                scheduleRender();
            });
        }
        if (splitShadowsAmount) {
            splitShadowsAmount.addEventListener('input', () => {
                state.adjustments.splitShadows.amount = parseInt(splitShadowsAmount.value);
                scheduleRender();
            });
        }
        if (splitBalance) {
            splitBalance.addEventListener('input', () => {
                state.adjustments.splitBalance = parseInt(splitBalance.value);
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

        HSL_COLORS.forEach(color => {
            const value = state.adjustments.hsl[color][state.currentHslMode === 'sat' ? 'sat' : state.currentHslMode === 'lum' ? 'lum' : 'hue'];
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
                const prop = state.currentHslMode === 'sat' ? 'sat' : state.currentHslMode === 'lum' ? 'lum' : 'hue';
                state.adjustments.hsl[color][prop] = parseInt(slider.value);
                valueSpan.textContent = slider.value;
                scheduleRender();
            });

            el.hslSliders.appendChild(div);
        });
    }

    function switchHSLMode(mode) {
        state.currentHslMode = mode;
        document.querySelectorAll('.hsl-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.hsl === mode);
        });
        updateHSLSliders();
    }

    // Tone curve
    function setupToneCurve() {
        drawToneCurve(el.curveCanvas, state.adjustments.curve);
    }

    function applyCurvePreset(curve) {
        state.adjustments.curve = curve;
        drawToneCurve(el.curveCanvas, curve);
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
                state.originalImage = img;
                state.rotation = 0;
                state.flipH = false;
                state.flipV = false;
                state.zoomScale = 1;
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

        let imgWidth = state.originalImage.width;
        let imgHeight = state.originalImage.height;

        if (state.rotation === 90 || state.rotation === 270) {
            [imgWidth, imgHeight] = [imgHeight, imgWidth];
        }

        state.displayScale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);

        const canvasWidth = imgWidth * state.displayScale;
        const canvasHeight = imgHeight * state.displayScale;

        el.canvas.width = canvasWidth;
        el.canvas.height = canvasHeight;

        state.cropBox = {
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight
        };

        state.aspectRatio = null;
        state.exportWidth = null;
        state.exportHeight = null;

        historyManager.clear();

        state.resetAdjustments();
        historyManager.saveImmediate(state.getState());

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
        if (state.renderTimeout) {
            cancelAnimationFrame(state.renderTimeout);
        }
        state.renderTimeout = requestAnimationFrame(() => {
            renderCanvas();
        });
    }

    function renderCanvas() {
        renderImage(el.canvas, state.originalImage, state);
    }

    // Crop handling
    function updateCropBoxUI() {
        el.cropBox.style.left = state.cropBox.x + 'px';
        el.cropBox.style.top = state.cropBox.y + 'px';
        el.cropBox.style.width = state.cropBox.width + 'px';
        el.cropBox.style.height = state.cropBox.height + 'px';
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
        state.isDragging = true;
        state.dragStart = getEventPosition(e);
        state.cropStart = { ...state.cropBox };
    }

    function startResize(e) {
        e.preventDefault();
        e.stopPropagation();
        state.isResizing = true;
        state.activeHandle = e.target.dataset.handle;
        state.dragStart = getEventPosition(e);
        state.cropStart = { ...state.cropBox };
    }

    function handleMove(e) {
        if (!state.isDragging && !state.isResizing) return;
        e.preventDefault();

        const pos = getEventPosition(e);
        const dx = pos.x - state.dragStart.x;
        const dy = pos.y - state.dragStart.y;

        if (state.isDragging) {
            state.cropBox.x = Math.max(0, Math.min(el.canvas.width - state.cropBox.width, state.cropStart.x + dx));
            state.cropBox.y = Math.max(0, Math.min(el.canvas.height - state.cropBox.height, state.cropStart.y + dy));
        } else if (state.isResizing) {
            resizeCropBox(dx, dy);
        }

        updateCropBoxUI();
        updateInfo();
    }

    function resizeCropBox(dx, dy) {
        let newX = state.cropStart.x;
        let newY = state.cropStart.y;
        let newWidth = state.cropStart.width;
        let newHeight = state.cropStart.height;

        const handle = state.activeHandle;
        const modifyLeft = handle.includes('w');
        const modifyRight = handle.includes('e');
        const modifyTop = handle.includes('n');
        const modifyBottom = handle.includes('s');

        if (modifyRight) newWidth = state.cropStart.width + dx;
        if (modifyLeft) {
            newWidth = state.cropStart.width - dx;
            newX = state.cropStart.x + dx;
        }
        if (modifyBottom) newHeight = state.cropStart.height + dy;
        if (modifyTop) {
            newHeight = state.cropStart.height - dy;
            newY = state.cropStart.y + dy;
        }

        // Enforce aspect ratio
        if (state.aspectRatio !== null) {
            if (modifyRight || modifyLeft) {
                newHeight = newWidth / state.aspectRatio;
                if (modifyTop) newY = state.cropStart.y + state.cropStart.height - newHeight;
            } else {
                newWidth = newHeight * state.aspectRatio;
                if (modifyLeft) newX = state.cropStart.x + state.cropStart.width - newWidth;
            }
        }

        // Enforce minimum size
        if (newWidth < MIN_CROP_SIZE) {
            newWidth = MIN_CROP_SIZE;
            if (modifyLeft) newX = state.cropStart.x + state.cropStart.width - MIN_CROP_SIZE;
        }
        if (newHeight < MIN_CROP_SIZE) {
            newHeight = MIN_CROP_SIZE;
            if (modifyTop) newY = state.cropStart.y + state.cropStart.height - MIN_CROP_SIZE;
        }

        // Enforce bounds
        if (newX < 0) { newWidth += newX; newX = 0; }
        if (newY < 0) { newHeight += newY; newY = 0; }
        if (newX + newWidth > el.canvas.width) newWidth = el.canvas.width - newX;
        if (newY + newHeight > el.canvas.height) newHeight = el.canvas.height - newY;

        state.cropBox = { x: newX, y: newY, width: newWidth, height: newHeight };
    }

    function stopInteraction() {
        if (state.isDragging || state.isResizing) {
            saveToHistory();
        }
        state.isDragging = false;
        state.isResizing = false;
        state.activeHandle = null;
    }

    // Presets and ratios
    function applyPreset(presetId) {
        const preset = PRESETS[presetId];
        if (!preset) return;

        document.querySelectorAll('.preset-item').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-preset="${presetId}"]`)?.classList.add('active');

        state.aspectRatio = preset.ratio;
        state.exportWidth = preset.width;
        state.exportHeight = preset.height;

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
            state.aspectRatio = null;
            state.exportWidth = null;
            state.exportHeight = null;
        } else {
            const [w, h] = ratio.split(':').map(Number);
            state.aspectRatio = w / h;
            state.exportWidth = null;
            state.exportHeight = null;
        }

        applyCropAspectRatio();
        updateInfo();
        saveToHistory();
    }

    function applyCropAspectRatio() {
        if (state.aspectRatio === null) return;

        const canvasWidth = el.canvas.width;
        const canvasHeight = el.canvas.height;
        const canvasRatio = canvasWidth / canvasHeight;

        let newWidth, newHeight;

        if (state.aspectRatio > canvasRatio) {
            newWidth = canvasWidth * 0.9;
            newHeight = newWidth / state.aspectRatio;
        } else {
            newHeight = canvasHeight * 0.9;
            newWidth = newHeight * state.aspectRatio;
        }

        state.cropBox = {
            x: (canvasWidth - newWidth) / 2,
            y: (canvasHeight - newHeight) / 2,
            width: newWidth,
            height: newHeight
        };

        updateCropBoxUI();
    }

    // Info updates
    function updateInfo() {
        if (state.originalImage) {
            el.infoDimensions.textContent = `${state.originalImage.width}×${state.originalImage.height}`;
        }

        if (state.exportWidth && state.exportHeight) {
            el.infoExport.textContent = `${state.exportWidth}×${state.exportHeight}`;
        } else {
            const w = Math.round(state.cropBox.width / state.displayScale);
            const h = Math.round(state.cropBox.height / state.displayScale);
            el.infoExport.textContent = `${w}×${h}`;
        }
    }

    // History
    function saveToHistory() {
        historyManager.save(state.getState(), updateHistoryButtons);
    }

    function undo() {
        const prevState = historyManager.undo();
        if (prevState) {
            state.restoreState(prevState);
            updateAllSliders();
            updateCropBoxUI();
            updateInfo();
            renderCanvas();
            drawToneCurve(el.curveCanvas, state.adjustments.curve);
            updateHistoryButtons();
        }
    }

    function redo() {
        const nextState = historyManager.redo();
        if (nextState) {
            state.restoreState(nextState);
            updateAllSliders();
            updateCropBoxUI();
            updateInfo();
            renderCanvas();
            drawToneCurve(el.curveCanvas, state.adjustments.curve);
            updateHistoryButtons();
        }
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
                slider.value = state.adjustments[key];
                value.textContent = state.adjustments[key];
            }
        });

        updateHSLSliders();
    }

    function updateHistoryButtons() {
        el.undoBtn.disabled = !historyManager.canUndo();
        el.redoBtn.disabled = !historyManager.canRedo();
    }

    // Transforms
    function rotate(degrees) {
        state.rotation = (state.rotation + degrees + 360) % 360;
        setupCanvas();
        saveToHistory();
    }

    function flip(direction) {
        if (direction === 'horizontal') state.flipH = !state.flipH;
        else state.flipV = !state.flipV;
        renderCanvas();
        saveToHistory();
    }

    // Zoom
    function zoomIn() {
        state.zoomScale = Math.min(3, state.zoomScale * 1.25);
        applyZoom();
    }

    function zoomOut() {
        state.zoomScale = Math.max(0.1, state.zoomScale / 1.25);
        applyZoom();
    }

    function zoomFit() {
        state.zoomScale = 1;
        applyZoom();
    }

    function applyZoom() {
        el.canvas.style.transform = `scale(${state.zoomScale})`;
        el.cropOverlay.style.transform = `scale(${state.zoomScale})`;
        updateZoomDisplay();
    }

    function updateZoomDisplay() {
        el.zoomLevel.textContent = Math.round(state.zoomScale * 100) + '%';
    }

    // Before/After toggle
    function toggleBeforeAfter() {
        state.showingOriginal = !state.showingOriginal;
        if (state.showingOriginal) {
            const ctx = el.canvas.getContext('2d');
            ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
            ctx.drawImage(state.originalImage, 0, 0, el.canvas.width, el.canvas.height);
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
        state.adjustments.exposure = 0;
        state.adjustments.contrast = 0;
        state.adjustments.highlights = 0;
        state.adjustments.shadows = 0;
        state.adjustments.whites = 0;
        state.adjustments.blacks = 0;
        state.adjustments.clarity = 0;
        state.adjustments.dehaze = 0;
        state.adjustments.vibrance = 0;
        state.adjustments.saturation = 0;
        updateAllSliders();
        scheduleRender();
        saveToHistory();
    }

    function resetTone() {
        state.adjustments.temperature = 0;
        state.adjustments.tint = 0;
        state.adjustments.curve = 'linear';
        updateAllSliders();
        drawToneCurve(el.curveCanvas, state.adjustments.curve);
        scheduleRender();
        saveToHistory();
    }

    function resetColor() {
        HSL_COLORS.forEach(color => {
            state.adjustments.hsl[color] = { hue: 0, sat: 0, lum: 0 };
        });
        state.adjustments.splitHighlights = { color: '#000000', amount: 0 };
        state.adjustments.splitShadows = { color: '#000000', amount: 0 };
        state.adjustments.splitBalance = 0;
        updateHSLSliders();
        scheduleRender();
        saveToHistory();
    }

    function resetEffects() {
        state.adjustments.sharpening = 0;
        state.adjustments.noise = 0;
        state.adjustments.vignette = 0;
        state.adjustments.grain = 0;
        state.adjustments.fade = 0;
        state.adjustments.distortion = 0;
        updateAllSliders();
        scheduleRender();
        saveToHistory();
    }

    // Export
    function exportImageHandler() {
        if (!state.originalImage || state.isProcessing) return;

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
        updateProgress(10);

        const options = {
            cropBox: state.cropBox,
            displayScale: state.displayScale,
            format: el.formatSelect.value,
            quality: parseInt(el.qualitySlider.value),
            resizeWidth: el.resizeToggle.checked ? parseInt(el.resizeWidth.value) : null,
            resizeHeight: el.resizeToggle.checked ? parseInt(el.resizeHeight.value) : null,
            exportWidth: state.exportWidth,
            exportHeight: state.exportHeight
        };

        updateProgress(30);

        const result = processExport(el.canvas, state.originalImage, state, options);

        updateProgress(80);

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 10);
        link.download = `image-${timestamp}-${result.finalWidth}x${result.finalHeight}.${options.format}`;
        link.href = result.dataURL;
        link.click();

        updateProgress(100);
    }

    function updateQualityVisibility() {
        const format = el.formatSelect.value;
        el.qualityRow.style.display = format === 'png' ? 'none' : 'grid';
    }

    // Reset to upload
    function resetToUpload() {
        state.reset();
        el.fileInput.value = '';
        el.uploadSection.classList.remove('hidden');
        el.editorSection.classList.add('hidden');
        historyManager.clear();
    }

    // Utilities
    function showLoading(show, text = 'Processing...', showProgress = false) {
        state.isProcessing = show;
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

    function handleWindowResize() {
        if (state.originalImage) setupCanvas();
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
            exportImageHandler();
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
