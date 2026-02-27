// Fungsi utama untuk menayangkan halaman web
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Manajemen Penyewaan VPS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Fungsi helper untuk menyertakan file HTML lain (CSS & JS)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

const GITHUB_USERNAME = 'bowowiwendi'; // << GANTI INI
const REPO_NAME = 'ipvps';           // << GANTI INI
const FILE_PATH = 'main/ip'; // Path file di repository Anda
const COMMIT_MESSAGE = 'Update VPS list from Google Spreadsheet';

// --- FUNGSI CRUD & RENEW ---

/**
 * Mengambil data dari sheet 'DataVPS' dengan opsi pagination dan filtering.
 * @param {number} page - Nomor halaman yang ingin diambil (dimulai dari 1).
 * @param {number} limit - Jumlah data per halaman.
 * @param {Date|string|null} startDate - Tanggal awal filter (opsional).
 * @param {Date|string|null} endDate - Tanggal akhir filter (opsional).
 * @returns {Array<Object>} Array of objects yang berisi data VPS.
 */
function getDataImproved(page = 1, limit = 10, startDate = null, endDate = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DataVPS');

  // 1. Error Handling: Cek apakah sheet ada
  if (!sheet) {
    console.error("Sheet 'DataVPS' tidak ditemukan.");
    return []; // Kembalikan array kosong atau throw error
  }

  const dataRange = sheet.getDataRange();
  const dataValues = dataRange.getValues();
  
  // 2. Proses Data: Skip header row
  const rows = dataValues.slice(1);

  // 3. Filtering Tanggal (jika parameter diberikan)
  let filteredRows = rows;
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Set waktu ke awal/akhir hari untuk filter yang akurat
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    filteredRows = rows.filter(row => {
      // Pastikan kolom tanggal adalah objek Date
      if (!(row[3] instanceof Date)) {
        return false; // Lewati baris jika bukan tanggal
      }
      const rowDate = new Date(row[3].getTime()); // Buat salinan date untuk amannya
      
      if (start && rowDate < start) {
        return false;
      }
      if (end && rowDate > end) {
        return false;
      }
      return true;
    });
  }

  // 4. Mapping ke Object
  const dataObjects = filteredRows.map(row => {
    // Format tanggal
    const masaAktifFormatted = (row[3] instanceof Date)
      ? Utilities.formatDate(row[3], Session.getScriptTimeZone(), "yyyy-MM-dd")
      : row[3];

    return {
      id: row[0],
      username: row[1],
      tipeAkun: row[2],
      masaAktif: masaAktifFormatted,
      ipVps: row[4],
      // 5. Gunakan ?? untuk nullish coalescing, lebih aman dari ||
      emailMember: row[5] ?? '',
      ram: row[6] ?? '',
      pesan: row[7] ?? ''
    };
  });

  // 6. Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = dataObjects.slice(startIndex, endIndex);

  // 7. (Opsional) Kembalikan info pagination juga
  // Ini sangat berguna untuk UI
  return {
    data: paginatedData,
    pagination: {
      currentPage: page,
      limit: limit,
      totalItems: dataObjects.length,
      totalPages: Math.ceil(dataObjects.length / limit)
    }
  };
}

// READ: Dapatkan semua data dari spreadsheet
function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DataVPS');
  const dataRange = sheet.getDataRange();
  const dataValues = dataRange.getValues();
  
  const dataObjects = dataValues.slice(1).map(row => {
    let masaAktifFormatted = '';
    if (row[3] instanceof Date) {
      masaAktifFormatted = Utilities.formatDate(row[3], Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      masaAktifFormatted = row[3];
    }
    
    return {
      id: row[0],
      username: row[1],
      tipeAkun: row[2],
      masaAktif: masaAktifFormatted,
      ipVps: row[4],
      emailMember: row[5] || '',
      ram: row[6] || '',
      pesan: row[7] || ''
    };
  });
  
  return dataObjects;
}

// CREATE: Tambahkan data baru
function addData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DataVPS');
  const newId = new Date().getTime().toString();
  
  let masaAktifValue = '';
  if (data.tipeAkun === 'limit') {
    const hari = parseInt(data.masaAktifHari, 10);
    const tanggalAkhir = new Date();
    tanggalAkhir.setDate(tanggalAkhir.getDate() + hari);
    masaAktifValue = tanggalAkhir;
  } else {
    masaAktifValue = 'lifetime';
  }
  
  // --- LOGIKA TAMBAHAN ---
  // Pastikan IP selalu dimulai dengan tanda petik
  let ipToSave = data.ipVps.startsWith("'") ? data.ipVps : "'" + data.ipVps;
  
  sheet.appendRow([
    newId, data.username, data.tipeAkun, masaAktifValue, ipToSave, data.emailMember, data.ram, data.pesan
  ]);
  
  generateVpsListFile();
  return { success: true, message: 'Data penyewaan berhasil ditambahkan!' };
}

// UPDATE: Perbarui data yang ada
function updateData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DataVPS');
  const dataRange = sheet.getDataRange();
  const dataValues = dataRange.getValues();
  
  for (let i = 1; i < dataValues.length; i++) {
    if (dataValues[i][0] == data.id) {
      sheet.getRange(i + 1, 2).setValue(data.username);
      sheet.getRange(i + 1, 6).setValue(data.emailMember);
      sheet.getRange(i + 1, 7).setValue(data.ram);
      sheet.getRange(i + 1, 8).setValue(data.pesan);
      
      // --- LOGIKA TAMBAHAN ---
      // Pastikan IP selalu dimulai dengan tanda petik
      let ipToSave = data.ipVps.startsWith("'") ? data.ipVps : "'" + data.ipVps;
      sheet.getRange(i + 1, 5).setValue(ipToSave);
      
      generateVpsListFile();
      return { success: true, message: 'Data penyewaan berhasil diperbarui!' };
    }
  }
  
  return { success: false, message: 'Data tidak ditemukan.' };
}

// DELETE: Hapus data berdasarkan ID
function deleteData(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DataVPS');
  const dataRange = sheet.getDataRange();
  const dataValues = dataRange.getValues();
  
  for (let i = dataValues.length - 1; i >= 1; i--) {
    if (dataValues[i][0] == id) {
      sheet.deleteRow(i + 1);
      
      // === BARIS TAMBAHAN ===
      generateVpsListFile();
      
      return { success: true, message: 'Data penyewaan berhasil dihapus!' };
    }
  }
  
  return { success: false, message: 'Data tidak ditemukan.' };
}

// RENEW: Fungsi khusus untuk memperpanjang masa aktif
function renewData(id, jumlahHari) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DataVPS');
  const dataRange = sheet.getDataRange();
  const dataValues = dataRange.getValues();
  
  for (let i = 1; i < dataValues.length; i++) {
    if (dataValues[i][0] == id) {
      const hari = parseInt(jumlahHari, 10);
      const tanggalAkhir = new Date();
      tanggalAkhir.setDate(tanggalAkhir.getDate() + hari);
      
      sheet.getRange(i + 1, 4).setValue(tanggalAkhir);
      
      // === BARIS TAMBAHAN ===
      generateVpsListFile();
      
      return { success: true, message: `Masa aktif berhasil diperpanjang ${hari} hari!` };
    }
  }
  
  return { success: false, message: 'Data tidak ditemukan untuk diperpanjang.' };
}

// --- FUNGSI BROADCAST & NOTIFIKASI ---

// Fungsi untuk mengirim broadcast ke semua member yang memiliki email
function sendBroadcastToAll(message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DataVPS');
  const dataRange = sheet.getDataRange();
  const dataValues = dataRange.getValues();
  
  let emailCount = 0;
  const subject = 'Pesan Penting dari Admin VPS';
  
  for (let i = 1; i < dataValues.length; i++) {
    const emailMember = dataValues[i][5];
    if (emailMember && emailMember.trim() !== '') {
      MailApp.sendEmail(emailMember, subject, message);
      emailCount++;
    }
  }
  
  return { success: true, message: `Broadcast berhasil dikirim ke ${emailCount} member.` };
}

// Fungsi utama yang berjalan setiap hari untuk mengecek kedaluwarsa dan peringatan
function runDailyChecks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DataVPS');
  const dataRange = sheet.getDataRange();
  const dataValues = dataRange.getValues();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

  const expiredAccounts = [];
  const warningAccounts = [];
  const emailsSentToExpired = [];
  const emailsSentToWarning = [];

  for (let i = 1; i < dataValues.length; i++) {
    const row = dataValues[i];
    const tipeAkun = row[2];
    const masaAktif = row[3];
    const username = row[1];
    const emailMember = row[5];
    const pesan = row[7] || ''; // Ambil data dari kolom Pesan

    if (tipeAkun === 'limit' && masaAktif instanceof Date) {
      const expiryDate = new Date(masaAktif);
      expiryDate.setHours(0, 0, 0, 0);

      // --- CEK KEDALUWARSA ---
      if (expiryDate < today) {
        const accountData = { username: username, expiryDate: Utilities.formatDate(expiryDate, Session.getScriptTimeZone(), "yyyy-MM-dd"), ipVps: row[4], ram: row[6], pesan: pesan };
        expiredAccounts.push(accountData);
        if (emailMember && emailMember.trim() !== '') {
          sendMemberExpiredEmail(emailMember, accountData);
          emailsSentToExpired.push(emailMember);
        }
      }
      
      // --- CEK PERINGATAN 7 HARI SEBELUM KEDALUWARSA ---
      if (expiryDate.getTime() === sevenDaysFromNow.getTime()) {
        const accountData = { username: username, expiryDate: Utilities.formatDate(expiryDate, Session.getScriptTimeZone(), "yyyy-MM-dd"), ipVps: row[4], ram: row[6], pesan: pesan };
        warningAccounts.push(accountData);
        if (emailMember && emailMember.trim() !== '') {
          sendMemberWarningEmail(emailMember, accountData);
          emailsSentToWarning.push(emailMember);
        }
      }
    }
  }

  // --- KIRIM LAPORAN KE ADMIN ---
  const adminEmail = Session.getActiveUser().getEmail();
  let subject = 'Laporan Harian Akun VPS: Aman';
  let htmlBody = '<h2>Laporan Harian Akun VPS</h2>';

  if (expiredAccounts.length > 0 || warningAccounts.length > 0) {
    subject = 'Laporan Harian Akun VPS: Ada Pembaruan';
    
    if (expiredAccounts.length > 0) {
      htmlBody += `<h3 style="color: red;">🔴 Akun Kadaluarsa (${expiredAccounts.length})</h3>`;
      htmlBody += `<p>Email notifikasi telah dikirim ke: <strong>${emailsSentToExpired.join(', ')}</strong>.</p>`;
      htmlBody += generateAccountTable(expiredAccounts);
    }

    if (warningAccounts.length > 0) {
      htmlBody += `<h3 style="color: orange;">🟠 Peringatan Akun Akan Kadaluarsa (7 Hari) (${warningAccounts.length})</h3>`;
      htmlBody += `<p>Email peringatan telah dikirim ke: <strong>${emailsSentToWarning.join(', ')}</strong>.</p>`;
      htmlBody += generateAccountTable(warningAccounts);
    }
  } else {
    htmlBody += '<p>Tidak ada akun yang kadaluarsa atau akan kadaluarsa dalam 7 hari ke depan. Semua aman!</p>';
  }
  
  MailApp.sendEmail(adminEmail, subject, '', { htmlBody: htmlBody });
  Logger.log('Daily check complete. Report sent to admin.');
}

// Helper function untuk membuat tabel HTML
function generateAccountTable(accounts) {
  let table = '<table border="1" style="border-collapse: collapse; width: 100%; font-family: sans-serif; margin-bottom: 20px;">';
  table += '<tr style="background-color:#f2f2f2;"><th style="padding: 8px;">Username</th><th style="padding: 8px;">Tanggal Kadaluarsa</th><th style="padding: 8px;">IP VPS</th><th style="padding: 8px;">RAM</th></tr>';
  accounts.forEach(acc => {
    table += `<tr><td style="padding: 8px;">${acc.username}</td><td style="padding: 8px;">${acc.expiryDate}</td><td style="padding: 8px;">${acc.ipVps}</td><td style="padding: 8px;">${acc.ram}</td></tr>`;
  });
  table += '</table>';
  return table;
}

function setupGithubToken() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Masukkan GitHub Personal Access Token (PAT)',
    'Token akan disimpan secara aman di properti skrip.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    const token = response.getResponseText();
    if (token) {
      PropertiesService.getScriptProperties().setProperty('GITHUB_TOKEN', token);
      ui.alert('Token GitHub berhasil disimpan!');
    } else {
      ui.alert('Token tidak boleh kosong.');
    }
  }
}

// --- FUNGSI INTEGRASI GITHUB (BARU) ---

// Fungsi utama untuk membuat dan mengupdate file di GitHub (VERSI DIPERBAIKI)
function generateVpsListFile() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('DataVPS');
    const dataRange = sheet.getDataRange();
    const dataValues = dataRange.getValues();
    
    let fileContent = '';

    // Loop dimulai dari baris kedua (indeks 1) untuk melewati header
    for (let i = 1; i < dataValues.length; i++) {
      const row = dataValues[i];
      
      // Ambil data dari kolom yang benar
      const username = row[1];     // Kolom Username
      const masaAktif = row[3];    // Kolom Masa Aktif
      const ipVps = row[4];        // Kolom IP VPS
      
      // Pastikan data penting ada sebelum membuat baris
      if (username && ipVps) {
        let expiryFormatted = '';
        if (masaAktif instanceof Date) {
          // Format tanggal menjadi YYYY-MM-DD
          expiryFormatted = Utilities.formatDate(masaAktif, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else {
          // Jika bukan tanggal (misal: 'lifetime'), gunakan apa adanya
          expiryFormatted = masaAktif;
        }

        if (ipVps.startsWith("'")) {
          ipVps = ipVps.substring(1);
        }
        
        // Buat baris dengan format yang benar: ### USERNAME EXPIRY_DATE IP
        fileContent += `### ${username} ${expiryFormatted} ${ipVps}\n`;
      }
    }
    
    // Panggil fungsi untuk update file di GitHub
    updateGithubFile(fileContent);
    Logger.log('Successfully generated and pushed VPS list to GitHub.');
    
  } catch (e) {
    Logger.log('Failed to generate VPS list: ' + e.toString());
  }
}

// Fungsi untuk mengirim permintaan update ke GitHub API
function updateGithubFile(content) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error('GitHub token not found. Please run setupGithubToken() first.');
  }

  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`;
  
  // 1. Dapatkan SHA file saat ini (diperlukan untuk update)
  const getOptions = {
    'method': 'get',
    'headers': {
      'Authorization': 'token ' + token,
      'User-Agent': 'Google-Apps-Script'
    },
    'muteHttpExceptions': true // Agar bisa menangani error
  };
  const getResponse = UrlFetchApp.fetch(url, getOptions);
  const getData = JSON.parse(getResponse.getContentText());
  
  let sha;
  if (getResponse.getResponseCode() === 200) {
    sha = getData.sha;
  } else if (getResponse.getResponseCode() === 404) {
    // File belum ada, buat baru
    sha = null; 
  } else {
    throw new Error('Error getting file info from GitHub: ' + getData.message);
  }

  // 2. Encode konten baru ke Base64
  const base64Content = Utilities.base64Encode(content);

  // 3. Buat payload untuk update/create
  const payload = {
    'message': COMMIT_MESSAGE,
    'content': base64Content,
    'sha': sha
  };

  const postOptions = {
    'method': 'put',
    'contentType': 'application/json',
    'headers': {
      'Authorization': 'token ' + token,
      'User-Agent': 'Google-Apps-Script'
    },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  const postResponse = UrlFetchApp.fetch(url, postOptions);
  const result = JSON.parse(postResponse.getContentText());

  if (postResponse.getResponseCode() !== 200 && postResponse.getResponseCode() !== 201) {
    throw new Error('Error updating file on GitHub: ' + result.message);
  }
}

// Fungsi untuk mengirim email peringatan 7 hari sebelum kadaluarsa
function sendMemberWarningEmail(email, account) {
  const subject = 'Peringatan: Akun VPS Anda Akan Kadaluarsa dalam 7 Hari';
  let htmlBody = `
    <h2>Hai, ${account.username}!</h2>
    <p>Ini adalah pengingat bahwa akun VPS Anda akan <strong>kedaluwarsa dalam 7 hari</strong>.</p>
    <ul>
      <li><strong>IP VPS:</strong> ${account.ipVps}</li>
      <li><strong>RAM:</strong> ${account.ram}</li>
      <li><strong>Tanggal Kadaluarsa:</strong> ${account.expiryDate}</li>
    </ul>
  `;
  
  // Tambahkan pesan personal jika ada
  if (account.pesan && account.pesan.trim() !== '') {
    htmlBody += `
      <hr>
      <p><strong>Pesan dari Admin:</strong></p>
      <p style="background-color: #f0f0f0; padding: 10px; border-left: 3px solid #007bff;">${account.pesan}</p>
    `;
  }

  htmlBody += `
    <p>Segera lakukan perpanjangan untuk menghindari gangguan layanan. Hubungi admin untuk informasi lebih lanjut.</p>
    <p>Terima kasih.</p>
  `;
  
  MailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
  Logger.log(`Sent warning email to member: ${email}`);
}

// Fungsi untuk mengirim email bahwa akun sudah kadaluarsa
function sendMemberExpiredEmail(email, account) {
  const subject = 'Akun VPS Anda Telah Kadaluarsa';
  let htmlBody = `
    <h2>Hai, ${account.username}!</h2>
    <p>Ini adalah pemberitahuan bahwa akun VPS Anda telah berakhir.</p>
    <ul>
      <li><strong>IP VPS:</strong> ${account.ipVps}</li>
      <li><strong>RAM:</strong> ${account.ram}</li>
      <li><strong>Tanggal Kadaluarsa:</strong> ${account.expiryDate}</li>
    </ul>
  `;

  // Tambahkan pesan personal jika ada
  if (account.pesan && account.pesan.trim() !== '') {
    htmlBody += `
      <hr>
      <p><strong>Pesan dari Admin:</strong></p>
      <p style="background-color: #f0f0f0; padding: 10px; border-left: 3px solid #dc3545;">${account.pesan}</p>
    `;
  }

  htmlBody += `
    <p>Silakan hubungi admin untuk perpanjangan jika Anda masih membutuhkannya.</p>
    <p>Terima kasih.</p>
  `;
  
  MailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
  Logger.log(`Sent expired notification to member: ${email}`);
}

// Wrapper untuk dipanggil dari client-side (tombol manual)
function runCheckAndNotify() {
  runDailyChecks();
  return { success: true, message: 'Pemeriksaan harian selesai. Notifikasi (kedaluwarsa & peringatan) akan dikirim jika ada.' };
}

