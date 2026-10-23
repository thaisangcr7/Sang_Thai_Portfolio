const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const specs = require('./specs');
const OUT = process.argv[2];
const only = process.argv[3];
const F = p => 'file://' + path.join(__dirname, 'node_modules/@fontsource', p);

const KIND = {
  src:   { c: '#475569', bg: '#F1F5F9', n: 'Source' },
  proc:  { c: '#4F46E5', bg: '#EEF0FF', n: 'Process' },
  ai:    { c: '#E04E72', bg: '#FFF0F4', n: 'AI / model' },
  store: { c: '#0F766E', bg: '#E8F7F5', n: 'Storage' },
  out:   { c: '#D86D2E', bg: '#FFF3EA', n: 'Output' },
  guard: { c: '#15803D', bg: '#EBF8EF', n: 'Check / guardrail' },
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function html(spec, mode) {
  const W = mode === 'desktop' ? 1200 : 720;
  const cols = mode === 'desktop' ? 3 : 1;
  const used = new Set();
  spec.stages.forEach(st => st.nodes.forEach(n => used.add(n.k)));
  (spec.rails || []).forEach(r => used.add(r.k));
  const node = n => `<div class="node" style="--c:${KIND[n.k].c};--bg:${KIND[n.k].bg}"><b>${esc(n.t)}</b><span>${esc(n.s)}</span></div>`;
  const stages = spec.stages.map((st, i) => `
    <div class="stage" data-i="${i}">
      <div class="lab"><em>${String(i + 1).padStart(2, '0')}</em>${esc(st.label)}</div>
      <div class="nodes ${st.nodes.length > 1 ? 'multi' : ''}">${st.nodes.map(node).join('')}</div>
    </div>`).join('');
  const rails = (spec.rails || []).map(r => `<div class="rail" style="--c:${KIND[r.k].c};--bg:${KIND[r.k].bg}"><b>${esc(r.t)}</b><span>${esc(r.s)}</span></div>`).join('');
  const metrics = (spec.metrics || []).map(m => `<div class="m"><b>${esc(m[0])}</b><span>${esc(m[1])}</span></div>`).join('');
  const legend = [...used].map(k => `<span><i style="background:${KIND[k].c}"></i>${KIND[k].n}</span>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:PJ;src:url(${F('plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff2')});font-weight:500}
@font-face{font-family:PJ;src:url(${F('plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2')});font-weight:700}
@font-face{font-family:PJ;src:url(${F('plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2')});font-weight:800}
@font-face{font-family:DM;src:url(${F('dm-mono/files/dm-mono-latin-400-normal.woff2')});font-weight:400}
@font-face{font-family:DM;src:url(${F('dm-mono/files/dm-mono-latin-500-normal.woff2')});font-weight:500}
*{box-sizing:border-box;margin:0;padding:0}
body{width:${W}px;background:#fff;font-family:PJ,sans-serif;color:#0F0E17}
.wrap{position:relative;padding:${mode === 'desktop' ? '44px 48px 40px' : '40px 36px 36px'};
  background:radial-gradient(circle at 1px 1px,rgba(15,14,23,.09) 1px,transparent 0) 0 0/22px 22px,#FCFBFF}
.top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:34px;flex-wrap:wrap}
.k{font-family:DM;font-size:${mode === 'desktop' ? 19 : 20}px;letter-spacing:.08em;text-transform:uppercase;color:#E04E72;margin-bottom:8px}
h1{font-size:${mode === 'desktop' ? 46 : 48}px;font-weight:800;letter-spacing:-.03em;line-height:1.05}
h1 small{display:block;font-size:${mode === 'desktop' ? 22 : 24}px;font-weight:500;color:#45425C;letter-spacing:0;margin-top:8px}
.legend{display:flex;flex-wrap:wrap;gap:8px 16px;font-family:DM;font-size:17px;color:#45425C;max-width:${mode === 'desktop' ? 520 : 640}px;justify-content:${mode === 'desktop' ? 'flex-end' : 'flex-start'}}
.legend i{display:inline-block;width:13px;height:13px;border-radius:4px;margin-right:7px;vertical-align:-1px}
.grid{position:relative;display:grid;grid-template-columns:repeat(${cols},1fr);column-gap:${mode === 'desktop' ? 64 : 0}px;row-gap:${mode === 'desktop' ? 70 : 44}px;align-items:start}
.stage{position:relative;z-index:1;background:#fff;border:2px solid #E4E1F0;border-radius:22px;padding:${mode === 'desktop' ? '18px' : '14px 14px 14px'};box-shadow:0 2px 0 rgba(15,14,23,.04),0 10px 30px rgba(15,14,23,.05)}
.lab{font-family:DM;font-weight:500;font-size:${mode === 'desktop' ? 18 : 20}px;letter-spacing:.07em;text-transform:uppercase;color:#45425C;margin-bottom:${mode === 'desktop' ? 12 : 9}px}
.lab em{font-style:normal;color:#fff;background:#0F0E17;border-radius:8px;padding:2px 9px;margin-right:10px}
.nodes{display:grid;gap:12px}
${mode === 'mobile' ? '.nodes.multi{grid-template-columns:1fr 1fr}' : ''}
.node{background:var(--bg);border:2px solid var(--c);border-left-width:9px;border-radius:15px;padding:13px 15px}
.node b{display:block;font-size:${mode === 'desktop' ? 26 : 29}px;font-weight:700;letter-spacing:-.015em;line-height:1.15;color:#0F0E17}
.node span{display:block;font-family:DM;font-size:${mode === 'desktop' ? 18 : 20}px;line-height:1.35;color:#45425C;margin-top:5px}
svg.links{position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:visible}
.rails{display:grid;gap:12px;margin-top:${mode === 'desktop' ? 40 : 34}px}
.rails::before{content:'Always on';font-family:DM;font-weight:500;font-size:18px;letter-spacing:.08em;text-transform:uppercase;color:#45425C}
.rail{display:flex;gap:16px;align-items:baseline;background:var(--bg);border:2px dashed var(--c);border-radius:14px;padding:12px 18px;${mode === 'mobile' ? 'flex-direction:column;gap:3px' : ''}}
.rail b{font-size:${mode === 'desktop' ? 23 : 27}px;font-weight:700;white-space:nowrap;color:var(--c)}
.rail span{font-family:DM;font-size:${mode === 'desktop' ? 19 : 20}px;color:#2E2B42;line-height:1.35}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:40px}
.m{background:#0F0E17;color:#fff;border-radius:16px;padding:16px 18px}
.m b{display:block;font-size:${mode === 'desktop' ? 34 : 30}px;font-weight:800;letter-spacing:-.02em;background:linear-gradient(135deg,#FF7AA5,#FFA066);-webkit-background-clip:text;color:transparent}
.m span{font-family:DM;font-size:17px;color:#C9C6DE;text-transform:uppercase;letter-spacing:.06em;line-height:1.3;display:block;margin-top:4px}
.note{font-family:DM;font-size:17px;color:#45425C;margin-top:18px}
.foot{display:flex;justify-content:space-between;margin-top:24px;font-family:DM;font-size:16px;color:#8B89A8}
</style></head><body><div class="wrap">
  <div class="top"><div><div class="k">Architecture · how it works</div><h1>${esc(spec.name)}<small>${esc(spec.kicker)}</small></h1></div><div class="legend">${legend}</div></div>
  <div class="grid" id="g"><svg class="links" id="s"></svg>${stages}</div>
  ${rails ? `<div class="rails">${rails}</div>` : ''}
  ${metrics ? `<div class="metrics">${metrics}</div>` : ''}
  ${spec.note ? `<div class="note">${esc(spec.note)}</div>` : ''}
  <div class="foot"><span>sangthai.dev</span><span>Sang Thai</span></div>
</div>
<script>
const g=document.getElementById('g'),s=document.getElementById('s'),R=g.getBoundingClientRect();
const st=[...g.querySelectorAll('.stage')].map(e=>{const r=e.getBoundingClientRect();return{x:r.left-R.left,y:r.top-R.top,w:r.width,h:r.height}});
let d='',heads='';const C='#E04E72';
const head=(x,y,dir)=>{const a=11;if(dir==='r')return 'M'+(x-a*1.6)+' '+(y-a)+'L'+x+' '+y+'L'+(x-a*1.6)+' '+(y+a)+'Z';return 'M'+(x-a)+' '+(y-a*1.6)+'L'+x+' '+y+'L'+(x+a)+' '+(y-a*1.6)+'Z'};
for(let i=0;i<st.length-1;i++){const A=st[i],B=st[i+1];
  if(Math.abs(A.y-B.y)<2){const y=Math.min(A.y+A.h/2,B.y+B.h/2,A.y+90);const x1=A.x+A.w,x2=B.x;d+='M'+x1+' '+y+'L'+(x2-14)+' '+y;heads+=head(x2-2,y,'r');}
  else if(Math.abs(A.x-B.x)<2){const x=A.x+A.w/2;d+='M'+x+' '+(A.y+A.h)+'L'+x+' '+(B.y-14);heads+=head(x,B.y-2,'d');}
  else{const x1=A.x+A.w/2,y1=A.y+A.h,x2=B.x+B.w/2,ym=(y1+B.y)/2,r=18;
    d+='M'+x1+' '+y1+'L'+x1+' '+(ym-r)+'Q'+x1+' '+ym+' '+(x1-r)+' '+ym+'L'+(x2+r)+' '+ym+'Q'+x2+' '+ym+' '+x2+' '+(ym+r)+'L'+x2+' '+(B.y-14);heads+=head(x2,B.y-2,'d');}
}
s.innerHTML='<path d="'+d+'" fill="none" stroke="'+C+'" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 10"/><path d="'+d+'" fill="none" stroke="'+C+'" stroke-width="4" stroke-opacity=".35"/><path d="'+heads+'" fill="'+C+'"/>';
</script></body></html>`;
}

(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  for (const [id, spec] of Object.entries(specs)) {
    if (only && only !== id) continue;
    for (const mode of ['desktop', 'mobile']) {
      const p = await b.newPage({ viewport: { width: mode === 'desktop' ? 1200 : 720, height: 400 }, deviceScaleFactor: mode === 'desktop' ? 1.5 : 1.75 });
      const f = path.join(__dirname, `tmp_${id}_${mode}.html`);
      fs.writeFileSync(f, html(spec, mode));
      await p.goto('file://' + f);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(150);
      const el = await p.$('.wrap');
      const file = path.join(OUT, `arch-${id}${mode === 'mobile' ? '-m' : ''}.png`);
      await el.screenshot({ path: file });
      console.log(file, (fs.statSync(file).size / 1024 | 0) + 'KB');
      await p.close();
    }
  }
  await b.close();
})();
