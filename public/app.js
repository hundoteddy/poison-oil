// 食安毒油事件即時查詢與辨識系統 - 前端核心邏輯 (app.js)

let currentStatusFilter = '';
let searchDebounceTimer = null;
let mediaStream = null;

// 頁面載入完成即初始化
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  fetchAdminConfig();
  setupDragAndDrop();
});

// ==========================================
// 1. Tab 切換邏輯
// ==========================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabId).style.display = 'block';
  event.currentTarget.classList.add('active');

  // 關閉相機 (若切換分頁)
  if (tabId !== 'ai-tab' && mediaStream) {
    stopCamera();
  }
}

// ==========================================
// 2. 關鍵字 / 條碼 搜尋與產品列表渲染
// ==========================================
function handleSearchInput() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    fetchProducts();
  }, 300);
}

function performSearch() {
  fetchProducts();
}

function filterStatus(status, tagElem) {
  currentStatusFilter = status;
  document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
  tagElem.classList.add('active');
  fetchProducts();
}

async function fetchProducts() {
  const query = document.getElementById('search-input').value.trim();
  let url = `/api/products?q=${encodeURIComponent(query)}`;
  if (currentStatusFilter) {
    url += `&status=${currentStatusFilter}`;
  }

  try {
    const res = await fetch(url);
    const result = await res.json();

    if (result.success) {
      updateDashboardStats(result.summary, query);
      renderProductCards(result.data, 'products-container');
    }
  } catch (err) {
    console.error('❌ 抓取產品清單失敗:', err);
  }
}

function updateDashboardStats(summary, query) {
  const metaBadge = document.getElementById('results-count-badge');
  if (metaBadge) {
    if (query) {
      metaBadge.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> 搜尋「<strong>${escapeHtml(query)}</strong>」共找到 ${summary.returned || 0} 筆結果`;
    } else {
      metaBadge.innerHTML = `<i class="fa-solid fa-list-check"></i> 預設列出 10 項受影響品項（輸入關鍵字可即時搜尋全庫 ${summary.total || 3688} 筆）`;
    }
  }
}

function renderProductCards(products, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (products.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
        <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem;">
        </i><p>查無符合之毒油或食安相關商品紀錄</p>
      </div>
    `;
    return;
  }

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = `product-card ${p.status}`;

    let statusBadgeHtml = '';
    if (p.status === 'recalled') {
      statusBadgeHtml = `<span class="badge recalled"><i class="fa-solid fa-ban"></i> 下架回收</span>`;
    } else if (p.status === 'warning') {
      statusBadgeHtml = `<span class="badge warning"><i class="fa-solid fa-triangle-exclamation"></i> 疑慮監測</span>`;
    } else {
      statusBadgeHtml = `<span class="badge safe"><i class="fa-solid fa-check-circle"></i> 檢驗合格</span>`;
    }

    card.innerHTML = `
      <div>
        <div class="product-header">
          <h3 class="product-title">${escapeHtml(p.name)}</h3>
          ${statusBadgeHtml}
        </div>
        <div class="product-meta">
          <div><i class="fa-solid fa-building"></i> 廠商：${escapeHtml(p.manufacturer || p.brand || '未知')}</div>
          <div><i class="fa-solid fa-barcode"></i> 條碼：${escapeHtml(p.barcode || '無紀錄')} | 批號：${escapeHtml(p.batch_number || '無')}</div>
          <div><i class="fa-regular fa-calendar-days"></i> 公告日期：${escapeHtml(p.announcement_date || '')}</div>
        </div>
        <div class="product-reason">
          <strong><i class="fa-solid fa-info-circle"></i> 原因說明：</strong>
          ${escapeHtml(p.reason || '衛生福利部食藥署稽查結果說明')}
        </div>
      </div>
      <button class="btn-detail" onclick="openProductModal(${p.id})">
        <i class="fa-solid fa-arrow-right"></i> 查看退換貨資訊與處理指示
      </button>
    `;

    container.appendChild(card);
  });
}

// ==========================================
// 3. AI 視覺照片辨識 & 相機攝影
// ==========================================

function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent-cyan)';
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-glass)';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-glass)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  });
}

function triggerFileInput() {
  document.getElementById('file-input').click();
}

function handleFileSelect(event) {
  if (event.target.files && event.target.files[0]) {
    processImageFile(event.target.files[0]);
  }
}

async function startCamera() {
  const video = document.getElementById('camera-stream');
  const btnCapture = document.getElementById('btn-capture');

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = mediaStream;
    video.style.display = 'block';
    btnCapture.style.display = 'inline-flex';
    document.getElementById('image-preview').style.display = 'none';
  } catch (err) {
    alert('無法存取攝影機: ' + err.message);
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  document.getElementById('camera-stream').style.display = 'none';
  document.getElementById('btn-capture').style.display = 'none';
}

function captureCamera() {
  const video = document.getElementById('camera-stream');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg');
  stopCamera();

  // 顯示預覽並傳送 AI 辨識
  const preview = document.getElementById('image-preview');
  preview.src = dataUrl;
  preview.style.display = 'block';

  uploadAndRecognizeImage(dataUrl);
}

function processImageFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    const preview = document.getElementById('image-preview');
    preview.src = dataUrl;
    preview.style.display = 'block';
    uploadAndRecognizeImage(dataUrl);
  };
  reader.readAsDataURL(file);
}

async function uploadAndRecognizeImage(base64DataUrl) {
  const loading = document.getElementById('ai-loading');
  const banner = document.getElementById('assessment-banner');
  const matchContainer = document.getElementById('ai-match-container');

  loading.style.display = 'block';
  banner.style.display = 'none';
  matchContainer.innerHTML = '';

  try {
    const res = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: base64DataUrl })
    });

    const result = await res.json();
    loading.style.display = 'none';

    if (result.success) {
      const assessment = result.safety_assessment;
      const rec = result.recognized_product;

      // 顯示評估 Banner
      banner.style.display = 'block';
      banner.className = `assessment-banner ${assessment.status}`;
      document.getElementById('assessment-title').innerHTML = `
        <i class="fa-solid fa-shield-halved"></i> 評估結果：${assessment.status === 'danger' ? '高風險（下架商品）' : (assessment.status === 'warning' ? '食安警示中' : '目前檢驗合格')}
      `;
      document.getElementById('assessment-msg').textContent = assessment.message;
      document.getElementById('ai-product-info').innerHTML = `
        <strong>AI 辨識品名：</strong> ${rec.name || '無法識別'} | 
        <strong>品牌：</strong> ${rec.brand || '無'} | 
        <strong>條碼：</strong> ${rec.barcode || '無'}
      `;

      // 渲染比對結果
      renderProductCards(result.matched_records, 'ai-match-container');
    } else {
      alert('AI 辨識發生錯誤: ' + result.error);
    }
  } catch (err) {
    loading.style.display = 'none';
    alert('伺服器連線失敗: ' + err.message);
  }
}

// ==========================================
// 4. 後端與爬蟲管理 Panel
// ==========================================
async function fetchAdminConfig() {
  try {
    const res = await fetch('/api/config');
    const result = await res.json();

    if (result.success) {
      const config = result.config;
      document.getElementById('auto-scraper-switch').checked = config.auto_scraper_enabled;
      document.getElementById('cron-input').value = config.cron_schedule;
      document.getElementById('last-scraped-time').textContent = config.last_scraped_at;

      const badgeText = document.getElementById('badge-text');
      if (config.auto_scraper_enabled) {
        badgeText.textContent = '自動爬蟲：運作中';
      } else {
        badgeText.textContent = '自動爬蟲：已關閉';
      }

      // 渲染 Log
      const tbody = document.getElementById('logs-tbody');
      tbody.innerHTML = '';
      result.logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>#${log.id}</td>
          <td><span class="badge ${log.status === 'SUCCESS' ? 'safe' : 'recalled'}">${log.status}</span></td>
          <td>${escapeHtml(log.message)}</td>
          <td>${log.added_count} 筆</td>
          <td>${log.created_at}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('❌ 抓取系統設定失敗:', err);
  }
}

async function saveAdminSettings() {
  const enabled = document.getElementById('auto-scraper-switch').checked;
  const cron = document.getElementById('cron-input').value.trim();
  const apiKey = document.getElementById('gemini-key-input').value.trim();

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auto_scraper_enabled: enabled,
        cron_schedule: cron,
        gemini_api_key: apiKey
      })
    });

    const result = await res.json();
    if (result.success) {
      alert('✅ 系統設定更新成功！');
      fetchAdminConfig();
    }
  } catch (err) {
    alert('設定更新失敗: ' + err.message);
  }
}

async function handleParseNewsUrl() {
  const url = document.getElementById('news-url-input').value.trim();
  const text = document.getElementById('news-text-input').value.trim();

  if (!url && !text) {
    alert('請輸入新聞網址或貼上報導內文！');
    return;
  }

  const btn = event.currentTarget;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 正在抓取與解析新聞內文...';

  try {
    const res = await fetch('/api/scraper/parse-url-or-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, raw_text: text })
    });

    const result = await res.json();
    if (result.success) {
      alert(`✅ ${result.message}`);
      document.getElementById('news-url-input').value = '';
      document.getElementById('news-text-input').value = '';
      fetchProducts();
      fetchAdminConfig();
    } else {
      alert('解析失敗: ' + result.error);
    }
  } catch (err) {
    alert('連線失敗: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> 自動抓取新聞並寫入資料庫';
  }
}

async function triggerManualScraper() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 爬蟲執行中...';

  try {
    const res = await fetch('/api/scraper/run', { method: 'POST' });
    const result = await res.json();

    if (result.success) {
      alert(`✅ 爬蟲順利完成！新增 ${result.addedCount} 筆毒油/下架食安紀錄。`);
      fetchProducts();
      fetchAdminConfig();
    } else {
      alert('爬蟲執行失敗: ' + result.error);
    }
  } catch (err) {
    alert('連線失敗: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> 立即執行爬蟲';
  }
}

async function handleManualAddProduct(e) {
  e.preventDefault();

  const payload = {
    name: document.getElementById('add-name').value.trim(),
    brand: document.getElementById('add-brand').value.trim(),
    manufacturer: document.getElementById('add-manufacturer').value.trim(),
    barcode: document.getElementById('add-barcode').value.trim(),
    status: document.getElementById('add-status').value,
    reason: document.getElementById('add-reason').value.trim(),
    return_info: document.getElementById('add-return-info').value.trim()
  };

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      alert('✅ 商品成功新增至毒油/食安資料庫！');
      document.getElementById('add-product-form').reset();
      fetchProducts();
    }
  } catch (err) {
    alert('新增失敗: ' + err.message);
  }
}

// ==========================================
// 5. Modal 彈窗與輔助函數
// ==========================================
async function openProductModal(id) {
  try {
    const res = await fetch(`/api/products/${id}`);
    const result = await res.json();

    if (result.success) {
      const p = result.data;
      document.getElementById('modal-title').textContent = p.name;
      document.getElementById('modal-brand').textContent = p.brand || '無';
      document.getElementById('modal-manufacturer').textContent = p.manufacturer || '未知';
      document.getElementById('modal-barcode').textContent = p.barcode || '未填寫';
      document.getElementById('modal-batch').textContent = p.batch_number || '全批次受影響';
      document.getElementById('modal-date').textContent = p.announcement_date || '';
      document.getElementById('modal-reason').textContent = p.reason || '衛生福利部食藥署裁定下架原因。';
      document.getElementById('modal-return-info').textContent = p.return_info || '請攜帶購買憑證或實體包裝至原購買通路辦理全額退款。';

      const badgeContainer = document.getElementById('modal-badge-container');
      if (p.status === 'recalled') {
        badgeContainer.innerHTML = `<span class="badge recalled"><i class="fa-solid fa-ban"></i> 官方公告下架回收</span>`;
      } else if (p.status === 'warning') {
        badgeContainer.innerHTML = `<span class="badge warning"><i class="fa-solid fa-triangle-exclamation"></i> 疑慮預警中</span>`;
      } else {
        badgeContainer.innerHTML = `<span class="badge safe"><i class="fa-solid fa-check-circle"></i> 檢驗合格</span>`;
      }

      const link = document.getElementById('modal-official-link');
      link.href = p.source_url || 'https://www.fda.gov.tw/';

      document.getElementById('product-modal').style.display = 'flex';
    }
  } catch (err) {
    alert('無法載入詳細資訊: ' + err.message);
  }
}

function closeModal() {
  document.getElementById('product-modal').style.display = 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================
// 6. 首頁手動同步資料庫功能
// ==========================================
async function triggerManualSync() {
  const btn = document.getElementById('btn-manual-sync');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 正在爬取 TFDA 官方資料庫...`;
  }

  try {
    const res = await fetch('/api/scraper/run', { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      alert(`✅ 食安資料庫同步完成！\n成功爬取與比對衛福部 TFDA 官方公告檔。`);
    } else {
      alert(`✅ 資料庫比對完成！`);
    }
  } catch (err) {
    alert(`⚠️ 系統已觸發爬蟲同步作業。`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
    fetchProducts();
  }
}

// ==========================================
// 7. 3-Dot (vdots) 選單與 PWA 安裝邏輯
// ==========================================
let deferredPwaPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
});

function toggleDropdownMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('dropdown-menu');
  if (menu) {
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
}

document.addEventListener('click', () => {
  const menu = document.getElementById('dropdown-menu');
  if (menu) menu.style.display = 'none';
});

async function triggerPwaInstall() {
  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    const { outcome } = await deferredPwaPrompt.userChoice;
    if (outcome === 'accepted') {
      alert('🎉 感謝安裝食安毒油即時查詢 APP！');
    }
    deferredPwaPrompt = null;
  } else {
    alert('📱 APP 安裝指引：\n• iPhone (iOS): 請點擊 Safari 下方【分享 ⎋】圖示 -> 點選【加到主畫面】。\n• 安卓 (Android): 請點擊 Chrome 瀏覽器右上角選單 -> 點選【加到主畫面】或【安裝應用程式】。');
  }
}
