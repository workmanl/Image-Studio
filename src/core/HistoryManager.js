// Undo/Redo history management
import { MAX_HISTORY } from '../utils/constants.js';

class HistoryManager {
    constructor() {
        this.history = [];
        this.historyIndex = -1;
        this.saveTimeout = null;
    }

    clear() {
        this.history = [];
        this.historyIndex = -1;
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }

    // Debounced save
    save(state, onUpdate) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.saveImmediate(state);
            if (onUpdate) onUpdate();
        }, 300);
    }

    // Immediate save
    saveImmediate(state) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);

        if (this.history.length > MAX_HISTORY) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    canUndo() {
        return this.historyIndex > 0;
    }

    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    undo() {
        if (!this.canUndo()) return null;
        this.historyIndex--;
        return this.history[this.historyIndex];
    }

    redo() {
        if (!this.canRedo()) return null;
        this.historyIndex++;
        return this.history[this.historyIndex];
    }
}

export const historyManager = new HistoryManager();
export default HistoryManager;
