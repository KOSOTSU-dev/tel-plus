# デプロイガイド

## Vercelへのデプロイ手順

### 前提条件

1. ✅ GitHubリポジトリが作成済み: `https://github.com/KOSOTSU-dev/tel-plus.git`
2. ✅ Supabaseプロジェクトが作成済み
3. ✅ データベーススキーマが適用済み（`supabase/schema.sql`を実行済み）

### ステップ1: Supabaseの設定値を取得

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にアクセス
2. プロジェクトを選択
3. **Settings** > **API** に移動
4. 以下の値をコピーしておく：
   - **Project URL** (例: `https://xxxxx.supabase.co`)
   - **anon public** key (長い文字列)

### ステップ2: Vercelにプロジェクトをインポート

1. [Vercel](https://vercel.com/)にアクセスしてログイン（GitHubアカウントでログイン推奨）
2. **Add New...** > **Project** をクリック
3. **Import Git Repository** で `KOSOTSU-dev/tel-plus` を選択
4. まだ接続されていない場合は、GitHubアカウントを連携

### ステップ3: プロジェクト設定

1. **Configure Project** 画面で以下を確認：
   - **Framework Preset**: Next.js（自動検出）
   - **Root Directory**: `./`（そのまま）
   - **Build Command**: `npm run build`（自動検出）
   - **Output Directory**: `.next`（自動検出）
   - **Install Command**: `npm install`（自動検出）

2. **Environment Variables** セクションを開く

3. 以下の環境変数を追加：

   **変数名1:**
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: SupabaseのProject URL（ステップ1で取得）
   - Environment: `Production`, `Preview`, `Development` すべてにチェック

   **変数名2:**
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: Supabaseのanon public key（ステップ1で取得）
   - Environment: `Production`, `Preview`, `Development` すべてにチェック

### ステップ4: デプロイ

1. **Deploy** ボタンをクリック
2. ビルドが開始されます（1-2分程度）
3. デプロイが完了すると、**Visit** ボタンが表示されます
4. アプリのURLが表示されます（例: `https://tel-plus.vercel.app`）

### ステップ5: 動作確認

1. デプロイされたアプリのURLにアクセス
2. 新規登録ができるか確認
3. ログインができるか確認
4. プロフィール作成ができるか確認

### トラブルシューティング

#### ビルドエラーが発生する場合

1. Vercelのダッシュボードで **Deployments** を確認
2. 失敗したデプロイをクリックしてログを確認
3. よくある原因：
   - 環境変数が正しく設定されていない
   - 依存関係のインストールエラー

#### 環境変数の確認方法

1. Vercelダッシュボードでプロジェクトを選択
2. **Settings** > **Environment Variables** に移動
3. 設定した変数が表示されているか確認

#### Supabase接続エラー

1. SupabaseのProject URLとAnon Keyが正しいか確認
2. Supabaseプロジェクトが有効になっているか確認
3. データベーススキーマが適用されているか確認

### 今後の更新

GitHubにプッシュすると、自動的にVercelで再デプロイされます：

```bash
git add .
git commit -m "Update"
git push
```

### カスタムドメインの設定（オプション）

1. Vercelダッシュボードでプロジェクトを選択
2. **Settings** > **Domains** に移動
3. カスタムドメインを追加

## ローカル開発環境の設定

1. `.env.local`ファイルを編集して、Supabaseの値を設定：

```bash
# エディタで開いて編集
nano .env.local
# または
code .env.local
```

2. 以下の値を実際の値に置き換え：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. 開発サーバーを起動：

```bash
npm run dev
```

