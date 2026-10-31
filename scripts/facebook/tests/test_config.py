"""공통 설정(config.py) 테스트."""

from __future__ import annotations

import pytest

from facebook import config


@pytest.fixture
def isolated_token(monkeypatch, tmp_path):
    """실제 환경변수·저장소 `.env`와 분리된 토큰 읽기 환경. `.env` 경로를 돌려준다."""
    monkeypatch.delenv("FB_PAGE_TOKEN", raising=False)
    env_path = tmp_path / ".env"
    monkeypatch.setattr(config, "ENV_PATH", env_path)
    return env_path


def test_ROOT는_저장소_루트를_가리킨다():
    assert (config.ROOT / "scripts" / "facebook" / "config.py").is_file()


def test_산출물_경로는_output_facebook_아래다():
    assert config.facebook_dir() == config.ROOT / "output" / "facebook"
    for path in (config.FACTS_PATH, config.GLOSSARY_PATH, config.UNIVERSITIES_PATH):
        assert path.parent == config.facebook_dir()


def test_금지_표현_사전은_산출물이_아니라_코드_옆_data_폴더에_있다():
    # 생성물이 아니라 코드와 함께 커밋하는 정책 파일이므로 output/ 밑이 아니다. CLI는 이 상수로 찾는다.
    assert config.BANNED_PHRASES_PATH == config.ROOT / "scripts" / "facebook" / "data" / "banned-phrases.json"
    assert config.BANNED_PHRASES_PATH.is_file()
    assert config.facebook_dir() not in config.BANNED_PHRASES_PATH.parents


def test_month_dir은_월_폴더를_돌려준다():
    assert config.month_dir("2026-11") == config.facebook_dir() / "2026-11"


@pytest.mark.parametrize("month", ["2026-1", "2026-13", "2026-00", "26-11", "2026-11-01", "../2026-11", ""],
                         ids=["one-digit-month", "month-13", "month-00", "two-digit-year", "with-day", "parent-path", "empty"])
def test_month_dir은_YYYY_MM이_아니면_거부한다(month):
    with pytest.raises(ValueError, match="YYYY-MM"):
        config.month_dir(month)


def test_이미지_용량_상한이_8MiB다():
    assert config.MAX_IMAGE_BYTES == 8 * 1024 * 1024


def test_load_token은_환경변수만_있으면_그_값을_쓴다(isolated_token, monkeypatch):
    monkeypatch.setenv("FB_PAGE_TOKEN", "from-env")
    assert not isolated_token.exists()
    assert config.load_token() == "from-env"


def test_load_token은_dotenv만_있으면_그_값을_쓴다(isolated_token):
    isolated_token.write_text("OTHER=1\nFB_PAGE_TOKEN=from-file\n", encoding="utf-8")
    assert config.load_token() == "from-file"


def test_load_token은_둘이_같으면_그_값을_쓴다(isolated_token, monkeypatch):
    isolated_token.write_text("FB_PAGE_TOKEN=same-value\n", encoding="utf-8")
    monkeypatch.setenv("FB_PAGE_TOKEN", "same-value")
    assert config.load_token() == "same-value"


def test_load_token은_둘이_다르면_어느_쪽도_고르지_않고_멈춘다(isolated_token, monkeypatch):
    isolated_token.write_text("FB_PAGE_TOKEN=file-value-xyz\n", encoding="utf-8")
    monkeypatch.setenv("FB_PAGE_TOKEN", "env-value-abc")
    with pytest.raises(RuntimeError) as e:
        config.load_token()
    message = str(e.value)
    # 두 출처를 모두 이름으로 짚고, 어떻게 풀지 알려 준다.
    assert "환경변수" in message and str(isolated_token) in message and "다릅니다" in message
    # 토큰 값은 어느 쪽도 메시지에 넣지 않는다.
    assert "env-value-abc" not in message and "file-value-xyz" not in message


def test_load_token은_환경변수가_공백뿐이면_없는_것으로_본다(isolated_token, monkeypatch):
    isolated_token.write_text("FB_PAGE_TOKEN=from-file\n", encoding="utf-8")
    monkeypatch.setenv("FB_PAGE_TOKEN", "   ")
    assert config.load_token() == "from-file"


@pytest.mark.parametrize("line", [
    'FB_PAGE_TOKEN="from-file"',
    "FB_PAGE_TOKEN='from-file'",
    "export FB_PAGE_TOKEN=from-file",
    "  FB_PAGE_TOKEN = from-file  ",
    "FB_PAGE_TOKEN=from-file # 만료일 확인",
    'FB_PAGE_TOKEN="from-file" # 만료일 확인',
    "FB_PAGE_TOKEN='from-file'  # 만료일 확인",
    "FB_PAGE_TOKEN=from-file#만료일확인",
], ids=["double-quote", "single-quote", "export", "spaces", "inline-comment",
        "quote-then-comment", "single-quote-then-comment", "comment-without-space"])
def test_load_token은_dotenv의_일반적인_표기를_해석한다(isolated_token, line):
    """운영자가 `.env` 한 줄을 쓰는 흔한 방식들. 어느 하나라도 값이 망가지면 바로 다음 단계(§1-4 토큰 점검)가
    Facebook의 거절을 「토큰이 유효하지 않거나 만료되었습니다」로 보여 주고, 운영자는 멀쩡한 토큰을 계속
    재발급하는 고리에 갇힌다. 따옴표를 의심할 길이 문서 어디에도 없으므로 **설치 직후 첫 10분**에 끝난다.

    뒤의 셋이 고치기 전에 틀렸던 것이다: 따옴표+메모는 `'"from-file"'`(따옴표가 남았다), 공백 없는 `#`은
    `'from-file#만료일확인'`이었다.
    """
    isolated_token.write_text(f"# 페이스북\n\n{line}\n", encoding="utf-8")
    assert config.load_token() == "from-file"


def test_load_token은_따옴표_안의_샵은_값으로_읽는다(isolated_token):
    """주석을 떼는 규칙(첫 `#`부터 버림)이 따옴표 안까지 들어가면, `#`가 든 토큰이 조용히 잘린다.
    그래서 따옴표로 시작하는 값은 **닫는 따옴표까지가 값**이고 그 안의 `#`는 손대지 않는다."""
    isolated_token.write_text('FB_PAGE_TOKEN="from#file" # 메모\n', encoding="utf-8")
    assert config.load_token() == "from#file"


def test_load_token은_같은_키가_여러_번이면_마지막_줄을_쓴다(isolated_token):
    isolated_token.write_text("FB_PAGE_TOKEN=old\nFB_PAGE_TOKEN=new\n", encoding="utf-8")
    assert config.load_token() == "new"


def test_load_token은_dotenv의_다른_키를_토큰으로_오인하지_않는다(isolated_token):
    isolated_token.write_text("FB_PAGE_TOKEN_OLD=stale\n#FB_PAGE_TOKEN=commented\n", encoding="utf-8")
    with pytest.raises(RuntimeError):
        config.load_token()


@pytest.mark.parametrize("content", [None, "", "FB_PAGE_TOKEN=\n", 'FB_PAGE_TOKEN=""\n'],
                         ids=["no-file", "empty-file", "empty-value", "empty-quotes"])
def test_load_token은_토큰이_없으면_한국어_안내와_함께_RuntimeError(isolated_token, content):
    if content is not None:
        isolated_token.write_text(content, encoding="utf-8")
    with pytest.raises(RuntimeError, match="FB_PAGE_TOKEN") as e:
        config.load_token()
    assert ".env" in str(e.value) and "환경변수" in str(e.value)


def test_load_token은_dotenv가_UTF_8이_아니면_한국어로_멈춘다(isolated_token):
    # 운영자는 `.env`를 손으로 만든다. 한국어 주석을 EUC-KR로 저장한 편집기가 이 바이트를 낸다.
    isolated_token.write_bytes("# 포인트\n FB_PAGE_TOKEN=x\n".encode("euc-kr"))
    with pytest.raises(RuntimeError) as e:
        config.load_token()
    message = str(e.value)
    # 어느 파일인지, 무엇이 문제인지, 무엇을 하면 되는지를 모두 한국어로 말한다.
    assert str(isolated_token) in message
    assert "UTF-8" in message
    # 영어 OS·파이썬 오류 문구가 그대로 새지 않는다.
    assert "codec" not in message and "decode" not in message.lower()
    # 원래 예외는 끊지 않는다 — 개발자가 추적할 수 있어야 한다.
    assert isinstance(e.value.__cause__, UnicodeDecodeError)


def test_load_token은_dotenv_자리가_폴더면_한국어로_멈춘다(isolated_token):
    isolated_token.mkdir()
    with pytest.raises(RuntimeError) as e:
        config.load_token()
    message = str(e.value)
    assert str(isolated_token) in message
    # 영어 OS 오류("Is a directory")가 그대로 새지 않는다.
    assert "Is a directory" not in message and "Errno" not in message
    assert isinstance(e.value.__cause__, OSError)


def test_load_token은_dotenv를_읽을_권한이_없으면_한국어로_멈춘다(isolated_token):
    isolated_token.write_text("FB_PAGE_TOKEN=unreadable-value\n", encoding="utf-8")
    isolated_token.chmod(0o000)
    try:
        if isolated_token.read_bytes():
            pytest.skip("이 사용자는 권한 0으로도 읽을 수 있다(root)")
    except PermissionError:
        pass
    with pytest.raises(RuntimeError) as e:
        config.load_token()
    message = str(e.value)
    assert str(isolated_token) in message
    assert "Permission denied" not in message and "Errno" not in message
    # 읽지 못한 파일의 값이 메시지에 실릴 길은 없지만, 못박아 둔다.
    assert "unreadable-value" not in message


def test_Graph_API_요청_타임아웃은_연결과_응답_두_값이고_둘_다_양수다():
    # 모든 네트워크 호출이 이 값을 명시적으로 넘긴다(tests/test_graph.py). 값이 None이거나 0이면 timeout이 없는 것과 같다.
    connect, read = config.GRAPH_TIMEOUT
    assert connect > 0 and read > 0
