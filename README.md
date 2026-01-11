# VTuber over Media over QUIC

ブラウザのみでVTuber配信/視聴を実現するための、MOQTベースの実装スタブです。

## セットアップ

```bash
pnpm install
```

## 開発起動

```bash
pnpm dev
```

Chromeで以下のフラグを有効化して起動してください。

```bash
--enable-features=EnableWebTransportDraft07
```

## 構成

- `index.html`: UI レイアウト
- `src/publisher.ts`: 配信側ロジック (MediaPipe + VRM + MOQT)
- `src/subscriber.ts`: 視聴側ロジック (MOQT + OrbitControls)
- `src/opfs.ts`: VRMモデルのOPFSキャッシュ

## 使い方

1. Publisher セクションで MOQT Relay URL と配信設定を入力。
2. VRMモデルを読み込み、配信開始を押す。
3. Subscriber セクションで同じ Relay URL を入力して視聴開始。

## 注意

- MOQTリレーは別途用意してください。
- MediaPipe のモデルは CDN から取得します。
