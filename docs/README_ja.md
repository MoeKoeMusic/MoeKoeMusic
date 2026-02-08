> **注意**: この日本語ドキュメントはタイムリーに更新されない場合があります。最新の内容については[簡体字中国語版](https://github.com/iAJue/MoeKoeMusic/README.md)をご参照ください。
<br />
<p align="center">
<img src="https://github.com/iAJue/MoeKoeMusic/raw/main/images/logo.png" alt="Logo" width="156" height="156">
<h2 align="center" style="font-weight: 600">MoeKoe Music</h2>

<p align="center">
オープンソースで簡潔で高ルックスのクールな犬のサードパーティクライアント
<br />
<a href="https://github.com/iAJue/MoeKoeMusic/" target="blank"><strong>🌎 GitHub倉庫</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
<a href="https://github.com/iAJue/MoeKoeMusic/releases" target="blank"><strong>📦️インストールパッケージのダウンロード</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
<a href="https://MoeJue.cn" target="blank"><strong>💬 ブログへのアクセス</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
<a href="https://Music.MoeKoe.cn" target="blank"><strong>🏠 プロジェクトホームページ</strong></a>
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

### ❤️ はじめに

10年ほど前の様子では、Web版QQを使っている間に私はすでにクールな犬音楽を使い始めていたので(10年以上の古い粉でもある)、これらの年に所蔵されている曲はすべて上にあります。その後、私も網易雲やQQ音楽を使ってみたり、クールな犬の歌を導入してみたりしましたが、効果はあまりありませんでした。私が聴いているのはほとんど日漫OPで、多くの曲は見つけることができませんでした。

ぐるぐる回って結局クールドッグに戻るのですが、Mac側のクールドッグでは、時々再生できないことがあります。インタフェースはあまり機能していないとはいえ、いいですね。ネットユーザーのアンリの下で、私は今までクールな犬の[コンセプト版](https://t1.kugou.com/d2tBza3CSV2)で歌を聴いて、しかもVIP曲を無料で聴ける音楽再生ソフトは市販されていないので、力を入れてください。

私は私の個人紹介ページで、私は特に歌を聴くのが好きだと言っています。特に日漫OP.どうやって証明しますか。(以前は私のウェブ版の歌単も長年修理を怠っていました)では、自分で音楽プレーヤーを開発します。


## ✨ プロパティ

- ✅ Vue.jsファミリーバケツを用いた開発
- 🔴 クールドッグアカウント登録(スキャン/携帯/アカウント登録)
- 📃 歌詞表示のサポート
- 📻 毎日のおすすめ曲
- 🚫🤝 ソーシャル機能なし
- 🔗 サードパーティ製APIなしの公式サーバ直結
- ✔️ VIPは毎日自動で受け取り、ログインするとVIPになります
- 🎨 テーマカラー切り替え
- 👋 開始の挨拶
- ⚙️ マルチプラットフォームサポート
- 🛠 その他の機能開発中

## 📢 Todo List
- [x] 📺 MV再生をサポート
- [x] 🌚 Light/Dark Mode 自動切り替え
- [x] 👆 Touch Bar対応
- [x] 🖥️ PWA対応、Chrome/Edgeでアドレスバー右の➕ コンピュータにインストール
- [ ] 🎧 Mprisのサポート
- [x] ⌨️ ショートカットとグローバルショートカットのカスタマイズ
- [x] 🤟 多言語サポート
- [x] 📻 デスクトップ歌詞
- [x] ⚙️ システムアーキテクチャの最適化
- [x] 🎶 曲、歌/コレクション、キャンセル

更新ログは[Commits](https://github.com/iAJue/MoeKoeMusic/commits/main/)

## 📦️ インストール

### 1. クライアントのインストール

本プロジェクトの [Releases](https://github.com/iAJue/MoeKoeMusic/releases) ページにアクセスして、インストールパッケージをダウンロードしてください。

### 2. WEB版のインストール（docker）

* 注意：デプロイ後は、サーバーの対応ポートを開放する必要があります。または、リバースプロキシを使用してドメインアクセスを実現してください。

    1. 方法一：クイックスタート（推奨）

    ```
    git clone https://github.com/iAJue/MoeKoeMusic.git
    cd MoeKoeMusic
    git submodule update --init --recursive
    docker compose up -d &
    ```

    2. ~~方法二：docker-composeを使用したワンクリックインストール（イメージはまだ公式にアップロードされていません）~~
    
    ```
    docker run -d --name MoeKoeMusic -p 8080:8080 iajue/moekoe-music:latest
    ```

    3. 方法三：宝塔コンテナ編成

    * リモートイメージ、バージョンは公式より遅れる可能性があります。
    
    ```
    version: '3.3'
    
    services:
      moekoe-music:
        # イメージアドレス
        image: registry.cn-wulanchabu.aliyuncs.com/youngxj/moekoe-music:latest
        container_name: moekoe-music # コンテナ名
        restart: unless-stopped # 自動再起動
        build:
          context: .
          dockerfile: Dockerfile
        ports: # ポートマッピング
          - "8080:8080"  # フロントエンドサービス
          - "6521:6521"  # APIサービス
    
    ```
    
    上記の内容をコピーして、宝塔パネルのコンテナ編成に貼り付け、編成名をMoeKoeMusicとして、デプロイをクリックしてください。

### 3. ワンクリックデプロイ
[![EdgeOne Pagesを使用してデプロイ](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?template=https://github.com/iAJue/moekoemusic&install-command=npm%20install&output-directory=dist&root-directory=.%2F&build-command=npm%20run%20build&env=VITE_APP_API_URL)

環境変数（VITE_APP_API_URL）に自分のAPIアドレスを入力する必要があります。

## ⚙️ かいはつ

1.本倉庫のクローニング

```sh
git clone --recurse-submodules https://github.com/iAJue/MoeKoeMusic.git
```

2.ディレクトリにアクセスして依存関係をインストールする

```sh
cd MoeKoeMusic
npm run install-all
```
3.開発者モデルの起動
```sh
npm run dev
```
4.パッケージ項目
```sh
npm run build
```
5.プロジェクトのコンパイル
- Windows: 
```sh
npm run electron：build：win[デフォルトNSISインストールパッケージ]
```
-	Linux: 
```sh
npm run electron：build：linux[デフォルトAppImageフォーマット]
```
-	macOS: 
```sh
npm run electron：build：macos[デフォルトの双架構]
```


詳細なコマンドは、「package.json」ファイル「scripts」を参照してください。

## 👷‍♂️ クライアントのコンパイル

Releaseページであなたに適したデバイスのインストールパッケージが見つからない場合は、次の手順に従って自分のクライアントをパッケージ化することができます。

1. [ノード.js](https://nodejs.org/en/)を選択し、` Node.js `バージョン>=18.0.0であることを確認します。

2. を使用する `git clonehttps://github.com/iAJue/MoeKoeMusic.git`この倉庫をローカルにクローニングします。

3. `npm install `を使用してプロジェクト依存性をインストールします。
4. APIサービス端末のコンパイル
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

5. 次のコマンドを選択して適切なインストールパッケージをパッケージ化し、パッケージ化されたファイルは`/dist _ electron `ディレクトリの下にあります。詳細については、[electron-builderドキュメント](https://www.electron.build/cli)


#### 1. パッケージmacOSプラットフォーム
- 汎用のmacOSパッケージ(IntelとApple Siliconデュアルアーキテクチャ)：
```
npm run electron:build -- --mac --universal
```
- Intelアーキテクチャのみ：
```
npm run electron:build -- --mac --x64
```
- Apple Siliconアーキテクチャのみ：
```
npm run electron:build -- --mac --arm64
```


#### 2. Windowsプラットフォームのパッケージ化

- デフォルトNSISインストールパッケージ(ほとんどのWindowsユーザー向け)：
```
npm run electron:build -- --win
```
- Windows用のEXEファイルとSquirrelインストールパッケージを作成するには：
```
npm run electron:build -- --win --ia32 --x64 --arm64 --target squirrel
```
---ia 32は32ビットWindowsアーキテクチャです。
---x 64は64ビットWindowsアーキテクチャです。
---arm 64はARM Windowsアーキテクチャ(Surfaceなどのデバイス)です。

- Windows用にポータブルEXEファイルを生成する(インストール不要)：
```
npm run electron:build -- --win --portable
```
#### 3. Linuxプラットフォームのパッケージ化
- デフォルトのAppImageフォーマット(ほとんどのLinuxリリース用)：
```
npm run electron:build -- --linux
```
- snap(Ubuntuおよびsnapをサポートするリリース用)：
```
npm run electron:build -- --linux --target snap
```
- deb(Debian/Ubuntuシリーズ用)：
```
npm run electron:build -- --linux --target deb
```
- rpm(Red Hat/Fedoraシリーズ用)：
```
npm run electron:build -- --linux --target rpm
```

#### 4. すべてのプラットフォームをパッケージ化

Windows、macOS、Linuxのインストールパッケージを同時に生成する必要がある場合は、次のコマンドを使用します。
```
npm run electron:build -- -mwl
```

#### 5. コンパイル設定のカスタマイズ

必要に応じて他のオプションを追加して、パッケージをさらにカスタマイズすることができます。たとえば、x 64とarm 64スキーマを指定したり、異なるターゲットフォーマットを選択したりすることができます。


## ⭐ プロジェクトをサポート

このプロジェクトがお役に立った場合は、ぜひ星を付けてください！あなたのサポートが私たちの継続的な改善の原動力です。

[![GitHub stars](https://img.shields.io/github/stars/iAJue/MoeKoeMusic.svg?style=social&label=Star)](https://github.com/iAJue/MoeKoeMusic)


## ☑️ フィードバック

何か質問やアドバイスがあれば、issueまたはpull requestを提出してください。

### ⚠️ 免責事項
0. 本プログラムはクールドッグの第三者クライアントであり、クールドッグの公式ではなく、より完全な機能が必要な場合は公式クライアント体験をダウンロードしてください。
1. 本プロジェクトは学習用にのみ使用されます。著作権を尊重し、このプロジェクトを利用して商業行為や不正な用途に従事しないでください。
2. 本プロジェクトの使用中に著作権データが生成される可能性があります。これらの著作権データに対して、本プロジェクトは所有権を持っていません。権利侵害を回避するために、使用者は、本プロジェクトを使用する過程で生成された著作権データを24時間以内に消去しなければならない。
3. 本事業の使用により生じた、本契約書の使用または使用不能によるいかなる性質を含む、直接的、間接的、特殊、偶発的または結果的な損害(名誉損失、操業停止、コンピュータ故障または故障による損害賠償、またはその他あらゆる商業的損害または損失を含むがこれらに限定されない)は、使用者が責任を負う。          
1. 現地の法律法規に違反した場合の本事業の使用を禁止する。使用者が現地の法律法規で許可されていないことを知っているか知らないかのうちに本プロジェクトを使用したことによるいかなる違法行為も使用者が負担し、本プロジェクトはこれによる直接、間接、特殊、偶然、または結果的な責任を負わない。          
2. 音楽プラットフォームは容易ではありません。著作権を尊重し、正規版をサポートしてください。
3. 本プロジェクトは技術の実現可能性の探索と研究にのみ使用され、いかなる商業(広告などを含むがこれに限らない)の協力と寄付を受けない。
4. 公式音楽プラットフォームが本プロジェクトに不具合があると感じた場合は、本プロジェクトに連絡して変更または削除することができます。
            

## 📜 オープンソースライセンス

本プロジェクトは個人学習研究用にのみ使用され、商業用及び不法用途に使用することは禁止されている。

[MIT license](https://opensource.org/licenses/MIT)オープンソースを許可する。

### 👍 インスピレーションソース

APIソースコードは[MakcRe/KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi) 

- [Apple Music](https://music.apple.com)
- [YouTube Music](https://music.youtube.com)
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)
-[クールドッグミュージック](https://kugou.com/)

## 🖼️ スクリーンショット

![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/2.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/3.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/4.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/5.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/6.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/7.png)
![image](https://github.com/iAJue/MoeKoeMusic/raw/main/images/8.png)


## 🗓️ スター履歴

[![Star History Chart](https://api.star-history.com/svg?repos=iAJue/MoeKoeMusic&type=Date)](https://www.star-history.com/#iAJue/MoeKoeMusic&Date)
