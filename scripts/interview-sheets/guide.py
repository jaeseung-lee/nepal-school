# -*- coding: utf-8 -*-
# 면접 진행 안내문(학생 배부용) 생성기. build.py 에서 import 해서 쓴다.

T = {
 'title':   {'ko':'일본어 면접 진행 안내', 'ja':'日本語面接の流れ・ご案内',
             'ne':'जापानी भाषा अन्तर्वार्ता प्रक्रिया निर्देशिका'},
 'sub':     'Japanese Interview — Guide for Candidates',
 'foryou':  {'ko':'면접을 보는 학생용 / 面接を受ける方へ', 'ja':'面接を受ける方へ',
             'ne':'अन्तर्वार्ता दिने विद्यार्थीका लागि / 面接を受ける方へ'},

 's1': {'ko':'면접 개요', 'ja':'面接について', 'ne':'अन्तर्वार्ताबारे'},
 's1items': [
   ({'ko':'일본어 회화 능력을 확인하는 면접입니다.',
     'ja':'日本語の会話力を確認する面接です。',
     'ne':'यो जापानी भाषामा कुराकानी गर्ने क्षमता जाँच्ने अन्तर्वार्ता हो।'}),
   ({'ko':'6개 분야에서 각 1문항, 총 6문항을 묻습니다.',
     'ja':'6つの分野から1問ずつ、合計6問を質問します。',
     'ne':'६ वटा क्षेत्रबाट एक-एक प्रश्न, जम्मा ६ प्रश्न सोधिन्छ।'}),
   ({'ko':'1인당 약 10분, 면접관과 1:1로 진행합니다.',
     'ja':'1人約10分、面接官と1対1で行います。',
     'ne':'प्रति व्यक्ति करिब १० मिनेट, अन्तर्वार्ताकर्तासँग एक्लै हुन्छ।'}),
   ({'ko':'질문과 답변은 모두 일본어로 합니다.',
     'ja':'質問も回答もすべて日本語です。',
     'ne':'प्रश्न र जवाफ दुवै जापानी भाषामा हुन्छ।'}),
 ],

 's2': {'ko':'진행 순서', 'ja':'当日の流れ', 'ne':'अन्तर्वार्ताको क्रम'},
 's2items': [
   ({'ko':'접수 · 평가시트 수령','ja':'受付・評価シートを受け取る','ne':'दर्ता・मूल्याङ्कन फारम लिने'},
    {'ko':'면접 시작 전에 평가시트를 1장 받습니다.',
     'ja':'面接の前に評価シートを1枚受け取ります。',
     'ne':'अन्तर्वार्ता सुरु हुनुअघि मूल्याङ्कन फारम एक प्रति लिनुहोस्।'}),
   ({'ko':'이름 · 면접번호 기입','ja':'氏名・面接番号を書く','ne':'नाम・अन्तर्वार्ता नम्बर लेख्ने'},
    {'ko':'시트 맨 위에 본인 이름과 면접 순번을 적습니다. 그 외에는 아무것도 쓰지 않습니다.',
     'ja':'シートの一番上に自分の氏名と面接番号を書きます。ほかは何も書きません。',
     'ne':'फारमको सबैभन्दा माथि आफ्नो नाम र अन्तर्वार्ता नम्बर लेख्नुहोस्। अरू केही नलेख्नुहोस्।'}),
   ({'ko':'대기','ja':'待機','ne':'पर्खने'},
    {'ko':'본인 번호가 불리면 시트를 가지고 면접실에 들어갑니다.',
     'ja':'自分の番号が呼ばれたら、シートを持って面接室に入ります。',
     'ne':'आफ्नो नम्बर बोलाइएपछि फारम लिएर अन्तर्वार्ता कोठामा जानुहोस्।'}),
   ({'ko':'면접','ja':'面接','ne':'अन्तर्वार्ता'},
    {'ko':'인사 후 시트를 면접관에게 건네고, 6개 질문에 답합니다. 한 문항당 약 1분입니다.',
     'ja':'あいさつをしてシートを面接官に渡し、6つの質問に答えます。1問あたり約1分です。',
     'ne':'अभिवादन गरेर फारम अन्तर्वार्ताकर्तालाई दिनुहोस्, अनि ६ प्रश्नको जवाफ दिनुहोस्। एक प्रश्नमा करिब १ मिनेट।'}),
   ({'ko':'종료','ja':'終了','ne':'समाप्ति'},
    {'ko':'인사하고 나옵니다. 시트는 면접관이 그대로 보관합니다.',
     'ja':'あいさつをして退室します。シートは面接官が預かります。',
     'ne':'अभिवादन गरेर बाहिर निस्कनुहोस्। फारम अन्तर्वार्ताकर्ताले राख्छन्।'}),
 ],

 's3': {'ko':'평가 방법', 'ja':'評価のしかた', 'ne':'मूल्याङ्कन कसरी हुन्छ'},
 'areas': [
   {'ko':'자기소개 · 기본회화','ja':'自己紹介・基本会話','ne':'आफ्नो परिचय・आधारभूत कुराकानी'},
   {'ko':'일본어 학습 · 일본 이해','ja':'日本語学習・日本理解','ne':'जापानी भाषा अध्ययन・जापानको बुझाइ'},
   {'ko':'취업동기 · 장래계획','ja':'就労動機・将来計画','ne':'काम गर्ने कारण・भविष्यको योजना'},
   {'ko':'일상생활 · 문제해결','ja':'日常生活・問題解決','ne':'दैनिक जीवन・समस्या समाधान'},
   {'ko':'직장 커뮤니케이션 · 지시 이해','ja':'職場コミュニケーション・指示理解','ne':'कार्यस्थल संवाद・निर्देशन बुझाइ'},
   {'ko':'현장 안전 · 보고','ja':'現場の安全・報告','ne':'कार्यस्थलको सुरक्षा・रिपोर्टिङ'},
 ],
 'score':  {'ko':'각 영역 5점 · 합계 30점 만점','ja':'各領域5点・合計30点満点','ne':'प्रत्येक क्षेत्र ५ अङ्क・जम्मा ३० अङ्क'},
 'grade':  {'ko':'등급','ja':'判定','ne':'ग्रेड'},
 'point':  {'ko':'정답을 맞히는 시험이 아닙니다. 질문을 듣고 이해했는지, 일본어 문장으로 답했는지를 봅니다.',
            'ja':'正解を当てる試験ではありません。質問を聞いて理解できたか、日本語の文で答えられたかを見ます。',
            'ne':'यो सही उत्तर खोज्ने परीक्षा होइन। प्रश्न सुनेर बुझ्नुभयो कि भएन र जापानी वाक्यमा जवाफ दिन सक्नुभयो कि भएन, त्यही हेरिन्छ।'},

 's4': {'ko':'면접 중 알아둘 것', 'ja':'面接中に覚えておくこと', 'ne':'अन्तर्वार्ताको बेला ध्यान दिने कुरा'},
 's4items': [
   {'ko':'못 들었으면 「もう一度お願いします」. 한 번 더 천천히 읽어 줍니다. (요청 횟수는 기록됩니다)',
    'ja':'聞き取れなかったら「もう一度お願いします」。もう一度ゆっくり読みます。回数は記録されます。',
    'ne':'सुन्न सक्नुभएन भने「もう一度お願いします」भन्नुहोस्। फेरि बिस्तारै पढिदिन्छन्। कति पटक सोध्नुभयो, नोट गरिन्छ।'},
   {'ko':'모르면 「わかりません」이라고 말해도 됩니다. 가만히 있는 것보다 낫습니다.',
    'ja':'わからないときは「わかりません」と言って構いません。黙っているよりよいです。',
    'ne':'थाहा नभए「わかりません」भन्न सक्नुहुन्छ। चुप लागेर बस्नुभन्दा राम्रो हो।'},
   {'ko':'발음이 완벽하지 않아도 감점하지 않습니다.',
    'ja':'発音が完璧でなくても減点しません。',
    'ne':'उच्चारण पूर्ण नभए पनि अङ्क घटाइँदैन।'},
   {'ko':'단어 하나보다, 짧아도 문장으로 답하는 쪽이 점수가 높습니다.',
    'ja':'単語1つより、短くても文で答えるほうが点数は高くなります。',
    'ne':'एउटा शब्द भन्नुभन्दा छोटो भए पनि वाक्यमा जवाफ दिँदा अङ्क बढी आउँछ।'},
 ],

 's5': {'ko':'주의사항', 'ja':'注意事項', 'ne':'सावधानी'},
 's5items': [
   {'ko':'학생마다 다른 번호의 질문이 나옵니다. 앞 순번 학생에게 묻지 마세요.',
    'ja':'学生ごとに違う番号の質問が出ます。前の人に質問の内容を聞かないでください。',
    'ne':'हरेक विद्यार्थीलाई फरक नम्बरको प्रश्न सोधिन्छ। अगाडिका साथीलाई प्रश्न के थियो भनी नसोध्नुहोस्।'},
   {'ko':'통째로 외운 답변은 추가 질문에서 드러납니다. 자기 말로 준비하세요.',
    'ja':'丸暗記した答えは追加の質問で分かります。自分のことばで準備してください。',
    'ne':'घोकेर आएको जवाफ थप प्रश्नमा थाहा हुन्छ। आफ्नै शब्दमा तयारी गर्नुहोस्।'},
   {'ko':'휴대전화는 전원을 끄고 대기실에 둡니다.',
    'ja':'携帯電話は電源を切って待機室に置いてください。',
    'ne':'मोबाइल बन्द गरेर प्रतीक्षा कक्षमा राख्नुहोस्।'},
   {'ko':'평가시트를 접거나 시트에 낙서하지 마세요.',
    'ja':'評価シートを折ったり、書き込んだりしないでください。',
    'ne':'मूल्याङ्कन फारम नमोड्नुहोस्, त्यसमा केही नलेख्नुहोस्।'},
 ],

 's6': {'ko':'면접에서 쓰는 인사', 'ja':'面接で使うあいさつ', 'ne':'अन्तर्वार्तामा प्रयोग हुने अभिवादन'},
 's6items': [
   ('失礼します',        {'ko':'입실할 때','ja':'入室のとき','ne':'भित्र पस्दा'}),
   ('よろしくお願いします', {'ko':'면접 시작할 때','ja':'面接の始め','ne':'सुरु गर्दा'}),
   ('ありがとうございました',{'ko':'면접 끝났을 때','ja':'面接の終わり','ne':'सकिँदा'}),
   ('失礼しました',      {'ko':'퇴실할 때','ja':'退室のとき','ne':'बाहिर निस्कँदा'}),
 ],
}

def build(primary, LOGO):
    P = primary                      # 'ko' or 'ne'
    pc = 'ko' if P == 'ko' else 'ne' # css class for primary script
    def p(d): return f'<span class="{pc}">{d[P]}</span>'
    def j(d): return f'<span class="ja">{d["ja"]}</span>'

    s1 = ''.join(f'<li>{p(i)}<span class="j2">{i["ja"]}</span></li>' for i in T['s1items'])

    s2 = ''.join(
        f'<div class="step"><div class="num">{n+1}</div><div class="sbody">'
        f'<div class="sh">{p(h)}<span class="j2 inl">{h["ja"]}</span></div>'
        f'<div class="sd">{p(d)}<span class="j2">{d["ja"]}</span></div></div></div>'
        for n,(h,d) in enumerate(T['s2items']))

    areas = ''.join(
        f'<tr><td class="an">{n+1}</td><td>{p(a)}<span class="j2">{a["ja"]}</span></td></tr>'
        for n,a in enumerate(T['areas']))

    s4 = ''.join(f'<li>{p(i)}<span class="j2">{i["ja"]}</span></li>' for i in T['s4items'])
    s5 = ''.join(f'<li>{p(i)}<span class="j2">{i["ja"]}</span></li>' for i in T['s5items'])
    s6 = ''.join(
        f'<div class="ph"><div class="pj ja">{ph}</div><div class="pk">{d[P]}</div></div>'
        for ph,d in T['s6items'])

    # 데바나가리는 글자 높이가 커서 같은 pt 에서도 행이 두꺼워진다.
    # 네팔어판만 한 단계 조여 A4 1 페이지에 맞춘다.
    tune = '' if P == 'ko' else '''
body { font-size:8.8pt; }
.ne { line-height:1.2; }
.sh { font-size:9pt; }
.sd { font-size:8.1pt; }
ul.b li { margin-bottom:.9mm; }
table.ar td { font-size:8.1pt; padding:.7mm 0; }
.hd h1 { font-size:15pt; }
'''

    return f'''<!DOCTYPE html>
<html lang="{P}"><head><meta charset="utf-8"><style>
@page {{ size:A4 portrait; margin:9mm 11mm 8mm; }}
* {{ box-sizing:border-box; margin:0; padding:0; }}
body {{ font-family:"Noto Sans CJK KR","Noto Sans CJK JP",sans-serif; color:#000; font-size:9.2pt; line-height:1.3; }}
.ja {{ font-family:"Noto Sans CJK JP","Noto Sans CJK KR",sans-serif; }}
.ne {{ font-family:"Noto Sans Devanagari","Kohinoor Devanagari","Devanagari Sangam MN",sans-serif; }}
.ko {{ font-family:"Noto Sans CJK KR",sans-serif; }}
.j2 {{ display:block; font-family:"Noto Sans CJK JP","Noto Sans CJK KR",sans-serif;
      font-size:7.3pt; color:#333; line-height:1.26; margin-top:.25mm; }}
.j2.inl {{ display:inline; font-size:8.2pt; margin-left:2.5mm; font-weight:500; }}

.hd {{ display:flex; align-items:center; border-bottom:2.2pt solid #000; padding-bottom:1.5mm; margin-bottom:2.4mm; }}
.hd .logo {{ width:27mm; flex:0 0 27mm; }}
.hd .pad {{ width:27mm; flex:0 0 27mm; }}
.hd .tt {{ flex:1; text-align:center; }}
.hd h1 {{ font-size:15.5pt; font-weight:800; letter-spacing:.03em; }}
.hd .jt {{ font-size:9pt; margin-top:.4mm; }}
.hd .sb {{ font-size:7pt; color:#444; margin-top:.3mm; letter-spacing:.05em; }}
.hd .fy {{ font-size:7.2pt; margin-top:.5mm; }}

.sec {{ border:1.6pt solid #000; margin-bottom:2mm; }}
.sec > h2 {{ background:#000; color:#fff; font-size:8.8pt; font-weight:700; padding:.9mm 2.5mm; }}
.sec > h2 .j2 {{ display:inline; color:#ccc; font-size:8pt; font-weight:500; margin-left:2.5mm; }}
.sec .in {{ padding:1.5mm 2.6mm; }}

ul.b {{ list-style:none; }}
ul.b li {{ position:relative; padding-left:3.2mm; margin-bottom:1.1mm; }}
ul.b li:last-child {{ margin-bottom:0; }}
ul.b li::before {{ content:"·"; position:absolute; left:.8mm; font-weight:800; }}
.grid2 {{ display:grid; grid-template-columns:1fr 1fr; gap:1.1mm 4mm; }}
.grid2 li {{ margin-bottom:0; }}

.step {{ display:flex; gap:2.2mm; padding:.9mm 0; border-bottom:.6pt solid #ccc; }}
.step:last-child {{ border-bottom:none; }}
.num {{ flex:0 0 5.6mm; height:5.6mm; border-radius:50%; background:#000; color:#fff;
       font-size:8.6pt; font-weight:800; text-align:center; line-height:5.6mm; }}
.sbody {{ flex:1; }}
.sh {{ font-size:9.4pt; font-weight:700; }}
.sd {{ font-size:8.4pt; margin-top:.3mm; }}

.cols {{ display:flex; gap:2.4mm; align-items:flex-start; }}
.cols > div {{ flex:1; }}
.cols .sec {{ margin-bottom:2mm; }}

table.ar {{ border-collapse:collapse; width:100%; }}
table.ar td {{ border-bottom:.6pt solid #ccc; padding:.8mm 0; font-size:8.4pt; vertical-align:top; }}
table.ar tr:last-child td {{ border-bottom:none; }}
td.an {{ width:5.5mm; font-weight:800; text-align:center; }}
.scline {{ border-top:1pt solid #000; margin-top:1.2mm; padding-top:1.2mm; font-size:8.6pt; font-weight:700; }}
.gr {{ font-size:8pt; margin-top:.8mm; font-weight:400; }}
.gr b {{ font-weight:800; }}
.pt {{ background:#efefef; border-top:1pt solid #000; padding:1.3mm 2.6mm; font-size:8.1pt; }}

.ph {{ flex:1; border-right:.8pt solid #000; padding:1.1mm 2mm; text-align:center; }}
.ph:last-child {{ border-right:none; }}
.pj {{ font-size:9.4pt; font-weight:700; }}
.pk {{ font-size:7.3pt; color:#333; margin-top:.3mm; }}
{tune}
</style></head><body>

<div class="hd">
  <img class="logo" src="{LOGO}" alt="JW HRDI">
  <div class="tt">
    <h1 class="{pc}">{T['title'][P]}</h1>
    <div class="jt ja">{T['title']['ja']}</div>
    <div class="sb">{T['sub']}</div>
    <div class="fy {pc}">{T['foryou'][P]}</div>
  </div>
  <div class="pad"></div>
</div>

<div class="sec"><h2 class="{pc}">{T['s1'][P]}<span class="j2 ja">{T['s1']['ja']}</span></h2>
  <div class="in"><ul class="b grid2">{s1}</ul></div></div>

<div class="sec"><h2 class="{pc}">{T['s2'][P]}<span class="j2 ja">{T['s2']['ja']}</span></h2>
  <div class="in" style="padding-top:.5mm; padding-bottom:.5mm;">{s2}</div></div>

<div class="cols">
  <div>
    <div class="sec"><h2 class="{pc}">{T['s3'][P]}<span class="j2 ja">{T['s3']['ja']}</span></h2>
      <div class="in">
        <table class="ar">{areas}</table>
        <div class="scline {pc}">{T['score'][P]}<span class="j2">{T['score']['ja']}</span></div>
        <div class="gr"><b>{T['grade'][P]} / {T['grade']['ja']}</b>　
          A : 26–30　·　B : 22–25　·　C : 18–21　·　D : ≤17</div>
      </div>
      <div class="pt {pc}">{T['point'][P]}<span class="j2">{T['point']['ja']}</span></div>
    </div>
  </div>
  <div>
    <div class="sec"><h2 class="{pc}">{T['s4'][P]}<span class="j2 ja">{T['s4']['ja']}</span></h2>
      <div class="in"><ul class="b">{s4}</ul></div></div>
    <div class="sec"><h2 class="{pc}">{T['s5'][P]}<span class="j2 ja">{T['s5']['ja']}</span></h2>
      <div class="in"><ul class="b">{s5}</ul></div></div>
  </div>
</div>

<div class="sec" style="margin-bottom:0;">
  <h2 class="{pc}">{T['s6'][P]}<span class="j2 ja">{T['s6']['ja']}</span></h2>
  <div style="display:flex;">{s6}</div>
</div>

</body></html>'''

if __name__ == "__main__":
    import pathlib
    logo = pathlib.Path("logo_uri.txt").read_text()
    for lang, name in (("ko", "guide_ko.html"), ("ne", "guide_ne.html")):
        pathlib.Path(name).write_text(build(lang, logo), encoding="utf-8")
        print("written", name)
