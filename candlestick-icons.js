// candlestick-icons.js

/**
 * Menghasilkan SVG Icon inline berdasarkan nama pola candlestick.
 * @param {string} pattern - Nama pola ('B-HAMMER', 'B-ENGULF', 'BEAR-ENGULF', 'G-CROSS')
 * @returns {string} String HTML elemen SVG
 */
export function getCandleIconSVG(pattern) {
  switch (pattern) {
    case 'B-HAMMER':
      // Body kecil di atas, tail/shadow bawah panjang (Hijau)
      return `
        <svg class="w-3.5 h-3.5 inline-block mr-1 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <!-- Sumbu / Shadow -->
          <line x1="12" y1="2" x2="12" y2="22" />
          <!-- Body Hammer (Atas) -->
          <rect x="8" y="2" width="8" height="6" fill="currentColor" rx="1" />
        </svg>
      `;

    case 'B-ENGULF':
      // Dual Candle: Candle kecil (kiri), Candle besar menutup penuh (kanan - Hijau)
      return `
        <svg class="w-4 h-3.5 inline-block mr-1 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Candle 1 Merah (Kecil) -->
          <line x1="6" y1="8" x2="6" y2="18" class="text-red-500" />
          <rect x="4" y="10" width="4" height="6" class="text-red-500" fill="currentColor" />
          <!-- Candle 2 Hijau (Engulfing Besar) -->
          <line x1="16" y1="2" x2="16" y2="22" />
          <rect x="13" y="4" width="6" height="15" fill="currentColor" rx="1" />
        </svg>
      `;

    case 'BEAR-ENGULF':
      // Dual Candle: Candle kecil hijau, Candle besar menutup penuh (kanan - Merah)
      return `
        <svg class="w-4 h-3.5 inline-block mr-1 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Candle 1 Hijau (Kecil) -->
          <line x1="6" y1="8" x2="6" y2="18" class="text-green-500" />
          <rect x="4" y="10" width="4" height="6" class="text-green-500" fill="currentColor" />
          <!-- Candle 2 Merah (Engulfing Besar) -->
          <line x1="16" y1="2" x2="16" y2="22" />
          <rect x="13" y="4" width="6" height="15" fill="currentColor" rx="1" />
        </svg>
      `;

    case 'G-CROSS':
      // Persilangan Garis Trend EMA (Emas/Hijau)
      return `
        <svg class="w-3.5 h-3.5 inline-block mr-1 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 18L21 6" class="text-green-400" />
          <path d="M3 6L21 18" class="text-blue-400" />
          <circle cx="12" cy="12" r="2" fill="currentColor" class="text-yellow-400" />
        </svg>
      `;

    default:
      return '';
  }
}