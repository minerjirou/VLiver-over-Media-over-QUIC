# VTuber over Media over QUIC

ブラウザのみでVTuber配信/視聴を実現するための、MOQTベースの実装スタブです。
配信側 (Publisher) と視聴側 (Subscriber) を同じ画面で確認できる構成にしています。

## 事前準備

- **Chrome**: `--enable-features=EnableWebTransportDraft07` を付けて起動してください。
- **MOQT Relay**: 別途リレーサーバーが必要です (URL を UI で指定)。
- **VRMモデル**: 任意の `.vrm` ファイルを用意してください。

## セットアップ

```bash
pnpm install
```

## 開発起動

```bash
pnpm dev
```

## 使い方 (クイックスタート)

1. **Publisher** セクションで MOQT Relay URL を入力。
2. 解像度・ビットレート・コーデックを設定。
3. `.vrm` ファイルを読み込み、**配信開始**を押す。
4. **Subscriber** セクションで同じ Relay URL を入力して **視聴開始**。
5. 必要に応じて **フルスクリーン** や **遅延表示** を切り替え。

## 構成

- `index.html`: UI レイアウト
- `src/main.ts`: UIイベントとコントローラの接続
- `src/publisher.ts`: 配信側ロジック (MediaPipe + VRM + MOQT)
- `src/subscriber.ts`: 視聴側ロジック (MOQT + OrbitControls)
- `src/opfs.ts`: VRMモデルのOPFSキャッシュ
- `src/styles.css`: スタイル

## 補足

- MediaPipe のモデルは CDN から取得します。
- デモ用途のスタブ実装のため、エラーハンドリングや再接続は最小限です。
