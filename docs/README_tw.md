> **注意**: 此繁體中文文檔可能更新不及時，最新內容請參考[簡體中文版本](https://github.com/iAJue/MoeKoeMusic/README.md)。
<br />
<p align="center">
<img src="https://github.com/iAJue/MoeKoeMusic/raw/main/images/logo.png "alt="Logo"width="156"height="156">
<h2 align="center"style="font-weight: 600">MoeKoe Music</h2>

<p align="center">
一款開源簡潔高顏值的酷狗協力廠商用戶端
<br />
<a href="https://github.com/iAJue/MoeKoeMusic/" target="blank"><strong>🌎 GitHub 倉庫</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
<a href="https://github.com/iAJue/MoeKoeMusic/releases" target="blank"><strong>📦️ 下載安裝包</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
<a href="https://MoeJue.cn" target="blank"><strong>💬 訪問部落格</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
<a href="https://Music.MoeKoe.cn" target="blank"><strong>🏠 項目主頁</strong></a>
</p>
<p align="center">
    <a href="https://github.com/iAJue/MoeKoeMusic/README.md" target="blank"><strong>🇨🇳 简体中文</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/iAJue/MoeKoeMusic/blob/main/docs/README_tw.md" target="blank"><strong>🇨🇳 繁体中文</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/iAJue/MoeKoeMusic/blob/main/docs/README_ja.md" target="blank"><strong>🇯🇵 日本語</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/iAJue/MoeKoeMusic/blob/main/docs/README_en.md" target="blank"><strong>🇺🇸 English</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/iAJue/MoeKoeMusic/blob/main/docs/README_ko.md" target="blank"><strong>🇰🇷 한국어</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/iAJue/MoeKoeMusic/blob/main/docs/README_ru.md" target="blank"><strong>🇷🇺 Русский</strong></a>
    <br />
    <br />
</p>
</p>

![images](https://github.com/iAJue/MoeKoeMusic/raw/main/images/1.png)

## ❤️ 前言

早在10年前後的樣子，那會在用網頁版QQ的時候我就已經開始使用酷狗音樂了(也是十來年的老粉了)，所以這些年收藏的歌曲全部都在上面. 後來我也嘗試開始使用網易雲或QQ音樂，也嘗試把酷狗的歌單導入進去，但是效果都不盡人意. 我聽的大多是日漫OP，好多歌曲都沒辦法找到.

兜兜轉轉最後還是回到酷狗，但是在Mac端的酷狗，時常可能會出現不能播放的情况，雖說介面沒什麼功能，但也挺好的. 在網友的安利下，我現在一直是在酷狗的[概念版](https://t1.kugou.com/d2tBza3CSV2)上聽歌，並且是市面上為數不多能免費聽VIP歌曲的音樂播放軟體了，力推.

我在我的個人介紹頁面說我特別喜歡聽歌，尤其是日漫OP. 怎麼證明呢？ (之前我網頁版歌單也年久失修了)那就自己開發一個音樂播放機.


## ✨  特性

- ✅  使用Vue.js全家桶開發
- 🔴  酷狗帳號登入(掃碼/手機/帳號登入)
- 📃  支持歌詞顯示
- 📻  每日推薦歌曲
- 🚫🤝  無任何社交功能
- 🔗  官方服務器直連，無任何協力廠商API
- ✔️  每日自動領取VIP，登入就是VIP
- 🎨  主題色切換
- 👋  啟動問候語
- ⚙️  多平臺支持
- 🛠  更多特性開發中

## 📢 Todo List
- [ ] 📺  支持MV播放
- [x] 🌚 Light/Dark Mode  自動切換
- [x] 👆  支持Touch Bar
- [x] 🖥️  支持PWA，可在Chrome/Edge裏點擊地址欄右邊的 ➕  安裝到電腦
- [ ] 🟥  支持Last.fm Scrobble
- [ ] 🎧  支持Mpris
- [x] ⌨️  全域快速鍵
- [x] 🤟  多語言支持
- [x] 📻  案頭歌詞
- [x] ⚙️  系統架構優化
- [x] 🎶  歌曲、歌單/收藏、取消

更新日誌請查看[Commits](https://github.com/iAJue/MoeKoeMusic/commits/main/)

## 📦 ️安裝

訪問本項目的[Releases](https://github.com/iAJue/MoeKoeMusic/releases)頁面下載安裝包。

## ⚙️  開發

1.尅隆本倉庫

```sh
git clone  https://github.com/iAJue/MoeKoeMusic.git
```

2.進入目錄並安裝依賴

```sh
cd MoeKoeMusic
npm run install-all
```
3.啟動開發者模式
```sh
npm run dev
```
4.打包項目
```sh
npm run build
```
5.編譯項目
- Windows:
```sh
npm run electron:build:win [默認NSIS安裝包]
```
- Linux:
```sh
npm run electron:build:linux [默認AppImage格式]
```
- macOS:
```sh
npm run electron:build:macos [默認雙架構]
```


更多命令請查看`package.json`檔案`scripts`

## 👷‍♂️  編譯用戶端

如果在Release頁面沒有找到適合你的設備的安裝包的話，你可以根據下麵的步驟來打包自己的用戶端。

1.安裝[Node.js](https://nodejs.org/en/)，並確保`Node.js`版本>= 18.0.0。

2.使用`git clone https://github.com/iAJue/MoeKoeMusic.git `尅隆本倉庫到本地。

3.使用`npm install`安裝項目依賴。
4.編譯API服務端
- Windows:
```sh
npm run build:api:win
```
- Linux:
```sh
npm run build:api:linux
```
- macOS:
```sh
npm run build:api:macos
```

5.選擇下列的命令來打包適合的你的安裝包，打包出來的檔案在`/dist_electron`目錄下。 瞭解更多資訊可訪問[electron-builder檔案](https://www.electron.build/cli)


#### 1. 打包macOS平臺
-通用的macOS包(Intel和Apple Silicon雙架構)：
```
npm run electron:build -- --mac --universal
```
-僅Intel架構：
```
npm run electron:build -- --mac --x64
```
-僅Apple Silicon架構：
```
npm run electron:build -- --mac --arm64
```


#### 2. 打包Windows平臺

-默認NSIS安裝包(適合大多數Windows用戶)：
```
npm run electron:build -- --win
```
-為Windows創建EXE檔案和Squirrel安裝包：
```
npm run electron:build -- --win --ia32 --x64 --arm64 --target squirrel
```
---ia32為32比特Windows架構。
---x64為64比特Windows架構。
---arm64為ARM Windows架構(Surface等設備)。

-為Windows生成可擕式的EXE檔案(免安裝)：
```
npm run electron:build -- --win --portable
```
#### 3. 打包Linux平臺
-默認AppImage格式(適用於大多數Linux發行版本)：
```
npm run electron:build -- --linux
```
- snap(適用於Ubuntu和支持snap的發行版本)：
```
npm run electron:build -- --linux --target snap
```
- deb(適用於Debian/Ubuntu系列)：
```
npm run electron:build -- --linux --target deb
```
- rpm(適用於Red Hat/Fedora系列)：
```
npm run electron:build -- --linux --target rpm
```

#### 4. 打包所有平臺

如果需要同時生成Windows、macOS和Linux的安裝包，可以使用以下命令：
```
npm run electron:build -- -mwl
```

#### 5. 自定義編譯設定

您可以根據需要添加其他選項來進一步自定義打包，例如指定x64和arm64架構，或選擇不同的目標格式。


## ⭐ 支持項目

如果您覺得這個項目對您有幫助，歡迎給我們一個 Star！您的支持是我們持續改進的動力。

[![GitHub stars](https://img.shields.io/github/stars/iAJue/MoeKoeMusic.svg?style=social&label=Star)](https://github.com/iAJue/MoeKoeMusic)


## ☑️  反饋

如有任何問題或建議，歡迎提交issue或pull request。

## ⚠️ 免責聲明
0. 本程式是酷狗協力廠商用戶端，並非酷狗官方，需要更完善的功能請下載官方用戶端體驗.
1. 本項目僅供學習使用，請尊重版權，請勿利用此項目從事商業行為及非法用途!
2. 使用本項目的過程中可能會產生版權數據。 對於這些版權數據，本項目不擁有它們的所有權。 為了避免侵權，使用者務必在24小時內清除使用本項目的過程中所產生的版權數據。
3. 由於使用本項目產生的包括由於本協定或由於使用或無法使用本項目而引起的任何性質的任何直接、間接、特殊、偶然或結果性損害(包括但不限於因商譽損失、停工、電腦故障或故障引起的損害賠償，或任何及所有其他商業損害或損失)由使用者負責。         
1. 禁止在違反當地法律法規的情况下使用本項目。 對於使用者在明知或不知當地法律法規不允許的情况下使用本項目所造成的任何違法違規行為由使用者承擔，本項目不承擔由此造成的任何直接、間接、特殊、偶然或結果性責任。
            
2. 音樂平臺不易，請尊重版權，支持正版。
3. 本項目僅用於對科技可行性的探索及研究，不接受任何商業(包括但不限於廣告等)合作及捐贈。
4. 如果官方音樂平臺覺得本項目不妥，可聯系本項目更改或移除。
            

## 📜  開源許可

本項目僅供個人學習研究使用，禁止用於商業及非法用途。

基於[MIT license](https://opensource.org/licenses/MIT)許可進行開源。

## 👍 靈感來源

API原始程式碼來自[MakcRe/KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi)
(為了不破壞原項目的結構和後期更新反覆運算方便，API未做高度集成.~~ 其實是圖省事~~)

- [Apple Music](https://music.apple.com)
- [YouTube Music](https://music.youtube.com)
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)
- [酷狗音樂](https://kugou.com/)

## 🖼️  截圖

![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/2.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/3.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/4.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/5.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/6.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/7.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/8.png)

## 🗓️ Star 歷史

[![Star History Chart](https://api.star-history.com/svg?repos=iAJue/MoeKoeMusic&type=Date)](https://www.star-history.com/#iAJue/MoeKoeMusic&Date)
