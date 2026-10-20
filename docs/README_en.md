> **Note**: This English document may not be updated in a timely manner. For the latest content, please refer to the [Simplified Chinese version](https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/README.md).
<br />
<p align="center">
    <img src="https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/hero.png" alt="hero" width="250" height="250">
  <h2 align="center" style="font-weight: 600">MoeKoe Music</h2>
  <p align="center">
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/releases/latest"><img src="https://img.shields.io/github/v/release/MoeKoeMusic/MoeKoeMusic?style=flat-square" /></a>
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/stargazers"><img src="https://img.shields.io/github/stars/MoeKoeMusic/MoeKoeMusic?style=flat-square" /></a>
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/releases"><img src="https://img.shields.io/github/downloads/MoeKoeMusic/MoeKoeMusic/total?style=flat-square" /></a>
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/LICENSE"><img src="https://img.shields.io/github/license/MoeKoeMusic/MoeKoeMusic?style=flat-square" /></a>
    <a href="https://github.com/iAJue"><img src="https://img.shields.io/badge/%F0%9F%8E%89_Create_by_iAJue-with_Love_%E2%9D%A4-pink?style=flat-square" /></a>
  </p>
  <p align="center">
    An open-source, clean and good-looking third-party client for KuGou Music
    <br />
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/" target="blank"><strong>🌎 GitHub Repository</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/releases" target="blank"><strong>📦️ Download Installers</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://MoeJue.cn" target="blank"><strong>💬 Visit Blog</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://Music.MoeKoe.cn" target="blank"><strong>🏠 Project Homepage</strong></a>
  </p>
  <p align="center">
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/README.md" target="blank"><strong>🇨🇳 简体中文</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/docs/README_tw.md" target="blank"><strong>🇨🇳 繁体中文</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/docs/README_ja.md" target="blank"><strong>🇯🇵 日本語</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/docs/README_en.md" target="blank"><strong>🇺🇸 English</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/docs/README_ko.md" target="blank"><strong>🇰🇷 한국어</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/docs/README_ru.md" target="blank"><strong>🇷🇺 Русский</strong></a>
    <br />
    <br />
  </p>
</p>

![images](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/1.png)

## ❤️ Preface

Around ten years ago, back when I was using the web version of QQ, I had already started using KuGou Music (I've been a loyal user for over a decade), so all the songs I had collected over the years were stored there. Later I also tried NetEase Cloud Music and QQ Music, and tried importing my KuGou playlists into them, but the results were far from satisfying. Most of what I listen to are Japanese anime OPs, and a lot of those songs simply couldn't be found.

After wandering around, I eventually came back to KuGou. The Mac version of KuGou, however, often fails to play songs; it doesn't have many features, but it's still quite nice. On the recommendation of fellow netizens, I now listen to music on KuGou's [concept version](https://t1.kugou.com/d2tBza3CSV2), which is one of the few music players on the market that lets you listen to VIP songs for free. Highly recommended.

On my personal profile page I said I especially love listening to music, Japanese anime OPs in particular. How do I prove it? (my web playlist had long fallen into disrepair) Then I'd just build my own music player.


## ✨ Features

- ✅ Developed with the Vue.js ecosystem
- 🔴 KuGou account login (QR code / phone / account)
- 📃 Lyrics display support
- 📻 Daily recommended songs
- 🔕 No social features at all
- 🔗 Direct connection to the official servers
- ✔️ Automatically claim VIP every day — log in and you're VIP
- 🎨 Theme color switching
- 👋 Startup greetings
- ⚙️ Multi-platform support
- 🧩 Super plugin system
- 🧭 Personalized layout settings
- 🥚 Hidden features and easter egg system
- 🚀 Onboarding guide system
- ✨ Even more features for you to explore

## 📢 Todo List
- [x] 📺 Support MV playback
- [x] 🌚 Automatic Light/Dark Mode switching
- [x] 👆 Support Touch Bar
- [x] 🖥️ Support PWA
- [x] ⌨️ Global hotkeys
- [x] 🤟 Multi-language support
- [x] 📻 Desktop lyrics
- [x] ⚙️ System architecture optimization
- [x] 🎶 Songs, playlists/favorites, cancel

[View changelog](http://music.moekoe.cn/changelog.html)

## 📦️ Installation

### 1. Client Installation

Visit the [Releases](https://github.com/MoeKoeMusic/MoeKoeMusic/releases) page of this project to download an installer.

### 2. Web Installation (Docker)

* Note: After deployment, please open the corresponding port on your server before using it, or use a reverse proxy to access it via a domain name.

    1. Option 1: Quick start (recommended)

    ```
    git clone --depth=1 https://github.com/MoeKoeMusic/MoeKoeMusic.git
    cd MoeKoeMusic
    docker compose up -d &
    ```

    2. ~~Option 2: One-click installation with docker-compose (the image has not yet been uploaded officially)~~
    
    ```
    docker run -d --name MoeKoeMusic -p 8080:8080 -e PORT=6521 -e platform=lite iajue/moekoe-music:latest
    ```

    3. Option 3: Baota (aaPanel) container orchestration

    * Remote image; the version may lag behind the official one
    
    ```
    version: '3.3'
    
    services:
      moekoe-music:
        # Image address
        image: registry.cn-wulanchabu.aliyuncs.com/youngxj/moekoe-music:latest
        container_name: moekoe-music # Container name
        restart: unless-stopped # Auto restart
        build:
          context: .
          dockerfile: Dockerfile
        environment:
          - PORT=6521
          - platform=lite
        ports: # Port mapping
          - "8080:8080"  # Frontend service
          - "6521:6521"  # API service
    
    ```
    
    Copy the content above, paste it into the container orchestration section of the Baota panel, name the orchestration `MoeKoeMusic`, and click Deploy.

### 3. One-Click Deployment
[![Deploy with EdgeOne Pages](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?template=https://github.com/MoeKoeMusic/MoeKoeMusic&install-command=npm%20install&output-directory=dist&root-directory=.%2F&build-command=npm%20run%20build&env=VITE_APP_API_URL)

You need to fill in your own API address in the environment variable `VITE_APP_API_URL`.

## ⚙️ Development

1. Clone this repository

```sh
git clone --depth=1 https://github.com/MoeKoeMusic/MoeKoeMusic.git
```

2. Enter the directory and install dependencies

```sh
cd MoeKoeMusic
npm install
```
3. Start developer mode
  - Develop in the browser
  ```sh
  npm run dev
  ```
  - Develop in client development mode
  ```sh
  npm run dev:client
  ```

4. Build the frontend
Choose one of the commands below for your target platform to build the frontend
```sh
npm run build # Build the frontend for the web
npm run build:client # Build the frontend for the client
npm run build:docker # Build the frontend for the Docker image
```
5. Compile the project
  - Windows:
```sh
npm run electron:build:win # [NSIS installer by default]
```
  - Linux:
```sh
npm run electron:build:linux # [AppImage format by default]
```
  - macOS:
```sh
npm run electron:build:macos # [both macOS architectures by default]
```


For more commands, please refer to `scripts` in the `package.json` file.

## 👷‍♂️ Building the Client

If you can't find an installer suitable for your device on the Releases page, you can follow the steps below to package your own client.

1. Install [Node.js](https://nodejs.org/en/) and make sure the `Node.js` version is >= 20.0.0.

2. Clone this repository locally with `git clone --depth=1 https://github.com/MoeKoeMusic/MoeKoeMusic.git`.

3. Install the project dependencies with `npm install`.

4. Build frontend for client with `npm run build:client`

5. Choose one of the commands below to package the installer that suits you; the output files will be in the `/dist_electron` directory. For more information, see the [electron-builder documentation](https://www.electron.build/cli).


#### 1. Packaging for the macOS platform
   - Universal macOS package (Intel and Apple Silicon, both architectures):
   ```
   npm run electron:build -- --mac --universal
   ```
   - Intel architecture only:
   ```
   npm run electron:build -- --mac --x64
   ```
   - Apple Silicon architecture only:
   ```
   npm run electron:build -- --mac --arm64
   ```


#### 2. Packaging for the Windows platform

   - Default NSIS installer (suitable for most Windows users):
   ```
   npm run electron:build -- --win
   ```
   - Create EXE files and Squirrel installers for Windows:
   ```
   npm run electron:build -- --win --ia32 --x64 --arm64 --target squirrel
   ```
       - `--ia32` targets 32-bit Windows.
       - `--x64` targets 64-bit Windows.
       - `--arm64` targets ARM Windows (Surface and similar devices).

   - Generate a portable EXE for Windows (no installation required):
   ```
   npm run electron:build -- --win --portable
   ```
#### 3. Packaging for the Linux platform
   - Default AppImage format (suitable for most Linux distributions):

   ```
   npm run electron:build -- --linux
   ```
   - snap (for Ubuntu and distributions that support snap):
   ```
   npm run electron:build -- --linux --target snap
   ```
   - deb (for the Debian/Ubuntu family):
   ```
   npm run electron:build -- --linux --target deb
   ```
   - rpm (for the Red Hat/Fedora family):
   ```
   npm run electron:build -- --linux --target rpm
   ```
   - ARM64 architecture (ARM v8+):
   ```
   npm run build:api:linux-arm64 // build the API
   npm run electron:build:linux-arm64 // build the main program
   ```

#### 4. Packaging for all platforms

  If you need to generate installers for Windows, macOS and Linux at the same time, you can use the following command:
  ```
  npm run electron:build -- -mwl
  ```

#### 5. Custom build settings

  You can add other options as needed to further customize the packaging, for example to specify the x64 and arm64 architectures, or to choose different target formats.

## ⭐ Support the Project

If you find this project helpful, you're welcome to give us a Star! Your support is what drives us to keep improving.

[![GitHub stars](https://img.shields.io/github/stars/MoeKoeMusic/MoeKoeMusic.svg?style=social&label=Star)](https://github.com/MoeKoeMusic/MoeKoeMusic)

## ✅ Feedback

If you have any questions or suggestions, feel free to open an issue or pull request.

## ⚠️ Disclaimer
1. This program is a third-party client for KuGou, not official KuGou software. For more complete functionality, please download and try the official client.
2. This project is for learning purposes only. Please respect copyright and do not use this project for commercial purposes or illegal activities!
3. Copyrighted data may be produced while using this project. This project does not own the rights to such data. To avoid infringement, users must delete any copyrighted data generated during their use of this project within 24 hours.
4. The user is responsible for any direct, indirect, special, incidental or consequential damages of any kind arising from the use of this project, including but not limited to damages for loss of goodwill, work stoppage, computer failure or malfunction, or any and all other commercial damages or losses, whether arising from this agreement or from the use of, or inability to use, this project.
5. It is forbidden to use this project in violation of local laws and regulations. Any illegal or unlawful conduct caused by a user using this project while knowing, or not knowing, that local laws and regulations do not permit it shall be borne by the user. This project assumes no direct, indirect, special, incidental or consequential liability arising therefrom.
6. Music platforms have a hard time; please respect copyright and support legal copies.
7. This project is intended solely for exploring and researching technical feasibility, and accepts no commercial cooperation (including but not limited to advertising) or donations.
8. If the official music platform considers this project inappropriate, it may contact this project to have it modified or removed.
            

## 📜 License

This project is for personal learning and research use only. Commercial and illegal use is prohibited.

Open-sourced under the [GNU General Public License v2.0 (GPL-2.0)](https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/LICENSE).

## 👍 Inspiration

The API source code comes from [MakcRe/KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi)

- [Apple Music](https://music.apple.com)
- [YouTube Music](https://music.youtube.com)
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)
- [KuGou Music](https://kugou.com/)

## 🖼️ Screenshots

![image](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/2.png)
![image](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/3.png)
![image](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/4.png)
![image](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/5.png)
![image](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/6.png)
![image](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/7.png)
![image](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/8.png)
![image](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/9.png)
![image](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/10.png)
![image](https://github.com/MoeKoeMusic/MoeKoeMusic/raw/main/images/11.png)


## 🗓️ Star History

[![Star History Chart](https://api.star-history.com/chart?repos=MoeKoeMusic/MoeKoeMusic&type=date&legend=top-left&sealed_token=unIw8k8CbengL1CW5XVoW-psSsTQHjp7X6Hchrr9WiEh4baeFZXunI95J9V8nnY8XTWrT8UuvRBXScevzXLRlhTID0-_V200iw9TFChclu1-28maCH3NutInvRl6nQ1jDMXpInpefFixeHYDr8BCn9fYqiNtZAoK30Vi46s7QPQQU80mJstgjgeqWjXf)](https://www.star-history.com/#MoeKoeMusic/MoeKoeMusic&Date)
