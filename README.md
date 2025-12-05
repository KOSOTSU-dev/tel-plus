# 電話帳プラス

電話対応の可否や具体的な対応状況をフレンドと共有し、並び替えやピン留めで連絡先を管理しやすくするWebアプリケーションです。

## 機能

### 基本機能
- メール+パスワード+ユーザー名での新規作成・ログイン
- ゲストログイン（ログアウトするとデータが消去される）
- 6桁英数字のフレンドコードでフレンド交換

### プロフィール・ステータス
- ニックネーム、所属、電話、公開用メールの管理
- ステータス（available / unavailable / emergency）と短いメモ（ノート）の設定
- フレンドがステータス・ノートを閲覧可能

### フレンド管理
- フレンドコードで検索して申請送信
- 受信した申請の承認・拒否
- 承認後はフレンド一覧に表示（双方向関係）
- フレンドごとのメモ追加、ピン留め、削除
- ピン留めは上部固定表示

### 表示・操作
- フレンド検索（名前・状態で絞り込み）
- ピン留めエリアと通常エリアで整理表示
- 各フレンドの詳細（所属・電話・メール）をダイアログで確認
- レスポンシブ対応のUI

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **認証・データベース**: Supabase
- **ドラッグ&ドロップ**: react-beautiful-dnd

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseの設定

1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. プロジェクトのURLとAnon Keyを取得
   - Supabaseダッシュボードにアクセス
   - プロジェクトを選択
   - **Settings** > **API** に移動
   - **Project URL** をコピー
   - **anon/public** key をコピー
3. `.env.local`ファイルをプロジェクトルートに作成し、以下の環境変数を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**注意**: `.env.local`ファイルは`.gitignore`で除外されているため、GitHubにはプッシュされません。各環境（ローカル、Vercel）で個別に設定が必要です。

### 3. データベーススキーマのセットアップ

SupabaseのSQL Editorで `supabase/schema.sql` の内容を実行してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## デプロイ

### Vercelへのデプロイ

#### 方法1: Vercel Webダッシュボードからデプロイ（推奨）

1. [Vercel](https://vercel.com/)にログイン（GitHubアカウントでログイン推奨）
2. **Add New Project** をクリック
3. GitHubリポジトリ `KOSOTSU-dev/tel-plus` を選択
4. **Configure Project** で以下を確認：
   - Framework Preset: **Next.js**
   - Root Directory: `./`（そのまま）
   - Build Command: `npm run build`（自動検出）
   - Output Directory: `.next`（自動検出）
5. **Environment Variables** をクリックして以下を追加：
   - `NEXT_PUBLIC_SUPABASE_URL` = `your_supabase_project_url`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your_supabase_anon_key`
6. **Deploy** をクリック
7. デプロイ完了後、提供されるURLでアプリにアクセスできます

#### 方法2: Vercel CLIからデプロイ

```bash
# Vercel CLIをインストール（グローバルインストールが必要な場合は sudo を使用）
npm i -g vercel

# プロジェクトディレクトリで実行
cd "/Users/adachiseigo/電話帳プラス"
vercel

# 初回はログインが必要
# プロンプトに従って設定
# 環境変数は vercel env add コマンドで追加可能
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### デプロイ後の確認事項

- ✅ データベーススキーマがSupabaseに適用されているか確認
- ✅ 環境変数が正しく設定されているか確認（Vercel Dashboard > Settings > Environment Variables）
- ✅ アプリが正常に動作するか確認

## 使い方

### 通常ユーザー

1. メールアドレス、パスワード、ユーザー名でアカウント作成
2. プロフィール・ステータスを設定
3. 自分のフレンドコードを共有、相手のコードで申請
4. 申請を承認してフレンドになる
5. ピン留め／メモでリストを整理し、ステータスを共有

### ゲストユーザー

1. 「ゲストとしてログイン」をクリック
2. ローカルでフレンド管理（ログアウトでデータが消去される）

## データベーススキーマ

### profiles
- ユーザーのプロフィール情報
- フレンドコードは一意・6桁英数字

### friends
- フレンド関係（双方向）
- ピン留め、並び順、メモを管理

### friend_requests
- フレンド申請の送受信
- ステータス: pending / accepted / rejected

## 注意事項

- `react-beautiful-dnd`はReactのStrictModeで警告が表示される場合がありますが、動作には影響ありません
- フレンドコードの重複が発生した場合、自動的に再生成されます（最大3回までリトライ）
- ゲストモードのデータはローカルストレージに保存され、ログアウト時に削除されます
- SupabaseのRow Level Security (RLS)が有効になっているため、適切なポリシーが設定されていることを確認してください

## ライセンス

MIT

