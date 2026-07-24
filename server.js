const app = require('./server_app');
const { initDB } = require('./db');
const { initScraperScheduler } = require('./scraper');

const PORT = process.env.PORT || 3000;

initDB().then(() => {
  initScraperScheduler();
  
  function startServer(port) {
    const server = app.listen(port, () => {
      console.log(`🚀 食安毒油事件即時查詢與辨識系統伺服器已啟動: http://localhost:${port}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️ 連接埠 ${port} 已被占用，自動切換至 http://localhost:${port + 1}`);
        startServer(port + 1);
      } else {
        console.error('❌ 伺服器啟動失敗:', err);
      }
    });
  }

  startServer(PORT);
}).catch(err => {
  console.error('❌ 伺服器初始化失敗:', err);
});
