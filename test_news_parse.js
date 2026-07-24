const axios = require('axios');

async function testParseNews() {
  try {
    const res = await axios.post('http://localhost:3000/api/scraper/parse-url-or-text', {
      url: 'https://www.storm.mg/lifestyle/11147806'
    });
    console.log('✅ 新聞自動解析測試成功！', res.data.message);
    console.log('📦 提取品項:', res.data.parsed_items);
  } catch (err) {
    console.error('❌ 測試失敗:', err.response?.data || err.message);
  }
}

testParseNews();
