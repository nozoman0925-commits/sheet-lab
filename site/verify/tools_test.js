const fs=require('fs');
function load(f){const h=fs.readFileSync(f,'utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);return new Function(m[1]+';return {'+ (f.includes('wareki')?'toWareki,toSeireki':f.includes('tax')?'calcTax,divRound':f.includes('age')?'calcAge,leap':'countText')+'}')();}
let fail=0;const ok=(c,m)=>{if(!c){fail++;if(fail<=10)console.log('NG',m)}};
// wareki vs Intl
const w=load('tools/wareki/body.html');
const fmt=new Intl.DateTimeFormat('ja-JP-u-ca-japanese',{era:'long',year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
let n=0;
for(let t=Date.UTC(1873,0,1);t<=Date.UTC(2030,11,31);t+=86400000*3+7){const d=new Date(t);const y=d.getUTCFullYear(),m=d.getUTCMonth()+1,dd=d.getUTCDate();
  const mine=w.toWareki(y,m,dd);const P=Object.fromEntries(fmt.formatToParts(d).map(x=>[x.type,x.value]));const ref=P.era+(P.relatedYear&&0?'':(P.year==='1'?'元':P.year))+'年'+P.month+'月'+P.day+'日';
  n++;ok(mine===ref,`${y}-${m}-${dd} mine=${mine} ref=${ref}`);}
// boundaries
for(const [a,b] of [[[2019,4,30],'平成31年4月30日'],[[2019,5,1],'令和元年5月1日'],[[1989,1,7],'昭和64年1月7日'],[[1989,1,8],'平成元年1月8日'],[[1926,12,24],'大正15年12月24日'],[[1926,12,25],'昭和元年12月25日'],[[1912,7,29],'明治45年7月29日'],[[1912,7,30],'大正元年7月30日']]) ok(w.toWareki(...a)===b,'boundary '+a+' '+w.toWareki(...a));
ok(w.toWareki(1872,12,31)===null,'pre-1873');ok(w.toWareki(2023,2,30)===null,'invalid');
ok(w.toSeireki('令和',1,5,1)==='2019年5月1日','r1');ok(w.toSeireki('平成',31,5,1)===null,'h31-5-1');ok(w.toSeireki('平成',1,1,7)===null,'h1-1-7');
ok(w.toSeireki('昭和',64,1,7)==='1989年1月7日','s64');ok(w.toSeireki('昭和',64,1,8)===null,'s64-1-8');ok(w.toSeireki('明治',5,1,1)==='1872年1月1日'?false:true,'m5 pre-1873 null');
// tax vs BigInt rational reference
const t=load('tools/tax/body.html');
function ref(num,den,mode){num=BigInt(num);den=BigInt(den);let q=num/den,r=num%den;if(r===0n)return Number(q);if(mode==='floor')return Number(q);if(mode==='ceil')return Number(q+1n);return (r*2n>=den)?Number(q+1n):Number(q);}
let c=0;for(const rate of [10,8])for(const md of ['floor','round','ceil'])for(let a=0;a<=3000;a++){const r=t.calcTax(a,rate,md);c++;
  ok(r.taxOnExcl===ref(a*rate,100,md),`tax ${a} ${rate} ${md}`);ok(r.exclFromIncl===ref(a*100,100+rate,md),`ex ${a} ${rate} ${md}`);}
ok(t.calcTax(1000,10,'floor').inclFromExcl===1100,'1000->1100');ok(t.calcTax(1100,10,'floor').exclFromIncl===1000,'1100->1000');ok(t.calcTax(1080,8,'floor').exclFromIncl===1000,'1080->1000');ok(t.calcTax(999,10,'floor').taxOnExcl===99,'999 floor');ok(t.calcTax(995,10,'round').taxOnExcl===100,'995 round 99.5->100');
// charcount
const cc=load('tools/charcount/body.html');
let r=cc.countText('あ い\nう\r\nえ');ok(r.all===8&&r.noNl===5&&r.noSp===4&&r.lines===3,'cc1 '+JSON.stringify(r));
r=cc.countText('');ok(r.all===0&&r.lines===0&&r.sheets===0,'empty');
r=cc.countText('a😀');ok(r.all===2&&r.bytes===5,'emoji '+JSON.stringify(r));
r=cc.countText('あ'.repeat(401));ok(r.sheets===2,'sheets');
// age vs 独立参照(n年後の応当日を総当たりで比較)
const ag=load('tools/age/body.html');
function refAge(by,bm,bd,y,m,d){const lp=Y=>new Date(Date.UTC(Y,1,29)).getUTCMonth()===1;const key=a=>a[0]*10000+a[1]*100+a[2];
  let n=0;while(true){const Y=by+n+1;let a=[Y,bm,bd];if(bm===2&&bd===29&&!lp(Y))a=[Y,3,1];if(key(a)<=key([y,m,d]))n++;else break;}return n;}
let ac=0;for(const [by,bm,bd] of [[2000,2,29],[1996,2,29],[1900,2,28],[2001,3,1],[1999,12,31],[2010,1,1]])for(let t=Date.UTC(by,bm-1,bd);t<=Date.UTC(2032,11,31);t+=86400000*(ac%5+1)){const D=new Date(t);const y=D.getUTCFullYear(),m=D.getUTCMonth()+1,d=D.getUTCDate();const r=ag.calcAge(by,bm,bd,y,m,d);ac++;
  ok(r&&r.age===refAge(by,bm,bd,y,m,d),`age ${by}-${bm}-${bd} @${y}-${m}-${d} ${JSON.stringify(r)}`);
  ok(r&&r.lived===Math.round((t-Date.UTC(by,bm-1,bd))/86400000),'lived');ok(r&&r.months>=0&&r.months<12&&r.days>=0&&r.days<=31&&r.toNext>=1,'range '+JSON.stringify(r)+` ${by}-${bm}-${bd}@${y}-${m}-${d}`);}
ok(ag.calcAge(2000,1,15,2024,1,14).age===23,'day before bday');ok(ag.calcAge(2000,1,15,2024,1,15).age===24,'bday');
ok(ag.calcAge(2000,2,29,2023,2,28).age===22,'leap 2/28');ok(ag.calcAge(2000,2,29,2023,3,1).age===23,'leap 3/1');ok(ag.calcAge(2000,2,29,2024,2,29).age===24,'leap 2/29');
let q=ag.calcAge(2000,1,31,2000,3,1);ok(q.months===1&&q.days===1,'month end '+JSON.stringify(q));
q=ag.calcAge(2000,1,15,2024,3,20);ok(q.age===24&&q.months===2&&q.days===5,'ymd '+JSON.stringify(q));
ok(ag.calcAge(2000,1,15,1999,1,1)===null,'before birth');ok(ag.calcAge(2001,2,29,2024,1,1)===null,'invalid date');
console.log(`age ${ac} dates, wareki ${n} dates, tax ${c} combos, fail=${fail}`);process.exit(fail?1:0);
