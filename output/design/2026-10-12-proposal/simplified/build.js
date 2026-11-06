const page=await figma.getNodeByIdAsync("0:1");
await figma.setCurrentPageAsync(page);
const specs=[
{id:"2:16",name:"01-service-flow",rows:[["모집·선발","준비교육","입학 준비"],["재학 지원","진로·기업 연계"]],widths:[356,356]},
{id:"2:83",name:"02-selection-check",rows:[["학력·서류","한국어"],["재정 계획","전공 적합성"]],widths:[546,546]},
{id:"2:125",name:"03-preparation-cycle",rows:[["진단","목표 협의","수업·실습"],["평가","보완"]],widths:[356,356]},
{id:"2:191",name:"04-student-support",rows:[["징후 확인","학생 상담","대학 협의"],["지원 연결","개선 확인"]],widths:[356,356]},
{id:"2:252",name:"05-role-map",rows:[["대학","기업","출입국관서"],["정우인재개발원","현지기관"]],widths:[356,356]},
{id:"2:297",name:"06-cost-refund",rows:[["필수비용","선택비용","제3자 비용"],["사유 확인","제공 내역 확인"],["규정·계약 검토","정산·처리안 안내"]],widths:[356,546,546]},
{id:"2:343",name:"07-residence-review",rows:[["D-2 · 재학","D-10 · 구직"],["E-7 · 취업","F-2-R · 지역특화"]],widths:[546,546]}
];
const frames=await Promise.all(specs.map(s=>figma.getNodeByIdAsync(s.id)));
const fonts=new Map();
for(const f of frames)for(const t of f.findAllWithCriteria({types:["TEXT"]}))for(const seg of t.getStyledTextSegments(["fontName"]))fonts.set(JSON.stringify(seg.fontName),seg.fontName);
await Promise.all([...fonts.values()].map(font=>figma.loadFontAsync(font)));
await figma.loadFontAsync({family:"Noto Sans KR",style:"Bold"});
const vars=await figma.variables.getLocalVariablesAsync();
const byName=Object.fromEntries(vars.map(v=>[v.name,v]));
const palette={paper:"#F7F4EE",surface:"#FFFFFF",ink:"#181A1F",line:"#DED8CC",cobalt:"#174EA6","cobalt-soft":"#E8EFFB","cobalt-ink":"#0C2E68"};
const rgb=hex=>({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
const paint=key=>figma.variables.setBoundVariableForPaint({type:"SOLID",color:rgb(palette[key])},"color",byName["color/"+key]);
const created=[],mutated=[],removed=[];
const register=n=>{created.push(n.id);return n;};
for(let i=0;i<frames.length;i++){
 const f=frames[i],spec=specs[i];
 for(const c of [...f.children]){removed.push(c.id,...("findAll" in c?c.findAll(()=>true).map(n=>n.id):[]));c.remove();}
 f.layoutMode="VERTICAL";f.resize(1180,100);f.layoutSizingHorizontal="FIXED";f.layoutSizingVertical="HUG";f.primaryAxisSizingMode="AUTO";f.counterAxisSizingMode="FIXED";
 f.paddingLeft=f.paddingRight=f.paddingTop=f.paddingBottom=32;f.itemSpacing=24;f.setBoundVariable("itemSpacing",byName["layout/gap-24"]);
 f.fills=[paint("paper")];f.clipsContent=false;mutated.push(f.id);
 for(let rowIndex=0;rowIndex<spec.rows.length;rowIndex++){
  const labels=spec.rows[rowIndex],w=spec.widths[rowIndex];
  const row=register(figma.createAutoLayout("HORIZONTAL"));row.name="핵심 항목 / "+(rowIndex+1);
  f.appendChild(row);row.resize(1116,128);row.layoutSizingHorizontal="FIXED";row.layoutSizingVertical="FIXED";row.primaryAxisSizingMode="FIXED";row.counterAxisSizingMode="FIXED";row.primaryAxisAlignItems="CENTER";row.counterAxisAlignItems="CENTER";
  row.itemSpacing=24;row.setBoundVariable("itemSpacing",byName["layout/gap-24"]);row.fills=[];row.clipsContent=false;
  for(const label of labels){
   const card=register(figma.createAutoLayout("VERTICAL"));card.name=label;row.appendChild(card);
   card.resize(w,128);card.layoutSizingHorizontal="FIXED";card.layoutSizingVertical="FIXED";card.primaryAxisSizingMode="FIXED";card.counterAxisSizingMode="FIXED";card.primaryAxisAlignItems="CENTER";card.counterAxisAlignItems="CENTER";
   card.paddingLeft=card.paddingRight=card.paddingTop=card.paddingBottom=24;card.itemSpacing=0;card.cornerRadius=24;card.setBoundVariable("cornerRadius",byName["layout/radius-24"]);
   card.fills=[paint("surface")];card.strokes=[paint("line")];card.strokeWeight=1;card.clipsContent=false;
   const t=register(figma.createText());t.name=label;t.fontName={family:"Noto Sans KR",style:"Bold"};t.fontSize=36;t.lineHeight={unit:"PERCENT",value:135};t.characters=label;t.textAutoResize="HEIGHT";t.textAlignHorizontal="CENTER";t.fills=[paint("cobalt-ink")];t.resize(w-48,t.height);card.appendChild(t);t.layoutSizingHorizontal="FIXED";
  }
 }
}
const validations=frames.map(f=>({id:f.id,name:f.name,width:f.width,height:f.height,texts:f.findAllWithCriteria({types:["TEXT"]}).map(t=>t.characters),rows:f.children.map(r=>r.children.filter(n=>n.type==="FRAME").map(c=>({id:c.id,label:c.name,x:c.x,y:c.y,width:c.width,height:c.height}))),vectors:f.findAllWithCriteria({types:["VECTOR"]}).length,overflow:f.findAllWithCriteria({types:["TEXT"]}).filter(t=>t.x<0||t.y<0||t.x+t.width>t.parent.width+0.5||t.y+t.height>t.parent.height+0.5).map(t=>t.id)}));
for(const f of frames.slice(0,5))figma.io.write(f.name+".png",await f.exportAsync({format:"PNG",constraint:{type:"SCALE",value:2}}));
return {createdNodeIds:created,mutatedNodeIds:mutated,removedNodeIds:removed,frames:validations};
