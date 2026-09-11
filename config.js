// Variable State Global
let globalData = {};
let currentTab = 'swing_setup';
let pantauanList = JSON.parse(localStorage.getItem('pantauan_stocks') || '[]');
let searchTimeout = null;

// Fungsi Mengambil Data Pantauan
function getPantauanData() {
    const all = globalData.all_stocks || [];
    return pantauanList.map(ticker => {
        const found = all.find(s => s.ticker === ticker);
        return found || { ticker: ticker, close: 0, change_pct: 0, category: 'Pantauan Manual', signal: 'NEUTRAL', power_score: 5 };
    });
}

// Tambah Emiten ke Pantauan
function addToPantauan(ticker) {
    if (!pantauanList.includes(ticker)) {
        pantauanList.push(ticker);
        localStorage.setItem('pantauan_stocks', JSON.stringify(pantauanList));
        updateTabCounts();
        renderCurrentTab();
    }
}

// Hapus Emiten dari Pantauan
function removeFromPantauan(ticker) {
    pantauanList = pantauanList.filter(t => t !== ticker);
    localStorage.setItem('pantauan_stocks', JSON.stringify(pantauanList));
    updateTabCounts();
    renderCurrentTab();
}