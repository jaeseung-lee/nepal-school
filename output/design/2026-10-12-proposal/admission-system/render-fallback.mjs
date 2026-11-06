import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Local alternative to build.js; no Figma or Google Docs calls.
// SVG text stays editable. The primary font matches build.js;
// a locally installed company font supplies the raster preview fallback.
const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../../../..');
const require = createRequire(path.join(repository, 'company/package.json'));
const sharp = require('sharp');
const C = {
  paper: '#F7F4EE', paperSoft: '#FCFAF5', surface: '#FFFFFF',
  ink: '#181A1F', muted: '#686B73', line: '#DED8CC',
  cobalt: '#174EA6', cobaltSoft: '#E8EFFB', cobaltInk: '#0C2E68', clay: '#A85B38',
};
const width = 1180, height = 1176;
const parts = [];
const recordedText = [];
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const number = value => Number(value.toFixed(2));
function rect(id, x, y, w, h, fill, radius = 0, border = false) {
  parts.push(`<rect id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"${border ? ` stroke="${C.line}" stroke-width="1"` : ''}/>`);
}
function text(id, value, x, top, size, weight = 400, color = C.ink, anchor = 'start') {
  const lines = value.split('\n');
  recordedText.push(value);
  const spans = lines.map((line, index) => `<tspan x="${x}" y="${number(top + size * 1.08 + index * size * 1.35)}">${escape(line)}</tspan>`).join('');
  parts.push(`<text id="${id}" font-family="Noto Sans KR, Pretendard, Apple SD Gothic Neo, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${spans}</text>`);
}
function arrow(id, points, color) {
  const tip = points.at(-1), previous = points.at(-2);
  const dx = tip[0] - previous[0], dy = tip[1] - previous[1];
  const length = Math.hypot(dx, dy), ux = dx / length, uy = dy / length;
  const left = [tip[0] - ux * 9 - uy * 5, tip[1] - uy * 9 + ux * 5];
  const right = [tip[0] - ux * 9 + uy * 5, tip[1] - uy * 9 - ux * 5];
  const xy = p => p.map(number).join(' ');
  const data = `M ${xy(points[0])}${points.slice(1).map(p => ` L ${xy(p)}`).join('')} M ${xy(left)} L ${xy(tip)} L ${xy(right)}`;
  parts.push(`<path id="${id}" d="${data}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
}
function card(id, x, y, w, h, sequence, title, detail, color) {
  parts.push(`<g id="${id}">`);
  rect(`${id}-card`, x, y, w, h, C.surface, 24, true);
  let next = y + 20;
  if (sequence) { text(`${id}-sequence`, sequence, x + 20, next, 20, 700, color); next += 35; }
  text(`${id}-title`, title, x + 20, next, 28, 700, color);
  next += 45.8;
  if (detail) text(`${id}-detail`, detail, x + 20, next, 24, 400, C.ink);
  parts.push('</g>');
}

rect('canvas', 0, 0, width, height, C.paper);
text('diagram-title', '외국인 유학생 도입·취업 연계 체계', 32, 32, 40, 700, C.cobaltInk);

parts.push('<g id="overseas">');
rect('overseas-panel', 32, 110, 1116, 582, C.paperSoft, 24, true);
text('overseas-title', '해외 현지 · 모집 및 준비교육', 56, 134, 28, 700, C.clay);
text('overseas-scope', '모집 국가·기관은 대학과 협의', 1124, 143, 20, 400, C.muted, 'end');
card('overseas-01', 56, 196, 332, 224, '01', '모집·신청 접수', '지원서·학력 자료\n대학 기준 확인', C.clay);
card('overseas-02', 424, 196, 332, 224, '02', '면접·선발', '학업 목적·한국어\n재정 계획 확인', C.clay);
card('overseas-03', 792, 196, 332, 224, '03', '준비교육', null, C.clay);
rect('korean-track-card', 812, 296.8, 140, 84, C.paperSoft, 24);
rect('technical-track-card', 964, 296.8, 140, 84, C.paperSoft, 24);
text('korean-track-label', '한국어\n교육', 882, 309.1, 22, 500, C.ink, 'middle');
text('technical-track-label', '용접·취부\n교육', 1034, 309.1, 22, 500, C.ink, 'middle');
card('overseas-04', 240, 476, 332, 192, '04', '이수·기량 확인', '한국어 평가·수료 기록\n용접 기량·자격 확인', C.clay);
card('overseas-05', 608, 476, 332, 192, '05', '대학 추천', '학생별 준비 자료\n대학 심사에 인계', C.clay);
arrow('overseas-01-to-02', [[396, 308], [416, 308]], C.clay);
arrow('overseas-02-to-03', [[764, 308], [784, 308]], C.clay);
arrow('overseas-03-to-04', [[958, 428], [958, 448], [406, 448], [406, 468]], C.clay);
arrow('overseas-04-to-05', [[580, 572], [600, 572]], C.clay);
parts.push('</g>');

arrow('overseas-to-domestic', [[590, 718], [590, 754]], C.cobalt);
parts.push('<g id="domestic">');
rect('domestic-panel', 32, 780, 1116, 310, C.cobaltSoft, 24, true);
text('domestic-title', '국내 대학 · 학업과 취업 연계', 56, 804, 28, 700, C.cobalt);
text('domestic-disciplines', '조선·기계·뿌리산업 관련 학과', 1124, 813, 20, 400, C.muted, 'end');
const domestic = [
  ['대학 입학', '대학 심사·허가\n입학·등록'],
  ['학업·현장활동', '전공·학업 우선\n허용 활동·절차 확인'],
  ['졸업·채용 검토', '학위·직무 확인\n기업 면접·계약'],
  ['체류 심사·취업', 'E-7 등 요건 검토\n허가 후 근무 개시'],
];
domestic.forEach(([title, detail], index) => card(`domestic-0${index + 1}`, 56 + index * 276, 866, 240, 200, null, title, detail, C.cobaltInk));
for (let index = 0; index < 3; index++) {
  const right = 56 + index * 276 + 240;
  arrow(`domestic-0${index + 1}-to-0${index + 2}`, [[right + 8, 966], [right + 28, 966]], C.cobalt);
}
parts.push('</g>');
text('decision-authorities', '입학은 대학, 채용은 기업, 체류허가는 출입국관서가 결정합니다.', 32, 1114, 22, 500, C.muted);

const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="svg-title svg-desc">\n<title id="svg-title">외국인 유학생 도입·취업 연계 체계</title>\n<desc id="svg-desc">build.js의 동일 문구와 회사 팔레트. 해외 현지 다섯 단계는 3+2 배치, 국내 대학 네 단계는 가로 배치. 아이콘 없이 벡터 화살표를 사용하며 모든 본문은 편집 가능한 텍스트입니다.</desc>\n${parts.join('\n')}\n</svg>\n`;

// Safety check: every visible text string must already occur in build.js.
const source = await fs.readFile(path.join(directory, 'build.js'), 'utf8');
for (const value of recordedText) {
  if (!source.includes(JSON.stringify(value))) throw new Error(`Text differs from build.js: ${value}`);
}
const svgPath = path.join(directory, 'fallback.svg');
const pngPath = path.join(directory, 'fallback.png');
await fs.writeFile(svgPath, svg, { flag: 'wx' });
try {
  await fs.access(pngPath);
  throw new Error('fallback.png already exists; inspect it before replacing it.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await sharp(Buffer.from(svg), { density: 144 }).png().toFile(pngPath);
console.log(JSON.stringify({ svgPath, pngPath, svgSize: { width, height }, pngSize: { width: width * 2, height: height * 2 }, textNodes: recordedText.length, arrows: 8, overseasRows: [3, 2], domesticStages: 4, editableText: true }, null, 2));
