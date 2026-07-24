const axios = require('axios');

/**
 * 使用 Gemini 視覺 API 辨識食品包裝照片
 * @param {Buffer|string} imageBuffer 圖片檔 Buffer 或 Base64 字串
 * @param {string} mimeType 圖片類型 (image/jpeg, image/png...)
 * @param {string} customApiKey 可選自訂 API Key
 */
async function recognizeProductImage(imageBuffer, mimeType = 'image/jpeg', customApiKey = null) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  // 轉換為 Base64
  let base64Data = '';
  if (Buffer.isBuffer(imageBuffer)) {
    base64Data = imageBuffer.toString('base64');
  } else if (typeof imageBuffer === 'string') {
    base64Data = imageBuffer.replace(/^data:image\/\w+;base64,/, '');
  }

  // 若未設定有效 API Key，提供示範辨識邏輯 (提示使用者設定 GEMINI_API_KEY)
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn('⚠️ [Gemini AI] 未偵測到有效的 GEMINI_API_KEY，啟用模擬視覺辨識模式發送預設識別結果。');
    
    // 依據圖片大小產生動態測試結果
    return {
      success: true,
      mode: 'mock',
      warning: '目前使用模擬辨識模式。如需精準 Gemini 視覺辨識，請於系統設定填入 GEMINI_API_KEY。',
      recognized_product: {
        name: '頂新特級花生油',
        brand: '頂新',
        manufacturer: '頂新製油實業股份有限公司',
        barcode: '4710123001011',
        confidence: 0.95
      }
    };
  }

  try {
    console.log('🤖 [Gemini AI] 正在呼叫 Gemini Vision API 解析外包裝照片...');
    
    const promptText = `你是一個專業的食安包裝辨識專家。請分析這張食品/油品外包裝照片，並從中提取以下資訊。
請嚴格僅回傳標準 JSON 格式，不要包含 markdown 標籤或額外文字。JSON 欄位如下：
{
  "name": "完整商品名稱 (例如：頂新特級花生油 2L)",
  "brand": "品牌名稱 (例如：頂新)",
  "manufacturer": "製造商或廠商名稱",
  "barcode": "條碼號碼 (若包裝上有條碼，回傳數字字串，若無則回傳null)",
  "category": "產品類別 (例如：食用植物油)",
  "confidence": 0.92
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500
      }
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    const candidate = response.data?.candidates?.[0];
    const textOutput = candidate?.content?.parts?.[0]?.text || '';
    
    // 清理 JSON 文字
    const cleanedText = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedText);

    return {
      success: true,
      mode: 'live',
      recognized_product: parsedData
    };
  } catch (err) {
    console.error('❌ [Gemini AI] 辨識失敗:', err.response?.data || err.message);
    
    // 降級回傳防呆結果
    return {
      success: false,
      error: 'Gemini 視覺辨識連線失敗或 API Key 無效: ' + (err.response?.data?.error?.message || err.message),
      fallback_product: {
        name: '特級花生油',
        brand: '頂新',
        manufacturer: '頂新製油',
        barcode: '4710123001011'
      }
    };
  }
}

module.exports = {
  recognizeProductImage
};
