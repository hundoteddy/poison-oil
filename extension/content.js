// 食安毒油即時比對 Content Script (自動在購物網站顯示食安下架警告)

(function() {
  console.log('🛡️ 食安毒油即時查詢 Content Script 啟動');

  const API_BASE = 'https://poison-oil.vercel.app/api';
  const LOCAL_API = 'http://localhost:3000/api';

  // 延遲執行抓取頁面商品標題
  setTimeout(() => {
    scanPageProductTitle();
  }, 1500);

  async function scanPageProductTitle() {
    // 常見電商產品標題 selector
    const selectors = [
      'h1', 
      '.product-name', 
      '.prod_name', 
      '#product-title', 
      '.goods-name',
      'title'
    ];

    let pageText = '';
    for (const sel of selectors) {
      const elem = document.querySelector(sel);
      if (elem && elem.innerText) {
        pageText += ' ' + elem.innerText;
      }
    }

    if (!pageText.trim()) return;

    try {
      // 擷取前 50 個字發送至後端進行比對
      const searchKey = pageText.trim().substring(0, 50);
      const res = await fetch(`${API_BASE}/products?q=${encodeURIComponent(searchKey)}`);
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        const recalledItems = data.data.filter(item => item.status === 'recalled');
        if (recalledItems.length > 0) {
          showFloatingWarningBanner(recalledItems[0]);
        }
      }
    } catch (err) {
      console.log('食安 Content Script 連線至後端失敗:', err.message);
    }
  }

  function showFloatingWarningBanner(item) {
    if (document.getElementById('food-safety-warning-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'food-safety-warning-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #ff4b5c, #d90429);
      color: #ffffff;
      padding: 12px 20px;
      font-size: 15px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">⚠️</span>
        <div>
          <span>【食安警示】本頁面商品包含公告下架項目：「${item.name}」</span>
          <div style="font-size: 12px; font-weight: normal; opacity: 0.9;">原因：${item.reason || '衛福部食藥署公告下架'}</div>
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <a href="https://poison-oil.vercel.app" target="_blank" style="background: #ffffff; color: #d90429; padding: 4px 12px; border-radius: 4px; text-decoration: none; font-size: 13px;">查看退換貨詳情</a>
        <button onclick="document.getElementById('food-safety-warning-banner').remove()" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer;">&times;</button>
      </div>
    `;

    document.body.prepend(banner);
  }
})();
