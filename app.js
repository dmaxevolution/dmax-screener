let globalData = {};
let pantauanList = JSON.parse(localStorage.getItem('pantauanList')) || [];
let currentTab = 'entry_now'; // Default Tab Saat Halaman Dibuka

function getPantauanData() {
    const allStocks = globalData['all_stocks'] || [];
    return allStocks.filter(stock => pantauanList.includes(stock.ticker));
}

function addToPantauan(ticker) {
    if (!pantauanList.includes(ticker)) {
        pantauanList.push(ticker);
        localStorage.setItem('pantauanList', JSON.stringify(pantauanList));
        updateTabCounts();
        renderCurrentTab();
    }
}

function removeFromPantauan(ticker) {
    pantauanList = pantauanList.filter(t => t !== ticker);
    localStorage.setItem('pantauanList', JSON.stringify(pantauanList));
    updateTabCounts();
    renderCurrentTab();
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // Reset style semua tombol tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-green-950', 'text-green-400', 'border', 'border-green-500/50');
        btn.classList.add('bg-gray-800', 'text-gray-300');
    });

    // Highlight tombol tab aktif
    const activeBtn = document.getElementById('tab-' + tabName);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-800', 'text-gray-300');
        activeBtn.classList.add('bg-green-950', 'text-green-400', 'border', 'border-green-500/50');
    }

    // Render ulang data tabel & kartu HP
    renderCurrentTab();
}

async function loadData() {
    try {
        const response = await fetch('data.json');
        globalData = await response.json();
        
        // Update Metadata
        if (document.getElementById('last-updated')) {
            document.getElementById('last-updated').innerText = globalData.last_updated || '-';
        }
        
        renderIHSG(globalData.ihsg);

        // Render Top 10 Candidate
        renderTop10Entry(globalData.top_10_entry);
        renderTop10EntryMobile(globalData.top_10_entry);

        // Hitung Jumlah Emiten di Setiap Tab
        updateTabCounts();

        // Paksa Render Tab Default Saat Awal Muat Halaman
        switchTab(currentTab);

    } catch (error) {
        console.error("Gagal memuat file data.json:", error);
    }
}

// Inisialisasi Aplikasi Saat Halaman Selesai Dimuat
document.addEventListener('DOMContentLoaded', loadData);
