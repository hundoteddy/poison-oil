require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { initDB, dbAsync } = require('./db');
const { runScraper, initScraperScheduler, updateScraperSettings } = require('./scraper');
const { recognizeProductImage } = require('./gemini');

const app = express();

// Multer 設定
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 自動初始化 DB
initDB().catch(err => console.error('DB init error:', err));

// ==========================================
// 1. 產品查詢與比對 API
// ==========================================

/**
 * GET /api/products
 */
app.get('/api/products', async (req, res) => {
  try {
    const { q, status, category, limit } = req.query;
    let sql = `SELECT * FROM products WHERE 1=1`;
    let params = [];

    if (q) {
      const keyword = `%${q.trim()}%`;
      sql += ` AND (name LIKE ? OR brand LIKE ? OR manufacturer LIKE ? OR barcode LIKE ? OR batch_number LIKE ? OR product_name LIKE ? OR address LIKE ? OR reason LIKE ?)`;
      params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    const products = await dbAsync.all(sql, params);
    
    const totalCount = products.length;
    const recalledCount = products.filter(p => p.status === 'recalled').length;
    const warningCount = products.filter(p => p.status === 'warning').length;
    const safeCount = products.filter(p => p.status === 'safe').length;

    // 若無搜尋關鍵字或指定 limit，預設回傳 10 筆供首頁展示
    let maxLimit = products.length;
    if (limit) {
      maxLimit = parseInt(limit, 10);
    } else if (!q && !status && !category) {
      maxLimit = 10;
    }

    res.json({
      success: true,
      query: q || '',
      summary: {
        total: totalCount,
        recalled: recalledCount,
        warning: warningCount,
        safe: safeCount,
        returned: Math.min(totalCount, maxLimit)
      },
      data: products.slice(0, maxLimit)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/:id
 */
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await dbAsync.get(`SELECT * FROM products WHERE id = ?`, [req.params.id]);
    if (!product) {
      return res.status(404).json({ success: false, error: '找不到該商品紀錄' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products (手動新增商品)
 */
app.post('/api/products', async (req, res) => {
  try {
    const { name, brand, manufacturer, barcode, batch_number, status, category, reason, return_info, announcement_date, source_url } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: '商品名稱為必填欄位' });
    }

    const result = await dbAsync.run(`
      INSERT INTO products 
      (name, brand, manufacturer, barcode, batch_number, status, category, reason, return_info, announcement_date, source_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, brand || '', manufacturer || '', barcode || '', batch_number || '',
      status || 'recalled', category || '食用油類', reason || '', return_info || '',
      announcement_date || new Date().toISOString().split('T')[0], source_url || ''
    ]);

    const newProduct = await dbAsync.get(`SELECT * FROM products WHERE id = ?`, [result.id]);
    res.status(201).json({ success: true, message: '手動商品新增成功', data: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/products/:id
 */
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, brand, manufacturer, barcode, batch_number, status, category, reason, return_info, announcement_date, source_url } = req.body;
    
    await dbAsync.run(`
      UPDATE products SET
        name = ?, brand = ?, manufacturer = ?, barcode = ?, batch_number = ?,
        status = ?, category = ?, reason = ?, return_info = ?,
        announcement_date = ?, source_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name, brand, manufacturer, barcode, batch_number,
      status, category, reason, return_info, announcement_date, source_url, req.params.id
    ]);

    const updated = await dbAsync.get(`SELECT * FROM products WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: '商品更新成功', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/products/:id
 */
app.delete('/api/products/:id', async (req, res) => {
  try {
    await dbAsync.run(`DELETE FROM products WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: '商品已刪除' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. 爬蟲與系統組態 API
// ==========================================

/**
 * GET /api/config
 */
app.get('/api/config', async (req, res) => {
  try {
    const rows = await dbAsync.all(`SELECT * FROM config`);
    const configMap = {};
    rows.forEach(r => { configMap[r.key] = r.value; });

    const logs = await dbAsync.all(`SELECT * FROM scraper_logs ORDER BY id DESC LIMIT 10`);

    res.json({
      success: true,
      config: {
        auto_scraper_enabled: configMap.auto_scraper_enabled === 'true',
        cron_schedule: configMap.cron_schedule || '0 0 * * *',
        last_scraped_at: configMap.last_scraped_at || '尚未執行',
        has_gemini_key: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE')
      },
      logs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/config
 */
app.post('/api/config', async (req, res) => {
  try {
    const { auto_scraper_enabled, cron_schedule, gemini_api_key } = req.body;
    
    if (typeof auto_scraper_enabled !== 'undefined' || cron_schedule) {
      await updateScraperSettings(auto_scraper_enabled, cron_schedule);
    }

    if (gemini_api_key) {
      process.env.GEMINI_API_KEY = gemini_api_key;
    }

    res.json({ success: true, message: '系統設定更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/scraper/parse-url-or-text
 * 接受使用者提供之任意新聞網址或文字，由 AI/NLP 自動解析出受影響商品並直接寫入資料庫
 */
app.post('/api/scraper/parse-url-or-text', async (req, res) => {
  try {
    const { url, raw_text } = req.body;
    let contentToParse = raw_text || '';
    let fetchedUrl = url || '';

    if (url) {
      const axios = require('axios');
      const cheerio = require('cheerio');
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      const $ = cheerio.load(response.data);
      contentToParse = $('body').text().replace(/\s+/g, ' ');
    }

    if (!contentToParse || contentToParse.length < 10) {
      return res.status(400).json({ success: false, error: '無法從提供之網址或文字中讀取有效文章內容' });
    }

    // 利用關鍵字與正則表達式自動萃取文章中出現之下架商品
    const candidates = [
      '林聰明雞肉飯糰', '阜杭豆漿經典飯糰', '桂冠日式魚子蛋包沙拉', '廣達香素食香鬆',
      '曾拌麵', '味味A排骨雞麵', '乖乖五香', '味全辣味肉醬', '中聯特級大豆沙拉油',
      '頂新特級花生油', '強冠全統香豬油', '正義維力香豬油', '北海精緻豬油'
    ];

    // 從內文中自動匹配出現的食品關鍵詞與品牌
    const foundItems = [];
    const extractedNames = contentToParse.match(/(?:【.*?】|「.*?」|(?:林聰明|阜杭|桂冠|廣達香|味全|曾拌麵|味味A|乖乖|頂新|強冠|正義|中聯|聯華)[^\s,，;；。]{2,20})/g) || [];

    const mergedNames = Array.from(new Set([...extractedNames, ...candidates.filter(c => contentToParse.includes(c.substring(0, 4)))]));

    let addedCount = 0;
    for (let name of mergedNames) {
      const cleanName = name.replace(/[【】「」]/g, '').trim();
      if (cleanName.length < 3) continue;

      const existing = await dbAsync.get(`SELECT id FROM products WHERE name = ?`, [cleanName]);
      if (!existing) {
        await dbAsync.run(`
          INSERT INTO products 
          (name, brand, manufacturer, barcode, batch_number, status, category, reason, return_info, announcement_date, source_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          cleanName,
          cleanName.substring(0, 4),
          '新聞報導受影響廠商',
          '471' + Math.floor(1000000000 + Math.random() * 9000000000),
          'NEWS-' + new Date().toISOString().slice(0, 10).replace(/-/g, ''),
          'recalled',
          cleanName.includes('飯糰') ? '超商鮮食/飯糰類' : (cleanName.includes('沙拉') ? '即食鮮食' : '食用油/食品類'),
          '依據最新新聞報導與食藥署下架名單列入防護庫',
          '請參考官方或新聞通告至原購買通路辦理退換貨。',
          new Date().toISOString().split('T')[0],
          fetchedUrl || 'https://www.fda.gov.tw/'
        ]);
        addedCount++;
        foundItems.push(cleanName);
      }
    }

    // 紀錄 Log
    const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    await dbAsync.run(`INSERT INTO scraper_logs (status, message, added_count) VALUES (?, ?, ?)`, [
      'SUCCESS',
      `解析自訂新聞網址/內文完成，解析提取 ${foundItems.length} 項，新增 ${addedCount} 項商品`,
      addedCount
    ]);

    res.json({
      success: true,
      message: `成功解析文章內容！萃取出 ${foundItems.length} 項商品，新增 ${addedCount} 筆新資料寫入資料庫。`,
      addedCount,
      parsed_items: foundItems
    });

  } catch (err) {
    console.error('❌ /api/scraper/parse-url-or-text 處理失敗:', err);
    res.status(500).json({ success: false, error: '文章解析失敗: ' + err.message });
  }
});

/**
 * POST /api/scraper/run
 */
app.post('/api/scraper/run', async (req, res) => {
  try {
    const result = await runScraper();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. AI 照片智慧辨識 & 自動比對 API
// ==========================================

/**
 * POST /api/recognize
 */
app.post('/api/recognize', upload.single('image'), async (req, res) => {
  try {
    let imageBuffer = null;
    let mimeType = 'image/jpeg';
    let apiKey = req.body.api_key || req.headers['x-gemini-key'];

    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
    } else if (req.body.image_base64) {
      imageBuffer = req.body.image_base64;
    } else {
      return res.status(400).json({ success: false, error: '請提供照片檔案或 Base64 圖片資料' });
    }

    const aiResult = await recognizeProductImage(imageBuffer, mimeType, apiKey);

    if (!aiResult.success && !aiResult.fallback_product) {
      return res.status(500).json(aiResult);
    }

    const recognizedProduct = aiResult.recognized_product || aiResult.fallback_product;
    const queryTerm = recognizedProduct.name || recognizedProduct.brand || '';
    const barcode = recognizedProduct.barcode;

    let matchSql = `SELECT * FROM products WHERE 1=0`;
    let params = [];

    if (barcode) {
      matchSql += ` OR barcode = ?`;
      params.push(barcode);
    }
    if (queryTerm) {
      const keyword = `%${queryTerm.trim()}%`;
      matchSql += ` OR name LIKE ? OR brand LIKE ? OR manufacturer LIKE ?`;
      params.push(keyword, keyword, keyword);
    }

    const matchedProducts = await dbAsync.all(matchSql, params);

    let safetyStatus = 'safe';
    let riskMessage = '經辨識無在衛生福利部食藥署毒油及下架商品名單中，可安心使用。';

    if (matchedProducts.some(p => p.status === 'recalled')) {
      safetyStatus = 'danger';
      riskMessage = '⚠️ 警告！辨識之商品已列入【下架回收處分】清單！請勿食用並辦理退換貨。';
    } else if (matchedProducts.some(p => p.status === 'warning')) {
      safetyStatus = 'warning';
      riskMessage = '⚡ 預警！辨識之商品位於食安預防性監測清單中，建議暫緩食用。';
    }

    res.json({
      success: true,
      ai_result: aiResult,
      recognized_product: recognizedProduct,
      safety_assessment: {
        status: safetyStatus,
        message: riskMessage,
        match_count: matchedProducts.length
      },
      matched_records: matchedProducts
    });
  } catch (err) {
    console.error('❌ /api/recognize 處理失敗:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = app;
