// ui-rotator.js
import { getCandleIconSVG } from './candlestick-icons.js';

class UIRotatorManager {
  constructor() {
    this.currentPhase = 0; // 0 = Pola Candle, 1 = G-CROSS
    this.timer = null;
    this.registeredElements = [];
  }

  /**
   * Menginisialisasi Timer Rotasi Setiap 3 Detik
   */
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.currentPhase = this.currentPhase === 0 ? 1 : 0;
      this.updateAllLabels();
    }, 3000);
  }

  /**
   * Mendaftarkan Elemen DOM untuk Dirotasi
   */
  registerLabel(elementId, data) {
    this.registeredElements.push({ id: elementId, data });
    this.renderElement(elementId, data);
  }

  /**
   * Render Tampilan Berdasarkan Fase Aktif & Hierarki Logic
   */
  renderElement(elementId, data) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const { pattern, isGoldenCross } = data;
    let labelToDisplay = '-';
    let activePattern = pattern;

    // Logika Rotasi Bergantian
    if (isGoldenCross && pattern !== '-') {
      if (this.currentPhase === 0) {
        labelToDisplay = pattern;
      } else {
        labelToDisplay = 'G-CROSS';
        activePattern = 'G-CROSS';
      }
    } else if (isGoldenCross) {
      labelToDisplay = 'G-CROSS';
      activePattern = 'G-CROSS';
    } else {
      labelToDisplay = pattern;
    }

    // Styling Warna & Badge
    let colorClasses = 'bg-gray-950 text-gray-400 border-gray-800';
    if (['B-HAMMER', 'B-ENGULF', 'G-CROSS'].includes(labelToDisplay)) {
      colorClasses = 'bg-[#121212] text-[#00FF00] border-green-900/50';
    } else if (labelToDisplay === 'BEAR-ENGULF') {
      colorClasses = 'bg-[#121212] text-[#FF0000] border-red-900/50';
    }

    const iconSVG = getCandleIconSVG(activePattern);

    // Terapkan perubahan UI tanpa merusak struktur layout
    el.className = `inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${colorClasses} transition-opacity duration-300`;
    el.innerHTML = `${iconSVG}<span>${labelToDisplay}</span>`;
  }

  updateAllLabels() {
    this.registeredElements.forEach((item) => {
      this.renderElement(item.id, item.data);
    });
  }
}

export const rotatorInstance = new UIRotatorManager();