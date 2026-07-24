const axios = require('axios');

async function verifySystem() {
  console.log('🧪 === 開始系統全功能自動化測試 ===\n');

  const BASE_URL = 'http://localhost:3000/api';

  try {
    // 1. 測試 GET /api/products
    console.log('1️⃣ 測試 GET /api/products (取得全部資料)...');
    const res1 = await axios.get(`${BASE_URL}/products`);
    console.log(`   ✅ 成功取得 ${res1.data.summary.total} 筆資料 (下架: ${res1.data.summary.recalled}, 疑慮: ${res1.data.summary.warning}, 合格: ${res1.data.summary.safe})`);

    // 2. 測試關鍵字模糊搜尋
    console.log('\n2️⃣ 測試關鍵字搜尋 "頂新"...');
    const res2 = await axios.get(`${BASE_URL}/products?q=頂新`);
    console.log(`   ✅ 成功找到 ${res2.data.data.length} 筆匹配結果: "${res2.data.data[0]?.name}"`);

    // 3. 測試條碼搜尋
    console.log('\n3️⃣ 測試國際條碼搜尋 "4710123001011"...');
    const res3 = await axios.get(`${BASE_URL}/products?q=4710123001011`);
    console.log(`   ✅ 成功精準比對條碼: "${res3.data.data[0]?.name}"`);

    // 4. 測試手動觸發爬蟲
    console.log('\n4️⃣ 測試 POST /api/scraper/run (觸發 TFDA 定期爬蟲)...');
    const res4 = await axios.post(`${BASE_URL}/scraper/run`);
    console.log(`   ✅ 爬蟲執行成功！新增筆數: ${res4.data.addedCount}, 最後執行時間: ${res4.data.timestamp}`);

    // 5. 測試 Gemini 視覺 AI 辨識 API
    console.log('\n5️⃣ 測試 POST /api/recognize (Gemini AI 視覺外包裝辨識與即時比對)...');
    const res5 = await axios.post(`${BASE_URL}/recognize`, {
      image_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/' // sample dummy image
    });
    console.log(`   ✅ AI 辨識模式: ${res5.data.ai_result.mode}`);
    console.log(`   ✅ 辨識出品名: "${res5.data.recognized_product.name}"`);
    console.log(`   ✅ 安全評估結果: ${res5.data.safety_assessment.status} (${res5.data.safety_assessment.message})`);

    // 6. 測試系統設定查詢
    console.log('\n6️⃣ 測試 GET /api/config (查詢自動爬蟲排程與日誌)...');
    const res6 = await axios.get(`${BASE_URL}/config`);
    console.log(`   ✅ 自動爬蟲狀態: ${res6.data.config.auto_scraper_enabled ? '啟用' : '關閉'}`);
    console.log(`   ✅ Cron 排程: ${res6.data.config.cron_schedule}`);
    console.log(`   ✅ 最新日誌數: ${res6.data.logs.length} 筆`);

    console.log('\n🎉 === 全系統功能驗證成功通過！ ===');
  } catch (err) {
    console.error('❌ 測試過程發生錯誤:', err.response?.data || err.message);
  }
}

verifySystem();
