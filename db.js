const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'food_safety_db.json');

// 初始資料結構
const defaultData = {
  products: [],
  config: {
    auto_scraper_enabled: 'true',
    cron_schedule: '23 15 * * *',
    last_scraped_at: ''
  },
  scraper_logs: []
};

// 讀取 DB 檔案
function loadDB() {
  if (!fs.existsSync(dbPath)) {
    saveDB(defaultData);
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ DB 檔案讀取失敗，使用預設結構:', err.message);
    return defaultData;
  }
}

// 寫入 DB 檔案
function saveDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('❌ DB 檔案寫入失敗:', err.message);
  }
}

function initDB() {
  return Promise.resolve(loadDB());
}

// 相容 SQLite 介面之 Promise 封裝
const dbAsync = {
  async all(sql, params = []) {
    const data = loadDB();
    let list = [...data.products];

    // 解析簡單關鍵字與狀態過濾
    if (sql.includes('WHERE 1=1')) {
      if (params.length > 0) {
        // 若有 q 搜尋 (5 個欄位 LIKE ?)
        if (params.length >= 5) {
          const kw = params[0].replace(/%/g, '').toLowerCase();
          list = list.filter(p => 
            (p.name && String(p.name).toLowerCase().includes(kw)) ||
            (p.brand && String(p.brand).toLowerCase().includes(kw)) ||
            (p.manufacturer && String(p.manufacturer).toLowerCase().includes(kw)) ||
            (p.barcode && String(p.barcode).toLowerCase().includes(kw)) ||
            (p.batch_number && String(p.batch_number).toLowerCase().includes(kw)) ||
            (p.product_name && String(p.product_name).toLowerCase().includes(kw)) ||
            (p.city && String(p.city).toLowerCase().includes(kw)) ||
            (p.address && String(p.address).toLowerCase().includes(kw)) ||
            (p.reason && String(p.reason).toLowerCase().includes(kw))
          );
        }
        
        // 若有 status
        if (sql.includes('status = ?')) {
          const statusVal = params[params.length - 1];
          if (['recalled', 'warning', 'safe'].includes(statusVal)) {
            list = list.filter(p => p.status === statusVal);
          }
        }
      }
    } else if (sql.includes('WHERE 1=0')) {
      // AI 視覺辨識匹配 (barcode or name/brand)
      const matched = [];
      params.forEach(param => {
        if (!param) return;
        const kw = param.replace(/%/g, '').toLowerCase();
        data.products.forEach(p => {
          if (
            (p.barcode && p.barcode.toLowerCase() === kw) ||
            (p.name && p.name.toLowerCase().includes(kw)) ||
            (p.brand && p.brand.toLowerCase().includes(kw)) ||
            (p.manufacturer && p.manufacturer.toLowerCase().includes(kw))
          ) {
            if (!matched.some(m => m.id === p.id)) {
              matched.push(p);
            }
          }
        });
      });
      list = matched;
    } else if (sql.includes('FROM config')) {
      return Object.keys(data.config).map(k => ({ key: k, value: data.config[k] }));
    } else if (sql.includes('FROM scraper_logs')) {
      return data.scraper_logs.slice(-10).reverse();
    }

    return list.sort((a, b) => b.id - a.id);
  },

  async get(sql, params = []) {
    const data = loadDB();

    if (sql.includes('FROM products WHERE id = ?')) {
      return data.products.find(p => p.id == params[0]) || null;
    }
    if (sql.includes('FROM products WHERE name = ?')) {
      return data.products.find(p => p.name == params[0]) || null;
    }
    if (sql.includes('COUNT(*)')) {
      return { count: data.products.length };
    }
    if (sql.includes('FROM config WHERE key = ?')) {
      const key = params[0];
      return { key, value: data.config[key] || '' };
    }
    return null;
  },

  async run(sql, params = []) {
    const data = loadDB();

    if (sql.includes('INSERT INTO products')) {
      const newId = data.products.length > 0 ? Math.max(...data.products.map(p => p.id)) + 1 : 1;
      const newProduct = {
        id: newId,
        name: params[0] || '',
        brand: params[1] || '',
        manufacturer: params[2] || '',
        barcode: params[3] || '',
        batch_number: params[4] || '',
        status: params[5] || 'recalled',
        category: params[6] || '食用油類',
        reason: params[7] || '',
        return_info: params[8] || '',
        announcement_date: params[9] || new Date().toISOString().split('T')[0],
        source_url: params[10] || '',
        updated_at: new Date().toISOString()
      };
      data.products.push(newProduct);
      saveDB(data);
      return { id: newId, changes: 1 };
    }

    if (sql.includes('UPDATE products SET')) {
      const id = params[params.length - 1];
      const idx = data.products.findIndex(p => p.id == id);
      if (idx !== -1) {
        data.products[idx] = {
          ...data.products[idx],
          name: params[0],
          brand: params[1],
          manufacturer: params[2],
          barcode: params[3],
          batch_number: params[4],
          status: params[5],
          category: params[6],
          reason: params[7],
          return_info: params[8],
          announcement_date: params[9],
          source_url: params[10],
          updated_at: new Date().toISOString()
        };
        saveDB(data);
      }
      return { changes: 1 };
    }

    if (sql.includes('DELETE FROM products')) {
      if (sql.includes('WHERE id = ?')) {
        data.products = data.products.filter(p => p.id != params[0]);
      } else {
        data.products = [];
      }
      saveDB(data);
      return { changes: 1 };
    }

    if (sql.includes('UPDATE config SET value = ? WHERE key = ?')) {
      data.config[params[1]] = params[0];
      saveDB(data);
      return { changes: 1 };
    }

    if (sql.includes('INSERT INTO scraper_logs')) {
      const newLog = {
        id: data.scraper_logs.length + 1,
        status: params[0],
        message: params[1],
        added_count: params[2] || 0,
        created_at: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
      };
      data.scraper_logs.push(newLog);
      saveDB(data);
      return { id: newLog.id, changes: 1 };
    }

    return { changes: 0 };
  }
};

module.exports = {
  initDB,
  dbAsync
};
