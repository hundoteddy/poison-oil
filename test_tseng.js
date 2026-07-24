const axios = require('axios');

async function testTsengNoodles() {
  try {
    const res = await axios.get('http://localhost:3000/api/products?q=' + encodeURIComponent('曾拌麵'));
    console.log('✅ 搜尋 "曾拌麵" 成功！找到匹配筆數:', res.data.data.length);
    console.log('📦 找到商品名稱:', res.data.data[0]?.name);
    console.log('⚠️ 下架原因:', res.data.data[0]?.reason);
  } catch (err) {
    console.error('❌ 測試失敗:', err.message);
  }
}

testTsengNoodles();
