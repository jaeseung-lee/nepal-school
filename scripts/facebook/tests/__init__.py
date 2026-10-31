"""테스트에서 `import facebook`이 되도록 `scripts/`를 임포트 경로에 올린다.

pytest도 패키지 루트(`scripts/`)를 잡아 주지만, 실행 방식(rootdir·import-mode)에
기대지 않도록 명시해 둔다.
"""

import sys
from pathlib import Path

_SCRIPTS_DIR = str(Path(__file__).resolve().parents[2])
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)
