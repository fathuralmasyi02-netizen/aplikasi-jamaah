const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwHwAdMyxnXnSfxiCwFajwswL0W10XHaKIXXvEfOucCbnFeqYxOMkMYEuFHK2xQ10CJ/exec"; // Ganti dengan URL hasil Deploy Apps Script Anda
const USER_EMAIL = "jamaah1@example.com"; // Contoh email sesi login aktif jamaah

// Fungsi Pindah Halaman/Tab
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active-panel'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(tabId).classList.add('active-panel');
  event.currentTarget.classList.add('active');
}

// Fitur 1: Memuat Data Profil Jamaah
function loadProfile() {
  fetch(`${APPS_SCRIPT_URL}?action=getProfil&email=${USER_EMAIL}`)
    .then(res => res.json())
    .then(res => {
      if(res.success) {
        const d = res.data;
        document.getElementById('profile-section').innerHTML = `
          <h2 class="section-title">Profil: ${d.nama}</h2>
          <p><b>Grup:</b> ${d.grup} | <b>No. Bus:</b> ${d.no_bus}</p>
          <p><b>Hotel:</b> ${d.hotel} (Kamar: ${d.no_kamar})</p>
          <p><b>Penyakit Bawaan:</b> ${d.penyakit_bawaan || '-'}</p>
          <p><b>Kontak Darurat:</b> ${d.kontak_darurat}</p>
        `;
      }
    });
}

// Fitur 6: Sensor Kompas Arah Kiblat
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', function(event) {
    if(event.alpha !== null) {
      // Sudut perhitungan kasar arah Kiblat dari Arab Saudi
      const kiblatDirection = event.alpha; 
      document.getElementById('compass').style.transform = `rotate(${-kiblatDirection}deg)`;
    }
  }, true);
}

// Fitur 10: Formula Haversine & Geofencing Mengikuti Tour Leader secara Dinamis
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius bumi dalam satuan meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Hasil akhir dalam meter
}

function startGeofencingTracking() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(position => {
      const jamLat = position.coords.latitude;
      const jamLng = position.coords.longitude;

      // 1. Tarik titik koordinat dinamis Tour Leader saat ini
      fetch(`${APPS_SCRIPT_URL}?action=getTLLocation`)
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            const tl = res.data;
            const distance = calculateDistance(jamLat, jamLng, tl.lat, tl.lng);
            let statusHadir = "Belum Hadir";

            // Logika Jarak Radius 20 - 50 Meter
            if (distance <= 50) {
              statusHadir = "Hadir/Sudah Berkumpul";
            } else if (distance > 100) {
              // Trigger Notifikasi Bahaya / Keamanan Keluar Rombongan
              alert("⚠️ PERINGATAN: Anda terpisah terlalu jauh (>100m) dari Tour Leader!");
            }

            // 2. Kirim update otomatis status absensi ke Spreadsheet
            fetch(APPS_SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: "updateJamaahStatus",
                email: USER_EMAIL,
                lat: jamLat,
                lng: jamLng,
                status_hadir: statusHadir
              })
            });
          }
        });
    }, error => console.log(error), { enableHighAccuracy: true });
  }
}

// Inisialisasi Fitur saat aplikasi dibuka
window.onload = () => {
  loadProfile();
  startGeofencingTracking();
};
