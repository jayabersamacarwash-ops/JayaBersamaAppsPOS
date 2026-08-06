import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@9";

// ================= CONFIGURATION & SCHEMA DEFINITIONS =================

const TABLE_IGNORED_COLUMNS: Record<string, string[]> = {
  "cafe": ["id_menu", "tanggal", "jam", "metode"],
  "pengeluaran": ["apakah_stok", "id_bahan_baku", "qty"],
  "struk": ["filepdf", "file_pdf", "pdf", "generatepdf", "generate_pdf"],
  "stok_barang": ["harga_satuan"],
  "resep": ["harga_satuan"],
  "daftar_harga_menu": ["hpp", "margin_profit"],
  "cashflow": ["total_saldo", "saldo_kas", "saldo_cash", "saldo_rekening_n", "saldo_rekening_y"],
  "carwash": ["gaji_pencuci", "gaji_anggota", "gaji_per_anggota"]
};

const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  "pengeluaran": {
    "jumlah": "nominal"
  },
  "barang_keluar": {
    "id_keluar_key": "id_keluar"
  }
};

const DUMMY_STRUK_ID = "c09b030c-0153-1e61-0a10-f082c99b7ed6";
const DUMMY_PENGELUARAN_ID = "117d564f-7364-3213-42b4-a89c9aec0d86";

// Urutan pengerjaan sinkronisasi untuk menjaga hubungan relasi data (Foreign Key)
const EXECUTION_ORDER = [
  { sheetName: "Struk", tableName: "struk", spreadsheetIdEnv: "GOOGLE_SHEET_ID_TRANSAKSI" },
  { sheetName: "Cashflow", tableName: "cashflow", spreadsheetIdEnv: "GOOGLE_SHEET_ID_TRANSAKSI" },
  { sheetName: "Carwash", tableName: "carwash", spreadsheetIdEnv: "GOOGLE_SHEET_ID_TRANSAKSI" },
  { sheetName: "Cafe", tableName: "cafe", spreadsheetIdEnv: "GOOGLE_SHEET_ID_TRANSAKSI" },
  { sheetName: "Pengeluaran", tableName: "pengeluaran", spreadsheetIdEnv: "GOOGLE_SHEET_ID_TRANSAKSI" },
  
  { sheetName: "Stok Barang", tableName: "stok_barang", spreadsheetIdEnv: "GOOGLE_SHEET_ID_STOK" },
  { sheetName: "Barang Masuk", tableName: "barang_masuk", spreadsheetIdEnv: "GOOGLE_SHEET_ID_STOK" },
  { sheetName: "Barang Keluar", tableName: "barang_keluar", spreadsheetIdEnv: "GOOGLE_SHEET_ID_STOK" },
  { sheetName: "Resep", tableName: "resep", spreadsheetIdEnv: "GOOGLE_SHEET_ID_STOK" },
  { sheetName: "Daftar Harga Menu", tableName: "daftar_harga_menu", spreadsheetIdEnv: "GOOGLE_SHEET_ID_STOK" }
];

// ================= HELPERS =================

function toSnakeCase(str: string): string {
  if (!str) return "";
  let clean = str.toString()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
    .trim()
    .replace(/^_+|_+$/g, '');
    
  if (clean.includes("gaji") && clean.includes("anggota")) {
    return "gaji_anggota";
  }
  return clean;
}

function parseIndonesianCurrency(str: string): number {
  let clean = str.toString().replace(/Rp/g, "").replace(/\s/g, "");
  if (clean.endsWith(",00")) {
    clean = clean.slice(0, -3);
  }
  clean = clean.replace(/\./g, "").replace(/,/g, ".");
  return parseFloat(clean) || 0;
}

// Helper: Menyeragamkan format tanggal menjadi YYYY-MM-DD
function formatToISODate(dateStr: any): string {
  if (!dateStr) return "";
  
  // A. Cek jika sudah berupa objek Date JavaScript secara langsung
  if (dateStr instanceof Date || (typeof dateStr === "object" && typeof dateStr.getMonth === "function")) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, "0");
    const d = String(dateStr.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  
  const s = dateStr.toString().trim();
  if (s === "") return "";
  
  // B. Jika formatnya ISO Timestamp (misal: 2026-07-25T17:00:00.000Z)
  if (s.includes("T")) {
    return s.split("T")[0];
  }
  
  // C. Jika formatnya sudah YYYY-MM-DD
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return s;
  }
  
  // D. Jika formatnya DD/MM/YYYY (misal: 01/05/2026)
  const parts = s.split("/");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];
    if (year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // E. Jika formatnya string panjang hari (misal: "Wed Apr 01 2026...")
  try {
    let cleanStr = s;
    if (s.includes("(")) {
      cleanStr = s.split("(")[0].trim();
    }
    const parsedDate = new Date(cleanStr);
    if (!isNaN(parsedDate.getTime())) {
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const d = String(parsedDate.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  } catch (e) {
    // Abaikan
  }
  
  return s;
}

// Helper: Menyeragamkan format jam menjadi HH:MM:SS
function formatToPOSTime(timeVal: any): string | null {
  if (!timeVal) return null;
  
  // A. Jika berupa objek Date, ambil jamnya saja
  if (timeVal instanceof Date || (typeof timeVal === "object" && typeof timeVal.getHours === "function")) {
    const h = String(timeVal.getHours()).padStart(2, "0");
    const m = String(timeVal.getMinutes()).padStart(2, "0");
    const sec = String(timeVal.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }
  
  let s = timeVal.toString().trim();
  if (s === "") return null;
  
  // B. Ganti pemisah titik (.) menjadi titik dua (:) jika ada
  s = s.replace(/\./g, ":");
  
  // C. Jika formatnya sudah HH:MM:SS atau HH:MM
  if (s.match(/^\d{2}:\d{2}/)) {
    if (s.split(":").length === 2) {
      return s + ":00";
    }
    return s;
  }
  
  // D. Jika berupa string waktu lainnya
  try {
    const parsedDate = new Date(s);
    if (!isNaN(parsedDate.getTime())) {
      const h = String(parsedDate.getHours()).padStart(2, "0");
      const m = String(parsedDate.getMinutes()).padStart(2, "0");
      const sec = String(parsedDate.getSeconds()).padStart(2, "0");
      return `${h}:${m}:${sec}`;
    }
  } catch (e) {
    // Abaikan
  }
  
  return s;
}

async function stringToUUID(str: string): Promise<string | null> {
  if (!str) return null;
  const s = str.toString().trim();
  if (s === "") return null;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(s)) return s;
  
  // Hitung hash SHA-1 menggunakan Web Crypto API bawaan Deno
  const encoder = new TextEncoder();
  const data = encoder.encode(s);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return hash.substring(0, 8) + "-" +
         hash.substring(8, 12) + "-" +
         hash.substring(12, 16) + "-" +
         hash.substring(16, 20) + "-" +
         hash.substring(20, 32);
}

function getPrimaryIdForTable(tableName: string): string {
  if (tableName === "carwash") return "id_transaksi";
  if (tableName === "cafe") return "id_detail";
  if (tableName === "cashflow") return "id_cashflow";
  if (tableName === "pengeluaran") return "id_pengeluaran";
  if (tableName === "struk") return "id_struk";
  if (tableName === "stok_barang") return "id_bahan_baku";
  if (tableName === "barang_masuk") return "id_masuk";
  if (tableName === "barang_keluar") return "id_keluar";
  if (tableName === "resep") return "id_resep";
  if (tableName === "daftar_harga_menu") return "id_menu";
  return "";
}

// Fungsi paging untuk mengambil seluruh ID yang sudah ada di Supabase
async function getExistingIds(supabase: any, tableName: string, primaryIdCol: string): Promise<Set<string>> {
  const existingIds = new Set<string>();
  if (!primaryIdCol) return existingIds;
  
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select(primaryIdCol)
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error(`Error mengambil ID dari ${tableName}:`, error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    data.forEach((item: any) => {
      if (item[primaryIdCol]) {
        existingIds.add(item[primaryIdCol].toString().trim());
      }
    });
    
    if (data.length < limit) break;
    offset += limit;
  }
  
  return existingIds;
}

// ================= EDGE FUNCTION MAIN HANDLER =================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  try {
    console.log("Memulai proses sinkronisasi Google Sheets...");
    
    // 1. Inisialisasi Supabase Client dengan Service Role Key (Bypass RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Autentikasi dengan Google Service Account
    const googleCredsJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!googleCredsJson) {
      throw new Error("Secret GOOGLE_SERVICE_ACCOUNT_JSON tidak ditemukan!");
    }
    
    const googleAuth = new GoogleAuth({
      credentials: JSON.parse(googleCredsJson),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    
    const googleClient = await googleAuth.getClient();
    const tokenResponse = await googleClient.getAccessToken();
    const accessToken = tokenResponse.token;
    if (!accessToken) {
      throw new Error("Gagal mendapatkan Access Token Google API!");
    }

    const report: Record<string, string> = {};

    // 3. Proses setiap sheet sesuai urutan eksekusi
    for (const item of EXECUTION_ORDER) {
      const { sheetName, tableName, spreadsheetIdEnv } = item;
      const spreadsheetId = Deno.env.get(spreadsheetIdEnv);
      
      if (!spreadsheetId) {
        console.warn(`Spreadsheet ID untuk ${spreadsheetIdEnv} tidak di-set. Melewati ${sheetName}.`);
        report[sheetName] = "Lewat (Spreadsheet ID kosong)";
        continue;
      }

      console.log(`Mengambil data dari Sheet: ${sheetName}...`);
      
      // Ambil data Google Sheets menggunakan REST API dengan fetch (sangat cepat & hemat memori)
      const range = `${sheetName}!A1:Z10000`;
      const sheetsApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
      
      const response = await fetch(sheetsApiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gagal mengambil data ${sheetName} dari Google Sheets:`, errorText);
        report[sheetName] = `Error Google API: ${response.statusText}`;
        continue;
      }

      const resData = await response.json();
      const rows = resData.values;
      if (!rows || rows.length < 2) {
        console.log(`Sheet ${sheetName} kosong atau hanya berisi header.`);
        report[sheetName] = "Lewat (Tidak ada baris data)";
        continue;
      }

      const headers = rows[0].map((h: string) => h.toString().trim());
      const primaryIdCol = getPrimaryIdForTable(tableName);
      
      // Ambil daftar ID yang sudah ada di database untuk mencegah duplikasi
      const existingIds = await getExistingIds(supabase, tableName, primaryIdCol);
      
      // Ambil data pendukung kunci asing (Foreign Key)
      let parentIds = new Set<string>();
      if (tableName === "barang_masuk") {
        parentIds = await getExistingIds(supabase, "pengeluaran", "id_pengeluaran");
      } else if (tableName === "barang_keluar") {
        parentIds = await getExistingIds(supabase, "cafe", "id_detail");
      } else if (tableName === "carwash" || tableName === "cafe") {
        parentIds = await getExistingIds(supabase, "struk", "id_struk");
      }

      // Cari kolom ID utama di header Sheet
      let primaryIdColIndex = -1;
      if (primaryIdCol) {
        primaryIdColIndex = headers.map(h => toSnakeCase(h)).indexOf(primaryIdCol);
      }

      const batchPayloads: any[] = [];
      let skippedCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Pengecekan Baris Kosong secara riil (melewati baris yang hanya berisi rumus kosong / 0)
        let isRowBlank = true;
        const tanggalIndex = headers.map(h => toSnakeCase(h)).indexOf("tanggal");
        const namaMenuIndex = headers.map(h => toSnakeCase(h)).indexOf("nama_menu");
        const namaBahanIndex = headers.map(h => toSnakeCase(h)).indexOf("nama_bahan");

        if (tanggalIndex !== -1) {
          if (row[tanggalIndex] === undefined || row[tanggalIndex] === null || row[tanggalIndex].toString().trim() === "") {
            isRowBlank = true;
          } else {
            isRowBlank = false;
          }
        } else if (namaMenuIndex !== -1) {
          if (row[namaMenuIndex] === undefined || row[namaMenuIndex] === null || row[namaMenuIndex].toString().trim() === "") {
            isRowBlank = true;
          } else {
            isRowBlank = false;
          }
        } else if (namaBahanIndex !== -1) {
          if (row[namaBahanIndex] === undefined || row[namaBahanIndex] === null || row[namaBahanIndex].toString().trim() === "") {
            isRowBlank = true;
          } else {
            isRowBlank = false;
          }
        } else {
          headers.forEach((header, colIndex) => {
            if (header !== "") {
              const dbCol = toSnakeCase(header);
              if (dbCol !== primaryIdCol) {
                const val = row[colIndex];
                if (val !== undefined && val !== null && val.toString().trim() !== "") {
                  isRowBlank = false;
                }
              }
            }
          });
        }

        if (isRowBlank) {
          skippedCount++;
          continue; // Lewati baris kosong / rumus kosong ini!
        }

        // Lewati baris ringkasan/total saldo (jika ada kolom yang mengandung kata "TOTAL")
        let isTotalRow = false;
        row.forEach((val: any) => {
          if (val && val.toString().toUpperCase().includes("TOTAL")) {
            isTotalRow = true;
          }
        });
        if (isTotalRow) {
          continue;
        }

        // Tentukan ID baris
        let rowId = "";
        if (primaryIdColIndex !== -1 && row[primaryIdColIndex] !== undefined) {
          rowId = row[primaryIdColIndex].toString().trim();
          
          // Konversikan ke UUID jika kolom tersebut bertipe UUID di database
          const uuidColumns = ["id_transaksi", "id_detail", "id_cashflow", "id_pengeluaran", "id_struk", "id_masuk", "id_keluar", "id_resep"];
          if (uuidColumns.indexOf(primaryIdCol) !== -1 && rowId !== "") {
            rowId = (await stringToUUID(rowId)) || "";
          }
        }

        // Jika ID kosong atau belum ada di database, masukkan ke batch sync
        if (rowId === "" || !existingIds.has(rowId)) {
          const payload: Record<string, any> = {};
          let hasData = false;

          for (let colIndex = 0; colIndex < headers.length; colIndex++) {
            const header = headers[colIndex];
            if (header !== "") {
              let value = row[colIndex];
              if (value === undefined || value === null) value = "";

              // Format mata uang Rupiah
              if (typeof value === "string" && value.startsWith("Rp")) {
                value = parseIndonesianCurrency(value);
              }

              let dbColumnName = toSnakeCase(header);

              // Seragamkan format tanggal menjadi YYYY-MM-DD
              if (dbColumnName === "tanggal" && value !== "") {
                value = formatToISODate(value.toString());
              }

              // Seragamkan format jam menjadi HH:MM:SS
              if (dbColumnName === "jam" && value !== "") {
                value = formatToPOSTime(value);
              }

              if (COLUMN_MAPPINGS[tableName] && COLUMN_MAPPINGS[tableName][dbColumnName]) {
                dbColumnName = COLUMN_MAPPINGS[tableName][dbColumnName];
              }

              if (TABLE_IGNORED_COLUMNS[tableName] && TABLE_IGNORED_COLUMNS[tableName].indexOf(dbColumnName) !== -1) {
                continue; // Abaikan kolom
              }

              // Konversi UUID
              const uuidColumns = ["id_transaksi", "id_detail", "id_cashflow", "id_pengeluaran", "id_struk", "id_masuk", "id_keluar", "id_resep"];
              if (uuidColumns.indexOf(dbColumnName) !== -1 && value !== "") {
                value = (await stringToUUID(value)) || "";
              }

              // 1. Generate UUID jika kolom ID primer kosong
              if (dbColumnName === primaryIdCol && value === "") {
                value = crypto.randomUUID();
                rowId = value;
              }

              // 2. Koreksi foreign key id_struk
              if (dbColumnName === "id_struk" && tableName !== "struk") {
                if (value === "" || !parentIds.has(value)) {
                  value = DUMMY_STRUK_ID;
                }
              }

              // 2b. Koreksi foreign key id_pengeluaran
              if (dbColumnName === "id_pengeluaran" && tableName !== "pengeluaran") {
                if (value === "" || !parentIds.has(value)) {
                  value = DUMMY_PENGELUARAN_ID;
                }
              }

              // 2c. Set null untuk id_cashflow
              if (dbColumnName === "id_cashflow" && value === "") {
                value = null;
              }

              // 2d. Set null untuk id_detail
              if (dbColumnName === "id_detail" && tableName !== "cafe") {
                if (value === "" || !parentIds.has(value)) {
                  value = null;
                }
              }

              // 3. Normalisasi metode_bayar
              if (dbColumnName === "metode_bayar") {
                if (value === "") {
                  value = "CASH";
                } else {
                  value = value.toString().toUpperCase().trim();
                }
              }

              // 4. Normalisasi kasir
              if (dbColumnName === "kasir") {
                if (value === "") {
                  value = "ALEXA";
                } else {
                  value = value.toString().toUpperCase().trim();
                }
              }

              // 5. Normalisasi status_bayar
              if (dbColumnName === "status_bayar") {
                if (value === "") {
                  value = "Selesai";
                } else {
                  const lower = value.toString().toLowerCase().trim();
                  value = lower.charAt(0).toUpperCase() + lower.slice(1);
                }
              }

              // Perbaikan error formula #VALUE! / #REF!
              const numericColumns = [
                "gaji_anggota", "gaji_per_anggota", "gaji_pencuci", "harga", "harga_cuci", 
                "harga_paket", "harga_custom", "harga_satuan", "subtotal", "total_tagihan", 
                "nominal", "pemasukan", "pengeluaran", "saldo_cash", "saldo_rekening_n", 
                "saldo_rekening_y", "saldo_kas", "qty", "no", "stok", "jumlah", "jumlah_keluar", "jumlah_masuk"
              ];

              if (numericColumns.indexOf(dbColumnName) !== -1) {
                const valStr = value.toString().trim();
                if (valStr === "" || valStr.indexOf("#") !== -1) {
                  value = 0;
                }
              }

              // Jika kolom jam kosong, set nilainya ke "00:00:00" agar tidak memicu error tipe TIME
              if (dbColumnName === "jam" && (value === "" || value === null || value === undefined)) {
                value = "00:00:00";
              }

              payload[dbColumnName] = value;
              if (value !== "" && value !== null) hasData = true;
            }
          }

          if (hasData) {
            let shouldSkipRow = false;
            
            if (tableName === "barang_keluar" && payload["jumlah_keluar"] <= 0) shouldSkipRow = true;
            if (tableName === "barang_masuk" && payload["jumlah_masuk"] <= 0) shouldSkipRow = true;
            if (tableName === "cafe" && payload["qty"] <= 0) shouldSkipRow = true;

            if (tableName === "resep") {
              const idMenu = payload["id_menu"] ? payload["id_menu"].toString().trim() : "";
              const idBahan = payload["id_bahan_baku"] ? payload["id_bahan_baku"].toString().trim() : "";
              if (idMenu === "" || idMenu.includes("Tidak") || idBahan === "" || idBahan.includes("Tidak")) {
                shouldSkipRow = true;
              }
            }

            if (!shouldSkipRow) {
              batchPayloads.push(payload);
            }
          }
        }
      }

      if (batchPayloads.length > 0) {
        console.log(`Mengirim batch sebanyak ${batchPayloads.length} baris ke tabel ${tableName}...`);
        
        let query = supabase.from(tableName).upsert(batchPayloads);
        if (tableName === "resep") {
          query = supabase.from(tableName).upsert(batchPayloads, { onConflict: "id_menu,id_bahan_baku" });
        }
        
        const { error } = await query;
        if (error) {
          console.error(`Gagal melakukan upsert ke ${tableName}:`, error);
          report[sheetName] = `Gagal Upsert: ${error.message}`;
        } else {
          report[sheetName] = `Sukses (${batchPayloads.length} baris baru terkirim, ${skippedCount} baris kosong diabaikan)`;
        }
      } else {
        report[sheetName] = `Sukses (Semua data sudah up-to-date, ${skippedCount} baris kosong diabaikan)`;
      }
    }

    console.log("Sinkronisasi selesai!");
    return new Response(JSON.stringify({ success: true, report }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Terjadi error sistem:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
});
