/**
 * 強制性下架清單 - 精確解析匯入腳本（直接操作 JSON 資料庫）
 * 格式：縣市[空格]序號[空格]業者名稱[空格]品項[空格]批號[空格]有效日期
 */
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'food_safety_db.json');

function loadDB() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}
function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

const CITIES = [
  '基隆市','臺北市','新北市','桃園市','新竹市','新竹縣','苗栗縣',
  '臺中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣',
  '臺南市','高雄市','屏東縣','臺東縣','花蓮縣','宜蘭縣',
  '金門縣','連江縣','澎湖縣'
];

// 批號格式（從右邊反推）：
// 通常是 大寫字母+數字 或 純數字 8-20 字元
const BATCH_RE = /^[A-Z0-9\-]{5,}$/;
const DATE_RE = /^\d{4}[./\-]\d{2}[./\-]\d{2}$|^\d{8}$|^\d{4}\/\d{1,2}\/\d{1,2}$/;

function parseLine(line) {
  const tokens = line.split(' ');
  if (tokens.length < 5) return null;

  // token[0] = 縣市
  const city = tokens[0];
  if (!CITIES.includes(city)) return null;

  // token[1] = 序號（數字）
  const seq = parseInt(tokens[1]);
  if (isNaN(seq)) return null;

  // 從右邊往左掃：找有效日期（倒數第1）、批號（倒數第2）
  // 其餘中間部分 = 業者名稱 + 品項
  const rest = tokens.slice(2); // 去掉縣市和序號

  // 嘗試從右邊找日期和批號
  // 策略：倒數第1個token可能是日期，倒數第2個token可能是批號
  // 但有些行只有批號沒有日期，或批號效期在同一token
  
  let expiry = '未記錄';
  let batch = '未記錄';
  let namePlusProd = rest;

  // 先嘗試倒數2個
  if (rest.length >= 4) {
    const last = rest[rest.length - 1];
    const secondLast = rest[rest.length - 2];
    
    // 最後一個像日期 or 純數字日期
    const lastIsDate = DATE_RE.test(last) || /^\d{8}$/.test(last) || /^\d{10}$/.test(last);
    const secondLastIsBatch = BATCH_RE.test(secondLast) || /^\d{8,}$/.test(secondLast);
    
    if (lastIsDate && secondLastIsBatch) {
      expiry = last;
      batch = secondLast;
      namePlusProd = rest.slice(0, rest.length - 2);
    } else if (secondLastIsBatch) {
      // 可能只有批號，倒數第1不是日期
      batch = secondLast;
      expiry = last;
      namePlusProd = rest.slice(0, rest.length - 2);
    } else {
      // 嘗試只用最後一個作為批號+日期（有時格式是 BATCH DATE 合在最後）
      batch = secondLast || '未記錄';
      expiry = last || '未記錄';
      namePlusProd = rest.slice(0, rest.length - 2);
    }
  } else if (rest.length === 3) {
    batch = rest[rest.length - 2];
    expiry = rest[rest.length - 1];
    namePlusProd = rest.slice(0, rest.length - 2);
  }

  // namePlusProd 包含：業者名稱 + 品項名稱（中間無明確分隔）
  // 我們用「查已知業者序號」的方式：同序號的第一個完整行定義了業者名稱
  // 這裡簡單返回合併字串，由外層邏輯處理
  const fullNameProd = namePlusProd.join(' ').trim();
  
  return { city, seq, fullNameProd, batch, expiry };
}

// 用更直接的方式：逐行解析，對每行的後兩個 token 嘗試當作批號/日期
function parseText(text) {
  const records = [];
  const lines = text.split('\n');
  
  // 業者名稱 lookup（seq -> name）
  const seqNameMap = {};
  
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('---') || line.startsWith('縣市') || 
        line.startsWith('中聯油脂') || line.startsWith('(批號') ||
        line.startsWith('福壽、') || /^第\s*\d+\s*頁/.test(line)) continue;
    
    const cityMatch = CITIES.find(c => line.startsWith(c + ' '));
    if (!cityMatch) continue;
    
    const afterCity = line.slice(cityMatch.length).trim();
    const seqMatch = afterCity.match(/^(\d+) (.+)/);
    if (!seqMatch) continue;
    
    const seq = parseInt(seqMatch[1]);
    const rest = seqMatch[2].trim();
    const tokens = rest.split(' ');
    
    if (tokens.length < 3) continue;
    
    // 反向解析：從最右邊找批號和日期
    // 批號特徵：字母數字組合，通常8字元以上，或有特定格式 C/BL/BS 開頭
    let batchIdx = -1;
    let expiryIdx = -1;
    
    // 掃描 tokens 找批號位置
    for (let i = tokens.length - 1; i >= 1; i--) {
      const t = tokens[i];
      // 像批號或日期
      if (/^[A-Z]{1,3}\d{6,}/.test(t) || /^\d{12,}$/.test(t) || 
          /^\d{4}[\.\/-]\d{2}[\.\/-]\d{2}$/.test(t) ||
          /^\d{8}$/.test(t) || /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(t)) {
        if (expiryIdx === -1) {
          expiryIdx = i;
        } else if (batchIdx === -1) {
          batchIdx = i;
          break;
        }
      }
    }
    
    let batch, expiry, nameAndProd;
    
    if (batchIdx !== -1 && expiryIdx !== -1 && batchIdx < expiryIdx) {
      batch = tokens[batchIdx];
      expiry = tokens[expiryIdx];
      nameAndProd = tokens.slice(0, batchIdx).join(' ');
    } else if (expiryIdx !== -1 && expiryIdx >= 2) {
      // 只找到一個像日期/批號的 token
      expiry = tokens[expiryIdx];
      batch = expiryIdx > 0 ? tokens[expiryIdx - 1] : '未記錄';
      nameAndProd = tokens.slice(0, Math.max(0, expiryIdx - 1)).join(' ');
    } else {
      continue;
    }
    
    if (!nameAndProd || nameAndProd.length < 2) continue;
    
    // 嘗試分離業者名稱和品項
    // 策略：如果已見過此 seq，後面的 token 可能是新業者，比對方式簡化
    // 這裡先將 nameAndProd 整體當成業者名稱，品項用 rest 最後解析
    
    // 更直接：用 seqNameMap 追蹤
    let name, product;
    
    if (seqNameMap[seq]) {
      // 已知此 seq 的業者名稱
      name = seqNameMap[seq];
      // nameAndProd 應以業者名稱開頭
      if (nameAndProd.startsWith(name)) {
        product = nameAndProd.slice(name.length).trim();
      } else {
        product = nameAndProd;
      }
    } else {
      // 第一次見到此 seq，嘗試從下一行確認或先暫存
      // 簡單做法：前半段當業者名稱（到第一個非名稱字元前）
      // 業者名稱通常不含油品關鍵字
      const oilKeywords = ['大豆','沙拉油','香油','炸酥油','胡麻油','調合油','烹調油','烘焙','液態','黃豆','精選','耐炸','花生'];
      let splitAt = -1;
      const tokenArr = nameAndProd.split(' ');
      for (let j = 0; j < tokenArr.length; j++) {
        if (oilKeywords.some(k => tokenArr[j].includes(k))) {
          splitAt = j;
          break;
        }
      }
      if (splitAt > 0) {
        name = tokenArr.slice(0, splitAt).join(' ');
        product = tokenArr.slice(splitAt).join(' ');
      } else {
        // 猜測最後一個詞是品項名稱開頭
        name = tokenArr.slice(0, Math.max(1, tokenArr.length - 1)).join(' ');
        product = tokenArr[tokenArr.length - 1] || '';
      }
      seqNameMap[seq] = name;
    }
    
    if (!name || !batch) continue;
    
    records.push({
      city: cityMatch,
      seq,
      name: name.replace(/[A-Z]O[A-Z]/g, '○'),
      product: product || nameAndProd,
      batch,
      expiry
    });
  }
  
  return records;
}

async function main() {
  console.log('📂 讀取資料庫...');
  const db = loadDB();
  const existing = db.products;
  let nextId = existing.length > 0 ? Math.max(...existing.map(p => p.id)) + 1 : 1;
  console.log(`   現有資料: ${existing.length} 筆，下一個 ID: ${nextId}`);

  console.log('\n📄 解析「強制性下架產品下游業者清單.pdf」(69頁)...');
  const text = fs.readFileSync(path.resolve(__dirname, 'pdf_mandatory_recall.txt'), 'utf-8');
  const records = parseText(text);
  console.log(`✅ 解析出 ${records.length} 筆記錄`);

  if (records.length > 0) {
    console.log('📋 前 8 筆預覽：');
    records.slice(0, 8).forEach((r, i) => {
      console.log(`  ${i+1}. [${r.city}] #${r.seq} 「${r.name}」| ${r.product} | 批號:${r.batch} | 效期:${r.expiry}`);
    });
  }

  console.log('\n📦 匯入中...');
  let inserted = 0, skipped = 0;

  for (const r of records) {
    if (!r.name || r.name.length < 2 || !r.batch) { skipped++; continue; }

    const dup = existing.find(p =>
      p.name === r.name && (p.product_name === r.product || p.batch_number === r.batch)
    );
    if (dup) {
      if (!dup.city) dup.city = r.city;
      skipped++;
      continue;
    }

    existing.push({
      id: nextId++,
      name: r.name,
      brand: r.name,
      manufacturer: r.name,
      barcode: '',
      batch_number: r.batch,
      status: 'recalled',
      category: '強制下架油品/下游業者',
      reason: `中聯油脂苯駢芘超標事件 - 強制下架 (${r.city})`,
      return_info: '請聯絡購買通路或原廠辦理退換貨，消費者服務專線：1950',
      announcement_date: '2026-07-21',
      source_url: '強制性下架產品下游業者清單.pdf',
      updated_at: new Date().toISOString(),
      product_name: r.product,
      expiry_date: r.expiry,
      city: r.city,
      seq_number: r.seq,
      layer: 2,
      address: ''
    });
    inserted++;
  }

  db.products = existing;
  saveDB(db);

  console.log(`\n✅ 匯入完成！`);
  console.log(`   新增: ${inserted} 筆`);
  console.log(`   略過/重複: ${skipped} 筆`);
  console.log(`   資料庫現有總筆數: ${existing.length} 筆`);

  // 統計縣市
  const cityMap = {};
  existing.filter(p => p.city).forEach(p => {
    cityMap[p.city] = (cityMap[p.city] || 0) + 1;
  });
  const top = Object.entries(cityMap).sort((a,b) => b[1]-a[1]).slice(0, 10);
  if (top.length > 0) {
    console.log('\n📊 各縣市業者數（前10）：');
    top.forEach(([city, cnt]) => console.log(`   ${city}: ${cnt} 筆`));
  }
}

main().catch(err => {
  console.error('❌ 失敗:', err.message, err.stack);
  process.exit(1);
});
