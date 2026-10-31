# 페이스북 일일 게시 자동화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 월 1회 실행으로 30일치 현지어 게시물을 검증·검토한 뒤 페이스북 페이지에 예약 게시하는 파이썬 도구를 만든다.

**Architecture:** `scripts/facebook/` 패키지에 순수 함수 모듈(사실 데이터, 플랜 스키마, 검증, 검토 HTML, Graph 클라이언트)을 두고, `scripts/facebook-cli.py` 한 개가 `uv run --script` 진입점으로 서브커맨드를 노출한다. 본문·이미지 생성은 코드가 하지 않는다 — Claude Code 세션과 사업주가 만든 산출물을 `output/facebook/YYYY-MM/` 에서 읽어 검증하고 올린다. 네트워크를 타는 코드는 `graph.py` 한 곳에 모으고 나머지는 전부 오프라인 테스트가 가능하게 한다.

**Tech Stack:** Python ≥3.11, `uv run --script` (저장소 기존 관례), 표준 라이브러리 + `requests`, 테스트는 `pytest`(`uv run --python 3.11 --isolated --with pytest`), 루트 `package.json`에 npm 스크립트로 노출.

**Spec:** `docs/superpowers/specs/2026-10-29-facebook-daily-posting-design.md`

## Global Constraints

- 문서·주석·오류 메시지·CLI 출력은 **한국어**.
- 페이지 ID는 `61595913932801`. Graph API 버전은 `v26.0`.
- 언어 순서는 **베트남어 → 미얀마어 → 네팔어** (`vi`, `my`, `ne`) 고정. 소재 1개 = 게시물 3건, 하루 1건.
- 게시 시각 기본값은 **JST 저녁**. 언어별 오프셋은 설정값으로 뺀다.
- 예약 가능 창은 **지금부터 10분 이후 ~ 75일 이내**.
- 필요 권한: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`.
- 토큰은 `.env`의 `FB_PAGE_TOKEN` 또는 같은 이름의 환경변수에서 읽는다. **둘 다 값을 주고 서로 다르면 멈춘다** — 회전된 토큰을 낡은 셸 변수가 조용히 가리는 사고를 막는다. 토큰은 커밋하지 않으며 코드·로그·테스트에 값을 남기지 않는다.
- **`facts.json`에 없는 수치는 본문에 쓸 수 없다.** 각 사실은 값·출처 URL·확인자·확인일·유효기한을 가진다.
- 대학 실명은 **소개 맥락에만**. 협력·제휴·입학 알선·합격 가능성 표현과 같은 게시물에 공존하면 오류. `status: "planned"` 기관은 쓰지 않는다.
- 게시물은 **무료 상담까지만** 말한다. 상담 이후 절차·비용 부담·합격/취업 가능성은 금지.
- 모든 게시물 마지막은 무료 상담 + 페이스북 메시지 CTA.
- `plan.json`·`facts.json`은 커밋하고 `output/facebook/*/images/`는 커밋하지 않는다.

## Review Focus

- **부분 실패 후 재실행** — 30건 중 12건만 예약된 뒤 다시 돌리면 중복 예약된다. 이미 성공한 건은 건너뛰어야 한다. → Task 9
- **예약 창 경계** — 월말 실행이나 지연으로 `publish_at`이 10분 이내이거나 75일을 넘으면 Graph가 거절한다. 올리기 전에 막아야 한다. → Task 8
- **게시일 기준 사실 만료** — 오늘 유효한 사실이 25일 뒤 게시일에는 만료일 수 있다. 검사 기준은 실행일이 아니라 **각 게시물의 게시일**이어야 한다. → Task 1, Task 4
- **언어 로테이션 붕괴** — 게시물 수가 3의 배수가 아니거나 소재별 언어가 빠지면 특정 언어권만 공백이 된다. → Task 4
- **이미지 파일 사고** — 0바이트, 깨진 파일, JPEG/PNG가 아닌 확장자, 과대 용량이 업로드 단계에서 터진다. 검증에서 걸러야 한다. → Task 4

---

### Task 1: 패키지 뼈대와 사실 데이터 로더

**Files:**
- Create: `scripts/facebook/__init__.py`
- Create: `scripts/facebook/config.py`
- Create: `scripts/facebook/facts.py`
- Create: `scripts/facebook/tests/__init__.py`
- Create: `scripts/facebook/tests/test_facts.py`
- Modify: `.gitignore` (추가: `output/facebook/*/images/`)

**Interfaces:**
- Consumes: 없음 (첫 작업)
- Produces:
  - `config.PAGE_ID: str`, `config.GRAPH_VERSION: str`, `config.LANGUAGES: tuple[str, str, str]` = `("vi", "my", "ne")`
  - `config.ROOT: Path`, `config.facebook_dir() -> Path`, `config.month_dir(month: str) -> Path`, `config.FACTS_PATH: Path`, `config.GLOSSARY_PATH: Path`, `config.UNIVERSITIES_PATH: Path`
  - `config.SCHEDULE_MIN_LEAD: timedelta` (10분), `config.SCHEDULE_MAX_LEAD: timedelta` (75일)
  - `config.DEFAULT_POST_TIME_JST: time`, `config.LANGUAGE_OFFSET_MINUTES: dict[str, int]` (기본 전부 0)
  - `config.MAX_IMAGE_BYTES: int` = `8 * 1024 * 1024`
  - `config.load_token() -> str` — `.env`의 `FB_PAGE_TOKEN` 또는 같은 이름의 환경변수에서 읽는다. 둘 다 값을 주고 서로 다르면 한국어 메시지로 `RuntimeError`. 둘 다 없어도 `RuntimeError`. 토큰 값을 로그에 남기지 않는다.
  - `facts.Fact` — frozen dataclass: `key: str`, `value: str`, `source_url: str`, `verified_by: str`, `verified_on: date`, `expires_on: date`; 메서드 `is_valid_on(day: date) -> bool`
  - `facts.FactsError(Exception)`
  - `facts.load_facts(path: Path) -> dict[str, Fact]`

- [ ] **Step 1: Write the failing test**

`scripts/facebook/tests/test_facts.py`:

```python
def test_load_facts_파싱(tmp_path):
    p = _write(tmp_path, {"work_hours_d2": {
        "value": "주 25시간", "source_url": "https://www.hikorea.go.kr/...",
        "verified_by": "builder", "verified_on": "2026-10-31", "expires_on": "2027-10-31"}})
    facts = load_facts(p)
    assert facts["work_hours_d2"].value == "주 25시간"
    assert facts["work_hours_d2"].expires_on == date(2027, 10, 31)

def test_is_valid_on_게시일_기준():
    f = Fact("k", "v", "https://x", "builder", date(2026, 10, 1), date(2026, 11, 15))
    assert f.is_valid_on(date(2026, 11, 15)) is True   # 유효기한 당일은 유효
    assert f.is_valid_on(date(2026, 11, 16)) is False

def test_필수_필드_누락이면_FactsError(tmp_path):
    p = _write(tmp_path, {"k": {"value": "v"}})
    with pytest.raises(FactsError, match="출처"):
        load_facts(p)

def test_유효기한이_확인일보다_빠르면_FactsError(tmp_path): ...
def test_출처가_http로_시작하지_않으면_FactsError(tmp_path): ...
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_facts.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'facebook'`

- [ ] **Step 3: Implement `config.py` and `facts.py`**

`config.ROOT = Path(__file__).resolve().parents[2]` (저장소 기존 `parents[1]` 관례를 패키지 깊이에 맞춘 것). `load_facts`는 JSON을 읽어 각 키마다 다섯 필드를 확인하고 `Fact`로 변환하며, 누락·형식 오류·날짜 역전·비 http 출처를 전부 한국어 메시지의 `FactsError`로 던진다. 테스트 임포트가 되도록 `scripts/facebook/tests/__init__.py`에서 `sys.path`에 `scripts/`를 넣는다.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_facts.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add scripts/facebook .gitignore
git commit -m "feat(facebook): 사실 데이터 로더와 패키지 뼈대 추가"
```

---

### Task 2: facts.json 1차 출처 조사·입력

조사 작업이다. 값을 지어내지 말 것. 1차 출처(법무부 하이코리아, 출입국관리법 시행령, 각 대학 등록금 공시)에서만 가져오고, 찾지 못한 항목은 **넣지 않는다**. 빈 칸은 그 수치를 쓰지 않는다는 뜻이므로 정상이다.

**Files:**
- Create: `output/facebook/facts.json`
- Create: `output/facebook/glossary.json`
- Create: `output/facebook/universities.json`
- Create: `scripts/facebook/tests/test_facts_data.py`

**Interfaces:**
- Consumes: `facts.load_facts`, `config.FACTS_PATH`, `config.GLOSSARY_PATH`, `config.UNIVERSITIES_PATH` (Task 1)
- Produces: 위 세 데이터 파일. `universities.json` 형태: `[{"name_ko": str, "name_en": str}]`. `glossary.json` 형태: `{"<term_key>": {"ko": str, "vi": str, "my": str, "ne": str}}`, 최소 키 — `visa_d2`, `visa_d4`, `company_name`, `cta`.

- [ ] **Step 1: Write the failing test**

`scripts/facebook/tests/test_facts_data.py`:

```python
def test_facts_파일이_로드된다():
    facts = load_facts(config.FACTS_PATH)
    assert facts, "facts.json이 비어 있다"

def test_모든_사실이_오늘_유효하다():
    for key, f in load_facts(config.FACTS_PATH).items():
        assert f.is_valid_on(date.today()), f"{key} 유효기한 지남"

def test_용어집이_네_언어를_모두_가진다():
    g = json.loads(config.GLOSSARY_PATH.read_text("utf-8"))
    for key in ("visa_d2", "visa_d4", "company_name", "cta"):
        assert set(g[key]) >= {"ko", "vi", "my", "ne"}

def test_대학목록은_partnership_network의_planned를_제외한_실명뿐이다():
    ts = (config.ROOT / "company/lib/partnership-network.ts").read_text("utf-8")
    names = [u["name_ko"] for u in json.loads(config.UNIVERSITIES_PATH.read_text("utf-8"))]
    assert names
    for n in names:
        assert n in ts, f"{n}은 partnership-network.ts에 없다"
    assert "김포대학교" not in names and "한영대학교" not in names  # status: planned
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_facts_data.py -v`
Expected: FAIL — `FactsError: 사실 파일을 찾을 수 없습니다: …/output/facebook/facts.json` (Task 1이 OS 오류를 한국어 `FactsError`로 감싼다)

- [ ] **Step 3: 1차 출처를 조사해 세 파일을 작성한다**

최소한 D-2·D-4 체류자격 요건과 시간제취업(아르바이트) 허용 시간을 하이코리아/법령에서 확인해 넣는다. 학비는 법정 수치가 아니므로, 대학별 공시 금액을 확보한 대학만 `tuition_<대학키>` 로 넣고 나머지는 넣지 않는다. `expires_on`은 출입국 규정 1년, 등록금 해당 학년도 말.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/ -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add output/facebook scripts/facebook/tests/test_facts_data.py
git commit -m "feat(facebook): 법령 1차 출처 기반 사실 데이터와 용어집 추가"
```

---

### Task 3: plan.json 스키마와 로더

**Files:**
- Create: `scripts/facebook/plan_model.py`
- Create: `scripts/facebook/tests/fixtures/plan-valid.json`
- Create: `scripts/facebook/tests/test_plan_model.py`

**Interfaces:**
- Consumes: `config.LANGUAGES` (Task 1)
- Produces:
  - `plan_model.Topic` — frozen dataclass: `topic_id: str`, `title_ko: str`
  - `plan_model.Post` — frozen dataclass: `index: int`, `topic_id: str`, `language: str`, `publish_at: datetime` (tz-aware), `source_ko: str`, `body_local: str`, `image_file: str`, `image_prompt: str`, `fact_keys: tuple[str, ...]`, `university_names: tuple[str, ...]`
  - `plan_model.Plan` — frozen dataclass: `month: str` (`"YYYY-MM"`), `topics: tuple[Topic, ...]`, `posts: tuple[Post, ...]`; 메서드 `posts_for(topic_id) -> tuple[Post, ...]`
  - `plan_model.PlanError(Exception)`
  - `plan_model.load_plan(path: Path) -> Plan`

- [ ] **Step 1: Write the failing test**

```python
def test_유효한_플랜_로드():
    plan = load_plan(FIXTURE)
    assert plan.month == "2026-11"
    assert plan.posts[0].language == "vi"
    assert plan.posts[0].publish_at.tzinfo is not None

def test_알_수_없는_언어코드면_PlanError(tmp_path): ...
def test_topic_id가_topics에_없으면_PlanError(tmp_path): ...
def test_index가_0부터_연속하지_않으면_PlanError(tmp_path): ...
def test_publish_at에_타임존이_없으면_PlanError(tmp_path): ...
```

픽스처 `plan-valid.json`은 소재 2개 · 게시물 6건으로 둔다 (30건을 넣지 않는다).

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_plan_model.py -v`
Expected: FAIL — `ImportError: cannot import name 'load_plan'`

- [ ] **Step 3: Implement `load_plan(path: Path) -> Plan` in `scripts/facebook/plan_model.py`**

`publish_at`은 ISO 8601 오프셋 포함 문자열로 저장하고 `datetime.fromisoformat`으로 읽는다. 구조적 무결성(언어 코드, topic 참조, index 연속성, 타임존)만 여기서 보고, 내용 규칙은 Task 4·5가 맡는다.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_plan_model.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/facebook/plan_model.py scripts/facebook/tests
git commit -m "feat(facebook): plan.json 스키마와 로더 추가"
```

---

### Task 4: 구조 검증 — 로테이션·일정·이미지·사실 만료

**Files:**
- Create: `scripts/facebook/validate_structure.py` / `scripts/facebook/validate_copy.py`
- Create: `scripts/facebook/tests/test_validate_structure.py`

**Interfaces:**
- Consumes: `plan_model.Plan`/`Post`, `facts.Fact`, `config.*` (Task 1, 3)
- Produces:
  - `findings.Finding` — frozen dataclass: `severity: Literal["error", "warning"]`, `code: str`, `post_index: int | None`, `message: str` (한국어)
  - `validate_structure.validate_structure(plan: Plan, images_dir: Path) -> list[Finding]`
  - `validate_structure.validate_facts(plan: Plan, facts: dict[str, Fact]) -> list[Finding]`

- [ ] **Step 1: Write the failing test**

```python
def test_소재마다_세_언어가_vi_my_ne_순서로_있어야_한다():
    # 한 소재의 my 게시물을 빼면 code == "언어누락"
def test_게시물_수가_3의_배수가_아니면_오류():
def test_게시일이_하루씩_연속하지_않으면_오류():
def test_게시일이_plan_month_밖이면_오류():
    # 2026-11 플랜에 2026-12-01 게시물 → code == "월밖"
def test_이미지_파일이_없으면_오류():
def test_이미지가_0바이트면_오류():
def test_이미지_확장자가_jpg_png가_아니면_오류():
def test_이미지가_8MB를_넘으면_오류():
def test_게시물마다_이미지_파일명이_달라야_한다():
    # 같은 소재의 세 건이 같은 image_file을 쓰면 code == "이미지중복"
def test_이미지_프롬프트에_글자금지_지시가_없으면_오류():
    # 프롬프트에 "no text" 계열 지시가 없으면 code == "프롬프트글자"
def test_이미지_프롬프트에_실존인물_실제캠퍼스_금지_지시가_없으면_오류():
    # code == "프롬프트삽화"
def test_fact_key가_facts에_없으면_오류():
def test_fact가_게시일에_만료되면_오류():
    # 실행일에는 유효하지만 publish_at 날짜에는 만료된 Fact → code == "사실만료"
def test_모두_정상이면_findings가_비어_있다():
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_validate_structure.py -v`
Expected: FAIL — `ImportError: cannot import name 'validate_structure'`

- [ ] **Step 3: Implement `validate_structure` and `validate_facts` in `scripts/facebook/validate_structure.py` / `scripts/facebook/validate_copy.py`**

`validate_facts`는 반드시 `post.publish_at.date()` 를 `Fact.is_valid_on`에 넘긴다 — 실행일이 아니다. 프롬프트 검사는 필수 지시 문구 목록을 `config`에 상수로 두고 부분 문자열로 찾는다 (스펙의 "글자 없는 사진", "실존 인물·캠퍼스·회사 시설 금지"를 프롬프트 단계에서 강제하는 유일한 기계적 수단이다).

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_validate_structure.py -v`
Expected: PASS (14 passed)

- [ ] **Step 5: Commit**

```bash
git add scripts/facebook
git commit -m "feat(facebook): 로테이션·일정·이미지·사실 만료 검증 추가"
```

---

### Task 5: 문구 검증 — 금지 표현·CTA·대학 실명 맥락

**Files:**
- Create: `scripts/facebook/data/banned-phrases.json`
- Modify: `scripts/facebook/validate_structure.py` / `scripts/facebook/validate_copy.py`
- Create: `scripts/facebook/tests/test_validate_copy.py`

**Interfaces:**
- Consumes: `findings.Finding` (Task 4), `config.UNIVERSITIES_PATH`, `config.GLOSSARY_PATH` (Task 2)
- Produces:
  - `validate_copy.load_banned_phrases(path: Path) -> dict[str, tuple[str, ...]]` — 언어코드(`ko`/`vi`/`my`/`ne`) → 금지 문구 목록
  - `validate_copy.validate_copy(plan: Plan, universities: list[dict], banned: dict[str, tuple[str, ...]], glossary: dict, facts: dict[str, Fact]) -> list[Finding]`

`banned-phrases.json`에는 최소한 합격 보장, 취업 보장, 비용 보장/무료 유학, 상담 이후 절차·수수료 언급, "저희 협력 대학", "입학을 도와드립니다" 계열을 네 언어로 넣는다.

- [ ] **Step 1: Write the failing test**

```python
def test_CTA가_없으면_오류():
def test_금지표현이_한국어_원문에_있으면_오류():
def test_금지표현이_현지어_본문에_있으면_오류():
def test_대학명과_협력표현이_같은_게시물에_있으면_오류():
    # university_names 비어있지 않은데 본문에 "협력 대학" → code == "대학맥락"
def test_대학명_소개_맥락만_있으면_통과():
def test_universities_목록에_없는_대학명을_쓰면_오류():
def test_용어집_용어가_다르게_표기되면_경고():
    # severity == "warning"
def test_출처없는_수치가_본문에_있으면_경고():
    # fact_keys가 비었는데 source_ko에 금액·시간 수치가 있으면 code == "출처없는수치", severity == "warning"
def test_fact_keys가_있으면_수치가_있어도_통과():
    # 인용한 사실의 value에 그 수치의 숫자열이 들어 있으면 통과한다
def test_인용한_사실에_없는_수치는_경고():
    # fact_keys가 비어 있지 않아도, 숫자열이 인용한 어느 사실에도 없으면 code == "출처없는수치"
def test_대학_실무_표현은_대학맥락이_아니다():
    # 산학협력단·국제협력처·연계전공·합격자 발표·불합격 다섯 문장은 findings가 비어 있어야 한다
def test_대학맥락은_1인칭_주체가_있어야_발화한다():
    # 대학명 + 관계 어휘만으로는 통과하고, 여기에 저희/우리/당사/회사명이 붙을 때만 오류
def test_대학맥락_1인칭_판정은_네_언어_모두_돈다():
    # vi/my/ne 본문에서도 1인칭 표지가 있을 때만 발화한다
def test_1인칭과_관계어휘가_다른_문장이면_발화하지_않는다():
    # "저희는 한국 대학을 소개합니다. 전북대학교 산학협력단은 유학생을 지원합니다."
    # → 1인칭과 관계 어휘가 같은 문장에 없으므로 findings가 비어 있다
def test_용어집_값이_비면_멈춘다():
    # glossary의 cta나 용어 문자열이 빈 문자열이면 ValueError (검사가 조용히 꺼지는 것을 막는다)
def test_등록금_사실을_인용하면_평균과_연단위_한정어가_있어야_한다():
    # fact_keys에 tuition_* 가 있는데 source_ko에 "평균"이 없거나
    # "1년"/"연간" 중 아무것도 없으면 code == "등록금한정어", severity == "error"
def test_대학교명이_연계_표현과_함께_있으면_경고():
    # 허용목록 밖의 "...대학교" + 맥락 어휘가 같은 게시물에 있으면
    # code == "대학명후보", severity == "warning". 맥락 어휘 없는 단순 소개는 통과한다
def test_픽스처_플랜은_findings가_비어_있다():
    # 실제 glossary.json의 CTA("무료 상담" 포함)가 금지 문구에 걸리지 않음을 고정한다
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_validate_copy.py -v`
Expected: FAIL — `ImportError: cannot import name 'validate_copy'`

- [ ] **Step 3: Implement `load_banned_phrases` and `validate_copy` in `scripts/facebook/validate_structure.py` / `scripts/facebook/validate_copy.py`**

CTA 존재는 `glossary["cta"][language]` 문자열이 `body_local` 끝부분에 있는지로 본다. 대학 맥락 규칙은 `post.university_names`가 비어 있지 않을 때만 협력 계열 표현을 찾는다. 용어집 불일치는 경고(warning)로, 나머지는 오류(error)로 낸다.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_validate_copy.py -v`
Expected: PASS (18 passed)

- [ ] **Step 5: Commit**

```bash
git add scripts/facebook
git commit -m "feat(facebook): 금지 표현·CTA·대학 맥락 문구 검증 추가"
```

---

### Task 6: 역번역 대조

역번역은 API가 아니라 **별도의 Claude Code 세션**이 워크시트를 채워 만든다. 코드가 하는 일은 워크시트 생성, 커버리지 확인, 그리고 원문과 되번역의 차이 표시다. 뜻의 옳고 그름은 Task 7의 검토 화면에서 사람이 본다.

**Files:**
- Create: `scripts/facebook/backtranslation.py`
- Create: `scripts/facebook/tests/test_backtranslation.py`

**Interfaces:**
- Consumes: `plan_model.Plan`, `findings.Finding`
- Produces:
  - `backtranslation.worksheet(plan: Plan, glossary: dict) -> dict` — `{"month": str, "entries": [{"index": int, "language": str, "body_local": str, "body_hash": str, "back_ko": ""}]}` — `body_local`은 **CTA를 뗀** 본문이고 `body_hash`는 그 본문의 SHA-256 앞 12자다(워크시트를 손으로 만들면 이 키가 있어야 `load`가 받는다)
  - `backtranslation.load(path: Path, *, plan: Plan | None = None, glossary: dict | None = None) -> dict[int, str]` — index → `back_ko`. `plan`과 `glossary`를 둘 다 넘기면 `body_hash`로 신선도를 검증하고 낡은 항목을 `WorksheetError`로 거부한다(하나만 넘기면 `ValueError`, 둘 다 안 넘기면 검증하지 않는다)
  - `backtranslation.divergence(source_ko: str, back_ko: str) -> float` — 0.0(동일)~1.0(완전 상이)
  - `backtranslation.validate_backtranslation(plan: Plan, back: dict[int, str], glossary: dict, *, threshold: float = 0.45) -> list[Finding]`

- [ ] **Step 1: Write the failing test**

```python
def test_워크시트가_모든_게시물을_담는다():
def test_비어있는_back_ko가_있으면_오류():
def test_게시물_하나라도_빠지면_오류():
def test_차이가_임계값을_넘으면_경고():
    # severity == "warning", code == "역번역차이"
def test_거의_같은_문장이면_findings가_비어_있다():
def test_divergence는_0과_1_사이():
def test_워크시트는_CTA를_떼고_본문을_내보낸다():
    # body_local 끝의 glossary["cta"][language]를 정확히 떼어 내보내므로
    # 채우는 쪽이 CTA를 역번역할 일이 없다
def test_되번역의_숫자가_원문과_다르면_오류():
    # source_ko의 숫자열 다중집합과 back_ko의 것이 다르면 code == "역번역수치", severity == "error"
def test_load는_본문이_바뀐_워크시트를_거부한다():
    # worksheet가 적어 둔 body_hash가 현재 body_local과 다르면 WorksheetError
def test_역번역이_다른_게시물과_똑같으면_경고():
    # 한 소재의 세 게시물은 source_ko가 글자까지 같으므로 역번역을 복사해도 숫자·유사도가 다 통과한다.
    # 두 게시물의 역번역이 (공백·문장부호 정규화 후) 같으면 code == "역번역중복", severity == "warning",
    # 메시지가 두 게시물 번호를 모두 댄다
def test_숫자가_같은데_순서가_다르면_경고():
    # "11월 5일" → "5월 11일": 다중집합이 같아 역번역수치는 안 나므로
    # code == "역번역수치순서", severity == "warning"
def test_본문이_CTA뿐이면_워크시트가_멈춘다():
    # body_local이 그 언어 CTA와 똑같으면 번역할 본문이 남지 않는다 → ValueError
def test_load는_다른_달의_워크시트를_거부한다():
    # raw["month"] != plan.month → WorksheetError (index가 겹치므로 "본문이 바뀌었다"로 오진된다)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_backtranslation.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'facebook.backtranslation'`

- [ ] **Step 3: Implement `scripts/facebook/backtranslation.py`**

`divergence`는 `difflib.SequenceMatcher(autojunk=False)`의 `ratio()`를 **양방향으로 재서 평균한** 값의 여수로 둔다 — `ratio()`는 비대칭이어서(`tide`/`diet` → 0.25 대 0.5) 한 방향만 재면 인자 순서가 결과를 바꾼다. 비교 전에 공백과 문장부호를 정규화한다. 누락·빈 칸과 숫자열 불일치는 error, 임계값 초과는 warning이다 (경고는 예약을 막지 않지만 검토 화면 상단에 뜬다).

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_backtranslation.py -v`
Expected: PASS (13 passed)

- [ ] **Step 5: Commit**

```bash
git add scripts/facebook
git commit -m "feat(facebook): 역번역 워크시트와 차이 대조 추가"
```

---

### Task 7: 검토 HTML 생성

이 화면이 **뜻을 확인하는 유일한 지점**이다. Task 6이 실측으로 보인 대로 문자 유사도는 부정 뒤집힘(0.05)·금액 변경(0.01)·약속 문장 추가(0.12)를 충실한 의역의 잡음(0.08~0.12)과 구분하지 못한다. 그래서 이 화면의 요구사항은 "보기 좋게"가 아니라 **사람이 세 단을 실제로 읽게 만드는 것**이고, 어떤 게시물에 달린 오류가 위쪽 요약에만 있어서 지나치는 일이 없어야 한다.

**Files:**
- Create: `scripts/facebook/review.py`
- Create: `scripts/facebook/tests/test_review.py`
- Modify: `scripts/facebook/backtranslation.py` (공개 측정 함수 추가)

**Interfaces:**
- Consumes: `plan_model.Plan`, `findings.Finding`, `backtranslation.load`
- Produces:
  - `backtranslation.divergences(plan: Plan, back: dict[int, str], glossary: dict) -> dict[int, float]` — 게시물 index → 차이값. `validate_backtranslation`과 **같은 CTA 제거 경로**를 쓴다(비공개 도우미를 공유하고 떼는 규칙을 두 번 쓰지 않는다). 역번역이 없거나 빈 게시물은 키에 넣지 않는다.
  - `review.render(plan: Plan, findings: list[Finding], back: dict[int, str], divergences: dict[int, float], images_dir: Path) -> str` — 완결된 HTML 문서 문자열

레이아웃: 상단에 오류·경고 요약, 그 아래 게시물을 게시일 순으로. 각 게시물은 왼쪽에 이미지, 오른쪽에 **한국어 원문 / 현지어 본문 / 되번역 한국어** 세 단을 같은 너비로 나란히 두고, 한국어 원문과 되번역을 서로 붙여 눈이 바로 견주게 한다. 이미지 아래에 `image_prompt`를 그대로 적는다(글자 금지·실존 인물 금지 지시가 형식만 맞고 내용이 어긋나는 경우를 사람이 보는 유일한 자리다). 이미지는 HTML 파일이 놓이는 자리(`images_dir.parent`) 기준 상대 경로로 걸어 파일을 열면 바로 보이게 한다.

- [ ] **Step 1: Write the failing test**

```python
def test_모든_게시물이_렌더된다():
def test_한국어_원문과_되번역이_모두_들어간다():
def test_오류가_있으면_상단_요약에_표시된다():
def test_게시물에_달린_finding이_그_게시물_자리에도_표시된다():
    # post_index=2의 error가 2번 게시물 블록 안에 코드와 메시지로 나타난다
    # (요약에만 있으면 긴 목록에서 지나친다)
def test_오류가_없으면_없다고_명시한다():
    # findings가 비면 요약이 비어 있지 않고 "오류 0건"·"경고 0건"을 적는다
def test_차이값이_게시물마다_표시된다():
def test_차이값은_backtranslation의_측정을_그대로_쓴다():
    # render가 받은 divergences의 값이 출력에 그대로 들어간다(재계산하지 않는다)
def test_이미지_경로가_HTML_위치_기준_상대경로다():
    # src == "images/<image_file>"  (images_dir=<month>/images, HTML=<month>/review.html)
def test_이미지_프롬프트가_들어간다():
def test_본문이_HTML_이스케이프된다():
    # body_local에 "<script>" → 출력에 "&lt;script&gt;"
def test_되번역과_프롬프트와_finding_메시지도_이스케이프된다():
    # 사람이 채우는 칸과 기계가 만든 메시지 모두 이스케이프된다
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_review.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'facebook.review'`

- [ ] **Step 3: Implement `divergences` in `backtranslation.py`, then `render(...) -> str` in `scripts/facebook/review.py`**

템플릿 엔진을 들이지 않고 f-string과 `html.escape`로 조립한다. 미얀마 문자와 데바나가리가 깨지지 않도록 `<meta charset="utf-8">`와 시스템 폰트 스택을 넣는다. 상대 경로는 `os.path.relpath(images_dir / post.image_file, start=images_dir.parent)`로 만들고 구분자를 `/`로 맞춘다.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_review.py -v`
Expected: PASS (11 passed)

- [ ] **Step 5: Commit**

```bash
git add scripts/facebook
git commit -m "feat(facebook): 한국어 대조 검토 화면 생성 추가"
```

---

### Task 8: Graph API 클라이언트와 토큰 점검

네트워크 호출이 있는 유일한 모듈이다. 테스트는 `requests.Session`을 가짜 객체로 주입해 돌린다. 실제 호출은 하지 않는다.

**Files:**
- Create: `scripts/facebook/graph.py`
- Create: `scripts/facebook/tests/test_graph.py`

**Interfaces:**
- Consumes: `config.PAGE_ID`, `config.GRAPH_VERSION`, `config.SCHEDULE_MIN_LEAD`, `config.SCHEDULE_MAX_LEAD`
- Produces:
  - `graph.GraphError(Exception)`
  - `graph.TokenStatus` — frozen dataclass: `ok: bool`, `page_name: str | None`, `missing_permissions: tuple[str, ...]`, `message: str`
  - `graph.check_token(token: str, page_id: str, *, session) -> TokenStatus`
  - `graph.assert_schedulable(publish_at: datetime, now: datetime) -> None` — 창 밖이면 `GraphError`
  - `graph.schedule_photo_post(token: str, page_id: str, image_path: Path, message: str, publish_at: datetime, *, session) -> str` — 반환값은 생성된 photo/post id

**플랫폼 사실은 이미 확인됐다 — 다시 조사하지 말 것.** Graph API `v26.0`. 본인이 관리하는 페이지에 글을 올리는 데는 App Review가 필요하지 않다. 필요한 권한은 `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` 세 개다. 예약 발행은 `published=false` + `scheduled_publish_time`(유닉스 초)이고 창은 **10분 뒤부터 75일 뒤까지**다. 이 값들은 `config`에 상수로 있다.

`graph.py`는 **모듈 수준에서 `requests`를 import하지 않는다.** 검증 경로(Task 4~7)와 CLI의 비네트워크 서브커맨드가 `requests` 없이도 돌아야 하고, 테스트는 가짜 세션을 넣으므로 `requests`를 필요로 하지 않는다. 타입 힌트가 필요하면 문자열 주석으로 쓴다.

- [ ] **Step 1: Write the failing test**

```python
def test_권한이_모두_있으면_ok():
def test_권한이_빠지면_missing_permissions에_담긴다():
def test_토큰이_무효면_ok_False와_한국어_메시지():
def test_10분_이내_예약이면_GraphError():
def test_75일_초과_예약이면_GraphError():
def test_경계값_정확히_10분과_75일은_통과():
def test_schedule_photo_post가_published_false와_scheduled_publish_time을_보낸다():
    # 가짜 session이 받은 payload를 검사. published == False, 유닉스 초
def test_API가_오류를_주면_GraphError에_한국어_설명():
def test_토큰_값이_예외_메시지에_들어가지_않는다():
def test_graph는_requests를_모듈_수준에서_import하지_않는다():
    # sys.modules에서 requests를 지운 뒤 importlib.reload(graph)가 성공한다
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_graph.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'facebook.graph'`

- [ ] **Step 3: Implement `scripts/facebook/graph.py`**

업로드는 `POST /{page-id}/photos` 에 멀티파트로 보내고 `published=false`, `scheduled_publish_time=<unix seconds>`를 함께 싣는다. 권한 확인은 `/me/permissions`. 모든 예외 메시지는 한국어로 쓰고 토큰 문자열을 절대 포함하지 않는다.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_graph.py -v`
Expected: PASS (10 passed)

- [ ] **Step 5: Commit**

```bash
git add scripts/facebook
git commit -m "feat(facebook): Graph API 클라이언트와 토큰 점검 추가"
```

---

### Task 9: 예약 실행·결과 기록·재실행 안전성

**Files:**
- Create: `scripts/facebook/schedule.py`
- Create: `scripts/facebook/tests/test_schedule.py`

**Interfaces:**
- Consumes: `graph.schedule_photo_post`, `graph.assert_schedulable`, `plan_model.Plan`, `findings.Finding`
- Produces:
  - `schedule.Outcome` — frozen dataclass: `index: int`, `ok: bool`, `post_id: str | None`, `error: str | None`
  - `schedule.load_ledger(path: Path) -> dict[int, str]` — 이미 예약된 index → post_id
  - `schedule.run(plan: Plan, findings: list[Finding], images_dir: Path, ledger_path: Path, *, token: str, session, now: datetime, dry_run: bool) -> list[Outcome]` — `findings`에 severity `"error"`가 하나라도 있으면 **아무것도 호출하지 않고** 한국어 `ValueError`를 낸다. `dry_run`일 때도 그렇다.

`ledger_path`는 `config.month_dir(month) / "scheduled.json"`. 한 건 성공할 때마다 즉시 기록한다 — 도중에 끊겨도 다음 실행이 이어받는다.

`findings` 인자는 장식이 아니라 **구조적 관문**이다. 검증을 통과하지 않은 플랜이 발행되는 경로가 있으면 Task 4~7의 검사 전부가 선택 사항이 된다. 시그니처가 findings를 요구하면 호출자가 검증을 건너뛴 사실이 코드에 드러난다. 경고(warning)는 막지 않는다 — 설계대로다.

- [ ] **Step 1: Write the failing test**

```python
def test_dry_run은_API를_호출하지_않고_예정_목록을_돌려준다():
def test_성공할_때마다_원장에_즉시_기록된다():
    # 2건째에서 예외를 던지는 가짜 session → 1건째 post_id가 파일에 남아 있다
def test_이미_원장에_있는_index는_건너뛴다():
    # 부분 실패 후 재실행 시 중복 예약 금지
def test_일부_실패해도_나머지를_계속_시도한다():
def test_예약창_밖인_게시물은_호출하지_않고_실패로_기록된다():
def test_원장이_없으면_빈_dict():
def test_오류_finding이_있으면_아무것도_호출하지_않고_ValueError():
    # dry_run=True일 때도 그렇다. 경고만 있으면 정상 진행한다
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_schedule.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'facebook.schedule'`

- [ ] **Step 3: Implement `scripts/facebook/schedule.py`**

한 건 실패가 전체를 멈추지 않는다. 실패는 `Outcome.error`에 한국어로 남기고 다음 건으로 간다. 원장 쓰기는 매 성공 직후 전체 파일을 다시 쓴다 (30건 규모라 성능 고민 불필요).

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_schedule.py -v`
Expected: PASS (7 passed)

- [ ] **Step 5: Commit**

```bash
git add scripts/facebook
git commit -m "feat(facebook): 예약 실행과 재실행 안전 원장 추가"
```

---

### Task 10: CLI 진입점·npm 스크립트·월간 운영 문서

**Files:**
- Create: `scripts/facebook-cli.py` (`uv run --script` 진입점, 실행 권한)
- Create: `scripts/facebook/cli.py`
- Create: `docs/facebook-운영.md`
- Modify: `package.json` (scripts 추가)
- Create: `scripts/facebook/tests/test_cli.py`

**Interfaces:**
- Consumes: 모든 선행 모듈
- Produces: `cli.main(argv: list[str], *, session=None) -> int`  (`session`이 None이면 그때 `requests`를 지연 임포트해 실제 세션을 만든다 — 테스트는 가짜 세션을 넣는다) — 서브커맨드 `check-token`, `images`, `backtranslate-template`, `validate`, `review`, `schedule`. 전부 `--month YYYY-MM`을 받는다. `schedule`은 기본이 dry-run이고 실제 예약은 `--confirm`이 있어야 한다. 반환값 0=성공, 1=검증 오류, 2=실행 오류.

`images` 서브커맨드는 플랜의 이미지 프롬프트 30개와 저장할 파일명을 그대로 출력한다 — 사업주가 ChatGPT에 붙여넣는 용도다.

npm 스크립트: `fb:check-token`, `fb:images`, `fb:validate`, `fb:review`, `fb:schedule`, `test:facebook`.

**이 task가 받아 온 결정들 (선행 task의 carry-forward — 전부 이 task가 이행해야 한다):**

- **플랜 작성 세션에게 이미지 프롬프트 규칙을 보여 줘야 한다.** Task 4가 `config.IMAGE_PROMPT_NO_TEXT`와 `config.IMAGE_PROMPT_NO_REAL_SUBJECTS` 두 문구를 프롬프트 안에서 **문구 그대로** 요구하는데, 지금 그 문구를 플랜 작성자에게 알려 주는 자리가 어디에도 없다. `images` 출력과 운영 문서의 플랜 작성 지침이 둘 다 이 두 상수를 그대로 보여 준다.
- **수는 숫자로, 원문과 같은 단위로.** Task 6의 `역번역수치`는 숫자열 다중집합을 견주므로, 한국어 원문이 `1년치`로 쓰고 현지어 본문이 `cả năm`처럼 말로 쓰면 충실한 역번역에도 되찾을 숫자가 없어 거짓 오류가 난다. `680만 원` 대 `6,800,000원`도 같은 부류다. 플랜 작성 지침에 "수는 숫자로 적고, 단위를 바꾸지 말 것"을 명시한다. 베트남어의 점 천단위(`6.800.000`)는 역번역에서 쉼표로 적어야 한다(검사는 쉼표만 제거한다).
- **월간 절차의 호출 순서가 고정되어 있다.** `validate_copy` → `backtranslation.worksheet(plan, glossary)` → `backtranslation.load(path, plan=plan, glossary=glossary)`. `worksheet`는 본문이 해당 언어 CTA로 끝나지 않으면 raise하므로 문구 검증이 먼저다. **신선도 보호는 `load`에 `plan`과 `glossary`를 둘 다 넘길 때만 존재한다** — 하나만 넘기면 `ValueError`, 둘 다 안 넘기면 낡은 워크시트가 조용히 통과한다.
- **플랜 JSON은 `fact_keys`와 `university_names`를 비어 있어도 반드시 쓴다(`[]`).** 키가 없으면 Task 3의 로더가 거부한다.
- **검토 화면은 `config.month_dir(month)/review.html`에 쓴다.** 이미지는 `month_dir/images/`에 있고 HTML이 그 부모에 놓이므로 상대 경로가 `images/<파일명>`이 된다.
- **운영 문서는 한계를 숨기지 않고 적는다.** (1) 역번역의 문자 유사도는 부정 뒤집힘·금액 변경·약속 문장 추가를 잡지 못한다 — 뜻은 검토 화면의 세 단을 사람이 읽어야 확인된다. (2) `banned-phrases.json`의 베트남어·미얀마어·네팔어 문구와 1인칭 제외 낱말은 AI가 작성했고 **원어민 검수를 받지 않았다** — 첫 실제 월 운영 전에 검수가 필요하다. (3) `주 20시간` 같은 1차 출처를 못 찾은 수치는 `facts.json`에 일부러 넣지 않았으므로 게시물에 쓸 수 없다.


- [ ] **Step 1: Write the failing test**

```python
def test_validate_오류가_있으면_종료코드_1():
def test_schedule은_confirm_없이는_dry_run이다():
def test_schedule은_검증_오류가_있으면_종료코드_1로_멈춘다():
    # 모든 검증기를 먼저 돌려 그 findings를 schedule.run에 넘긴다. 가짜 session은 호출되지 않는다
    # 가짜 session이 한 번도 호출되지 않는다
def test_알_수_없는_서브커맨드는_종료코드_2와_한국어_메시지():
def test_month_인자가_없으면_오류():
def test_images는_프롬프트와_파일명을_모두_출력한다():
def test_FB_PAGE_TOKEN이_없으면_종료코드_2와_한국어_안내():
def test_오류_출력에_토큰_값이_들어가지_않는다():
def test_images는_글자금지와_실존인물금지_지시도_출력한다():
    # config.IMAGE_PROMPT_NO_TEXT와 IMAGE_PROMPT_NO_REAL_SUBJECTS가 출력에 그대로 들어간다
def test_validate는_낡은_역번역_워크시트를_오류로_잡는다():
    # 워크시트를 만든 뒤 플랜의 본문을 고치면 종료코드 1과 한국어 안내
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/test_cli.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'facebook.cli'`

- [ ] **Step 3: Implement `cli.py`, `scripts/facebook-cli.py`, `package.json` scripts, `docs/facebook-운영.md`**

진입점은 저장소 관례대로 `#!/usr/bin/env -S uv run --script` + PEP 723 헤더(`requests`)로 시작하고, `sys.path`에 `scripts/`를 넣은 뒤 `cli.main`을 호출한다.

운영 문서는 두 부분이다. (1) **최초 1회 준비** — 페이스북 페이지를 Meta 비즈니스 포트폴리오에 넣고 시스템 사용자 영구 토큰을 발급해 `.env`의 `FB_PAGE_TOKEN`에 넣기(안 되면 장기 사용자 토큰 폴백), 페이지 소개란 상담 언어에 베트남어·미얀마어·네팔어 추가하기. (2) **매달 하는 일** — 토큰 점검 → 플랜 생성(Claude 세션) → 이미지 프롬프트 출력 → 그림 넣기 → 역번역 워크시트 채우기 → 검증 → 검토 → 1건 테스트 예약 후 눈으로 확인하고 삭제 → 전체 예약.

- [ ] **Step 4: Run the full suite**

Run: `uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/ -v`
Expected: PASS (전체)

- [ ] **Step 5: Commit**

```bash
git add scripts package.json docs/facebook-운영.md
git commit -m "feat(facebook): CLI 진입점과 월간 운영 문서 추가"
```
