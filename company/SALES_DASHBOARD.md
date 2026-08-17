# YOLO JAPAN 介護営業リード・ダッシュボード

`company` の非公開 `/sales` 領域です。YOLO JAPAN の介護求人を、候補者が直接応募できる求人リストではなく、外国人採用需要を示す営業シグナルとして管理します。候補者の履歴書や個人情報は保存せず、メールは送信しません。

## 1. Supabase を作成する

1. 新しい Supabase プロジェクトを作成します。
2. [Supabase マイグレーション運用ガイド（韓国語）](./docs/supabase-migrations.md)に従い、`supabase/migrations/` の SQL をバージョン順に適用します。SQL Editor で基本スキーマをすでに適用した既存 DB は、ガイドの migration history 修復手順を先に確認してください。
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

## 4. 企業情報・公式連絡先の調査

通常のキュー表示は読み取り専用です。スコア上位の企業について、不足している企業情報・連絡手段と既存候補を JSON で確認できます。

```bash
npm run sales:contacts:queue -- --limit 20
```

自動化が調査対象を確保するときだけ `--claim` を付けます。1回の上限は10社で、claim は90分間有効です。出力には実行 ID、会社 ID、claim token、不足フィールド、会社名、求人勤務地の手掛かり、既存候補が含まれます。

```bash
npm run sales:contacts:queue -- --claim --limit 10
```

調査対象は `official_name`、`corporate_number`、`official_address`、`website`、`phone`、`email`、`contact_form` です。公式法人サイトの会社概要・問い合わせ・アクセス・採用ページ、または国税庁の公開ページだけを出典として使います。会社名と地域で法人を一意に特定できない場合は推測せず `ambiguous` とします。メールアドレスの生成、問い合わせフォーム送信、メール・電話などの外部接触は禁止です。

自動化の結果は次の envelope で保存します。発見値には必ず値そのものを確認できる公開ページの URL を付け、住所は可能な範囲で構造化します。

```json
{
  "runId": "00000000-0000-0000-0000-000000000000",
  "results": [
    {
      "organizationId": "00000000-0000-0000-0000-000000000000",
      "claimToken": "33333333-3333-4333-8333-333333333333",
      "outcome": "found",
      "candidates": [
        {
          "kind": "official_address",
          "value": "東京都千代田区…",
          "postalCode": "100-0001",
          "countryCode": "JP",
          "region": "東京都",
          "locality": "千代田区",
          "streetAddress": "…",
          "addressType": "head_office",
          "sourceUrl": "https://official.example.jp/company",
          "confidence": "high",
          "lastCheckedAt": "2026-07-21T03:15:00+09:00"
        }
      ]
    }
  ]
}
```

```bash
npm run sales:contacts:import -- /absolute/path/contact-enrichment.json
```

従来の単純な候補配列も引き続き取り込めます。取り込み時にメール、電話、URL、住所を正規化・重複排除します。自動・手動を問わず新しい発見はすべて `pending` となり、既存の `verified` / `rejected` 判定は再調査で戻しません。候補は `/sales/companies/[id]` で人が確認または却下します。

連絡準備状態は、検証済み公式住所と検証済みのメール・電話・問い合わせフォームのいずれかが揃えば `ready`、承認待ち候補があれば `review_pending`、一部だけ検証済みなら `partial`、候補がなければ `missing` です。Webサイトだけが検証済みの場合も `partial` です。

Codex のローカル自動化 `yolo` は毎日03:00（JST）に求人同期後、最大10社を claim して同じ手順で調査します。`not_found` / `ambiguous` は30日後、`ready` は90日後に再調査し、失敗は1日・3日・7日間隔で最大3回再試行します。

## 5. 画面と権限

- `/sales`: 直近実行、新規・変更・未検出・終了、今日のフォロー、Aランク
- `/sales/jobs`: 求人の検索・フィルター・1求人1行の総合CSV・原文リンク
- `/sales/companies`: 法人・施設単位の需要、担当、段階、連絡準備状態、公式住所、最終調査結果
- `/sales/companies/[id]`: 公式企業情報、連絡手段、求人勤務地、候補の出典・確認、日韓メール下書き、訪問チェック、活動履歴
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
5. 公式Webサイトだけを承認すると `partial`、公式住所と直接連絡手段を承認すると `ready` になること。
6. `/sales/jobs` の現在のフィルターを反映したCSVが求人ごとに1行となり、複数候補、カンマ、引用符、改行、数式接頭辞を安全に扱うこと。

## 運用上の注意

長期の商用自動収集前に YOLO JAPAN の最新利用規約と robots ポリシーを再確認し、必要に応じて許諾・日本法の確認を行ってください。実際の営業メール運用前に、特定電子メール法に沿った送信者表示、受信拒否方法、`do_not_contact` の運用を法務・運用担当者が確認してください。
