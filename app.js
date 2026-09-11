// Memuat Data JSON Utama dari Server
async function loadData() {
    try {
        const response = await fetch('data.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error("Gagal memuat data.json");
        
        globalData = await response.json();
        document.getElementById('last-updated').innerText = 'Terakhir Diperbarui: ' + (globalData.last_updated || 'N/A');
        
        renderIHSG(globalData.ihsg || {});
        updateTabCounts();
        renderTop10Entry(globalData.top_10_entry || []);
        renderCurrentTab();
    } catch (error) {
        console.error(error);
        document.getElementById('last-updated').innerText = 'Error: Gagal memuat data';
    }
}

// Fungsi Berpindah Tab Filter
function switchTab(tabKey) {
    currentTab = tabKey;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-green-600', 'text-white', 'shadow-md');
        btn.classList.add('bg-gray-800', 'text-gray-300');
    });
    const activeBtn = document.getElementById('tab-' + tabKey);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-800', 'text-gray-300');
        activeBtn.classList.add('bg-green-600', 'text-white', 'shadow-md');
    }
    renderCurrentTab();
}

// Copy Ticker ke Clipboard
function copyTicker(ticker) {
    navigator.clipboard.writeText(ticker);
    const statusEl = document.getElementById('search-status-text');
    statusEl.className = "text-[11px] text-green-400 font-semibold min-h-[16px] px-1";
    statusEl.innerText = `✓ Kode emiten ${ticker} berhasil dicopy!`;
    setTimeout(() => { statusEl.innerText = ''; }, 2000);
}

// Fitur Pencarian Langsung (Live Search)
function liveSearch() {
    clearTimeout(searchTimeout);
    const statusEl = document.getElementById('search-status-text');
    const clearBtn = document.getElementById('clear-search-btn');
    const input = document.getElementById('search-input').value.trim().toUpperCase();

    if (!input) {
        statusEl.innerText = '';
        clearBtn.classList.add('hidden');
        return;
    }

    clearBtn.classList.remove('hidden');
    statusEl.className = "text-[11px] text-gray-400 min-h-[16px] px-1";
    statusEl.innerText = `Mencari '${input}'...`;

    searchTimeout = setTimeout(() => {
        executeSearch(false);
    }, 300);
}

// Clear Field Input Search
function clearSearchInput() {
    document.getElementById('search-input').value = '';
    document.getElementById('clear-search-btn').classList.add('hidden');
    document.getElementById('search-status-text').innerText = '';
}

// Eksekusi Pencarian Emiten
function executeSearch(isManualClick = false) {
    const input = document.getElementById('search-input').value.trim().toUpperCase();
    const statusEl = document.getElementById('search-status-text');
    if (!input) return;

    let targetCategory = null;
    let targetStock = null;
    const categories = ['swing_setup', 'top_gainers', 'top_movers', 'bluechips', 'top_bearish', 'all_stocks'];

    for (const cat of categories) {
        if (globalData[cat]) {
            const found = globalData[cat].find(s => s.ticker === input);
            if (found) {
                targetCategory = cat;
                targetStock = found;
                break;
            }
        }
    }

    if (targetStock && targetCategory) {
        statusEl.className = "text-[11px] text-green-400 font-semibold min-h-[16px] px-1";
        statusEl.innerText = `✓ Emiten ${targetStock.ticker} ditemukan di kategori ${targetCategory.replace('_', ' ').toUpperCase()}`;

        if (currentTab !== targetCategory) switchTab(targetCategory);

        setTimeout(() => {
            const el = document.getElementById('row-' + targetStock.ticker) || document.getElementById('m-card-' + targetStock.ticker);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.remove('animate-blink');
                void el.offsetWidth;
                el.classList.add('animate-blink');
            }
        }, 100);
    } else {
        if (isManualClick) {
            statusEl.className = "text-[11px] text-yellow-400 font-semibold min-h-[16px] px-1";
            statusEl.innerText = `⚠️ ${input} ditambahkan ke Pantauan.`;

            if (!pantauanList.includes(input)) {
                pantauanList.push(input);
                localStorage.setItem('pantauan_stocks', JSON.stringify(pantauanList));
                updateTabCounts();
            }

            switchTab('pantauan');
        }
    }
}

// Reload Halaman Web
function reloadPage() {
    const icon = document.getElementById('reload-icon');
    icon.classList.add('rotate-180');
    setTimeout(() => location.reload(), 300);
}

// Memasang Event Listener Komponen Input & Tombol
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const executeBtn = document.getElementById('execute-search-btn');
    const reloadBtn = document.getElementById('reload-btn');

    if (searchInput) {
        searchInput.addEventListener('input', liveSearch);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') executeSearch(true);
        });
    }

    if (clearBtn) clearBtn.addEventListener('click', clearSearchInput);
    if (executeBtn) executeBtn.addEventListener('click', () => executeSearch(true));
    if (reloadBtn) reloadBtn.addEventListener('click', reloadPage);

    // Inisialisasi Data Pertama Kali
    loadData();

    // Auto-refresh Data setiap 30 Detik
    setInterval(loadData, 30000);
});