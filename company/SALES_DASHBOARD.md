# YOLO JAPAN 介護営業リード・ダッシュボード

`company` の非公開 `/sales` 領域です。YOLO JAPAN の介護求人を、候補者が直接応募できる求人リストではなく、外国人採用需要を示す営業シグナルとして管理します。候補者の履歴書や個人情報は保存せず、メールは送信しません。

## 1. Supabase を作成する

1. 新しい Supabase プロジェクトを作成します。
2. SQL Editor で `supabase/migrations/202607160001_sales_dashboard.sql` を実行します。
3. `.env.example` を参考に、デプロイ環境とローカルの `.env.local` に次を設定します。

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` は収集・初期管理者登録のサーバーコマンド専用です。ブラウザへ公開しないでください。

## 2. Google OAuth と最初の管理者

Supabase Auth で Google provider を有効にします。

- Google Cloud の Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- Supabase の Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://YOUR_COMPANY_DOMAIN/auth/callback`

最初の管理者メールを許可リストへ登録します。

```bash
npm run sales:admin:bootstrap -- admin@example.com
```

その Google アカウントで `/login` から初回ログインしてください。以後は `/sales/admin/users` で `admin` または `sales` を追加・停止できます。公開サインアップ画面はありません。

## 3. 収集を実行する

まず保存しないドライランで、ページ数・件数・URL Job ID の抽出を確認します。

```bash
npm run sales:sync:dry
```

Supabase へ同期します。

```bash
npm run sales:sync
```

毎回、一覧の最終ページを自動発見して全ページを比較します。詳細ページは新規・変更・未補強の求人を優先して、既定で 40 件ずつ取得します。`detail_checked_at` がチェックポイントなので、初回は同じコマンドを複数回実行すれば再開できます。

```bash
npm run sales:sync -- --detail-batch-size 100
npm run sales:sync -- --skip-details
```

安全規則:

- URL の数字を正式な `source_job_id` とし、JSON-LD identifier の不一致は warning に残します。
- 正規化フィールドのハッシュが変わった場合だけ `job_versions` を追加します。
- 1回の未検出は `missing`、2回連続で `closed` です。
- 1ページでも失敗、または直近成功件数・掲載件数から20%超減少した実行は `failed` です。その実行では未検出・終了への変更を一切行いません。
- HTML と求人本文全体は保存しません。構造化された事実、判定シグナル、ハッシュ、原文 URL のみ保存します。

## 4. 公式連絡先の調査

連絡先が確認できていない上位企業を JSON で表示します。

```bash
npm run sales:contacts:queue -- 20
```

調査結果は次の形式で作成し、`pending` として取り込みます。必ず公式法人サイトなど公開された法人用情報の出典 URL を付けます。

```json
[
  {
    "organizationId": "00000000-0000-0000-0000-000000000000",
    "kind": "website",
    "value": "https://official.example.jp",
    "sourceUrl": "https://official.example.jp/company",
    "confidence": "high",
    "notes": "法人名と所在地が一致"
  }
]
```

```bash
npm run sales:contacts:import -- /absolute/path/candidates.json
```

同名企業、非公開の採用企業、個人メールは推測して登録しません。取り込んだ候補は `/sales/companies/[id]` で人が確認または却下します。

## 5. 画面と権限

- `/sales`: 直近実行、新規・変更・未検出・終了、今日のフォロー、Aランク
- `/sales/jobs`: 求人の検索・フィルター・CSV・原文リンク
- `/sales/companies`: 法人・施設単位の需要、担当、段階、連絡先状態
- `/sales/companies/[id]`: 求人、連絡先、日韓メール下書き、訪問チェック、活動履歴
- `/sales/admin/runs`: 実行 warning / error（admin のみ）
- `/sales/admin/users`: Google メール許可リスト（admin のみ）

RLS は、有効な `profiles` のない Google セッションを内部ユーザーとして扱いません。`sales` は原本求人・収集実行・ユーザーを変更できず、担当・営業段階・連絡先候補・活動だけを操作できます。収集 CLI は service role で実行します。

## 6. 確認コマンド

```bash
npm run test:sales
npm run test:i18n
npm run test:blog
npm run typecheck
npm run build
```

新しい Supabase へ migration を適用した後は、次を手動で受け入れ確認します。

1. 未許可・停止 Google アカウントが `/sales` に入れないこと。
2. `sales` が `/sales/admin/*` に入れず、Supabase API から求人原本を変更できないこと。
3. 初回全件同期後、同一データの2回目で新規0件になること。
4. テスト環境でページ失敗を起こし、既存求人が `closed` にならず実行が `failed` と表示されること。

## 運用上の注意

長期の商用自動収集前に YOLO JAPAN の最新利用規約と robots ポリシーを再確認し、必要に応じて許諾・日本法の確認を行ってください。実際の営業メール運用前に、特定電子メール法に沿った送信者表示、受信拒否方法、`do_not_contact` の運用を法務・運用担当者が確認してください。
