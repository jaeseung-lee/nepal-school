import csv
from pathlib import Path

OUT = Path(__file__).parent
rows = [
    (1, 'SA190 クロス住之江公園1', '大阪府大阪市住之江区南加賀屋3-5', '스미노에구', '住之江公園駅 徒歩6分', '32명 정원', 'XROSS HOUSE', '베트남어지원;네팔어지원;미얀마어지원;공용거실', '세 대상 언어 지원 명시. 개별 건물번호는 공개되지 않아 방문 전 확인.', 'https://x-house.co.jp/sharehouse/osaka/city/osaka/xross-408/', '블록까지'),
    (2, 'BeGood なんば恵美須', '大阪府大阪市浪速区恵美須西2-6-22', '나니와구', '恵美須町駅 徒歩3分', '8실', 'BeGood Japan', '일본어학교학생;외국인환영;공용거실', '인근 일본어학교 학생 환영. J국제학원 안내자료에도 소개. 전단지 비치 가능 여부 확인.', 'https://kansai.hituji.jp/comret/info/osaka/osaka/be-good-namba-ebisu', '번지까지'),
    (3, 'コミューズ新大阪', '大阪府大阪市東淀川区西淡路5-1-1', '히가시요도가와구', '淡路駅 徒歩6分', '110실', '合同会社ホーマス', '학생기숙사;외국인입주;대형;상주관리인;식당', '식당·담화공간이 있는 학생기숙사 겸용. 국적별 실제 입주 규모 확인.', 'https://comuse-shinosaka.com/', '번지까지'),
    (4, 'J&Fハウス大阪', '大阪府大阪市平野区喜連西4-7-16', '히라노구', '喜連瓜破駅 徒歩約6分', '대형·총실수 재확인', '株式会社ジャフプラザ', '국제교류;외국인입주;대형라운지;상주관리인', '20개국 이상 주민 공동생활 안내. 총실수는 공개자료 간 차이가 있어 미확정. 대상 세 국적의 입주 비중 별도 확인.', 'https://jafplaza.com/share_item/jf-house-osaka/?lang=jp', '번지까지'),
    (5, 'J&Fハウス大阪Ⅱ', '大阪府大阪市西淀川区花川1-3-17', '니시요도가와구', '塚本駅 徒歩6分', '공식 소개 약50명 공동생활', '株式会社ジャフプラザ', '국제교류;외국인입주;대형라운지;옥상', '라운지·공용주방·옥상 보유. 주소는 요도가와구가 아니라 니시요도가와구.', 'https://jafplaza.com/share_item/jf-house-osaka-2/', '번지까지'),
    (6, 'SPACEGREEN Osaka-e', '大阪府大阪市東淀川区小松4-17-32', '히가시요도가와구', '瑞光四丁目駅 徒歩3分', '47실', '株式会社ECLL', '사회인;학생;외국인입주;키친라운지', '각 실에도 주방·욕실이 있는 셰어먼트 형태. 공용 키친라운지 이용률 확인.', 'https://spacegreen-osaka.jimdofree.com/', '번지까지'),
    (7, 'SA232 クロス玉出1', '大阪府大阪市住之江区粉浜2-14', '스미노에구', '粉浜駅 徒歩4分', '9명 정원', 'XROSS HOUSE', '베트남어지원;네팔어지원;미얀마어지원;공용거실', '세 대상 언어 지원 명시. 개별 건물번호는 공개되지 않아 방문 전 확인.', 'https://x-house.co.jp/sharehouse/osaka/city/osaka/xross-909/', '블록까지'),
    (8, 'SA200 クロス西九条1', '大阪府大阪市此花区梅香3-31', '고노하나구', '千鳥橋駅 徒歩3分', '7명 정원', 'XROSS HOUSE', '베트남어지원;네팔어지원;미얀마어지원;공용거실', '세 대상 언어 지원 명시. 개별 건물번호는 공개되지 않아 방문 전 확인.', 'https://x-house.co.jp/sharehouse/osaka/city/osaka/xross-418/', '블록까지'),
    (9, 'CRIB', '大阪府大阪市西成区太子1丁目', '니시나리구', '動物園前駅 徒歩1分', '22실', 'MAGICO', '외국인환영;저렴한임대료;정기식사회;옥상', '공용거실·옥상·정원. 상세 번지는 운영자에게 확인.', 'https://osakasharehouse.jp/crib', '초메까지'),
    (10, 'ONE WORLD 中川西Ⅱ', '大阪府大阪市生野区中川西2-13-21', '이쿠노구', '今里駅 徒歩12分', '14실', 'GLOBAL CONNECTION', '외국인비중공개;국제교류;공용거실;옥상', '운영사가 주민 절반 이상이 외국인이라고 소개. 실제 대상 세 국적 비중 별도 확인.', 'https://www.global-con.co.jp/?plan=oneworld-nakagawa-nishi-2', '번지까지'),
    (11, 'ONE WORLD 中川西Ⅲ', '大阪府大阪市生野区中川西2-14-4', '이쿠노구', '今里駅 徒歩12分', '14실·여성전용', 'GLOBAL CONNECTION', '여성전용;다국적입주;공용거실', '여러 국적 여성의 공동생활. IV와 공개 주소가 같으므로 현장 동·출입구 구분 확인.', 'https://www.global-con.co.jp/?plan=oneworld-nakagawa-nishi-3', '번지까지·동구분확인'),
    (12, 'ONE WORLD 中川西Ⅳ', '大阪府大阪市生野区中川西2-14-4', '이쿠노구', '今里駅 徒歩12分', '10실', 'GLOBAL CONNECTION', '외국인환영;남녀공용;주변하우스교류', '공용거실·주변 셰어하우스 교류. III와 공개 주소가 같으므로 현장 동·출입구 구분 확인.', 'https://www.sharehouse180.net/houses/oneworld-nakagawanishi-4/', '번지까지·동구분확인'),
    (13, 'C’s share 鶴橋', '大阪府大阪市天王寺区東上町2-2', '덴노지구', '鶴橋駅 徒歩2分', '21실·여성전용', '株式会社フロンティア', '여성전용;학생;직장인;외국인가능;대형공용공간', '20~30대 직장인·학생 대상. 약60㎡ 공용공간. 국적별 입주 비중 별도 확인.', 'https://sharehouse.jpn.com/tsuruhashi-2/', '번지까지'),
    (14, 'C’s share なんば2 大国町', '大阪府大阪市浪速区敷津西1丁目', '나니와구', '大国町駅 徒歩6分', '10명·여성전용', '株式会社フロンティア', '여성전용;유학생;일본어학교인근;공용다이닝', '일본어학교·해외 유학생 수요를 공식 소개. 상세 번지는 운영자 확인.', 'https://sharehouse.jpn.com/namba2-2/', '초메까지'),
    (15, '住吉大社前シェアハウス', '大阪府大阪市住之江区浜口東', '스미노에구', '住吉大社駅 徒歩4分', '8실', '株式会社アドミリ', '외국인비중공개;저렴한임대료;장기거주;공용거실', '운영사가 외국인 비중40% 게시. 비율의 현재성과 상세 번지는 확인 필요.', 'https://guesthouse-kikuya.com/sharehouse/sumiyoshitaishamae/', '동까지만'),
    (16, 'The Maison リバージュ桜ノ宮', '大阪府大阪市都島区中野町', '미야코지마구', '桜ノ宮駅 徒歩3分', '18명 정원', '株式会社フロンティア', '남녀공용;외국인가능;라운지;작업공간;다목적실', '국적별 실제 입주 규모와 상세 번지는 운영자 확인.', 'https://sharehouse.jpn.com/sakuranomiya-2/', '동까지만'),
    (17, 'MASH', '大阪府大阪市生野区生野東4-1-40', '이쿠노구', '寺田町駅 徒歩14分', '11실', 'ちいさな建築研究所', '외국인환영;공용라운지;코워킹;이벤트공간', '주택 주소4-1-40과 운영사 주소4-1-41을 구분. 공용공간 비치·설명회 협의 후보.', 'https://kansai.hituji.jp/comret/info/osaka/osaka/mash', '번지까지'),
    (18, 'ARTdoor’s', '大阪府大阪市西淀川区姫島2丁目', '니시요도가와구', '姫島駅 徒歩6分', '12실', 'art p', '외국인환영;6개월이상;저렴한임대료;아틀리에', '넓은 거실·주방·아틀리에. 상세 번지는 운영자 확인.', 'https://kansai.hituji.jp/comret/info/osaka/osaka/artdoors', '초메까지'),
    (19, 'International Sharehouse Alley', '大阪府大阪市生野区桃谷1-11-3', '이쿠노구', '桃谷駅 徒歩約3分', '7실', '株式会社マチアケ', '외국인환영;3개월이상;공용거실;교류행사', '2025년11월 개장 안내. 넓은 거실·교류행사 운영.', 'https://share-share.jp/house/detail/6823/', '번지까지'),
    (20, 'ECHO HOUSE', '大阪府大阪市西成区花園北1丁目', '니시나리구', '新今宮駅 徒歩5分', '여성전용·다인실운영', 'ECHO HOUSE', '여성전용;외국인생활지원;다인실;운영확인필요', '공식 사이트는 열려 있으나 게시 정보가 오래된 부분이 있음. 운영현황·상세 주소부터 확인.', 'https://www.echo-house-osaka.com/ja', '초메까지'),
]

headers = ['이름','지도검색','주소','지역','가까운역','규모','우선순위','태그','접촉상태','전단지상태','국적확인','방문일','배포수량','운영사','출처','공개주소수준','메모','조사일']
OUT.mkdir(parents=True, exist_ok=True)
with (OUT / 'osaka-sharehouses-20.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f)
    w.writerow(headers)
    for n,name,address,ward,station,size,operator,tags,note,url,precision in rows:
        priority='A 최우선' if n<=8 else ('C 운영확인' if n==20 else 'B 우선')
        w.writerow([f'{n:02d} {name}',f'{name}, {address}, 日本',address,ward,station,size,priority,tags,'미접촉','미승인','국적별입주미확인','미정',0,operator,url,precision,note,'2026-10-25'])
assert len(rows)==20 and len({r[1] for r in rows})==20
print(OUT / 'osaka-sharehouses-20.csv')
print('20 records, 18 columns; priorities A=8 B=11 C=1')
