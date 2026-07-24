const axios = require('axios');

async function testRiceball() {
  try {
    const res = await axios.get('http://localhost:3000/api/products?q=' + encodeURIComponent('飯糰'));
    console.log('✅ 搜尋 "飯糰" 成功！找到匹配筆數:', res.data.data.length);
    res.data.data.forEach((item, i) => {
      console.log(` 🍙 [${i+1}] ${item.name}`);
      console.log(`    下架原因: ${item.reason}`);
    });
  } catch (err) {
    console.error('❌ 測試失敗:', err.message);
  }
}

testRiceball();
