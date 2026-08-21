#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
네팔 현지 일본어 면접용 인쇄물 생성기.

산출물 (output/):
  · 일본어면접_평가시트_학생배부용_A4.pdf        A4 1p, 학생 배부용 (한국어 + 일본어)
  · 일본어면접_평가시트_학생배부용_JP-NE_A4.pdf  A4 1p, 학생 배부용 (일본어 + 네팔어)
  · 면접진행안내_학생용_KO-JP_A4.pdf             A4 1p, 면접 진행 절차 안내 (한국어 + 일본어)
  · 면접진행안내_학생용_NE-JP_A4.pdf             A4 1p, 면접 진행 절차 안내 (네팔어 + 일본어)
  · 일본어면접_질문지_면접관용_KO.pdf       A4 4p, 면접관 전용 (6분류 x 10문항, 일본어 원문 + 한국어 해석)

사용법 (레포 루트에서):
  python3 scripts/interview-sheets/build.py            # HTML 생성 + PDF 렌더
  python3 scripts/interview-sheets/build.py --html     # HTML만 생성 (playwright 불필요)

PDF 렌더에는 node + playwright(chromium)가 필요하고, 렌더 환경에 CJK 글리프와
데바나가리 글리프(Noto Sans Devanagari / macOS 의 Kohinoor Devanagari 등)가 있어야 한다. 없으면 --html 으로 만든 뒤
브라우저에서 '인쇄 → PDF로 저장'(A4, 배경 그래픽 켜기)으로 대체할 수 있다.
"""
import argparse
import base64
import pathlib
import random
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import guide  # noqa: E402  (HERE 를 path 에 넣은 뒤에 import 해야 한다)
LOGO_SVG = ROOT / "company" / "public" / "brand" / "logo-black.svg"
OUT_DIR = ROOT / "output"
BUILD_DIR = HERE / ".build"

SHEET_PDF = "일본어면접_평가시트_학생배부용_A4.pdf"
SHEET_NE_PDF = "일본어면접_평가시트_학생배부용_JP-NE_A4.pdf"
GUIDE_KO_PDF = "면접진행안내_학생용_KO-JP_A4.pdf"
GUIDE_NE_PDF = "면접진행안내_학생용_NE-JP_A4.pdf"
QUEST_PDF = "일본어면접_질문지_면접관용_KO.pdf"

# 공식 브랜드 에셋을 인라인 data URI 로 삽입한다(PDF 자체 완결성 확보).
LOGO = "data:image/svg+xml;base64," + base64.b64encode(LOGO_SVG.read_bytes()).decode()

# -*- coding: utf-8 -*-
CATS = [
 ("1","자기소개 · 기본회화","自己紹介・基本会話",
  "이름·나이·가족·생활 등 준비된 기본 정보를 일본어로 말할 수 있는지. 발음과 문장 완성도를 본다.",
  [("お名前を教えてください。","이름을 말해 주세요."),
   ("何歳ですか。誕生日はいつですか。","몇 살입니까? 생일은 언제입니까?"),
   ("家族は何人ですか。家族について話してください。","가족은 몇 명입니까? 가족에 대해 이야기해 주세요."),
   ("今、どこに住んでいますか。","지금 어디에 살고 있습니까?"),
   ("家から学校まで、どうやって来ますか。どのくらいかかりますか。","집에서 학교까지 어떻게 옵니까? 얼마나 걸립니까?"),
   ("休みの日は、何をしますか。","쉬는 날에는 무엇을 합니까?"),
   ("あなたの性格を一つ教えてください。","본인의 성격을 하나 말해 주세요."),
   ("得意なことは何ですか。","잘하는 것은 무엇입니까?"),
   ("今朝は何時に起きましたか。何を食べましたか。","오늘 아침 몇 시에 일어났습니까? 무엇을 먹었습니까?"),
   ("自分のことを1分ぐらいで紹介してください。","자기소개를 1분 정도 해 주세요."),]),
 ("2","일본어 학습 · 일본 이해","日本語学習・日本理解",
  "학습 이력을 스스로 설명할 수 있는지, 일본 생활에 대한 사전 이해가 있는지를 본다.",
  [("日本語の勉強を始めて、どのくらいになりますか。","일본어 공부를 시작한 지 얼마나 되었습니까?"),
   ("毎日、何時間ぐらい日本語を勉強していますか。","매일 몇 시간 정도 일본어를 공부합니까?"),
   ("日本語の勉強で、一番難しいことは何ですか。","일본어 공부에서 가장 어려운 것은 무엇입니까?"),
   ("どうやって日本語を勉強していますか。","어떤 방법으로 일본어를 공부하고 있습니까?"),
   ("日本語の試験を受けたことがありますか。結果はどうでしたか。","일본어 시험을 본 적이 있습니까? 결과는 어땠습니까?"),
   ("日本について知っていることを話してください。","일본에 대해 알고 있는 것을 이야기해 주세요."),
   ("日本とネパールで、違うところは何だと思いますか。","일본과 네팔의 다른 점은 무엇이라고 생각합니까?"),
   ("日本には四季があります。どの季節が一番好きですか。どうしてですか。","일본에는 사계절이 있습니다. 어느 계절을 가장 좋아합니까? 왜 그렇습니까?"),
   ("日本の食べ物を食べたことがありますか。何を食べてみたいですか。","일본 음식을 먹어본 적이 있습니까? 무엇을 먹어보고 싶습니까?"),
   ("日本語がもっと上手になるために、これから何をしますか。","일본어를 더 잘하기 위해 앞으로 무엇을 하겠습니까?"),]),
 ("3","일본 취업동기 · 장래계획","就労動機・将来計画",
  "지원 동기가 본인의 말로 정리되어 있는지, 계획이 현실적인지를 본다. 암기형 답변 여부를 메모.",
  [("どうして日本で働きたいですか。","왜 일본에서 일하고 싶습니까?"),
   ("どんな仕事をしたいですか。","어떤 일을 하고 싶습니까?"),
   ("今まで働いたことがありますか。どんな仕事でしたか。","지금까지 일한 적이 있습니까? 어떤 일이었습니까?"),
   ("日本で何年ぐらい働きたいですか。","일본에서 몇 년 정도 일하고 싶습니까?"),
   ("お給料をもらったら、何に使いたいですか。","급여를 받으면 무엇에 쓰고 싶습니까?"),
   ("家族は、あなたが日本で働くことについて何と言っていますか。","가족은 당신이 일본에서 일하는 것에 대해 뭐라고 합니까?"),
   ("日本で働くとき、心配なことはありますか。","일본에서 일할 때 걱정되는 것이 있습니까?"),
   ("仕事が大変なとき、あなたはどうしますか。","일이 힘들 때 당신은 어떻게 하겠습니까?"),
   ("5年後、あなたは何をしていると思いますか。","5년 후 당신은 무엇을 하고 있을 것 같습니까?"),
   ("あなたを採用したら、会社にどんないいことがありますか。","당신을 채용하면 회사에 어떤 좋은 점이 있습니까?"),]),
 ("4","일상생활 · 문제해결","日常生活・問題解決",
  "혼자 생활할 수 있는지, 예상치 못한 상황에서 문장을 만들어 대응할 수 있는지를 본다.",
  [("自分で料理をしますか。何が作れますか。","직접 요리를 합니까? 무엇을 만들 수 있습니까?"),
   ("日本ではごみを分けて出します。どうしたらいいと思いますか。","일본에서는 쓰레기를 분리해서 버립니다. 어떻게 하면 좋다고 생각합니까?"),
   ("道が分からなくなりました。どうしますか。","길을 모르게 되었습니다. 어떻게 하겠습니까?"),
   ("体の調子が悪いとき、どうしますか。","몸이 안 좋을 때 어떻게 하겠습니까?"),
   ("コンビニや銀行で、何をしたことがありますか。","편의점이나 은행에서 무엇을 해 본 적이 있습니까?"),
   ("電車が止まって、会社に遅れそうです。どうしますか。","전철이 멈춰서 회사에 늦을 것 같습니다. 어떻게 하겠습니까?"),
   ("財布をなくしてしまいました。どうしますか。","지갑을 잃어버렸습니다. 어떻게 하겠습니까?"),
   ("隣の部屋の人がうるさいです。何と言いますか。","옆방 사람이 시끄럽습니다. 뭐라고 말하겠습니까?"),
   ("友だちと約束をしましたが、行けなくなりました。何と言いますか。","친구와 약속했는데 갈 수 없게 되었습니다. 뭐라고 말하겠습니까?"),
   ("買った物が壊れていました。店で何と言いますか。","산 물건이 고장 나 있었습니다. 가게에서 뭐라고 말하겠습니까?"),]),
 ("5","직장 커뮤니케이션 · 지시 이해","職場コミュニケーション・指示理解",
  "인사·경어의 기본형과 지시에 대한 반응을 본다. 「はい、わかりました」류의 즉답 여부가 핵심.",
  [("朝、会社に来たら、まず何と言いますか。","아침에 회사에 오면 먼저 뭐라고 말합니까?"),
   ("「これを2階に持って行ってください」と言われました。何と答えますか。","“이것을 2층에 가져가 주세요”라는 말을 들었습니다. 뭐라고 답합니까?"),
   ("先輩の話が分からなかったとき、何と言いますか。","선배의 말을 이해하지 못했을 때 뭐라고 말합니까?"),
   ("仕事が終わって帰るとき、何と言いますか。","일이 끝나고 돌아갈 때 뭐라고 말합니까?"),
   ("休みを取りたいとき、誰に、何と言いますか。","휴가를 받고 싶을 때 누구에게 뭐라고 말합니까?"),
   ("病気で会社を休むとき、電話で何と言いますか。","아파서 회사를 쉴 때 전화로 뭐라고 말합니까?"),
   ("仕事で間違えてしまいました。何と言いますか。","일에서 실수를 했습니다. 뭐라고 말합니까?"),
   ("二つの仕事を頼まれました。どちらを先にするか、どうやって決めますか。","두 가지 일을 부탁받았습니다. 어느 것을 먼저 할지 어떻게 정합니까?"),
   ("「ちょっと待っていてください」と言われました。どうしますか。","“잠깐 기다려 주세요”라는 말을 들었습니다. 어떻게 하겠습니까?"),
   ("仕事を教えてもらったとき、何と言いますか。","일을 배웠을 때 뭐라고 말합니까?"),]),
 ("6","현장 안전 · 보고","現場の安全・報告",
  "직종과 무관한 공통 안전·보고 능력. 「모르면 묻는다 / 생기면 바로 보고한다」가 나오는지를 본다.",
  [("仕事中にけがをしました。まず何をしますか。","근무 중에 다쳤습니다. 먼저 무엇을 하겠습니까?"),
   ("物を落として壊してしまいました。どうしますか。","물건을 떨어뜨려 망가뜨렸습니다. 어떻게 하겠습니까?"),
   ("「危ないです！」と言われたら、どうしますか。","“위험합니다!”라는 말을 들으면 어떻게 하겠습니까?"),
   ("床が濡れています。どうしますか。","바닥이 젖어 있습니다. 어떻게 하겠습니까?"),
   ("やり方が分からない仕事を頼まれました。どうしますか。","방법을 모르는 일을 부탁받았습니다. 어떻게 하겠습니까?"),
   ("仕事が終わったら、誰に、何と言いますか。","일이 끝나면 누구에게 뭐라고 말합니까?"),
   ("火事や地震のとき、どうしますか。","화재나 지진이 났을 때 어떻게 하겠습니까?"),
   ("手はどんなときに洗いますか。どうして大切ですか。","손은 어떤 때에 씻습니까? 왜 중요합니까?"),
   ("重い物を運ぶとき、気をつけることは何ですか。","무거운 물건을 옮길 때 주의할 점은 무엇입니까?"),
   ("お客さんや利用者さんに呼ばれました。何と言って行きますか。","손님이나 이용자분이 불렀습니다. 뭐라고 하면서 갑니까?"),]),
]

CSS = """
@page { size: A4 portrait; margin: 11mm 12mm 12mm; }
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:"Noto Sans CJK KR","Noto Sans CJK JP",sans-serif; color:#000; font-size:10pt; }
.jp { font-family:"Noto Sans CJK JP","Noto Sans CJK KR",sans-serif; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
.hd { display:flex; justify-content:space-between; align-items:flex-end;
      border-bottom:2.2pt solid #000; padding-bottom:1.6mm; margin-bottom:3mm; }
.hd .l { display:flex; align-items:flex-end; gap:4mm; }
.hd .logo { width:27mm; margin-bottom:.6mm; }
.hd h1 { font-size:15pt; font-weight:800; letter-spacing:.03em; }
.hd .s { font-size:8pt; }
.hd .r { font-size:8pt; text-align:right; line-height:1.5; }
.tag { display:inline-block; border:1.2pt solid #000; padding:.6mm 2mm; font-size:7.6pt; font-weight:700; }

.cat { border:2pt solid #000; margin-bottom:3.5mm; page-break-inside:avoid; }
.cat > .ch { background:#000; color:#fff; padding:1.3mm 3mm; display:flex; align-items:baseline; gap:3mm; }
.ch .n { font-size:13pt; font-weight:800; }
.ch .k { font-size:11pt; font-weight:800; color:#fff; }
.ch .j { font-size:8pt; opacity:.85; }
.pt { background:#efefef; border-bottom:1pt solid #000; padding:1.1mm 3mm; font-size:7.6pt; }
.pt b { font-size:7.8pt; }
table { border-collapse:collapse; width:100%; }
td { border-bottom:.6pt solid #bbb; padding:1.0mm 2.5mm; vertical-align:top; }
tr:last-child td { border-bottom:none; }
td.n { width:8mm; text-align:center; font-weight:800; font-size:10pt; border-right:.6pt solid #bbb;
       background:#fafafa; }
.q  { font-size:9.9pt; font-weight:600; line-height:1.28; }
.k  { font-size:7.8pt; color:#333; margin-top:.3mm; line-height:1.22; }

/* guide page */
.gbox { border:2pt solid #000; margin-bottom:3mm; }
.gbox .gh { background:#000; color:#fff; font-size:9.5pt; font-weight:800; padding:1.5mm 3mm; }
.gbox .gb { padding:2.5mm 3mm; font-size:8.8pt; line-height:1.55; }
.gbox ol, .gbox ul { margin-left:4.5mm; }
.gbox li { margin-bottom:.8mm; }
.ctab td { border:.8pt solid #000; padding:1.5mm 2.5mm; font-size:8.8pt; }
.ctab td.p { width:12mm; text-align:center; font-weight:800; background:#f0f0f0; }
.two { display:flex; gap:3mm; }
.two > div { flex:1; }

.rnd table { border-collapse:collapse; width:100%; }
.rnd td, .rnd th { border:.7pt solid #000; text-align:center; font-size:7.4pt; padding:.28mm 0; }
.rnd th { background:#e6e6e6; font-weight:700; font-size:6.8pt; }
.rnd td.s { background:#f4f4f4; font-weight:700; width:11mm; }
.warn { border:1.4pt solid #000; padding:1.8mm 3mm; font-size:8.2pt; line-height:1.45; margin-bottom:3mm; }
"""

def hd(page, total, right):
    return f'''<div class="hd">
  <div class="l">
    <img class="logo" src="{LOGO}" alt="정우인재개발원 JW HRDI">
    <div><h1>일본어 면접 질문지 <span style="font-size:9pt;font-weight:700;">(면접관용)</span></h1>
    <div class="s jp">日本語面接質問リスト / 特定技能1号 候補者 面接　—　N4 수준</div></div>
  </div>
  <div class="r">{right}<br><b>{page} / {total}</b></div>
</div>'''


import random
_r = random.Random(20260818)
def rndtab(lo, hi):
    rows = []
    for i in range(lo, hi+1):
        cells = ''.join(f'<td>{_r.randint(1,10)}</td>' for _ in range(6))
        rows.append(f'<tr><td class="s">{i}</td>{cells}</tr>')
    head = '<tr><th>순번</th>' + ''.join(f'<th>{n}</th>' for n in ['①','②','③','④','⑤','⑥']) + '</tr>'
    return f'<table>{head}{"".join(rows)}</table>'

RND = f'''<div class="gbox rnd">
  <div class="gh">4. 출제번호 랜덤 배정표 &nbsp;<span style="font-weight:400;font-size:7.8pt;">— 미리 뽑아 둔 번호. 학생의 면접 순번 행을 그대로 따라 6개 영역의 출제번호를 정하면 된다. 별도 표를 쓰거나 즉석에서 다르게 뽑아도 무방.</span></div>
  <div class="gb" style="padding:1.2mm; display:flex; gap:2.5mm;">
    <div style="flex:1;">{rndtab(1,15)}</div>
    <div style="flex:1;">{rndtab(16,30)}</div>
  </div>
</div>'''

pages = []

# --- guide page ---
g = ['<div class="page">', hd(1,4,'<span class="tag">대외비 · 면접관 전용</span>')]
g.append('''
<div class="gbox">
  <div class="gh">1. 사용 방법</div>
  <div class="gb">
   <ol>
    <li>학생에게는 <b>평가 시트</b>만 배부한다. 이 질문지는 <b>배부하지 않는다.</b></li>
    <li>6개 평가영역별로 <b>1~10번 중 1문항</b>을 면접관이 랜덤으로 골라 질문한다. (학생 1명당 총 6문항)</li>
    <li>학생마다 다른 번호를 뽑아, 뒷 순번 학생이 앞 학생의 답을 그대로 외워 오는 것을 막는다.</li>
    <li>질문한 번호를 평가 시트의 <b>「출제번호」</b> 칸에 반드시 기록한다.</li>
    <li>질문은 <b>일본어로 그대로 읽는다.</b> 한국어 해석은 면접관 참고용이며 학생에게 말하지 않는다.</li>
    <li>학생이 못 알아들으면 <b>같은 문장을 한 번 더 천천히</b> 읽어준다. 바꿔 말하거나 쉬운 말로 풀어주지 않는다.
        재청취 요청 횟수는 평가 시트 하단 <b>「질문 재청취 횟수」</b>에 누계로 기록한다.</li>
    <li>답변 시간은 1문항당 <b>약 1분</b>. 침묵이 15초 이상 이어지면 다음 문항으로 넘어간다.</li>
   </ol>
  </div>
</div>

<div class="two">
 <div class="gbox">
  <div class="gh">2. 채점 기준 (0~5점 · 6항목 30점 만점)</div>
  <div class="gb" style="padding:2mm;">
   <table class="ctab">
    <tr><td class="p">5</td><td>질문을 즉시 이해하고 자연스럽게 답변 가능</td></tr>
    <tr><td class="p">4</td><td>질문을 이해하고 적절하게 답변 가능</td></tr>
    <tr><td class="p">3</td><td>대체로 이해하고 단순한 문장으로 답변</td></tr>
    <tr><td class="p">2</td><td>반복이 필요하거나 단어 중심으로 답변</td></tr>
    <tr><td class="p">1</td><td>질문의 일부만 이해, 매우 제한적으로 답변</td></tr>
    <tr><td class="p">0</td><td>질문을 이해하지 못하거나 답변 불가능</td></tr>
   </table>
  </div>
 </div>
 <div class="gbox">
  <div class="gh">3. 판정 및 유의사항</div>
  <div class="gb" style="padding:2mm;">
   <table class="ctab">
    <tr><td class="p">A</td><td>26~30점</td><td class="p">B</td><td>22~25점</td></tr>
    <tr><td class="p">C</td><td>18~21점</td><td class="p">D</td><td>17점 이하</td></tr>
   </table>
   <div style="margin-top:2mm; font-size:8.2pt; line-height:1.55;">
    · <b>5번(직장 커뮤니케이션)</b> 또는 <b>6번(현장 안전·보고)</b>이 0~1점이면 총점과 무관하게 별도 검토 대상으로 표기한다.<br>
    · 내용의 정답 여부가 아니라 <b>「듣고 이해했는가 / 일본어 문장으로 답했는가」</b>를 본다.<br>
    · 암기한 문장을 그대로 말하는지 판단이 서지 않으면 그 자리에서 같은 영역의 <b>다른 번호</b>를 한 번 더 물어보고, 두 번째 번호도 함께 기록한다.
   </div>
  </div>
 </div>
</div>

<div class="warn">
 <b>※ 발음·문법의 사소한 오류는 감점하지 않는다.</b> 네팔어 화자 특유의 억양은 평가 대상이 아니며,
 질문을 <b>듣고 이해했는지</b>와 <b>스스로 문장을 만들어 답했는지</b>가 판단 기준이다.
 특히 6번 영역은 「わかりません」「もう一度お願いします」처럼 <b>모르는 상황을 말로 표현할 수 있는지</b>를 긍정적으로 평가한다.
</div>
''')
g.append(RND)
g.append('</div>')
pages.append(''.join(g))

def cat_html(c):
    no, ko, jp, pt, qs = c
    rows = ''.join(
        f'<tr><td class="n">{i+1}</td><td><div class="q jp">{q}</div><div class="k">{k}</div></td></tr>'
        for i,(q,k) in enumerate(qs))
    return (f'<div class="cat"><div class="ch"><span class="n">{no}</span>'
            f'<span class="k">{ko}</span><span class="j jp">{jp}</span></div>'
            f'<div class="pt"><b>확인 포인트</b> &nbsp;{pt}</div>'
            f'<table>{rows}</table></div>')

for pi,(a,b) in enumerate([(0,1),(2,3),(4,5)]):
    p = ['<div class="page">', hd(pi+2, 4, '<span class="tag">대외비 · 면접관 전용</span>')]
    p.append(cat_html(CATS[a])); p.append(cat_html(CATS[b]))
    p.append('</div>')
    pages.append(''.join(p))

QUESTIONS_HTML = f'<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{"".join(pages)}</body></html>'


SHEET_HTML = (HERE / "sheet.template.html").read_text(encoding="utf-8").replace("{{LOGO}}", LOGO)
SHEET_NE_HTML = (HERE / "sheet.ne.template.html").read_text(encoding="utf-8").replace("{{LOGO}}", LOGO)
GUIDE_KO_HTML = guide.build("ko", LOGO)
GUIDE_NE_HTML = guide.build("ne", LOGO)

RENDER_JS = """
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const a of process.argv.slice(2)) {
    const i = a.lastIndexOf('::');
    const src = a.slice(0, i), out = a.slice(i + 2);
    await p.goto('file://' + src, { waitUntil: 'networkidle' });
    await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
    console.log('->', out);
  }
  await b.close();
})();
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", action="store_true", help="HTML만 생성하고 PDF 렌더는 건너뛴다")
    args = ap.parse_args()

    BUILD_DIR.mkdir(exist_ok=True)
    OUT_DIR.mkdir(exist_ok=True)

    pages = [
        ("sheet.html", SHEET_HTML, SHEET_PDF),
        ("sheet.ne.html", SHEET_NE_HTML, SHEET_NE_PDF),
        ("guide.ko.html", GUIDE_KO_HTML, GUIDE_KO_PDF),
        ("guide.ne.html", GUIDE_NE_HTML, GUIDE_NE_PDF),
        ("questions.html", QUESTIONS_HTML, QUEST_PDF),
    ]
    for name, html, _ in pages:
        (BUILD_DIR / name).write_text(html, encoding="utf-8")
        print(f"HTML  {BUILD_DIR / name}")

    if args.html:
        return 0

    if shutil.which("node") is None:
        print("node 를 찾을 수 없다. --html 로 생성한 뒤 브라우저에서 인쇄하라.", file=sys.stderr)
        return 1

    render_js = BUILD_DIR / "render.js"
    render_js.write_text(RENDER_JS, encoding="utf-8")
    cmd = ["node", str(render_js)] + [
        f"{BUILD_DIR / name}::{OUT_DIR / pdf}" for name, _, pdf in pages
    ]
    try:
        subprocess.run(cmd, check=True, cwd=ROOT)
    except subprocess.CalledProcessError:
        print("playwright(chromium) 렌더 실패. `npm i -D playwright && npx playwright install chromium` 후 재시도하라.",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
