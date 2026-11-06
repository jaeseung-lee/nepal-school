(async () => {
function createAutoLayout(direction) {
 const node=figma.createFrame();
 node.layoutMode=direction;
 node.primaryAxisSizingMode="AUTO";
 node.counterAxisSizingMode="AUTO";
 return node;
}
const page = await figma.getNodeByIdAsync("0:1");
await figma.setCurrentPageAsync(page);
const frameName = "08-student-admission-system";
if (page.children.some(n => n.name === frameName)) throw new Error("Target frame already exists; inspect it before retrying.");
await Promise.all(["Regular", "Medium", "Bold"].map(style => figma.loadFontAsync({family:"Noto Sans KR", style})));
const variables = await figma.variables.getLocalVariablesAsync();
const byName = Object.fromEntries(variables.map(v => [v.name, v]));
const colors = {paper:"#F7F4EE", "paper-soft":"#FCFAF5", surface:"#FFFFFF", ink:"#181A1F", muted:"#686B73", line:"#DED8CC", cobalt:"#174EA6", "cobalt-soft":"#E8EFFB", "cobalt-ink":"#0C2E68", clay:"#A85B38"};
const rgb = hex => ({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
const paint = key => figma.variables.setBoundVariableForPaint({type:"SOLID",color:rgb(colors[key])},"color",byName["color/"+key]);
const created = [];
const record = node => {created.push(node.id);return node;};
function container(parent, name, direction, width, height, options={}) {
  const node = record(createAutoLayout(direction));
  node.name = name;
  parent.appendChild(node);
  node.resize(width,height);
  node.layoutSizingHorizontal = "FIXED";
  node.layoutSizingVertical = options.hug ? "HUG" : "FIXED";
  node.primaryAxisSizingMode = options.hug ? "AUTO" : "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.primaryAxisAlignItems = options.align || "MIN";
  node.counterAxisAlignItems = options.cross || "MIN";
  node.itemSpacing = options.gap || 0;
  const pad = options.padding || 0;
  node.paddingLeft = node.paddingRight = node.paddingTop = node.paddingBottom = pad;
  node.fills = options.fill ? [paint(options.fill)] : [];
  node.clipsContent = false;
  if (options.round) {node.cornerRadius=24;node.setBoundVariable("cornerRadius",byName["layout/radius-24"]);}
  if (options.stroke) {node.strokes=[paint("line")];node.strokeWeight=1;}
  if (options.gap === 24) node.setBoundVariable("itemSpacing",byName["layout/gap-24"]);
  return node;
}
function text(parent, name, content, width, size, weight="Regular", color="ink", align="LEFT") {
  const node = record(figma.createText());
  node.name = name;
  node.fontName={family:"Noto Sans KR",style:weight};
  node.fontSize=size;
  node.lineHeight={unit:"PERCENT",value:135};
  node.characters=content;
  node.textAutoResize="HEIGHT";
  node.textAlignHorizontal=align;
  node.fills=[paint(color)];
  node.resize(width,node.height);
  parent.appendChild(node);
  node.layoutSizingHorizontal="FIXED";
  return node;
}
function stage(parent, number, title, detail, width, height, color) {
  const card=container(parent,number+" · "+title,"VERTICAL",width,height,{padding:20,gap:8,fill:"surface",round:true,stroke:true});
  if(number) text(card,"순서",number,width-40,20,"Bold",color);
  text(card,"단계명",title,width-40,28,"Bold",color);
  if(detail) text(card,"확인 내용",detail,width-40,24,"Regular","ink");
  return card;
}
function localRect(node,parent) {
  const n=node.absoluteBoundingBox,p=parent.absoluteBoundingBox;
  return {x:n.x-p.x,y:n.y-p.y,w:n.width,h:n.height};
}
function arrow(parent,name,points,color) {
  const tip=points[points.length-1],prev=points[points.length-2];
  const dx=tip[0]-prev[0],dy=tip[1]-prev[1],len=Math.sqrt(dx*dx+dy*dy);
  const ux=dx/len,uy=dy/len;
  const heads=[[tip[0]-ux*9-uy*5,tip[1]-uy*9+ux*5],[tip[0]-ux*9+uy*5,tip[1]-uy*9-ux*5]];
  const all=[...points,...heads];
  const minX=Math.min(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1]));
  const point=p=>(p[0]-minX).toFixed(2)+" "+(p[1]-minY).toFixed(2);
  const data="M "+point(points[0])+points.slice(1).map(p=>" L "+point(p)).join("")+" M "+point(heads[0])+" L "+point(tip)+" L "+point(heads[1]);
  const vector=record(figma.createVector());
  vector.name=name;parent.appendChild(vector);vector.layoutPositioning="ABSOLUTE";
  vector.vectorPaths=[{windingRule:"NONZERO",data}];
  vector.fills=[];vector.strokes=[paint(color)];vector.strokeWeight=3;vector.strokeCap="ROUND";vector.strokeJoin="ROUND";
  vector.x=minX;vector.y=minY;
  return vector;
}
function horizontalArrow(parent,left,right,name,color) {
  const a=localRect(left,parent),b=localRect(right,parent);
  return arrow(parent,name,[[a.x+a.w+8,a.y+a.h/2],[b.x-8,b.y+b.h/2]],color);
}
const priorBounds=page.children.map(n=>({id:n.id,name:n.name,x:n.x,y:n.y,width:n.width,height:n.height}));
const root=container(page,frameName,"VERTICAL",1180,100,{hug:true,padding:32,gap:24,fill:"paper"});
root.x=Math.max(...priorBounds.map(n=>n.x+n.width))+160;root.y=160;

text(root,"도해 제목","외국인 유학생 도입·취업 연계 체계",1116,40,"Bold","cobalt-ink");
const overseas=container(root,"해외 현지 · 모집 및 준비교육","VERTICAL",1116,100,{hug:true,padding:24,gap:24,fill:"paper-soft",round:true,stroke:true});
const oHeader=container(overseas,"해외 과정 제목","HORIZONTAL",1068,38,{gap:24,cross:"CENTER"});
text(oHeader,"영역명","해외 현지 · 모집 및 준비교육",620,28,"Bold","clay");
text(oHeader,"모집 범위","모집 국가·기관은 대학과 협의",424,20,"Regular","muted","RIGHT");
const overseasFlow=container(overseas,"해외 준비 5단계","VERTICAL",1068,100,{hug:true,gap:56});
const upper=container(overseasFlow,"상단 3단계","HORIZONTAL",1068,224,{gap:36});
const s1=stage(upper,"01","모집·신청 접수","지원서·학력 자료\n대학 기준 확인",332,224,"clay");
const s2=stage(upper,"02","면접·선발","학업 목적·한국어\n재정 계획 확인",332,224,"clay");
const s3=stage(upper,"03","준비교육",null,332,224,"clay");
const tracks=container(s3,"병행 준비교육","HORIZONTAL",292,84,{gap:12});
for (const [name,label] of [["한국어 교육","한국어\n교육"],["기술 교육","용접·취부\n교육"]]) {
  const track=container(tracks,name,"VERTICAL",140,84,{padding:8,fill:"paper-soft",round:true,align:"CENTER",cross:"CENTER"});
  text(track,"교육 분야",label,124,22,"Medium","ink","CENTER");
}
const lower=container(overseasFlow,"하단 2단계","HORIZONTAL",1068,192,{gap:36,align:"CENTER"});
const s4=stage(lower,"04","이수·기량 확인","한국어 평가·수료 기록\n용접 기량·자격 확인",332,192,"clay");
const s5=stage(lower,"05","대학 추천","학생별 준비 자료\n대학 심사에 인계",332,192,"clay");
horizontalArrow(overseasFlow,s1,s2,"01 → 02","clay");
horizontalArrow(overseasFlow,s2,s3,"02 → 03","clay");
const a=localRect(s3,overseasFlow),b=localRect(s4,overseasFlow),turn=a.y+a.h+28;
arrow(overseasFlow,"03 → 04",[[a.x+a.w/2,a.y+a.h+8],[a.x+a.w/2,turn],[b.x+b.w/2,turn],[b.x+b.w/2,b.y-8]],"clay");
horizontalArrow(overseasFlow,s4,s5,"04 → 05","clay");
const transition=container(root,"해외 준비 → 국내 대학","VERTICAL",1116,40);
arrow(transition,"국내 대학 과정 연결",[[558,2],[558,38]],"cobalt");
const domestic=container(root,"국내 대학 · 학업과 취업 연계","VERTICAL",1116,100,{hug:true,padding:24,gap:24,fill:"cobalt-soft",round:true,stroke:true});
const dHeader=container(domestic,"국내 과정 제목","HORIZONTAL",1068,38,{gap:24,cross:"CENTER"});
text(dHeader,"영역명","국내 대학 · 학업과 취업 연계",620,28,"Bold","cobalt");
text(dHeader,"관련 전공","조선·기계·뿌리산업 관련 학과",424,20,"Regular","muted","RIGHT");
const dRow=container(domestic,"국내 대학 4단계","HORIZONTAL",1068,200,{gap:36});
const domesticStages=[
  ["대학 입학","대학 심사·허가\n입학·등록"],
  ["학업·현장활동","전공·학업 우선\n허용 활동·절차 확인"],
  ["졸업·채용 검토","학위·직무 확인\n기업 면접·계약"],
  ["체류 심사·취업","E-7 등 요건 검토\n허가 후 근무 개시"]
].map(([title,detail])=>stage(dRow,"",title,detail,240,200,"cobalt-ink"));
for(let i=0;i<domesticStages.length-1;i++)horizontalArrow(dRow,domesticStages[i],domesticStages[i+1],"국내 "+(i+1)+" → "+(i+2),"cobalt");
text(root,"결정 주체","입학은 대학, 채용은 기업, 체류허가는 출입국관서가 결정합니다.",1116,22,"Medium","muted");

figma.currentPage.selection=[root];
figma.viewport.scrollAndZoomIntoView([root]);
const textNodes=root.findAllWithCriteria({types:["TEXT"]});
const overflow=textNodes.filter(t=>t.x<0||t.y<0||t.x+t.width>t.parent.width+0.5||t.y+t.height>t.parent.height+0.5).map(t=>({id:t.id,name:t.name,text:t.characters,bounds:{x:t.x,y:t.y,w:t.width,h:t.height},parent:{w:t.parent.width,h:t.parent.height}}));
const validation={frame:{id:root.id,name:root.name,x:root.x,y:root.y,width:root.width,height:root.height},createdNodeIds:created,mutatedNodeIds:[],priorFrameIds:priorBounds.map(n=>n.id),foreignRows:[upper,lower].map(r=>r.children.filter(n=>n.type==="FRAME").map(n=>({id:n.id,name:n.name,x:n.x,y:n.y,width:n.width,height:n.height}))),domesticRow:domesticStages.map(n=>({id:n.id,name:n.name,x:n.x,y:n.y,width:n.width,height:n.height})),textCount:textNodes.length,texts:textNodes.map(t=>({id:t.id,text:t.characters,size:t.fontSize})),arrowCount:root.findAllWithCriteria({types:["VECTOR"]}).length,overflow};
const png = await root.exportAsync({format:"PNG",constraint:{type:"SCALE",value:2}});
const svg = await root.exportAsync({format:"SVG",svgOutlineText:false,svgIdAttribute:true});
figma.showUI(__html__, {width:500,height:390});
figma.ui.postMessage({type:"result",validation,png:Array.from(png),svg:Array.from(svg)});

})().catch(error => {figma.showUI(__html__,{width:500,height:390});figma.ui.postMessage({type:"error",message:String(error)});});
