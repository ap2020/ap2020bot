# ap2020bot (AWS)

## Bots
| Path | Description |
|-|-|
| [watch-portal](src/watch-portal) | 工学部ポータルサイト更新通知 |
| [slash/invite-all](src/slash/invite-all) | `/invite-all`: チャンネルにワークスペース全員を招待する Slash Command |

## Setup
### Prerequisites
Node.js の実行環境が必要です。バージョンは `.nvmrc` に記載されています。
Node.js のバージョンを簡単に切り替えられるツール (`nvm` など) の利用をお勧めします。
あと多分 Docker が必要です。

### Install Dependencies

### Start Emulators

### Invoke Local Lambda
HTTP リクエストを Lambda に送りたい場合は [Start Local Server](#Start-Local-Server) を参照してください。

### Start Local Server
HTTP リクエストを Lambda に送りたい場合 (Slash Command など) は以下の手順で行います。

外部から HTTP リクエストを送れるようにしたい場合，`ngrok` 等が便利です。

## `ifdef-loader`
C プリプロセッサの `#if` みたいなことができます。

TypeScript は `ifdef-loader` のディレクティブを無視して解析を行うため，`ifdef-loader` を不必要に使うと TypeScript の静的解析の強みが失われます。`ifdef-loader` はどうしても静的に削除しなければならないコードに限って使ってください。

## 環境変数

## for Beginners
既存の bot のソースコードを読むと何をすればいいかイメージが湧くかもしれません。
自分が作ろうとしているものとやることが近い bot のソースコードを読むのがおすすめです。

ソースコードを読む際は，まず `main` 関数を読んで処理の大まかな流れを掴み，その後各関数を読み進めるとわかりやすいかと思います。
