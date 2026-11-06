# 유학생 도입 체계 도식

[Figma 프레임](https://www.figma.com/design/WjWhtE25116IaGXslTO3xv?node-id=9-2)

원본 PDF의 추진 체계를 해외 준비 5단계(3+2)와 국내 대학 4단계로 정리했다. 회사 globals.css와 연결된 기존 Figma 색상·간격·모서리 변수를 사용했다. 텍스트 30개와 화살표 8개는 모두 Figma에서 개별 편집할 수 있다. 아이콘은 사용하지 않았다.

졸업 직후 E-7이 자동 취득되는 것처럼 보이는 원문은 졸업·채용 검토와 체류 심사로 구분했다. 준비교육의 수료·기량·자격 확인도 독립 단계로 표시했다.

완성 프레임은 1180×1180이며, PNG는 Figma에서 2배 해상도(2360×2360)로 내보냈다. 문구 잘림·겹침이 없는지 검토했고 별도 브라우저에서도 프레임이 표시되는 것을 확인했다. Google Docs는 이번 작업에서 변경하지 않았다.

`build.js`는 Figma MCP용 제작 코드다. MCP Starter 호출 한도 때문에 이번에는 직접 작성한 `desktop-plugin`을 Figma 데스크톱에서 실행했다. `desktop-plugin/create.js`는 최초 구성, `desktop-plugin/code.js`는 문구 한 곳을 다듬은 마지막 편집 코드다. `fallback.svg`와 `fallback.png`는 연결 도구 한도 발생 시 준비했던 대안이며, 최종 결과는 `08-student-admission-system.png`다.
