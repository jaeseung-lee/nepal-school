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


def test_month_dir은_월_폴더를_돌려준다():
    assert config.month_dir("2026-11") == config.facebook_dir() / "2026-11"


@pytest.mark.parametrize("month", ["2026-1", "2026-13", "2026-00", "26-11", "2026-11-01", "../2026-11", ""],
                         ids=["one-digit-month", "month-13", "month-00", "two-digit-year", "with-day", "parent-path", "empty"])
def test_month_dir은_YYYY_MM이_아니면_거부한다(month):
    with pytest.raises(ValueError, match="YYYY-MM"):
        config.month_dir(month)


def test_언어별_오프셋은_모든_언어를_기본_0으로_가진다():
    assert config.LANGUAGE_OFFSET_MINUTES == {lang: 0 for lang in config.LANGUAGES}


def test_load_token은_환경변수를_우선한다(isolated_token, monkeypatch):
    isolated_token.write_text("FB_PAGE_TOKEN=from-file\n", encoding="utf-8")
    monkeypatch.setenv("FB_PAGE_TOKEN", "from-env")
    assert config.load_token() == "from-env"


def test_load_token은_환경변수가_없으면_dotenv에서_읽는다(isolated_token):
    isolated_token.write_text("OTHER=1\nFB_PAGE_TOKEN=from-file\n", encoding="utf-8")
    assert config.load_token() == "from-file"


@pytest.mark.parametrize("line", [
    'FB_PAGE_TOKEN="from-file"',
    "FB_PAGE_TOKEN='from-file'",
    "export FB_PAGE_TOKEN=from-file",
    "  FB_PAGE_TOKEN = from-file  ",
    "FB_PAGE_TOKEN=from-file # 만료일 확인",
], ids=["double-quote", "single-quote", "export", "spaces", "inline-comment"])
def test_load_token은_dotenv의_일반적인_표기를_해석한다(isolated_token, line):
    isolated_token.write_text(f"# 페이스북\n\n{line}\n", encoding="utf-8")
    assert config.load_token() == "from-file"


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
