const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lin=c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4};
const L=([r,g,b])=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const mix=(top,a,bot)=>top.map((t,i)=>t*a+bot[i]*(1-a));
const ratio=(a,b)=>{const[x,y]=[L(a),L(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05)};
const slate950=hex('#020617'), white=[255,255,255];
for (const stop of ['#F59E0B','#0D9488','#FFFFFF','#FDE68A','#10B981','#0EA5E9']) {
  for (const a of [0.8,0.85]) console.log(stop, a, ratio(white, mix(slate950,a,hex(stop))).toFixed(2));
}
console.log('slate-900 sobre blanco', ratio(hex('#0F172A'), white).toFixed(2));
