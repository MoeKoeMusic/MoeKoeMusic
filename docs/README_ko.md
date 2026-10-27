> **주의**: 이 한국어 문서는 업데이트가 지연될 수 있으니, 최신 내용은 [중국어 간체 버전](https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/README.md)을 참고하세요.
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
    오픈소스이자 간결하고 아름다운 쿠거우(酷狗) 음악 서드파티 클라이언트
    <br />
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/" target="blank"><strong>🌎 GitHub 저장소</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://github.com/MoeKoeMusic/MoeKoeMusic/releases" target="blank"><strong>📦️ 설치 파일 다운로드</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://MoeJue.cn" target="blank"><strong>💬 블로그 방문</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://Music.MoeKoe.cn" target="blank"><strong>🏠 프로젝트 홈페이지</strong></a>
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

## ❤️ 머리말

약 10년 전쯤, 아직 웹 버전 QQ를 쓰던 시절부터 저는 이미 쿠거우(酷狗) 음악을 사용하고 있었습니다(십여 년 넘게 즐겨온 오랜 팬이기도 합니다). 그래서 이 모든 세월 동안 모아둔 곡들이 전부 그곳에 있습니다. 이후에는 NetEase Cloud Music이나 QQ 음악도 써 보고, 쿠거우의 플레이리스트를 그쪽으로 가져오려고도 했지만 결과는 모두 만족스럽지 못했습니다. 제가 주로 듣는 것은 일본 애니메이션 OP인데, 많은 곡을 찾을 수 없었습니다.

이리저리 돌고 돌아 결국 다시 쿠거우로 돌아왔습니다. 다만 Mac 버전 쿠거우는 종종 재생이 안 되는 경우가 있습니다. 인터페이스에 기능이 많지는 않지만 그래도 괜찮습니다. 네티즌의 추천으로 지금은 계속 쿠거우의 [컨셉 버전](https://t1.kugou.com/d2tBza3CSV2)에서 음악을 듣고 있는데, 이는 시중에서 몇 안 되는 VIP 곡을 무료로 들을 수 있는 음악 재생 소프트웨어 중 하나입니다. 강력히 추천합니다.

저는 자기소개 페이지에 음악 듣는 것을 특히 좋아하고, 특히 일본 애니메이션 OP를 좋아한다고 적어 두었습니다. 어떻게 증명할까요? (예전 웹 버전 플레이리스트도 오래 방치되어 있었습니다) 그럼 직접 음악 플레이어를 만들면 되겠네요.


## ✨ 특징

- ✅ Vue.js 풀스택으로 개발
- 🔴 쿠거우 계정 로그인(QR 코드/휴대폰/계정 로그인)
- 📃 가사 표시 지원
- 📻 매일 추천 곡
- 🔕 소셜 기능 전혀 없음
- 🔗 공식 서버 직접 연결
- ✔️ 매일 자동으로 VIP 수령, 로그인만 하면 VIP
- 🎨 테마 색상 전환
- 👋 시작 인사말
- ⚙️ 멀티 플랫폼 지원
- 🧩 슈퍼 플러그인 시스템
- 🧭 레이아웃 개인 설정
- 🥚 숨겨진 기능과 이스터 에그 시스템
- 🚀 초보자 가이드 시스템
- ✨ 더 많은 기능을 직접 탐험해 보세요

## 📢 Todo List
- [x] 📺 MV 재생 지원
- [x] 🌚 Light/Dark Mode 자동 전환
- [x] 👆 Touch Bar 지원
- [x] 🖥️ PWA 지원
- [x] ⌨️ 전역 단축키
- [x] 🤟 다국어 지원
- [x] 📻 데스크톱 가사
- [x] ⚙️ 시스템 아키텍처 최적화
- [x] 🎶 곡 담기, 플레이리스트/즐겨찾기, 취소

[변경 로그 보기](http://music.moekoe.cn/changelog.html)

## 📦️ 설치

### 1. 클라이언트 설치

본 프로젝트의 [Releases](https://github.com/MoeKoeMusic/MoeKoeMusic/releases) 페이지에 접속하여 설치 파일을 다운로드하세요.

### 2. WEB 버전 설치(docker)

* 참고: 배포 후 서버의 해당 포트를 열어야 사용할 수 있으며, 또는 리버스 프록시를 사용해 도메인으로 접속해야 합니다.

    1. 방법 1: 빠른 시작(권장)

    ```
    git clone --depth=1 https://github.com/MoeKoeMusic/MoeKoeMusic.git
    cd MoeKoeMusic
    docker compose up -d &
    ```

    2. ~~방법 2: docker-compose로 원클릭 설치(이미지는 아직 공식에 업로드되지 않았습니다)~~
    
    ```
    docker run -d --name MoeKoeMusic -p 8080:8080 -e PORT=6521 -e platform=lite iajue/moekoe-music:latest
    ```

    3. 방법 3: 바오타(宝塔) 컨테이너 오케스트레이션

    * 원격 이미지이므로 버전이 공식보다 뒤처질 수 있습니다
    
    ```
    version: '3.3'
    
    services:
      moekoe-music:
        # 이미지 주소
        image: registry.cn-wulanchabu.aliyuncs.com/youngxj/moekoe-music:latest
        container_name: moekoe-music # 컨테이너 이름
        restart: unless-stopped # 자동 재시작
        build:
          context: .
          dockerfile: Dockerfile
        environment:
          - PORT=6521
          - platform=lite
        ports: # 포트 매핑
          - "8080:8080"  # 프런트엔드 서비스
          - "6521:6521"  # API 서비스
    
    ```
    
    위 내용을 복사하여 바오타 패널의 컨테이너 오케스트레이션에 붙여 넣고, 오케스트레이션 이름을 `MoeKoeMusic`으로 지정한 뒤 "배포"를 클릭하세요.

### 3. 원클릭 배포
[![EdgeOne Pages로 배포](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?template=https://github.com/MoeKoeMusic/MoeKoeMusic&install-command=npm%20install&output-directory=dist&root-directory=.%2F&build-command=npm%20run%20build&env=VITE_APP_API_URL)

환경 변수 `VITE_APP_API_URL`에 본인의 API 주소를 입력해야 합니다.

## ⚙️ 개발

1. 이 저장소를 클론합니다

```sh
git clone --depth=1 https://github.com/MoeKoeMusic/MoeKoeMusic.git
```

2. 디렉터리로 이동하여 의존성을 설치합니다

```sh
cd MoeKoeMusic
pnpm install --frozen-lockfile
```
3. 개발자 모드를 시작합니다
  - 브라우저에서 개발
  ```sh
  pnpm run dev
  ```
  - 클라이언트 개발 모드에서 개발
  ```sh
  pnpm run dev:client
  ```

4. 프런트엔드 빌드
대상 플랫폼에 맞는 명령을 하나 선택하여 프런트엔드를 빌드하세요
```sh
pnpm run build # 웹용 프런트엔드 빌드
pnpm run build:client # 클라이언트용 프런트엔드 빌드
pnpm run build:docker # Docker 이미지용 프런트엔드 빌드
```
5. 프로젝트 컴파일
  - Windows: 
```sh
pnpm run electron:build:win # [기본 NSIS 설치 파일]
```
  - Linux: 
```sh
pnpm run electron:build:linux # [기본 AppImage 형식]
```
  - macOS: 
```sh
pnpm run electron:build:macos # [기본 macOS 듀얼 아키텍처]
```


더 많은 명령은 `package.json` 파일의 `scripts`를 참고하세요.

## 👷‍♂️ 클라이언트 빌드

Release 페이지에서 자신의 기기에 맞는 설치 파일을 찾지 못했다면, 아래 단계에 따라 직접 클라이언트를 패키징할 수 있습니다.

1. [Node.js](https://nodejs.org/en/)를 설치하고 `Node.js` 버전이 20.0.0 이상인지 확인합니다.

2. `git clone --depth=1 https://github.com/MoeKoeMusic/MoeKoeMusic.git`을 사용해 이 저장소를 로컬에 클론합니다.

3. `pnpm install --frozen-lockfile`로 프로젝트 의존성을 설치합니다.

4. `pnpm run build:client`를 사용해서 클라이언트용 프론트엔드를 빌드하기

5. 아래 명령 중 자신에게 맞는 것을 선택해 설치 파일을 패키징하면, 결과물은 `/dist_electron` 디렉터리에 생성됩니다. 자세한 내용은 [electron-builder 문서](https://www.electron.build/cli)를 참고하세요.


#### 1. macOS 플랫폼 패키징
   - 범용 macOS 패키지(Intel 및 Apple Silicon 듀얼 아키텍처):
   ```
   pnpm run electron:build -- --mac --universal
   ```
   - Intel 아키텍처만:
   ```
   pnpm run electron:build -- --mac --x64
   ```
   - Apple Silicon 아키텍처만:
   ```
   pnpm run electron:build -- --mac --arm64
   ```


#### 2. Windows 플랫폼 패키징

   - 기본 NSIS 설치 파일(대부분의 Windows 사용자에게 적합):
   ```
   pnpm run electron:build -- --win
   ```
   - Windows용 EXE 파일과 Squirrel 설치 파일 생성:
   ```
   pnpm run electron:build -- --win --ia32 --x64 --arm64 --target squirrel
   ```
       - `--ia32`는 32비트 Windows 아키텍처입니다.
       - `--x64`는 64비트 Windows 아키텍처입니다.
       - `--arm64`는 ARM Windows 아키텍처(Surface 등 기기)입니다.

   - Windows용 포터블 EXE 파일 생성(설치 불필요):
   ```
   pnpm run electron:build -- --win --portable
   ```
#### 3. Linux 플랫폼 패키징
   - 기본 AppImage 형식(대부분의 Linux 배포판에 적합):

   ```
   pnpm run electron:build -- --linux
   ```
   - snap(Ubuntu 및 snap을 지원하는 배포판용):
   ```
   pnpm run electron:build -- --linux --target snap
   ```
   - deb(Debian/Ubuntu 계열용):
   ```
   pnpm run electron:build -- --linux --target deb
   ```
   - rpm(Red Hat/Fedora 계열용):
   ```
   pnpm run electron:build -- --linux --target rpm
   ```
   - ARM64 아키텍처(ARM v8+): 
   ```
   pnpm run electron:build:linux-arm64
   ```

#### 4. 모든 플랫폼 패키징

  Windows, macOS, Linux용 설치 파일을 동시에 생성해야 한다면 다음 명령을 사용할 수 있습니다:
  ```
  pnpm run electron:build -- -mwl
  ```

#### 5. 사용자 지정 빌드 설정

  필요에 따라 다른 옵션을 추가해 패키징을 더 세부적으로 사용자 지정할 수 있습니다. 예를 들어 x64와 arm64 아키텍처를 지정하거나 다른 대상 형식을 선택할 수 있습니다.

## ⭐ 프로젝트 후원

이 프로젝트가 도움이 되었다면 Star를 눌러 주세요! 여러분의 지지가 저희가 계속 개선해 나가는 원동력입니다.

[![GitHub stars](https://img.shields.io/github/stars/MoeKoeMusic/MoeKoeMusic.svg?style=social&label=Star)](https://github.com/MoeKoeMusic/MoeKoeMusic)

## ✅ 피드백

질문이나 제안이 있으시면 언제든지 issue 또는 pull request를 보내 주세요.

## ⚠️ 면책 조항
1. 본 프로그램은 쿠거우의 서드파티 클라이언트이며 쿠거우 공식 프로그램이 아닙니다. 더 완전한 기능이 필요하시면 공식 클라이언트를 다운로드해 사용해 보세요.
2. 본 프로젝트는 학습용으로만 제공됩니다. 저작권을 존중해 주시고, 본 프로젝트를 상업적 행위나 불법적인 용도로 사용하지 마세요!
3. 본 프로젝트를 사용하는 과정에서 저작권 데이터가 생성될 수 있습니다. 이러한 저작권 데이터에 대해 본 프로젝트는 소유권을 갖지 않습니다. 침해를 피하기 위해 사용자는 본 프로젝트 사용 과정에서 생성된 저작권 데이터를 24시간 이내에 삭제해야 합니다.
4. 본 프로젝트의 사용으로 인해 발생하는, 본 약관에 의한 것이든 본 프로젝트의 사용 또는 사용 불가로 인한 것이든, 모든 성격의 직접적, 간접적, 특별, 우발적 또는 결과적 손해(영업권 손실, 작업 중단, 컴퓨터 고장이나 오작동으로 인한 손해, 그리고 그 외의 모든 상업적 손해 또는 손실을 포함하되 이에 국한되지 않음)에 대한 책임은 사용자에게 있습니다.
5. 현지 법률과 규정을 위반하는 방식으로 본 프로젝트를 사용하는 것은 금지됩니다. 현지 법률과 규정이 허용하지 않는다는 사실을 알았거나 알지 못한 상태에서 본 프로젝트를 사용함으로써 발생한 모든 위법·불법 행위에 대한 책임은 사용자에게 있으며, 본 프로젝트는 그로 인해 발생하는 직접적, 간접적, 특별, 우발적 또는 결과적 책임을 지지 않습니다.
6. 음악 플랫폼 운영은 쉽지 않습니다. 저작권을 존중하고 정품을 응원해 주세요.
7. 본 프로젝트는 기술적 실현 가능성의 탐구와 연구에만 사용되며, 어떠한 상업적(광고 등을 포함하되 이에 국한되지 않음) 협력이나 기부도 받지 않습니다.
8. 공식 음악 플랫폼이 본 프로젝트를 부적절하다고 판단하는 경우, 본 프로젝트에 연락하시면 변경하거나 제거하겠습니다.
            

## 📜 오픈소스 라이선스

본 프로젝트는 개인 학습 및 연구 목적으로만 제공되며, 상업적 및 불법적 사용은 금지됩니다.

[GNU General Public License v2.0 (GPL-2.0)](https://github.com/MoeKoeMusic/MoeKoeMusic/blob/main/LICENSE) 라이선스에 따라 오픈소스로 공개되었습니다.

## 👍 영감의 원천

API 소스 코드는 [MakcRe/KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi)에서 왔습니다

- [Apple Music](https://music.apple.com)
- [YouTube Music](https://music.youtube.com)
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)
- [쿠거우 음악](https://kugou.com/)

## 🖼️ 스크린샷

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
