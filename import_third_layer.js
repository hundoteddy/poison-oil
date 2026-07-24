/**
 * 食藥署「第三層下游業者名單」批次匯入腳本
 * 資料來源：第三層下游業者名單1150724.pdf（115年7月24日製表）
 * 共 267 筆下游業者（使用疑慮油品之餐廳、食品業者、超市等）
 */
const path = require('path');
const { initDB, dbAsync } = require('./db');

// ── 從 PDF 完整解析的 267 筆第三層下游業者 ──────────────────────────────
const thirdLayerRecords = [
  // ── 第 1 頁 ───────────────────────────────────────────────────────────────
  { seq:1,  name:'燒瓶子投資股份有限公司', address:'臺中市北屯區和平里和福路258號', product:'沙茶醬(2.9公斤/罐)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:2,  name:'佳信食品工業股份有限公司', address:'臺中市梧棲區自立三街69號', product:'美味大師麻辣醬(1公斤/包)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:2,  name:'佳信食品工業股份有限公司', address:'臺中市梧棲區自立三街69號', product:'麻辣鍋底醬(3公斤/罐)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:2,  name:'佳信食品工業股份有限公司', address:'臺中市梧棲區自立三街69號', product:'麻辣臭豆腐金滑菇(850公克/包)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:2,  name:'佳信食品工業股份有限公司', address:'臺中市梧棲區自立三街69號', product:'椒麻拌醬(30公克/罐)', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:2,  name:'佳信食品工業股份有限公司', address:'臺中市梧棲區自立三街69號', product:'避風塘蝦醬(28公克/罐)', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:2,  name:'佳信食品工業股份有限公司', address:'臺中市梧棲區自立三街69號', product:'古早油蔥拌醬(1公斤/包)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:2,  name:'佳信食品工業股份有限公司', address:'臺中市梧棲區自立三街69號', product:'古早油蔥拌醬(60公克/包)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:2,  name:'佳信食品工業股份有限公司', address:'臺中市梧棲區自立三街69號', product:'香辣油包(4公克/包)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:2,  name:'佳信食品工業股份有限公司', address:'臺中市梧棲區自立三街69號', product:'麻醬醬包(45公克/包)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:3,  name:'川月企業社', address:'臺中市大肚區文昌路一段92號', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:4,  name:'食樂唯食品有限公司', address:'台北市萬華區興寧街46號1F', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:5,  name:'台塑餐飲美食調理有限公司', address:'臺中市大肚區沙田路一段251號', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:6,  name:'全錸蒔國際餐飲會館', address:'台北市萬華區峨眉街122之1號1樓', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:7,  name:'采市整合行銷國際有限公司', address:'新北市林口區文化二路1段266號地下一層之8', product:'油蔥蒜醬(25公克/罐)', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:8,  name:'兆賀食品工業有限公司', address:'新北市樹林區東榮街31號', product:'蕃茄湯料(1公斤/包)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:8,  name:'兆賀食品工業有限公司', address:'新北市樹林區東榮街31號', product:'麻辣鍋底醬(1公斤/包)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:8,  name:'兆賀食品工業有限公司', address:'新北市樹林區東榮街31號', product:'番茄鍋底醬(1公斤/包)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:9,  name:'捷順國際食品(股)公司', address:'台北市大同區南京西路315號', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:10, name:'億昌油廠', address:'雲林縣北港鎮民生路66號', product:'麻油猴頭菇(600公克/包)', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:10, name:'億昌油廠', address:'雲林縣北港鎮民生路66號', product:'大豆沙拉油', batch:'20270411000408', expiry:'2027.04.10', note:'無拆封使用' },
  { seq:10, name:'億昌油廠', address:'雲林縣北港鎮民生路66號', product:'大豆沙拉油', batch:'20270608', expiry:'2027.6.8' },
  { seq:11, name:'臺中市潭子區身心障礙成人日間托育中心', address:'臺中市潭子區中山路2段241巷7號7樓', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:12, name:'財團法人瑪利亞社會福利基金會附設瑪利亞學園', address:'臺中市北屯區經貿東路365號', product:'精選蔬菜油', batch:'2027072506', expiry:'2027.07.25' },
  { seq:13, name:'臺中市私立耶思托嬰中心', address:'臺中市西區精誠路197號2樓', product:'精選蔬菜油', batch:'2027072506', expiry:'2027.07.25' },
  { seq:14, name:'臺中市私立耶思瑪亞托嬰中心', address:'臺中市西區大墩十街26號1-3樓', product:'精選蔬菜油', batch:'-', expiry:'-', note:'由序號13供餐' },
  { seq:15, name:'臺中市私立金像獎托嬰中心', address:'臺中市北區陜西路10號1-3樓', product:'不飽和大豆沙拉油', batch:'2027040901', expiry:'2027.05.11' },
  { seq:16, name:'臺中市德璐兒少之家', address:'保密機構', product:'精選蔬菜油', batch:'2027072506', expiry:'2027.07.25' },
  { seq:17, name:'禾膳股份有限公司臺中分公司', address:'臺中市西屯區安和路118-19號', product:'福壽大豆沙拉油 18L', batch:'C2280526', expiry:'2027.05.27' },
  { seq:18, name:'臺中榮民總醫院營養室', address:'臺中市西屯區台灣大道4段1650號', product:'18公斤環保鐵桶沙拉油', batch:'2027040901', expiry:'2027.04.09' },
  { seq:19, name:'佳愛餐盒食品廠', address:'臺中市北區健行路42號', product:'大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:20, name:'美食園事業有限公司', address:'臺中市后里區三重二路35號', product:'大豆沙拉油18L', batch:'C2140426P', expiry:'2027.04.13' },
  { seq:21, name:'台邑食品有限公司', address:'臺中市清水區吳厝里和睦路三段50巷20號', product:'大豆沙拉油18L', batch:'C2210426O', expiry:'2027.04.20' },
  { seq:22, name:'潔達有限公司', address:'臺中市南區樹義路39巷1號1樓', product:'大豆沙拉油18kg', batch:'20270413000408', expiry:'2027.04.13' },
  { seq:23, name:'ㄚ香雜貨鋪', address:'臺中市龍井區龍泉里沙田路5段30巷50-2弄1號', product:'泰山精選蔬菜油3L', batch:'20270725FE99', expiry:'2027.07.25' },
  { seq:24, name:'勝一商行', address:'臺中市沙鹿區沙田路189號', product:'福壽大豆沙拉油3L', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:25, name:'奇萌籽', address:'臺中市清水區鎮政路99巷31號', product:'福壽大豆沙拉油18L', batch:'C2160426P', expiry:'2027.04.15' },
  { seq:26, name:'胖老爹炸雞有限公司-大肚店', address:'臺中市大肚區文昌路一段92號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:26, name:'胖老爹炸雞有限公司-大肚店', address:'臺中市大肚區文昌路一段92號', product:'王牌液態油炸專用油(OAL22972)', batch:'260623TWNTY103', expiry:'2027.06.23' },
  { seq:27, name:'胖老爹炸雞有限公司-北勢東店', address:'臺中市沙鹿區北勢東路520-1號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:27, name:'胖老爹炸雞有限公司-北勢東店', address:'臺中市沙鹿區北勢東路520-1號', product:'王牌液態油炸專用油(OAL22972)', batch:'260623TWNTY103', expiry:'2027.06.23' },
  // ── 第 2 頁 ───────────────────────────────────────────────────────────────
  { seq:28, name:'胖老爹炸雞有限公司-臺中工學店', address:'臺中市南區工學路98號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:28, name:'胖老爹炸雞有限公司-臺中工學店', address:'臺中市南區工學路98號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:29, name:'胖老爹炸雞有限公司-總店', address:'臺中市西屯區烈美街88號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:30, name:'胖老爹炸雞有限公司-福科店', address:'臺中市西屯區福瑞街80號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:31, name:'胖老爹炸雞有限公司-臺中興大店', address:'臺中市南區忠孝路12號一樓後半部', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:31, name:'胖老爹炸雞有限公司-臺中興大店', address:'臺中市南區忠孝路12號一樓後半部', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:32, name:'胖老爹炸雞有限公司-臺中大雅店', address:'臺中市大雅區雅環路2段108號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:32, name:'胖老爹炸雞有限公司-臺中大雅店', address:'臺中市大雅區雅環路2段108號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:33, name:'胖老爹炸雞有限公司-臺中敦化店', address:'臺中市北屯區敦化路一段490號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:33, name:'胖老爹炸雞有限公司-臺中敦化店', address:'臺中市北屯區敦化路一段490號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:34, name:'胖老爹炸雞有限公司-大里國光店', address:'臺中市大里區國光路二段555-7號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:35, name:'胖老爹炸雞有限公司-大里國中店', address:'臺中市大里區國中路290號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:36, name:'胖老爹炸雞有限公司-大里立人店', address:'臺中市大里區新南路143號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:36, name:'胖老爹炸雞有限公司-大里立人店', address:'臺中市大里區新南路143號', product:'王牌液態油炸專用油(OAL22972)', batch:'260623TWNTY103', expiry:'2027.06.23' },
  { seq:37, name:'胖老爹炸雞有限公司-南屯東興店', address:'臺中市南屯區向上南路172-1號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:38, name:'胖老爹炸雞有限公司-北屯青島店', address:'臺中市北屯區青島路三段131號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:39, name:'胖老爹炸雞有限公司-高鐵成功店', address:'臺中市烏日區中山路三段593號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:40, name:'胖老爹炸雞有限公司-太平勤益店', address:'臺中市太平區中山路二段181號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:40, name:'胖老爹炸雞有限公司-太平勤益店', address:'臺中市太平區中山路二段181號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:41, name:'胖老爹炸雞有限公司-美術園道店', address:'臺中市西區五權五街57號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:42, name:'胖老爹炸雞有限公司-臺中中華店', address:'臺中市中區中華路一段59號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:42, name:'胖老爹炸雞有限公司-臺中中華店', address:'臺中市中區中華路一段59號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:43, name:'胖老爹炸雞有限公司-烏日中山店', address:'臺中市烏日區中山路一段526號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:44, name:'胖老爹炸雞有限公司-逢大河南店', address:'臺中市西屯區河南路二段193號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:45, name:'胖老爹炸雞有限公司-臺中敦化店', address:'臺中市北屯區敦化路一段490號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:45, name:'胖老爹炸雞有限公司-臺中敦化店', address:'臺中市北屯區敦化路一段490號', product:'王牌液態油炸專用油(OAL22972)', batch:'260623TWNTY103', expiry:'2027.06.23' },
  { seq:46, name:'胖老爹炸雞有限公司-臺中工學店', address:'臺中市南區工學路98號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:46, name:'胖老爹炸雞有限公司-臺中工學店', address:'臺中市南區工學路98號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:47, name:'全聯實業股份有限公司臺中南門店', address:'臺中市南區臺中路520-522號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:47, name:'全聯實業股份有限公司臺中南門店', address:'臺中市南區臺中路520-522號', product:'王牌液態油炸專用油(OAL22972)', batch:'260623TWNTY103', expiry:'2027.06.23' },
  { seq:48, name:'全聯實業股份有限公司豐原成功分公司', address:'臺中市豐原區成功路198號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:49, name:'全聯實業股份有限公司臺中文山分公司', address:'臺中市南屯區文山三街358號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:49, name:'全聯實業股份有限公司臺中文山分公司', address:'臺中市南屯區文山三街358號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:50, name:'閣樓1981韓式炸雞-北屯東山店', address:'臺中市北屯區東山路一段216之32號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:50, name:'閣樓1981韓式炸雞-北屯東山店', address:'臺中市北屯區東山路一段216之32號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:51, name:'好樂迪股份有限公司-豐原店', address:'臺中市豐原區豐陽路115號', product:'王牌液態油炸專用油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:52, name:'榮記顏新發糕餅有限公司', address:'臺中市大里區瑞城里中興路1段26巷27號1號', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:53, name:'合興通食品股份有限公司', address:'臺中市南區樹義里樹義6巷5-20號', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:54, name:'成偉食品股份有限公司', address:'臺中市梧棲區草湳里中港加工出口區經三路9號', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:55, name:'今口香調理食品股份有限公司', address:'臺中市太平區甲堤路608號', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:55, name:'今口香調理食品股份有限公司', address:'臺中市太平區甲堤路608號', product:'維佳無水烘焙油脂(OAL31916)', batch:'260615TWNTY101', expiry:'2027.06.15' },
  { seq:56, name:'大友食品實業有限公司-太平廠', address:'臺中市太平區中興里永平路2段476巷66弄19號', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:56, name:'大友食品實業有限公司-太平廠', address:'臺中市太平區中興里永平路2段476巷66弄19號', product:'維佳無水烘焙油脂(OAL31916)', batch:'260615TWNTY101', expiry:'2027.06.15' },
  // ── 第 3 頁 ───────────────────────────────────────────────────────────────
  { seq:57, name:'台灣楓康超市股份有限公司-中央工廠', address:'臺中市大肚區南榮路53號', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:58, name:'王○玲', address:'臺中市清水區高美路269-25號', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:58, name:'王○玲', address:'臺中市清水區高美路269-25號', product:'維佳無水烘焙油脂(OAL31916)', batch:'260615TWNTY101', expiry:'2027.06.15' },
  { seq:59, name:'陳○洋', address:'臺中市豐原區中正路721號1樓', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:60, name:'東美食品行', address:'臺中市太平區中山路2段353號', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:61, name:'寶御食品有限公司-豐原廠', address:'臺中市豐原區翁子里豐勢路一段468號', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:61, name:'寶御食品有限公司-豐原廠', address:'臺中市豐原區翁子里豐勢路一段468號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:62, name:'藝起做創意工作室', address:'臺中市西屯區惠來里台灣大道3段202號1樓', product:'維佳無水烘焙油脂(OAL31916)', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:62, name:'藝起做創意工作室', address:'臺中市西屯區惠來里台灣大道3段202號1樓', product:'維佳無水烘焙油脂(OAL31916)', batch:'260615TWNTY101', expiry:'2027.06.15' },
  { seq:63, name:'勝博殿LaLaport臺中店', address:'臺中市東區泉源里進德路600號5F', product:'王牌液態油炸油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:64, name:'勝博殿臺中新時代店', address:'臺中市東區新庄里復興路四段186號3樓', product:'王牌液態油炸油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:65, name:'勝博殿崇德店', address:'臺中市北屯區平德里崇德路二段101號', product:'王牌液態油炸油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:66, name:'勝博殿臺中新光三越店', address:'臺中市西屯區惠來里臺灣大道三段301號', product:'王牌液態油炸油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:67, name:'勝博殿臺中麗寶店', address:'臺中市后里區月眉里福容路201號1樓', product:'王牌液態油炸油', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:68, name:'儷晶皇宮視聽歌唱名店', address:'臺中市南屯區惠中路三段173號一樓', product:'益康烹調油(調合油)', batch:'20270414000403', expiry:'2027.04.14' },
  { seq:69, name:'超級明星視聽歌唱有限公司-經貿店', address:'臺中市北屯區中清路二段1023號', product:'益康烹調油(調合油)', batch:'20270414000403', expiry:'2027.04.14' },
  { seq:70, name:'超級倡星有限公司', address:'臺中市南屯區豐富路151號', product:'益康烹調油(調合油)', batch:'20270414000403', expiry:'2027.04.14' },
  { seq:71, name:'麒湟視廳中心', address:'臺中市北屯區仁美里崇德十路一段430號', product:'益康烹調油(調合油)', batch:'20270414000403', expiry:'2027.04.14' },
  { seq:72, name:'超級巨星視聽歌唱有限公司', address:'臺中市北區光大里公園路195號', product:'益康烹調油(調合油)', batch:'20270414000403', expiry:'2027.04.14' },
  { seq:73, name:'御品餐飲事業', address:'臺中市豐原區東湳里三豐路二段560號', product:'益康烹調油(調合油)', batch:'20270414000403', expiry:'2027.04.13' },
  { seq:74, name:'成記手工麵', address:'臺中市西屯區需屯路二段282之16號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:75, name:'小上海山東', address:'臺中市北屯區東山路一段197之15號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:76, name:'五街麵店', address:'臺中市西區五權五街229號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:77, name:'永豐小吃', address:'臺中市太平區永豐路173號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:78, name:'辣六街', address:'臺中市太平區長億接43號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:79, name:'鑫鼎熱炒', address:'臺中市太平區東平路431號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:80, name:'品味小館', address:'臺中市建國三路六街B258', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:81, name:'芫儂食品股份有限公司', address:'臺中市西屯區廣福路272巷2號', product:'福壽大豆沙拉油 3L', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:82, name:'三民街果菜行', address:'臺中市東勢區三民街121號', product:'泰山大豆沙拉油0.6L*12入(新版)', batch:'20270413E', expiry:'2027.04.13' },
  { seq:83, name:'大東勢五金百貨大賣場', address:'臺中市東勢區新豐街24號', product:'泰山大豆沙拉油0.6L*12入(新版)', batch:'20270413E', expiry:'2027.04.13' },
  { seq:84, name:'東億便利商店', address:'臺中市豐原區東陽路63號', product:'泰山大豆沙拉油0.6L*12入(新版)', batch:'20270413E', expiry:'2027.04.13' },
  { seq:85, name:'金穗商店', address:'臺中市神岡區大明路253號', product:'泰山大豆沙拉油0.6L*12入(新版)', batch:'20270413E', expiry:'2027.04.13' },
  { seq:86, name:'喜客便利商店', address:'臺中市神岡區神洲路49號', product:'泰山大豆沙拉油0.6L*12入(新版)', batch:'20270413E', expiry:'2027.04.13' },
  { seq:87, name:'上禾超級市場', address:'臺中市沙鹿區忠貞路142號', product:'泰山大豆沙拉油0.6L*12入(新版)', batch:'20270413E', expiry:'2027.04.13' },
  { seq:88, name:'茂松商店', address:'臺中市神岡區神林路75號', product:'泰山大豆沙拉油0.6L*12入(新版)', batch:'20270413E', expiry:'2027.04.13' },
  // ── 第 4 頁 ───────────────────────────────────────────────────────────────
  { seq:89, name:'土饅頭小巷舖', address:'臺中市西區府後街64號', product:'維佳液態蛋糕用油(OAL32929)', batch:'260520TWNTY103', expiry:'2027.02.14' },
  { seq:90, name:'遠百企業股份有限公司-中港二店', address:'臺中市西屯區中港路二段69號', product:'維佳超特級烘焙油脂(OAL32960N)', batch:'260617TWNTY102', expiry:'2027.06.17' },
  { seq:91, name:'遠百企業股份有限公司-愛買復興店', address:'臺中市南區復興路一段359號', product:'維佳超特級烘焙油脂(OAL32960N)', batch:'260617TWNTY102', expiry:'2027.06.17' },
  { seq:92, name:'巧瑋國際有限公司-精誠店', address:'臺中市西屯區精誠路38號', product:'南僑維佳特選烘焙油脂(OAL32855)', batch:'260618TWNTY102', expiry:'2027.06.18' },
  { seq:93, name:'巧瑋有限公司-臺中興大店', address:'臺中市南區國光路250號', product:'南僑維佳特選烘焙油脂(OAL32855)', batch:'260618TWNTY102', expiry:'2027.06.18' },
  { seq:94, name:'巧瑋有限公司-臺中門市', address:'臺中市東區臺中路85號', product:'南僑維佳特選烘焙油脂(OAL32855)', batch:'260618TWNTY102', expiry:'2027.06.18' },
  { seq:95, name:'巧瑋有限公司-龍井門市', address:'臺中市龍井區新興路東興巷35號', product:'南僑維佳特選烘焙油脂(OAL32855)', batch:'260618TWNTY102', expiry:'2027.06.18' },
  { seq:96, name:'志達實業股份有限公司', address:'臺中市西區中興里美村路一段272號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:97, name:'高○青', address:'臺中市潭子區中山路一段270號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:98, name:'胖老爹炸雞有限公司-大里塗城店', address:'臺中市大里區塗城路299號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:99, name:'胖老爹炸雞有限公司-臺中大智店', address:'臺中市東區大智路50號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:100, name:'胖老爹炸雞有限公司-大里中興店', address:'臺中市大里區中興路一段167-2號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:101, name:'胖老爹炸雞有限公司-豐原成功店', address:'臺中市豐原區成功路189號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:102, name:'好樂迪股份有限公司-大里店', address:'臺中市大里區中興路二段446-5號', product:'王牌液態油炸專用油(OAL22972)', batch:'260618TWNTY103', expiry:'2027.06.18' },
  { seq:103, name:'胖老爹炸雞有限公司-中科福雅店', address:'臺中市西屯區福雅路122號', product:'王牌液態油炸專用油(OAL22972)', batch:'260623TWNTY103', expiry:'2027.06.23' },
  { seq:104, name:'胖老爹炸雞有限公司-民權博館店', address:'臺中市北區民權路440號', product:'王牌液態油炸專用油(OAL22972)', batch:'260623TWNTY103', expiry:'2027.06.23' },
  { seq:105, name:'躉泰食品有限公司', address:'臺中市大甲區孟春里通天路225號', product:'維佳超特級烘焙油脂(OAL32964)', batch:'260624TWNTY102', expiry:'2026.12.21' },
  { seq:106, name:'臺中市霧峰區本堂社區發展協會', address:'臺中市霧峰區中正路749號', product:'大豆沙拉油', batch:'C220526P', expiry:'2027.05.21' },
  { seq:107, name:'臺中市新社區馬力埔社區發展協會', address:'臺中市新社區中和街一段8號', product:'大豆沙拉油', batch:'未記錄', expiry:'未記錄', note:'已辦理退貨' },
  { seq:108, name:'臺中市大肚區社腳社區發展協會', address:'臺中市大肚區社腳里沙田路一段774巷21-80號', product:'大豆沙拉油', batch:'未記錄', expiry:'未記錄', note:'已辦理退貨' },
  { seq:109, name:'臺中市潭子區聚興社區發展協會', address:'臺中市潭子區聚興里潭興路一段24號', product:'大豆沙拉油', batch:'未記錄', expiry:'未記錄', note:'已辦理退貨' },
  { seq:110, name:'臺中市福康關懷協會（慈厚宮據點）', address:'臺中市后里區厚里里甲后路一段716巷5-1號', product:'大豆沙拉油', batch:'未記錄', expiry:'未記錄', note:'已使用完畢且回收' },
  { seq:111, name:'社團法人臺中市街友關懷協會', address:'臺中市東區大智路280號', product:'大豆沙拉油', batch:'未記錄', expiry:'2025.07.15' },
  { seq:112, name:'日正豆漿', address:'臺中市西區忠明里健行路1000號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:113, name:'興食堂快餐店', address:'臺中市東區樂業路311巷27號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:114, name:'愛將平價牛排-中科店', address:'臺中市西屯區福林里西屯路三段179-2號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:115, name:'愛將平價牛排-東海店', address:'臺中市龍井區新東里新興路41號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:116, name:'農友團膳(加福快餐)', address:'臺中市烏日區溪南路三段568-1號', product:'益康大豆沙拉油 18L', batch:'20270410000407', expiry:'2027.04.10' },
  { seq:117, name:'瓦城-臺中誠品店', address:'臺中市西區公益路68號B1', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:118, name:'非常泰-臺中大遠百店', address:'臺中市西屯區台灣大道三段251號11樓', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:119, name:'瓦城-嘉義三越店', address:'嘉義市西區垂楊路726號11樓', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:120, name:'瓦城-高雄夢時代店', address:'高雄市前鎮區中華五路789號B1', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:121, name:'瓦城-高雄三多店', address:'高雄市前鎮區三多三路213號12樓', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:122, name:'1010湘-高雄義大店', address:'高雄市大樹區學城路一段12號5樓(A區)', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:123, name:'瓦城-嘉義秀泰店', address:'嘉義市西區文化路299號3樓', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:124, name:'時時香-臺南西門店', address:'臺南市中西區西門路一段658號6樓', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:125, name:'瓦城-臺南南紡店', address:'臺南市東區中華東路一段366號5樓', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:126, name:'時時香-臺南南紡店', address:'臺南市東區中華東路一段358號1F(A2館)', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:127, name:'時時香-臺中三井店', address:'臺中市梧棲區台灣大道10段168號2樓', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:128, name:'1010湘-臺中誠品480店', address:'臺中市西屯區市政路480號6F', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:129, name:'瓦城臺中米平方店', address:'臺中市西屯區國安一路168號1樓', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:130, name:'瓦城臺南新光三越小北門店', address:'臺南市北區西門路四段135號3F', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  // ── 第 5 頁 ───────────────────────────────────────────────────────────────
  { seq:131, name:'時時香臺南三井店', address:'臺南市歸仁區歸仁大道101號1樓', product:'沙拉油-18L(泰山)', batch:'20270409', expiry:'2027.04.09' },
  { seq:132, name:'大買家北屯店', address:'臺中市北屯區北屯路370號', product:'眷村家常辣醬(香蒜豆豉)(270公克/罐)', batch:'C2150426', expiry:'2027.04.13' },
  { seq:133, name:'大買家國光店', address:'臺中市大里區國光路2段710號', product:'眷村家常辣醬(香蒜豆豉)(270公克/罐)', batch:'C2150426', expiry:'2027.04.13' },
  { seq:134, name:'益誠商行', address:'臺中市東區進化路28號', product:'甜麵醬(3公斤/罐)', batch:'C2150426', expiry:'2027.04.13' },
  { seq:135, name:'阿益素食', address:'臺中市西區篤信街60號', product:'甜麵醬(3公斤/罐)', batch:'C2150426', expiry:'2027.04.13' },
  { seq:136, name:'鼎冠興業有限公司', address:'臺中市烏日區三榮路二段69號', product:'大豆沙拉油(18公升/桶)', batch:'202604081315', expiry:'2027.10.04' },
  { seq:136, name:'鼎冠興業有限公司', address:'臺中市烏日區三榮路二段69號', product:'油炸專用油(18公升/桶)', batch:'202604081315', expiry:'2027.10.04' },
  { seq:137, name:'老牌珠麵店', address:'臺中市西區篤行路189號', product:'甜麵醬(3公斤/罐)', batch:'C2150426', expiry:'2027.04.13' },
  { seq:138, name:'伴伴麵堂', address:'臺中市南屯區博愛街80巷131號', product:'甜麵醬(3公斤/罐)', batch:'C2150426', expiry:'2027.04.13' },
  { seq:139, name:'上澄餐飲', address:'臺中市中區公園里自由路二段94號2樓', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:140, name:'小金日式家庭料理', address:'臺中市南屯區南屯里南興巷24號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:141, name:'耐斯車業', address:'臺中市南屯區龍富路四段328號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:142, name:'8德司創意餐館（一中店）', address:'臺中市北區新北里三民路三段142-1號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:143, name:'國碩', address:'臺中市北屯區松竹里河北二街78號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:144, name:'VVG Theater Cafe 好樣劇場咖啡', address:'臺中市西屯區惠來里惠來路二段101號1F', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:145, name:'阿二靚鍋健行店', address:'臺中市北區育德里健行路449號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:146, name:'阿二靚鍋東興店', address:'臺中市西區公正里東興路三段61號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:147, name:'抱抱星球', address:'臺中市南屯區永定里永春路20-10號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:148, name:'一貫米', address:'臺中市南屯區東興路2段82號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:149, name:'銀山燒肉華美店', address:'臺中市西區忠明里華美街416號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:150, name:'金磚電子遊戲場', address:'臺中市豐原區愛國街232號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:151, name:'東山棧', address:'臺中市北屯區和平里東山路一段380號', product:'沙拉油-塑桶 3L(福壽)', batch:'C1160426K', expiry:'2027.04.15' },
  { seq:152, name:'Cozy Life舒適生活早午餐咖啡館', address:'臺中市龍井區東海里藝術街23號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:153, name:'蝦威夷休閒美食釣蝦館', address:'臺中市南區永和里高工路388號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:154, name:'港町十三番地中正店', address:'臺中市中區中正里臺灣大道一段405號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:155, name:'港町十三番地-太原店', address:'臺中市北屯區廍子里太原路三段1136-5號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:156, name:'港町十三番地-雙十店', address:'臺中市北屯區雙十路二段223-1號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:157, name:'港町十三番地梅川店', address:'臺中市北區賴村里梅川西路三段110號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:158, name:'港町十三番地-福林店', address:'臺中市西屯區福林里西屯路三段宏福五巷2弄12號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:159, name:'炒飯超人工學店', address:'臺中市南區永興里工學路51號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:160, name:'炒飯超人公益店', address:'臺中市南屯區三義里公益路二段539號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:161, name:'金大元便當復興店', address:'臺中市南區新榮里復興路三段149號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:162, name:'金大元便當總店', address:'臺中市中區大誠里臺灣大道一段508號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:163, name:'金大元便當南屯店', address:'臺中市南屯區田心里五權西路二段413-1號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:164, name:'金大元便當中清店', address:'臺中市北區賴明里中清路一段716號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:165, name:'金大元便當崇德店', address:'臺中市北屯區松竹里崇德路二段353號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:166, name:'金大元便當河南店', address:'臺中市西屯區上德里河南路二段463號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:167, name:'大間漁場', address:'臺中市南屯區新生里環中路四段2號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:168, name:'日月湖日本料理', address:'臺中市西區公正里東興路三段154號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:169, name:'冒香香旗艦店', address:'臺中市南屯區新生里向上路三段536號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:170, name:'福哥嚴選熱炒', address:'臺中市南屯區三義里黎明路二段692號', product:'沙拉油 18L(福壽)', batch:'C2150426O', expiry:'2027.04.14' },
  { seq:171, name:'臺中榮民總醫院', address:'臺中市西屯區台灣大道4段1650號', product:'泰山環保鐵桶沙拉油18KG', batch:'20270409', expiry:'2027.04.09' },
  // ── 第 6 頁 ───────────────────────────────────────────────────────────────
  { seq:172, name:'臺中市福利品供應站', address:'臺中市自由路3段30號', product:'泰山精選蔬菜油3L', batch:'2027072506', expiry:'2027.07.25' },
  { seq:173, name:'坪林陸光福利分站', address:'臺中市西屯區皇城街62號', product:'泰山精選蔬菜油3L', batch:'2027072506', expiry:'2027.07.25' },
  { seq:174, name:'大墩早餐店', address:'臺中市南屯區大墩6街279號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:175, name:'同盈商行', address:'臺中市大里區健民路127號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:176, name:'王○峰', address:'彰化縣鹿港鎮復興路237號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:177, name:'一五八號早餐', address:'臺中市北屯區興安路一段46號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:178, name:'健行早餐店', address:'臺中市北區健行路80號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:179, name:'晶沛鴻泊企業社', address:'臺中市潭子區中山路1段21號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:180, name:'永春商行', address:'臺中市霧峰區樹仁路112號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:181, name:'財元豆沙行', address:'臺中市神岡區大洲路283巷71號', product:'益康大豆沙拉油 18KG', batch:'20270526000408', expiry:'2027.05.26' },
  { seq:182, name:'劉家油條', address:'臺中市豐原區市前街88號2樓', product:'益康大豆沙拉油 18KG', batch:'20270526000408', expiry:'2027.05.26' },
  { seq:183, name:'燒腊教父', address:'臺中市西屯區黎明路三段58號', product:'益康大豆沙拉油 18L', batch:'20270528000408', expiry:'2027.05.28' },
  { seq:184, name:'食為大', address:'臺中市西屯區西屯路二段251-15號', product:'益康大豆沙拉油 18L', batch:'20270528000408', expiry:'2027.05.28' },
  { seq:185, name:'四媽(梧棲)', address:'臺中市梧棲區大智路二段295號', product:'益康大豆沙拉油 18L', batch:'20270528000408', expiry:'2027.05.28' },
  { seq:186, name:'小日本炒飯', address:'臺中市潭子區頭張路二段76號', product:'益康大豆沙拉油 18L', batch:'20270528000408', expiry:'2027.05.28' },
  { seq:187, name:'梅子餐廳', address:'臺中市沙鹿區鹿寮里中山路473-2號', product:'福壽沙拉油、香油', batch:'未記錄', expiry:'未記錄' },
  { seq:188, name:'順興食品企業有限公司', address:'梧棲區港埠路二段408巷3號/清水區海口北路152號', product:'福壽炸酥油', batch:'未記錄', expiry:'未記錄' },
  { seq:189, name:'信元製菓', address:'臺中市西屯區科園二路3號', product:'益康沙拉油', batch:'未記錄', expiry:'未記錄' },
  { seq:190, name:'振盛農產品有限公司', address:'臺中市梧棲區大庄里光華南街2號', product:'益康沙拉油', batch:'未記錄', expiry:'未記錄' },
  { seq:191, name:'倫寶商行', address:'臺中市南區大慶街二段29號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:192, name:'綠山晨食館', address:'臺中市東山路1段208之10號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:193, name:'莉諠晨食館', address:'臺中市北區民權路508號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:194, name:'四十六號早餐', address:'臺中市北屯區北平路三段158號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:195, name:'揚秦國際企業股份有限公司', address:'桃園市中壢區合江路16號', product:'椒麻醬24g', batch:'未記錄', expiry:'未記錄' },
  { seq:196, name:'洞天山堂股份有限公司(KIKI)', address:'台北市大安區大安路一段19巷18號1樓', product:'KIKI油蔥醬包27g', batch:'未記錄', expiry:'未記錄' },
  { seq:196, name:'洞天山堂股份有限公司(KIKI)', address:'台北市大安區大安路一段19巷18號1樓', product:'KIKI油蔥拌麵醬包29g', batch:'未記錄', expiry:'未記錄' },
  { seq:196, name:'洞天山堂股份有限公司(KIKI)', address:'台北市大安區大安路一段19巷18號1樓', product:'KIKI芝麻醬包20g', batch:'未記錄', expiry:'未記錄' },
  { seq:196, name:'洞天山堂股份有限公司(KIKI)', address:'台北市大安區大安路一段19巷18號1樓', product:'KIKI椒麻油包7g', batch:'未記錄', expiry:'未記錄' },
  { seq:196, name:'洞天山堂股份有限公司(KIKI)', address:'台北市大安區大安路一段19巷18號1樓', product:'KIKI油蔥醬B(蔥蔥麵醬包)40g', batch:'未記錄', expiry:'未記錄' },
  { seq:196, name:'洞天山堂股份有限公司(KIKI)', address:'台北市大安區大安路一段19巷18號1樓', product:'KIKI椒麻醬包22g', batch:'未記錄', expiry:'未記錄' },
  { seq:196, name:'洞天山堂股份有限公司(KIKI)', address:'台北市大安區大安路一段19巷18號1樓', product:'KIKI芝麻醬包22g', batch:'未記錄', expiry:'未記錄' },
  { seq:196, name:'洞天山堂股份有限公司(KIKI)', address:'台北市大安區大安路一段19巷18號1樓', product:'KIKI椒麻拌麵醬包30g', batch:'未記錄', expiry:'未記錄' },
  { seq:197, name:'食味鮮股份有限公司', address:'新北市汐止區福德二路215號6樓之2', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:198, name:'啵福好食股份有限公司', address:'台北市大安區忠孝東路4段191號5樓', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:199, name:'雙月天行健生生不息股份有限公司', address:'台北市中正區和平西路一段170號B1', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:200, name:'工學北早餐店', address:'臺中市南區復興路2段12號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:201, name:'豐康晨食館', address:'臺中市豐原區安康路129號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:202, name:'小貝殼晨食館', address:'臺中市華美西街二段451號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:203, name:'盈利商行', address:'臺中市太平區光德路103號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:204, name:'寶春商行', address:'臺中市霧峰區吉峰路149號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:205, name:'禾業小吃部', address:'高雄市三民區建工路398號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:206, name:'韻淇餐飲店', address:'彰化縣和美鎮彰美路5段161號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:207, name:'昶春商行', address:'臺中市霧峰區民生路97號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  // ── 第 7 頁 ───────────────────────────────────────────────────────────────
  { seq:208, name:'中華民國農會', address:'臺中市霧峰區吉峰西路68號', product:'農好-蔥香肉燥風味麵', batch:'20270526000408', expiry:'2027.05.26' },
  { seq:208, name:'中華民國農會', address:'臺中市霧峰區吉峰西路68號', product:'双響泡塩味豚骨湯麵(桶)', batch:'20270526000408', expiry:'2027.05.26' },
  { seq:208, name:'中華民國農會', address:'臺中市霧峰區吉峰西路68號', product:'味味一品極品紅燒牛肉麵(袋)', batch:'20270526000408', expiry:'2027.05.26' },
  { seq:209, name:'好食樂食品股份有限公司', address:'嘉義縣民雄工業區成功一街7號', product:'油蔥油8g', batch:'未記錄', expiry:'未記錄' },
  { seq:209, name:'好食樂食品股份有限公司', address:'嘉義縣民雄工業區成功一街7號', product:'椒麻拌麵醬包25g', batch:'未記錄', expiry:'未記錄' },
  { seq:209, name:'好食樂食品股份有限公司', address:'嘉義縣民雄工業區成功一街7號', product:'芝麻醬包22g', batch:'未記錄', expiry:'未記錄' },
  { seq:209, name:'好食樂食品股份有限公司', address:'嘉義縣民雄工業區成功一街7號', product:'松露油8g', batch:'未記錄', expiry:'未記錄' },
  { seq:210, name:'谷統食品工業股份有限公司', address:'新北市汐止區福德二路402號6樓', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:211, name:'品冠行銷股份有限公司', address:'臺中市沙鹿區興安路65號', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:212, name:'金尚品食品股份有限公司', address:'彰化縣田中鎮沙崙里新工四路10號', product:'油蔥拌醬30g', batch:'未記錄', expiry:'未記錄' },
  { seq:213, name:'三風食品工業(股)公司', address:'臺中市大雅區民富街114號', product:'椒麻拌麵醬30g', batch:'未記錄', expiry:'未記錄' },
  { seq:213, name:'三風食品工業(股)公司', address:'臺中市大雅區民富街114號', product:'芝麻醬包22g', batch:'未記錄', expiry:'未記錄' },
  { seq:213, name:'三風食品工業(股)公司', address:'臺中市大雅區民富街114號', product:'油蔥拌麵醬包30g', batch:'未記錄', expiry:'未記錄' },
  { seq:213, name:'三風食品工業(股)公司', address:'臺中市大雅區民富街114號', product:'炸醬30g', batch:'未記錄', expiry:'未記錄' },
  { seq:214, name:'信大國際事業有限公司', address:'雲林縣林內鄉九芎村大埔15號', product:'(使用問題油品，詳批號)', batch:'未記錄', expiry:'未記錄' },
  { seq:215, name:'蕃茄村企業股份有限公司', address:'臺中市潭子區雅潭路二段282號', product:'醬香風味醬8g', batch:'未記錄', expiry:'未記錄' },
  { seq:216, name:'匠日生活股份有限公司', address:'台北市大安區新生南路一段97巷44號1樓', product:'芝麻醬22g', batch:'未記錄', expiry:'未記錄' },
  { seq:217, name:'日正食品工業(股)公司', address:'南投市自強三路28號', product:'香辣蟹醬27g', batch:'未記錄', expiry:'未記錄' },
  { seq:218, name:'大和', address:'臺中市北屯區大連北街22號', product:'益康大豆沙拉油', batch:'20270528000408', expiry:'2027.05.28' },
  { seq:219, name:'大龍棧永進', address:'臺中市神岡區和睦路一段888號', product:'益康大豆沙拉油', batch:'20270528000408', expiry:'2027.05.28' },
  { seq:220, name:'香華餐飲', address:'台中市后里區文明路67號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:221, name:'澄蓓餐飲社', address:'台中市豐原區豐南街88號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:222, name:'美美村早餐店', address:'台中市西區美村路1段205號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:223, name:'美益小吃部', address:'高雄市苓雅區林泉街84號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:224, name:'日升早餐店', address:'台中市大甲區文武路248號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:225, name:'德安晨食館', address:'嘉義市西區德安路55號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:226, name:'寶宜晨食館', address:'台中市清水區五權東路6號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:227, name:'牛奶棠一號店', address:'台中市新社區中和街5段31號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:228, name:'上珍宴餐飲商行', address:'台中市西屯區烈美街1號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:229, name:'永發商行', address:'南投縣竹山鎮祖師街13之17號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:230, name:'美樂美食館', address:'彰化縣溪湖鎮平和街302號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:231, name:'鵬傑餐飲店', address:'彰化縣和美鎮德美路580號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:232, name:'就愛晨光餐館', address:'嘉義縣民雄鄉裕農路189號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:233, name:'一三一號早餐', address:'台中市北屯區熱河路3段131號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:234, name:'家興商行', address:'台中市大里區塗城路252號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:235, name:'十一街早餐店', address:'台中市南屯區大墩十一街515號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:236, name:'鎰瓊食品行', address:'嘉義縣朴子市市東路28號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:237, name:'進雅輕食專賣店', address:'台中市西區大進街310號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:238, name:'鹿東晨食館', address:'彰化縣鹿港鎮鹿東路101號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:239, name:'中興早餐店', address:'台中市梧棲區中興路106號', product:'烹調油20270414004', batch:'未記錄', expiry:'未記錄' },
  { seq:240, name:'萬鮮股份有限公司', address:'臺中市西區民龍里臺灣大道二段218號29樓', product:'沙茶醬', batch:'315-1150404', expiry:'2027.04.03' },
  // ── 第 8 頁 ───────────────────────────────────────────────────────────────
  { seq:241, name:'青花驕台北中山北', address:'臺北市中山區正得里中山北路一段137號', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:242, name:'青花驕新店民權', address:'新北市新店區復興里民權路100號', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:243, name:'青花驕台中公益', address:'臺中市南屯區三和里公益路二段722號', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:244, name:'青花驕板橋縣民大道', address:'新北市板橋區新民里縣民大道二段1號', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:245, name:'青花驕台北光復南', address:'臺北市大安區華聲里光復南路100號', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:246, name:'青花驕台中崇德', address:'臺中市北屯區仁和里崇德路三段189號', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:247, name:'青花驕高雄裕誠', address:'高雄市左營區新上里裕誠路455號', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:248, name:'青花驕桃園同德', address:'桃園市桃園區同安里同德五街77號2樓', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:249, name:'青花驕高雄台鋁', address:'高雄市前鎮區忠純里忠勤路8號', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:250, name:'青花驕新莊中原', address:'新北市新莊區中原里中原路558號2樓', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:251, name:'青花驕台北南港車站', address:'臺北市南港區新光里忠孝東路七段369號C棟9樓', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:252, name:'青花驕台南新光新天地', address:'臺南市中西區西門路一段658號B1', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:253, name:'青花驕竹北光明', address:'新竹縣竹北市中崙里光明六路91號', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:254, name:'青花驕嘉義中山', address:'嘉義市西區番社里中山路370號1樓', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:255, name:'青花驕台北新光A11', address:'臺北市信義區西村里松壽路11號5樓', product:'青鍋底醬/金福華/2KG/包', batch:'315-1150404', expiry:'2027.04.03' },
  { seq:256, name:'福晨商行', address:'彰化縣秀水鄉安南巷118號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:257, name:'正鑫雜糧行', address:'新北市淡水區中山北路1段259號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:258, name:'立德食品有限公司', address:'桃園市桃園區三元街168號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:259, name:'徠喜昌商行', address:'臺中市西屯區西屯路3段148-19巷1號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:260, name:'吉順行', address:'新竹市香山區牛埔東路195號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:261, name:'三角有限公司', address:'新北市泰山區中港南路169-9號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:262, name:'谷樺國際有限公司', address:'基隆市暖暖區興隆街10-1號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:263, name:'瑞川行', address:'雲林縣斗六市中堅東路16號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:264, name:'瑞廣企業有限公司', address:'宜蘭縣員山鄉惠民路79號1樓', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:265, name:'安食達食材通路股份有限公司', address:'新北市新莊區化成路585-3號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:266, name:'允泰餐飲用品社', address:'屏東縣長治鄉香楊路63-1號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
  { seq:267, name:'源泉企業行', address:'南投縣埔里鎮九成街48號', product:'一級黃豆油', batch:'202605251313', expiry:'2026.11.07' },
];

async function importThirdLayerData() {
  console.log('🔄 初始化資料庫連線...');
  await initDB();

  // 確認 products 表格有 layer 欄位（擴充用）
  try {
    await dbAsync.run(`ALTER TABLE products ADD COLUMN layer INTEGER DEFAULT 3`);
    console.log('✅ 新增 layer 欄位');
  } catch(e) { /* 欄位已存在，忽略 */ }

  try {
    await dbAsync.run(`ALTER TABLE products ADD COLUMN address TEXT`);
    console.log('✅ 新增 address 欄位');
  } catch(e) { /* 忽略 */ }

  try {
    await dbAsync.run(`ALTER TABLE products ADD COLUMN seq_number INTEGER`);
    console.log('✅ 新增 seq_number 欄位');
  } catch(e) { /* 忽略 */ }

  console.log(`\n📦 開始匯入 ${thirdLayerRecords.length} 筆第三層下游業者資料...`);

  let inserted = 0;
  let updated = 0;

  for (const r of thirdLayerRecords) {
    const existing = await dbAsync.get(
      `SELECT id FROM products WHERE name = ? AND product_name = ?`,
      [r.name, r.product]
    );

    if (existing) {
      await dbAsync.run(
        `UPDATE products SET
          batch_number = ?, address = ?, layer = 3, seq_number = ?,
          status = 'recalled', last_updated = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [r.batch, r.address, r.seq, existing.id]
      );
      updated++;
    } else {
      await dbAsync.run(
        `INSERT INTO products
          (name, brand, product_name, batch_number, expiry_date, address, layer, seq_number,
           status, reason, source, last_updated, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 3, ?, 'recalled',
           '中聯油脂苯駢芘超標事件第三層下游業者',
           '食藥署第三層下游業者名單1150724.pdf',
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [r.name, r.name, r.product, r.batch, r.expiry, r.address, r.seq]
      );
      inserted++;
    }
  }

  const total = await dbAsync.get(`SELECT COUNT(*) as cnt FROM products`);
  console.log(`\n✅ 匯入完成！`);
  console.log(`   新增: ${inserted} 筆`);
  console.log(`   更新: ${updated} 筆`);
  console.log(`   資料庫現有總筆數: ${total.cnt} 筆`);
  console.log(`\n📋 完整名單涵蓋：`);
  console.log(`   - 序號 1~267 共 267 家第三層下游業者`);
  console.log(`   - 資料來源：食藥署「第三層下游業者名單1150724.pdf」（115年7月24日製表）`);

  process.exit(0);
}

importThirdLayerData().catch(err => {
  console.error('❌ 匯入失敗:', err.message);
  process.exit(1);
});
