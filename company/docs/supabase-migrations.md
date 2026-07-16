# Supabase 마이그레이션 운영 가이드

`company` 앱의 Supabase 스키마는 `supabase/migrations/` 아래 SQL 파일로 관리합니다. 운영 DB에는 Supabase CLI로 아직 적용되지 않은 마이그레이션만 순서대로 반영합니다.

## 현재 마이그레이션

| 버전 | 파일 | 역할 |
|---|---|---|
| `202607160001` | `202607160001_sales_dashboard.sql` | 영업 대시보드의 기본 테이블, 함수, 정책, RLS 구성 |
| `202607160002` | `202607160002_sales_list_views.sql` | 페이지네이션 목록용 읽기 전용 뷰와 조회 인덱스 구성 |

`202607160002`는 `202607160001`의 테이블을 사용하므로 반드시 버전 순서대로 적용해야 합니다.

## 최초 CLI 설정

명령은 `company` 디렉터리에서 실행합니다.

```bash
cd /Users/twc_n_131/nepal-school/company
```

`supabase/config.toml`이 아직 없을 때만 로컬 설정을 초기화합니다.

```bash
npx supabase@latest init
```

Supabase에 로그인하고 대상 프로젝트를 연결합니다.

```bash
npx supabase@latest login
npx supabase@latest link --project-ref <PROJECT_REF>
```

`PROJECT_REF`는 Supabase Dashboard 프로젝트 URL의 `https://supabase.com/dashboard/project/<PROJECT_REF>` 부분에서 확인할 수 있습니다. 운영과 스테이징 프로젝트를 혼동하지 않도록 `link` 직후 연결 대상을 다시 확인합니다.

## 안전하게 적용하기

먼저 로컬과 원격의 마이그레이션 이력을 비교합니다.

```bash
npx supabase@latest migration list --linked
```

실제 DB를 변경하기 전에 dry-run으로 적용 대상을 확인합니다.

```bash
npx supabase@latest db push --linked --dry-run
```

출력에 의도한 마이그레이션만 표시되는 경우 적용합니다.

```bash
npx supabase@latest db push --linked
```

적용 후 이력을 다시 확인합니다.

```bash
npx supabase@latest migration list --linked
```

운영 반영의 권장 순서는 다음과 같습니다.

1. DB 마이그레이션 dry-run
2. DB 마이그레이션 적용
3. 뷰와 보안 옵션 검증
4. 애플리케이션 배포
5. `/sales/jobs`, `/sales/companies` 동작 확인

## 기존 DB를 나중에 마이그레이션 이력에 연결하는 경우

기존 운영 DB에 `jobs`, `sales_leads` 등 기본 스키마를 SQL Editor로 이미 만들었지만 `202607160001` 이력은 없는 경우, `db push`를 바로 실행하면 기존 객체나 정책과 충돌할 수 있습니다.

이 경우 먼저 Supabase Dashboard의 SQL Editor나 스키마 화면에서 `202607160001_sales_dashboard.sql`의 테이블, 함수, 정책이 실제로 존재하는지 확인합니다. 스키마가 동일하게 적용되어 있다는 사실을 확인한 뒤에만 해당 버전을 적용 완료로 표시합니다.

```bash
npx supabase@latest migration repair 202607160001 --status applied --linked
npx supabase@latest migration list --linked
npx supabase@latest db push --linked --dry-run
```

dry-run 결과에 `202607160002_sales_list_views.sql`만 남아 있는지 확인한 다음 적용합니다.

```bash
npx supabase@latest db push --linked
```

실제 스키마를 확인하지 않은 채 `migration repair`를 실행하면 마이그레이션 이력과 DB 상태가 달라질 수 있습니다. 기본 스키마가 없거나 일부만 적용된 경우에는 repair하지 말고, 충돌 원인을 먼저 해결해야 합니다.

## 적용 결과 검증

Supabase Dashboard의 SQL Editor에서 다음 쿼리를 실행합니다.

```sql
select table_name
from information_schema.views
where table_schema = 'public'
  and table_name in ('sales_job_list', 'sales_company_list')
order by table_name;
```

두 뷰가 모두 반환되어야 합니다. 이어서 뷰가 호출 사용자의 RLS 권한을 따르도록 `security_invoker`가 설정됐는지 확인합니다.

```sql
select relname, reloptions
from pg_class
where relname in ('sales_job_list', 'sales_company_list')
order by relname;
```

두 행의 `reloptions`에 `security_invoker=true`가 있어야 합니다. 그다음 앱에서 다음 항목을 확인합니다.

- `/sales/jobs`와 `/sales/companies`가 정상 조회되는지
- 목록 한 페이지가 최대 25개인지
- 검색·필터·페이지 이동이 정상 동작하는지
- 익명 사용자와 비활성 사용자가 영업 데이터를 조회할 수 없는지

## 주의사항

- 운영 또는 공유 DB에 `supabase db reset --linked`를 실행하지 않습니다. DB를 재생성하는 명령은 로컬 개발 DB에서만 사용합니다.
- `SUPABASE_SERVICE_ROLE_KEY`, DB 비밀번호, access token은 문서나 Git에 커밋하지 않습니다.
- 실패한 마이그레이션을 기존 파일 수정으로 덮지 않습니다. 이미 공유된 마이그레이션은 그대로 두고 수정용 새 마이그레이션을 추가합니다.
- 운영 적용 전에는 항상 `migration list`와 `db push --dry-run` 결과를 확인합니다.
- 롤백이 필요하면 운영 DB에서 임의로 이력을 삭제하지 말고, 변경을 되돌리는 새 forward migration을 작성합니다.

## 참고

- [Supabase 로컬 개발 및 CLI 개요](https://supabase.com/docs/guides/local-development/overview)
- [Supabase CLI `db push`](https://supabase.com/docs/reference/cli/supabase-db-push)
- [Supabase 데이터베이스 마이그레이션](https://supabase.com/docs/guides/deployment/database-migrations)
