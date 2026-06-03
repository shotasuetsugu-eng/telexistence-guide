# 公開手順（URLで見れるようにする）

## 最短：Renderで公開
1. このフォルダをGitHubリポジトリにアップロード
2. Renderで「New +」→「Web Service」
3. GitHubリポジトリを選択
4. Build Command: `corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm build`
5. Start Command: `node dist/index.js`
6. Environment Variablesに最低限以下を設定
   - `NODE_ENV=production`
   - `PORT=10000`（Render側が自動設定する場合は不要）
7. DeployするとURLが発行されます

## 反映済み
- サイト名: Telexistence
- 背景: 黒
- 文字: 白
- 管理者メール: shota.suetsugu@tx-inc.com

## 注意
- 管理者ログインやデータ保存を使う場合は、認証環境変数とDATABASE_URLが必要です。
- データベース未設定でもサイト自体は起動しますが、手順・チェックリスト等の保存データは空になります。

---

## 追加機能の設定

### Google Drive 連携

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」→「ライブラリ」から **Google Drive API** を有効化
3. 「認証情報」→「APIキーを作成」でAPIキーを取得
4. 表示したいGoogle DriveフォルダのURLから `folders/` 以降のIDをコピー
   - 例: `https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`
   - フォルダID: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`
5. フォルダの共有設定を「リンクを知っている全員が閲覧可」に変更
6. 環境変数に設定:
   ```
   GOOGLE_DRIVE_API_KEY=取得したAPIキー
   GOOGLE_DRIVE_FOLDER_ID=フォルダID
   ```

### Google Map 連携

- Manus組み込みのForge APIを使用するため、追加設定不要です。
- `BUILT_IN_FORGE_API_KEY` と `BUILT_IN_FORGE_API_URL` が設定されていれば動作します。

### Slack 検索

1. [Slack API](https://api.slack.com/apps) でアプリを作成
2. 「OAuth & Permissions」→「Scopes」に以下を追加:
   - `search:read`（メッセージ検索）
   - `channels:read`（チャンネル一覧）
3. 「Install to Workspace」でインストールし、**Bot Token**（`xoxb-...`）を取得
   - ※ `search:read` は **User Token**（`xoxp-...`）が必要な場合があります
4. 環境変数に設定:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   ```
