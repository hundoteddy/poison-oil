const API_BASE = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('ext-search-input');
  const searchBtn = document.getElementById('ext-search-btn');
  const aiBtn = document.getElementById('ext-ai-btn');
  const fileInput = document.getElementById('ext-file-input');

  searchBtn.addEventListener('click', () => search(searchInput.value.trim()));
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') search(searchInput.value.trim());
  });

  aiBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleImageUpload);

  // 預設抓取所有下架資料
  search('');
});

async function search(query) {
  const loading = document.getElementById('ext-loading');
  const resultsList = document.getElementById('ext-results-list');
  const banner = document.getElementById('ext-status-banner');

  loading.style.display = 'block';
  banner.style.display = 'none';
  resultsList.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/products?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    loading.style.display = 'none';

    if (data.success) {
      renderResults(data.data);
    }
  } catch (err) {
    loading.style.display = 'none';
    resultsList.innerHTML = `<div style="color: #ff4b5c; font-size: 0.85rem;">無法連線後端伺服器 (http://localhost:3000)。請確認伺服器已啟動。</div>`;
  }
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (evt) {
    const base64 = evt.target.result;
    const loading = document.getElementById('ext-loading');
    const banner = document.getElementById('ext-status-banner');
    const resultsList = document.getElementById('ext-results-list');

    loading.style.display = 'block';
    loading.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gemini AI 視覺包裝辨識中...';
    banner.style.display = 'none';
    resultsList.innerHTML = '';

    try {
      const res = await fetch(`${API_BASE}/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64 })
      });

      const result = await res.json();
      loading.style.display = 'none';

      if (result.success) {
        banner.style.display = 'block';
        const status = result.safety_assessment.status;
        banner.className = `status-banner ${status === 'danger' ? 'danger' : 'safe'}`;
        banner.innerHTML = `<strong>${result.safety_assessment.message}</strong>`;
        renderResults(result.matched_records);
      }
    } catch (err) {
      loading.style.display = 'none';
      alert('AI 辨識失敗: ' + err.message);
    }
  };
  reader.readAsDataURL(file);
}

function renderResults(products) {
  const list = document.getElementById('ext-results-list');
  list.innerHTML = '';

  if (!products || products.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 1rem;">查無相關下架或毒油紀錄。</div>`;
    return;
  }

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'ext-card';
    const isRecalled = p.status === 'recalled';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div class="ext-card-title">${escapeHtml(p.name)}</div>
        <span class="ext-card-status ${isRecalled ? 'recalled' : 'safe'}">
          ${isRecalled ? '下架回收' : '檢驗合格'}
        </span>
      </div>
      <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">
        廠商：${escapeHtml(p.manufacturer || '未知')} | 條碼：${escapeHtml(p.barcode || '無')}
      </div>
      <div class="ext-card-reason">${escapeHtml(p.reason || '')}</div>
    `;
    list.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
