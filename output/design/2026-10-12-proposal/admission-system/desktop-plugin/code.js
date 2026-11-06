(async () => {
const page=await figma.getNodeByIdAsync("0:1");
await figma.setCurrentPageAsync(page);
const root=await figma.getNodeByIdAsync("9:2");
const body=await figma.getNodeByIdAsync("9:51");
await Promise.all(body.getStyledTextSegments(["fontName"]).map(seg=>figma.loadFontAsync(seg.fontName)));
body.characters="전공·학업 우선\n허가·신고 확인";
const textNodes=root.findAllWithCriteria({types:["TEXT"]});
const validation={frame:{id:root.id,name:root.name,x:root.x,y:root.y,width:root.width,height:root.height},createdNodeIds:[],mutatedNodeIds:[body.id],textCount:textNodes.length,texts:textNodes.map(t=>({id:t.id,text:t.characters,size:t.fontSize,width:t.width,height:t.height})),arrowCount:root.findAllWithCriteria({types:["VECTOR"]}).length,overflow:textNodes.filter(t=>t.x<0||t.y<0||t.x+t.width>t.parent.width+0.5||t.y+t.height>t.parent.height+0.5).map(t=>t.id)};
figma.currentPage.selection=[root];
figma.viewport.scrollAndZoomIntoView([root]);
const png=await root.exportAsync({format:"PNG",constraint:{type:"SCALE",value:2}});
const svg=await root.exportAsync({format:"SVG",svgOutlineText:false,svgIdAttribute:true});
figma.showUI(__html__, {width:500,height:390});
figma.ui.postMessage({type:"result",validation,png:Array.from(png),svg:Array.from(svg)});

})().catch(error=>{figma.showUI(__html__,{width:500,height:390});figma.ui.postMessage({type:"error",message:String(error)});});
