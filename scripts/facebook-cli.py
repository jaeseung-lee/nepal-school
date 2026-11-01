#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "requests>=2.32.0",
# ]
# ///
"""페이스북 월간 예약 게시 도구의 진입점. 쓰는 법은 `--help` 또는 docs/facebook-운영.md.

이 파일은 `scripts/`를 임포트 경로에 올리고 `facebook.cli.main`에 명령줄을 넘기는 일만 한다.
실제 동작은 전부 `scripts/facebook/` 안에 있고 그쪽만 테스트한다.

`requests`는 PEP 723 헤더에 적혀 있지만 이 파일에서 임포트하지 않는다 — 네트워크를 타는 두 명령
(`check-token`·`schedule`)이 실제 세션을 만들 때 `facebook/cli.py`가 지연 임포트한다.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from facebook.cli import main  # noqa: E402 — sys.path를 세운 뒤에 임포트해야 한다

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
