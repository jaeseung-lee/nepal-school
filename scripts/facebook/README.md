# scripts/facebook

테스트 (저장소 루트에서, Python 3.11 고정):

```bash
uv run --python 3.11 --isolated --with pytest pytest scripts/facebook/tests/ -v
```

`--isolated`는 시스템 Python의 전역 패키지가 pytest 플러그인으로 딸려 들어오는 것을 막는다. 이 Mac의 Homebrew 3.11에는 pytest 9와 맞지 않는 `xonsh` 플러그인이 깔려 있어, 이 옵션이 없으면 pytest가 시작하자마자 죽는다.
