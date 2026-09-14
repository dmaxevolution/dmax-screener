V4.0.3 STABLE FIX

PENYEBAB 0 EMITEN: app.js berhenti sebelum load() karena fungsi exchangeClock() memanggil ID elemen header yang tidak ada. Error JavaScript ini membuat data.json tidak pernah dirender.

FIX:
1. Semua elemen header opsional sekarang aman jika tidak ada.
2. Service Worker lama otomatis di-unregister, tanpa register ulang pada build ini.
3. data.json dibaca network no-store.
4. Data 99 emiten tetap bawaan ZIP.
