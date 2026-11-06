const page = await figma.getNodeByIdAsync("0:1");
await figma.setCurrentPageAsync(page);
if (page.children.some(n => /^0[1-7]-/.test(n.name))) throw new Error("Proposal frames already exist; inspect before retry.");
await Promise.all(["Regular","Medium","Bold"].map(style => figma.loadFontAsync({family:"Noto Sans KR",style})));
const created=[], mutated=[page.id], frames=[], variableIds=[];
page.name="대학 협력 제안서";
const palette={paper:"#F7F4EE","paper-soft":"#FCFAF5",surface:"#FFFFFF",ink:"#181A1F",muted:"#686B73",line:"#DED8CC",cobalt:"#174EA6","cobalt-soft":"#E8EFFB","cobalt-ink":"#0C2E68",clay:"#A85B38"};
const rgb=hex=>({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
const collection=figma.variables.createVariableCollection("정우 · globals.css");
const mode=collection.modes[0].modeId, variables={};
for(const [name,hex] of Object.entries(palette)){
 const v=figma.variables.createVariable("color/"+name,collection,"COLOR");
 v.scopes=["FRAME_FILL","SHAPE_FILL","TEXT_FILL","STROKE_COLOR"];v.setValueForMode(mode,rgb(hex));v.setVariableCodeSyntax("WEB","var(--color-"+name+")");
 variables[name]=v;variableIds.push(v.id);
}
for(const [name,val,scopes,syntax] of [["gap-16",16,["GAP"],"16px"],["gap-24",24,["GAP"],"24px"],["radius-24",24,["CORNER_RADIUS"],"24px"]]){
 const v=figma.variables.createVariable("layout/"+name,collection,"FLOAT");v.scopes=scopes;v.setValueForMode(mode,val);v.setVariableCodeSyntax("WEB",syntax);variables[name]=v;variableIds.push(v.id);
}
const paint=name=>figma.variables.setBoundVariableForPaint({type:"SOLID",color:rgb(palette[name])},"color",variables[name]);
function reg(n){created.push(n.id);return n;}
function auto(parent,name,dir,w,gap=16,pad=0,bg=null){
 const n=reg(figma.createAutoLayout(dir,{name,itemSpacing:gap}));
 n.resize(w,10);n.counterAxisSizingMode="FIXED";n.primaryAxisSizingMode="AUTO";
 n.layoutSizingHorizontal="FIXED";n.layoutSizingVertical="HUG";
 n.paddingLeft=n.paddingRight=n.paddingTop=n.paddingBottom=pad;
 n.fills=bg?[paint(bg)]:[];n.clipsContent=false;
 if(gap===16||gap===24)n.setBoundVariable("itemSpacing",variables["gap-"+gap]);
 if(parent)parent.appendChild(n);
 return n;
}
function text(parent,str,w,size=22,color="ink",style="Regular",align="LEFT"){
 const n=reg(figma.createText());n.name=str.replace(/\n/g," · ");
 n.fontName={family:"Noto Sans KR",style};n.fontSize=size;n.lineHeight={unit:"PERCENT",value:135};
 n.characters=str;n.fills=[paint(color)];n.textAutoResize="HEIGHT";n.textAlignHorizontal=align;
 n.resize(w,n.height);if(parent)parent.appendChild(n);n.layoutSizingHorizontal="FIXED";
 return n;
}
const paths={
 people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5.65"/>',
 book:'<path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1v15"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 12h8M8 16h8"/>',
 check:'<rect x="4" y="3" width="16" height="19" rx="2"/><path d="M9 3V1h6v2M8 13l3 3 5-6"/>',
 chat:'<path d="M21 11a8 8 0 0 1-8 8H7l-5 3v-6a9 9 0 0 1-1-5 10 10 0 0 1 20 0zM6 10h12M6 14h7"/>',
 briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V3h8v4M2 12c5 4 15 4 20 0M12 12v4"/>',
 bank:'<path d="M2 9l10-7 10 7H2M4 10v10M9 10v10M15 10v10M20 10v10M2 22h20"/>',
 shield:'<path d="M12 2l9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6zM8 12l3 3 5-6"/>',
 wallet:'<path d="M21 8V5H4a2 2 0 0 1 0-4h15v4M2 3v17a2 2 0 0 0 2 2h17V8zM21 12h-6v6h6"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c-6 6-6 14 0 20 6-6 6-14 0-20"/>',
 arrow:'<path d="M3 12h18M14 5l7 7-7 7"/>',
 loop:'<path d="M3 10V4h6M3 4a9 9 0 1 1-1 10"/>'
};
function icon(parent,key,size=48,bg=true){
 const wrap=auto(parent,"Icon / "+key,"HORIZONTAL",size,0,0,bg?"cobalt-soft":null);
 wrap.resize(size,size);wrap.primaryAxisSizingMode="FIXED";wrap.layoutSizingVertical="FIXED";
 wrap.counterAxisAlignItems="CENTER";wrap.primaryAxisAlignItems="CENTER";wrap.cornerRadius=16;
 const n=figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="'+palette.cobalt+'" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+paths[key]+'</svg>');
 reg(n);for(const c of n.findAll(()=>true))created.push(c.id);
 n.name=key;n.resize(bg?32:size,bg?32:size);wrap.appendChild(n);
 for(const c of n.findAll(()=>true)){if("strokes" in c&&c.strokes.length)c.strokes=[paint("cobalt")];}
 return wrap;
}
function card(parent,title,desc,w,key,num=null,height=264,bg="surface"){
 const n=auto(parent,title,"VERTICAL",w,16,24,bg);
 n.strokes=[paint("line")];n.strokeWeight=1;n.cornerRadius=24;n.setBoundVariable("cornerRadius",variables["radius-24"]);
 n.resize(w,height);n.primaryAxisSizingMode="FIXED";n.layoutSizingVertical="FIXED";
 const top=auto(n,"Card header","HORIZONTAL",w-48,16);
 top.counterAxisAlignItems="CENTER";top.primaryAxisAlignItems="SPACE_BETWEEN";icon(top,key);
 if(num!==null)text(top,String(num).padStart(2,"0"),40,22,"cobalt","Medium","RIGHT");
 text(n,title,w-48,24,"ink","Bold");text(n,desc,w-48,22,"muted");
 return n;
}
function bar(parent,label,w=1116,key=null,bg="cobalt-soft",size=24){
 const n=auto(parent,"Summary / "+label,"HORIZONTAL",w,16,16,bg);n.cornerRadius=16;n.counterAxisAlignItems="CENTER";
 if(key)icon(n,key,32,false);
 text(n,label,w-32-(key?48:0),size,"cobalt-ink","Medium");return n;
}
function stageRow(parent,items,w=1116,height=264,cardWidth=184){
 const row=auto(parent,"Process stages","HORIZONTAL",w,8);row.counterAxisAlignItems="CENTER";
 row.primaryAxisAlignItems="CENTER";
 items.forEach((it,i)=>{if(i)icon(row,"arrow",28,false);card(row,it[0],it[1],cardWidth,it[2],i+1,height);});return row;
}
function start(name,title,subtitle){
 const f=auto(page,name,"VERTICAL",1180,24,32,"paper");
 const ordinal=frames.length;f.x=160+(ordinal%2)*1300;f.y=160+Math.floor(ordinal/2)*820;
 f.cornerRadius=0;const head=auto(f,"Heading","VERTICAL",1116,8);text(head,title,1116,40,"ink","Bold");text(head,subtitle,1116,22,"muted");
 frames.push(f);return f;
}
let f=start("01-service-flow","대학 협력의 단계별 흐름","모집부터 학업 적응과 진로 연계까지, 대학과 협의하여 운영합니다.");
stageRow(f,[["모집·선발","대학 기준\n확인","people"],["준비교육","한국어·\n전공 기초","book"],["입학 준비","서류·일정\n인계","file"],["재학 지원","학업·생활\n상담","chat"],["진로·기업\n연계","직무·체류\n요건 확인","briefcase"]]);
const decisions=auto(f,"Decision rights","HORIZONTAL",1116,16);
for(const [a,b] of [["입학 결정","대학"],["채용 결정","기업"],["체류허가","출입국관서"]])bar(decisions,a+" · "+b,361.3,null,"surface",22);
text(f,"운영 범위와 일정은 협약으로 확정합니다.",1116,22,"cobalt-ink","Medium");

f=start("02-selection-check","지원자 사전 확인","확인 결과와 보완 이력을 정리하여 대학 심사에 인계합니다.");
const sr=auto(f,"Four checks","HORIZONTAL",1116,16);
[["학력·서류","원본·신원 대조","file"],["한국어","대학 기준 확인","book"],["재정 계획","증빙·부담액 확인","wallet"],["전공 적합성","학업계획 면담","target"]].forEach(it=>card(sr,it[0],it[1],267,it[2],null,224));
bar(f,"점검표·보완 이력  →  대학 심사",1116,"check");
text(f,"최종 입학 결정은 대학이 담당합니다.",1116,22,"cobalt-ink","Medium");

f=start("03-preparation-cycle","준비교육 운영 과정","한국어와 전공 기초를 함께 준비하고 평가 결과를 수업에 반영합니다.");
stageRow(f,[["진단","현재 수준\n확인","target"],["목표 협의","학습 목표\n설정","chat"],["수업·실습","한국어·\n전공 기초","book"],["평가","성과와 보완\n사항 확인","check"],["보완","추가 학습·\n수업 조정","loop"]]);
bar(f,"평가·보완 결과를 진단과 수업·실습에 반영",1116,"loop");
text(f,"교육기간·시수는 대학과 협의합니다.",1116,22,"cobalt-ink","Medium");

f=start("04-student-support","학업 적응을 위한 지원 과정","학업·생활의 어려움을 조기에 확인하고 필요한 지원을 연결합니다.");
stageRow(f,[["징후 확인","출결·과제·\n성적","check"],["학생 상담","언어·수업·\n생활","chat"],["대학 협의","원인과\n대응 방향","bank"],["지원 연결","보충학습·\n상담","book"],["개선 확인","기록과\n후속 조치","loop"]]);
const sn=auto(f,"Support conditions","VERTICAL",1116,8);
text(sn,"학사 결정은 대학의 기준을 따릅니다.",1116,22,"cobalt-ink","Medium");
text(sn,"필요한 정보는 동의와 업무 범위에 따라 공유합니다.",1116,22,"muted");

f=start("05-role-map","기관별 역할과 결정권","협약에서 수행자·확인자·결정자를 정합니다.");
text(f,"결정 권한",1116,24,"cobalt-ink","Bold");
const dr=auto(f,"Decision authorities","HORIZONTAL",1116,16);
[["대학","입학·학사 결정","bank"],["기업","직무·근로조건·채용","briefcase"],["출입국관서","체류자격 심사·허가","shield"]].forEach(it=>card(dr,it[0],it[1],361.3,it[2],null,224));
text(f,"지원·수행 업무",1116,24,"cobalt-ink","Bold");
const ar=auto(f,"Support providers","HORIZONTAL",1116,16);
[["정우인재개발원","자료 취합·일정 관리·보고","file"],["현지기관","상담·교육·평가 기록","book"]].forEach(it=>card(ar,it[0],it[1],550,it[2],null,208));
text(f,"정우는 입학·채용·체류허가를 대신 결정하지 않습니다.",1116,22,"cobalt-ink","Medium");

f=start("06-cost-refund","비용 확인과 환불 검토","비용의 성격과 제공 내역을 확인하고 규정·계약에 따라 검토합니다.");
const cr=auto(f,"Cost categories","HORIZONTAL",1116,16);
[["필수비용","등록·운영에 필요한 항목","file"],["선택비용","선택한 서비스의 항목","check"],["제3자 비용","외부기관에 지급하는 항목","wallet"]].forEach(it=>card(cr,it[0],it[1],361.3,it[2],null,224));
const rr=auto(f,"Review sequence","HORIZONTAL",1116,8);rr.counterAxisAlignItems="CENTER";rr.primaryAxisAlignItems="CENTER";
["사유 확인","제공 내역 확인","규정·계약 검토","정산·처리안 안내"].forEach((label,i)=>{if(i)icon(rr,"arrow",28,false);bar(rr,label,244,null,"cobalt-soft",22);});
text(f,"금액·환불률·기한은 견적과 계약으로 확정합니다.",1116,22,"cobalt-ink","Medium");

f=start("07-residence-review","체류자격별 별도 확인","학생별 요건과 관할 출입국관서의 심사를 확인합니다.");
const matrix=auto(f,"Independent status cards","VERTICAL",1116,16);
for(const pairs of [
 [["D-2 · 재학","학업 중심 · 활동 허가 확인","book"],["D-10 · 구직","구직·인턴 조건 확인","target"]],
 [["E-7 · 취업","직종·기업·계약 확인","briefcase"],["F-2-R · 지역특화","지역 추천·거주·소득 확인","globe"]]
]){const row=auto(matrix,"Independent statuses","HORIZONTAL",1116,16);for(const it of pairs)card(row,it[0],it[1],550,it[2],null,208);}
bar(f,"자동 전환이 아닙니다. 체류자격마다 별도로 확인합니다.",1116,"shield");
text(f,"세부 적용 기준은 부록 A를 참조합니다.",1116,22,"muted");

const diagnostics=frames.map(n=>({id:n.id,name:n.name,width:n.width,height:n.height,textCount:n.findAllWithCriteria({types:["TEXT"]}).length,vectorCount:n.findAllWithCriteria({types:["VECTOR"]}).length,clipped:n.findAllWithCriteria({types:["TEXT"]}).filter(t=>t.width<=0||t.height<=0).map(t=>t.id)}));
for(const n of frames){
 figma.io.write(n.name+".png",await n.exportAsync({format:"PNG",constraint:{type:"SCALE",value:2}}));
 figma.io.write(n.name+".svg",await n.exportAsync({format:"SVG",svgOutlineText:false,svgIdAttribute:true}));
}
figma.viewport.scrollAndZoomIntoView(frames);
return {createdNodeIds:created,mutatedNodeIds:mutated,collectionId:collection.id,variableIds,frames:diagnostics,fontFamily:"Noto Sans KR",cssSource:"company/app/globals.css",nativeText:true};
