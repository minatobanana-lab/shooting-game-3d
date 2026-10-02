# Neon Sky Defender

3Dシューティングゲームの簡易版です。ブラウザで動くので、GitHub Pages にそのまま置いて公開できます。

## 遊び方

- `WASD` または `← → ↑ ↓` で移動
- `Space` で攻撃
- 敵にぶつかるとライフが減る
- 3回ミスするとゲームオーバー

## ローカルで確認する方法

```bash
python3 -m http.server 8000
```

その後、ブラウザで `http://localhost:8000` を開くとプレイできます。

## GitHub Pages で公開する方法

1. GitHub のリポジトリの `Settings` → `Pages` を開く
2. `Build and deployment` で `Deploy from a branch` を選択
3. `Branch` を `main`、`Folder` を `/ (root)` に設定
4. 保存すると公開URLが発行されます

公開URLの例:

```text
https://<ユーザー名>.github.io/<リポジトリ名>/
```

例えばこのリポジトリなら:

```text
https://minatobanana-lab.github.io/shooting-game-3d/
```

## 使っている技術

- HTML
- CSS
- JavaScript
- Three.js

## 今後のアップデート案

- 敵の弾を避けるモード
- ボス戦
- 音楽と効果音
- スタート画面とハイスコア保存
- ステージ追加

