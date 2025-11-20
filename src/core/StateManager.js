// Centralized state management
import { DEFAULT_ADJUSTMENTS } from '../utils/constants.js';

class StateManager {
    constructor() {
        this.originalImage = null;
        this.displayScale = 1;
        this.cropBox = { x: 0, y: 0, width: 100, height: 100 };
        this.aspectRatio = null;
        this.exportWidth = null;
        this.exportHeight = null;
        this.isDragging = false;
        this.isResizing = false;
        this.activeHandle = null;
        this.dragStart = { x: 0, y: 0 };
        this.cropStart = { x: 0, y: 0, width: 0, height: 0 };
        this.isProcessing = false;
        this.renderTimeout = null;
        this.historySaveTimeout = null;
        this.originalResizeRatio = 1;

        // Transform state
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.zoomScale = 1;

        // Adjustments
        this.adjustments = JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS));

        // HSL mode
        this.currentHslMode = 'hue';

        // Before/after
        this.showingOriginal = false;
    }

    reset() {
        this.originalImage = null;
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.zoomScale = 1;
        this.aspectRatio = null;
        this.exportWidth = null;
        this.exportHeight = null;
        this.adjustments = JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS));
    }

    resetAdjustments() {
        this.adjustments = JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS));
    }

    getState() {
        return {
            cropBox: { ...this.cropBox },
            adjustments: JSON.parse(JSON.stringify(this.adjustments)),
            aspectRatio: this.aspectRatio,
            exportWidth: this.exportWidth,
            exportHeight: this.exportHeight,
            rotation: this.rotation,
            flipH: this.flipH,
            flipV: this.flipV
        };
    }

    restoreState(state) {
        this.cropBox = { ...state.cropBox };
        this.adjustments = JSON.parse(JSON.stringify(state.adjustments));
        this.aspectRatio = state.aspectRatio;
        this.exportWidth = state.exportWidth;
        this.exportHeight = state.exportHeight;
        this.rotation = state.rotation || 0;
        this.flipH = state.flipH || false;
        this.flipV = state.flipV || false;
    }

    hasAnyAdjustments() {
        const adj = this.adjustments;
        return adj.exposure !== 0 ||
               adj.contrast !== 0 ||
               adj.highlights !== 0 ||
               adj.shadows !== 0 ||
               adj.whites !== 0 ||
               adj.blacks !== 0 ||
               adj.clarity !== 0 ||
               adj.dehaze !== 0 ||
               adj.vibrance !== 0 ||
               adj.saturation !== 0 ||
               adj.temperature !== 0 ||
               adj.tint !== 0 ||
               adj.sharpening !== 0 ||
               adj.noise !== 0 ||
               adj.fade !== 0 ||
               this.hasCurveAdjustments() ||
               adj.splitHighlights.amount > 0 ||
               adj.splitShadows.amount > 0;
    }

    hasCurveAdjustments() {
        const points = this.adjustments.curvePoints;
        if (!points || points.length === 2) {
            // Check if it's just the linear default
            if (points[0].x === 0 && points[0].y === 0 &&
                points[1].x === 1 && points[1].y === 1) {
                return false;
            }
        }
        return true;
    }
}

export const state = new StateManager();
export default StateManager;
