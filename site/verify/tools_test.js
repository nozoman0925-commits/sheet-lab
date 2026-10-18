const fs=require('fs');
function load(f){const h=fs.readFileSync(f,'utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);return new Function(m[1]+';return {'+ (f.includes('hourly-wage')?'wageCalc':f.includes('list-diff')?'listDiff':f.includes('dup-check')?'dupCheck,normKey':f.includes('tax-rounding-compare')?'compare,parseAmounts':f.includes('estimate-total')?'estimate,parseLines,dec,divRound':f.includes('wareki')?'toWareki,toSeireki':f.includes('tax')?'calcTax,divRound':f.includes('age')?'calcAge,leap':f.includes('zenkaku')?'toHalf,toFull,H2F,F2H':f.includes('space-remove')?'cleanSpaces':f.includes('phone-format')?'cleanPhones':f.includes('postal-format')?'cleanPostal':f.includes('unit-time')?'parseTime,fmtHM,fmtDec,workMinutes,sumTimes':f.includes('percent')?'calc,parseNum':'countText')+'}')();}
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
// zenkaku: NFKC・独立計算と照合
const zk=load('tools/zenkaku/body.html');const ALL={alnum:true,symbol:true,kana:true,space:true};
for(let c=0x21;c<=0x7E;c++){const h=String.fromCharCode(c),f=String.fromCharCode(c+0xFEE0);ok(zk.toFull(h,ALL)===f,'full '+h);ok(zk.toHalf(f,ALL)===h&&f.normalize('NFKC')===h,'half '+h);}
ok(zk.toFull(' ',ALL)==='\u3000'&&zk.toHalf('\u3000',ALL)===' ','space');
ok(zk.toHalf('ＡＢＣ１２３！ ',{alnum:true})==='ABC123！ ','alnum only');
ok(zk.toHalf('ＡＢＣ１２３！',{symbol:true})==='ＡＢＣ１２３!','symbol only');
ok(zk.toFull('ABC 12!',{alnum:true})==='ＡＢＣ 12!'.replace('12','１２'),'full alnum only');
ok(zk.toFull('ｶﾞｷﾞｸﾞｹﾞｺﾞﾊﾟﾋﾟｳﾞｱｲｳ｡｢｣､･ｰ',ALL)==='ガギグゲゴパピヴアイウ。「」、・ー','half kana '+zk.toFull('ｶﾞｷﾞｸﾞｹﾞｺﾞﾊﾟﾋﾟｳﾞｱｲｳ｡｢｣､･ｰ',ALL));
ok(zk.toHalf('ガギグパピヴアイウ。「」、・ー',ALL)==='ｶﾞｷﾞｸﾞﾊﾟﾋﾟｳﾞｱｲｳ｡｢｣､･ｰ','full kana');
ok(zk.toHalf('ひらがな',ALL)==='ひらがな','hiragana untouched');
ok(zk.toFull('ｶﾞ',{kana:false})==='ｶﾞ'&&zk.toFull('ﾞ',ALL)==='ﾞ','lone/disabled dakuten');
ok(zk.toFull('ｱﾞ',ALL)==='ｱﾞ'.replace('ｱ','ア').replace('ﾞ','ﾞ'),'invalid dakuten stays');
let kn=0;for(const h of Object.keys(zk.H2F)){const f=zk.H2F[h];kn++;ok(f===h.normalize('NFKC'),'nfkc '+h);ok(zk.toHalf(f,ALL)===h&&zk.toFull(h,ALL)===f,'kana rt '+h);}
ok(kn>=80,'kana count '+kn);
ok(zk.toFull(zk.toHalf('日本語ＡＢＣ　ｶﾅ！',ALL),ALL)==='日本語ＡＢＣ　カナ！','mixed roundtrip');
console.log(`zenkaku kana ${kn} `);
// space-remove: 正規表現による独立実装と、ランダム入力で総当たり照合
const sr=load('tools/space-remove/body.html');
(function(){
  const POOL=['山','田',' ','\u3000','\t','\u00A0','a','1','株','\n','\r\n'];
  let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const refs={};
  function cls(o){let c='';if(o.half)c+=' ';if(o.full)c+='\u3000';if(o.tab)c+='\t';if(o.nbsp)c+='\u00A0';return c;}
  function ref(s,m,o){const c=cls(o);const lines=s.split(/\r\n|\n|\r/);
    return lines.map(l=>{if(!c)return l;const cc='['+c+']';
      if(m==='remove')return l.replace(new RegExp(cc,'g'),'');
      if(m==='normalize')return l.replace(new RegExp(cc+'+','g'),'\uE000').replace(/^\uE000|\uE000$/g,'').replace(/\uE000/g,' ');
      return l.replace(new RegExp('^'+cc+'+'),'').replace(new RegExp(cc+'+$'),'');}).join('\n');}
  let k=0;
  for(let n=0;n<4000;n++){
    let s='';const len=Math.floor(rnd()*14);for(let i=0;i<len;i++)s+=POOL[Math.floor(rnd()*POOL.length)];
    const o={half:rnd()<.7,full:rnd()<.7,tab:rnd()<.5,nbsp:rnd()<.3};
    for(const m of ['remove','normalize','trim']){const r=sr.cleanSpaces(s,m,o);k++;
      ok(r.text===ref(s,m,o),`sr ${m} ${JSON.stringify(s)} ${JSON.stringify(o)} got ${JSON.stringify(r.text)} ref ${JSON.stringify(ref(s,m,o))}`);
      ok(r.removed===Array.from(s.replace(/\r\n|\r/g,'\n')).length-Array.from(r.text).length,'removed '+JSON.stringify(s));}
  }
  const A={half:true,full:true,tab:true,nbsp:false};
  ok(sr.cleanSpaces('山田　太郎',  'remove',A).text==='山田太郎','sr1');
  ok(sr.cleanSpaces('山田　太郎',  'normalize',A).text==='山田 太郎','sr2');
  ok(sr.cleanSpaces('　山田　 太郎　','trim',A).text==='山田　 太郎','sr3');
  ok(sr.cleanSpaces('株式会社 サンプル　商事','normalize',A).text==='株式会社 サンプル 商事','sr4');
  ok(sr.cleanSpaces('山田　太郎','remove',{half:true}).text==='山田　太郎','half only keeps full-width');
  ok(sr.cleanSpaces('a b\r\n c ','remove',A).text==='ab\nc','newlines kept as \\n');
  ok(sr.cleanSpaces('','remove',A).text===''&&sr.cleanSpaces('','remove',A).removed===0,'empty');
  ok(sr.cleanSpaces('山 田','remove',A).removed===1,'removed count');
  ok(sr.cleanSpaces('  山　　田  ','normalize',A).removed===5,'removed normalize '+sr.cleanSpaces('  山　　田  ','normalize',A).removed);
  console.log('space-remove '+k+' cases');
})();
// phone-format: 正規表現による独立実装と、ランダム入力で総当たり照合
const pf=load('tools/phone-format/body.html');
(function(){
  const POOL=['0','3','9','1','5','7','８','０','９','-','－','ー','(',')','（','）',' ','\u3000','A','\n'];
  let seed=777;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const fw={'０':'0','１':'1','２':'2','３':'3','４':'4','５':'5','６':'6','７':'7','８':'8','９':'9'};
  function ref(line,mode){ // 戻り値 [出力, 注意あり?]
    if(/^[\s\u3000]*$/.test(line))return [line.trim?'':'',false];
    let s=[...line].map(c=>fw[c]||c).join('');
    s=s.split('').filter(c=>!'-\u2010\u2011\u2012\u2013\u2014\u2015\u2212\u30FC\uFF70\uFF0D\u30FB()\uFF08\uFF09 \u3000\t'.includes(c)).join('');
    if(!/^\d+$/.test(s))return [line,true];
    if(mode==='hyphen'){
      if(s.length===11&&['050','070','080','090'].includes(s.slice(0,3)))return [s.slice(0,3)+'-'+s.slice(3,7)+'-'+s.slice(7),false];
      if(s.length===10&&['03','06'].includes(s.slice(0,2)))return [s.slice(0,2)+'-'+s.slice(2,6)+'-'+s.slice(6),false];
      return [s,true];
    }
    return [s,s[0]!=='0'];
  }
  let k=0;
  for(let n=0;n<6000;n++){
    let s='';const len=Math.floor(rnd()*16);for(let i=0;i<len;i++)s+=POOL[Math.floor(rnd()*POOL.length)];
    for(const m of ['digits','hyphen']){
      const r=pf.cleanPhones(s,m);const lines=s.split(/\r\n|\n|\r/).map(l=>ref(l,m));k++;
      ok(r.text===lines.map(x=>x[0]).join('\n'),`pf text ${m} ${JSON.stringify(s)} got ${JSON.stringify(r.text)}`);
      ok(r.notes.length===lines.filter(x=>x[1]).length,`pf notes ${m} ${JSON.stringify(s)} ${r.notes.length}`);
    }
  }
  const eq=(a,b,m)=>ok(a===b,m+' got '+JSON.stringify(a));
  eq(pf.cleanPhones('03-1234-5678','digits').text,'0312345678','pf1');
  eq(pf.cleanPhones('(03)1234-5678','digits').text,'0312345678','pf2');
  eq(pf.cleanPhones('０９０－１２３４－５６７８','hyphen').text,'090-1234-5678','pf3');
  eq(pf.cleanPhones('09012345678','hyphen').text,'090-1234-5678','pf4');
  eq(pf.cleanPhones('0312345678','hyphen').text,'03-1234-5678','pf5');
  eq(pf.cleanPhones('0612345678','hyphen').text,'06-1234-5678','pf6');
  eq(pf.cleanPhones('0120123456','hyphen').text,'0120123456','pf7 0120は区切らない');
  ok(pf.cleanPhones('0120123456','hyphen').notes.length===1,'pf7 note');
  eq(pf.cleanPhones('03-1234-5678 内線12','digits').text,'03-1234-5678 内線12','pf8 数字以外は元のまま');
  ok(pf.cleanPhones('312345678','hyphen').notes[0].includes('先頭が0'),'pf9 先頭0なし');
  eq(pf.cleanPhones('03ー1234ー5678','digits').text,'0312345678','pf10 長音符');
  eq(pf.cleanPhones('a\n\n03-1111-2222','digits').text,'a\n\n0311112222','pf11 空行保持');
  console.log('phone-format '+k+' cases');
})();
// postal-format: 独立実装(文字ごとの走査)とランダム入力で照合
const pc=load('tools/postal-format/body.html');
(function(){
  const POOL=['1','2','3','0','7','９','０','-','－','ー','〒',' ','\u3000','A','E','\n'];
  let seed=4242;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const SKIP=new Set(['〒','-','\u2010','\u2011','\u2012','\u2013','\u2014','\u2015','\u2212','\u30FC','\uFF70','\uFF0D','\u30FB',' ','\u3000','\t']);
  function ref(line,mode){
    if([...line].every(c=>c===' '||c==='\u3000'||c==='\t'))return ['',false];
    let d='',ok=true;
    for(const c of line){
      if(SKIP.has(c))continue;
      const cp=c.codePointAt(0);
      if(cp>=0xFF10&&cp<=0xFF19)d+=String.fromCharCode(cp-0xFEE0);
      else if(c>='0'&&c<='9')d+=c;
      else ok=false;
    }
    if(!ok||d.length===0)return [line,true];
    if(d.length!==7)return [line,true];
    return [mode==='hyphen'?d.slice(0,3)+'-'+d.slice(3):d,false];
  }
  let k=0;
  for(let n=0;n<6000;n++){
    let s='';const len=Math.floor(rnd()*14);for(let i=0;i<len;i++)s+=POOL[Math.floor(rnd()*POOL.length)];
    for(const m of ['digits','hyphen']){
      const r=pc.cleanPostal(s,m);const lines=s.split(/\r\n|\n|\r/).map(l=>ref(l,m));k++;
      ok(r.text===lines.map(x=>x[0]).join('\n'),`pc text ${m} ${JSON.stringify(s)} got ${JSON.stringify(r.text)}`);
      ok(r.notes.length===lines.filter(x=>x[1]).length,`pc notes ${m} ${JSON.stringify(s)} ${r.notes.length}`);
    }
  }
  const eq=(a,b,m)=>ok(a===b,m+' got '+JSON.stringify(a));
  eq(pc.cleanPostal('123-4567','digits').text,'1234567','pc1');
  eq(pc.cleanPostal('1234567','hyphen').text,'123-4567','pc2');
  eq(pc.cleanPostal('〒１２３－４５６７','hyphen').text,'123-4567','pc3');
  eq(pc.cleanPostal('123ー4567','digits').text,'1234567','pc4 長音');
  eq(pc.cleanPostal('234567','hyphen').text,'234567','pc5 6桁は0を足さない');
  ok(pc.cleanPostal('234567','hyphen').notes[0].includes('先頭の0'),'pc5 note');
  eq(pc.cleanPostal('1E34567','digits').text,'1E34567','pc6 英字混じりは元のまま');
  eq(pc.cleanPostal('12-34567','hyphen').text,'123-4567','pc7 位置違いも7桁なら整形');
  eq(pc.cleanPostal('1\n\n123-4567','digits').text,'1\n\n1234567','pc8 空行保持');
  console.log('postal-format '+k+' cases');
})();

// percent: BigInt分数の実装を、Number(整数入力)の独立計算と許容誤差で照合 + 手計算ケース
const pt=load('tools/percent/body.html');
(function(){
  let seed=777;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  let k=0;
  for(let n=0;n<4000;n++){
    const a=Math.floor(rnd()*100000),b=Math.floor(rnd()*100000),d=Math.floor(rnd()*3);
    const tol=0.5*Math.pow(10,-d)+1e-9;
    let r=pt.calc('ratio',String(a),String(b),d);k++;
    if(b===0)ok(!r.ok,'pt ratio b=0');
    else ok(r.ok&&Math.abs(parseFloat(r.value)-a/b*100)<=tol,`pt ratio ${a} ${b} ${d} got ${r.value}`);
    r=pt.calc('change',String(a),String(b),d);k++;
    if(a===0){ok(!r.ok&&r.diff===String(b),`pt change a=0 ${b} ${r.diff}`);}
    else ok(r.ok&&Math.abs(parseFloat(r.value)-(b-a)/a*100)<=tol&&Number(r.diff)===b-a,`pt change ${a} ${b} ${d} got ${r.value}`);
    r=pt.calc('point',String(a/100),String(b/100),d);k++;
    ok(r.ok&&Math.abs(parseFloat(r.value)-(b-a)/100)<=tol,`pt point ${a} ${b} ${d} got ${r.value}`);
  }
  const eq=(a,b,m)=>ok(a===b,m+' got '+JSON.stringify(a));
  eq(pt.calc('change','30000','36000',1).value,'20.0','pt1');
  eq(pt.calc('change','36000','30000',1).value,'-16.7','pt2');
  eq(pt.calc('change','1234','2345',1).value,'90.0','pt3');
  eq(pt.calc('change','1234','2345',2).value,'90.03','pt3b');
  eq(pt.calc('change','5000','0',1).value,'-100.0','pt4');
  eq(pt.calc('change','8000','8000',1).value,'0.0','pt5');
  eq(pt.calc('change','0','5000',1).ok,false,'pt6');
  eq(pt.calc('change','0','5000',1).diff,'5000.0','pt6 diff');
  eq(pt.calc('ratio','1','8',1).value,'12.5','pt7');
  eq(pt.calc('ratio','1','8',0).value,'13','pt8 0.5は切り上げ');
  eq(pt.calc('change','8','7',0).value,'-13','pt9 -12.5は絶対値が大きい方');
  eq(pt.calc('change','1000','999',1).value,'-0.1','pt10');
  eq(pt.calc('change','100000','99999',2).value,'0.00','pt11 負のゼロにしない');
  eq(pt.calc('ratio','1,234.5','１０００',2).value,'123.45','pt12 カンマ・全角');
  eq(pt.calc('point','12.5','15.25',2).value,'2.75','pt13');
  eq(pt.calc('ratio','abc','3',1).ok,false,'pt14 数字でない');
  eq(pt.calc('ratio','','3',1).ok,false,'pt15 空');
  eq(pt.calc('ratio','3','0',1).ok,false,'pt16 B=0');
  eq(pt.calc('change','0.1','0.3',1).value,'200.0','pt17 小数誤差なし');
  console.log('percent '+k+' cases');
})();

// unit-time: 全開始・終了の組(5分刻み)をDate差による独立計算と照合 + 手計算ケース
const ut=load('tools/unit-time/body.html');
(function(){
  let k=0;const p2=n=>String(n).padStart(2,'0');
  const tm=m=>Math.floor(m/60)+':'+p2(m%60);
  for(let s=0;s<1440;s+=5)for(let e=0;e<1440;e+=5)for(const br of [0,45,60]){
    const d0=Date.UTC(2026,0,1,Math.floor(s/60),s%60);let d1=Date.UTC(2026,0,1,Math.floor(e/60),e%60);if(d1<=d0)d1+=86400000;
    const span=(d1-d0)/60000,w=span-br;
    const r=ut.workMinutes(tm(s),tm(e),String(br));k++;
    if(w<0)ok(!r.ok,`ut neg ${s} ${e} ${br}`);else ok(r.ok&&r.minutes===w&&r.hm===Math.floor(w/60)+':'+p2(w%60),`ut ${s} ${e} ${br} got ${JSON.stringify(r)}`);
  }
  // 小数時間: 分0〜6000を独立計算(Number丸め)と照合。0.5境界はテスト用に厳密整数で確認
  for(let m=0;m<=6000;m++){const exact=m*100/60;const f=Math.floor(exact),fr=exact-f;
    if(Math.abs(fr-0.5)>1e-9){const c=Math.round(exact);ok(Number(ut.fmtDec(m))===c/100,`ut dec ${m} ${ut.fmtDec(m)}`);k++;}}
  const eq=(a,b,m)=>ok(a===b,m+' got '+JSON.stringify(a));
  eq(ut.workMinutes('9:00','18:30','60').hm,'8:30','ut1');
  eq(ut.workMinutes('22:00','6:00','60').hm,'7:00','ut2 日またぎ');
  eq(ut.workMinutes('9:00','9:00','0').hm,'24:00','ut3 同時刻=24h');
  eq(ut.workMinutes('9:00','10:00','61').ok,false,'ut4 休憩超過');
  eq(ut.workMinutes('24:00','10:00','0').ok,false,'ut5 24:00不可');
  eq(ut.workMinutes('9:60','10:00','0').ok,false,'ut6 分60不可');
  eq(ut.workMinutes('９：３０','１７時００分','','').hm,'7:30','ut7 全角・時分表記・休憩空');
  eq(ut.workMinutes('9:00','17:00','-5').ok,false,'ut8 休憩負');
  eq(ut.workMinutes('9:00','17:00','1.5').ok,false,'ut9 休憩小数');
  eq(ut.workMinutes('9:00','17:45','0').dec,'8.75','ut10 8.75');
  eq(ut.workMinutes('9:00','17:20','0').dec,'8.33','ut11 8.33');
  eq(ut.workMinutes('9:00','17:50','0').dec,'8.83','ut12 8.83');
  eq(ut.sumTimes('7:45\n8:15\n0:30').hm,'16:30','ut13 合計');
  eq(ut.sumTimes('12:30\r\n13:45').hm,'26:15','ut14 24h超');
  eq(ut.sumTimes('7:45\n\n  \n8:15\n').count,2,'ut15 空行無視');
  eq(ut.sumTimes('7:45\n8:6x').ok,false,'ut16 不正行');
  eq(ut.sumTimes('7:75').ok,false,'ut17 分75不可');
  eq(ut.sumTimes('').ok,false,'ut18 空');
  eq(ut.sumTimes('0:20\n0:20\n0:20').hm,'1:00','ut19 20分×3');
  eq(ut.fmtDec(0),'0.00','ut20');
  console.log('unit-time '+k+' cases');
})();

// estimate-total: 記事の10ケース(LibreOffice計算値)+Number整数計算との総当たり照合
const et=load('tools/estimate-total/body.html');
(function(){
  const eq=(a,b,m)=>ok(a===b,m+' got '+JSON.stringify(a));
  const L=a=>a.map(x=>x.join(',')).join('\n');
  const T=(lines,pct,disc,exp,m)=>{const r=et.estimate(L(lines),String(pct),String(disc),'floor');ok(r.ok&&[r.sub,r.expenses,r.taxable,r.tax,r.total].join()===exp.join(),m+' got '+JSON.stringify(r));};
  const A=[[1,100000],[2,35000],[10,1200]];
  T(A,0,0,[182000,0,182000,18200,200200],'et1');
  T(A,10,0,[182000,18200,200200,20020,220220],'et2');
  T(A,10,5000,[182000,18200,195200,19520,214720],'et3');
  T([[2.5,3333],[0.5,12345]],0,0,[14506,0,14506,1450,15956],'et4');
  T([[1,12345],[3,6789]],7,0,[32712,2290,35002,3500,38502],'et5');
  T([[1,1005]],0,0,[1005,0,1005,100,1105],'et6');
  T([[1,99999]],5,1234,[99999,5000,103765,10376,114141],'et7');
  T([],10,0,[0,0,0,0,0],'et8 空');
  T([[1,10000]],10,11000,[10000,1000,0,0,0],'et9');
  T([[12,987654],[3,456789]],15,100000,[13222215,1983332,15105547,1510554,16616101],'et10');
  eq(et.estimate(L(A),'0','0','round').tax,'18200','et11 round');
  eq(et.estimate('1,1005','0','0','floor').tax,'100','et12 100.5切り捨て');
  eq(et.estimate('1,1005','0','0','round').tax,'101','et13 100.5四捨五入');
  eq(et.estimate('1,1005','0','0','ceil').tax,'101','et14 切り上げ');
  eq(et.estimate('1,1001','0','0','ceil').tax,'101','et15 100.1切り上げ');
  eq(et.estimate('1,10000','10','11001','floor').ok,false,'et16 値引き超過');
  eq(et.estimate('品名,2,500\n\n  \nB\t3\t100','0','0','floor').sub,'1300','et17 品名・タブ・空行');
  eq(et.estimate('１,１０００','０','０','floor').sub,'1000','et18 全角');
  eq(et.estimate('1,-5','0','0','floor').ok,false,'et19 負');
  eq(et.estimate('abc','0','0','floor').ok,false,'et20 1要素');
  eq(et.estimate('1,2','x','0','floor').ok,false,'et21 率');
  eq(et.estimate('1,2','0','1.5','floor').ok,false,'et22 値引き小数');
  eq(et.estimate('1.23456,2','0','0','floor').ok,false,'et23 5桁');
  eq(et.estimate('','0','0','floor').sub,'0','et24 空');
  eq(et.estimate('0.1,0.3','0','0','floor').sub,'0','et25 0.03→0');
  eq(et.estimate('0.5,1','0','0','floor').sub,'1','et26 0.5→1');
  let seed=4242;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const hu=(a,b)=>Math.floor((2*a+b)/(2*b));
  let k=0;
  for(let n=0;n<20000;n++){
    const nl=1+Math.floor(rnd()*4);let sub=0;const lines=[];
    for(let i=0;i<nl;i++){const q10=Math.floor(rnd()*500),p=Math.floor(rnd()*100000);lines.push((q10/10).toFixed(1)+','+p);sub+=hu(q10*p,10);}
    const pct=Math.floor(rnd()*2500)/100;const pc=Math.round(pct*100);
    const ex=hu(sub*pc,10000);const disc=Math.floor(rnd()*(sub+ex+1));
    const taxable=sub+ex-disc;
    for(const md of ['floor','round','ceil']){
      const tax=md==='floor'?Math.floor(taxable/10):md==='round'?hu(taxable,10):Math.ceil(taxable/10);
      const r=et.estimate(lines.join('\n'),pct.toFixed(2),String(disc),md);k++;
      ok(r.ok&&r.sub===String(sub)&&r.expenses===String(ex)&&r.taxable===String(taxable)&&r.tax===String(tax)&&r.total===String(taxable+tax),`et rnd ${lines} ${pct} ${disc} ${md} got ${JSON.stringify(r)}`);
    }
  }
  console.log('estimate-total '+k+' cases');
})();

// tax-rounding-compare: 手計算ケース+Number整数計算との総当たり照合
(function(){
  const tr=load('tools/tax-rounding-compare/body.html');
  const eq=(a,b,m)=>ok(a===b,m+' got '+JSON.stringify(a));
  let r=tr.compare('解体工事,100005\nクロス張替,70005\n養生,12005');
  eq(r.sub,'182015','tr1 sub');
  eq(r.each.floor+'/'+r.once.floor,'18200/18201','tr1 切り捨て 10000+7000+1200 / 18201.5→18201');
  eq(r.each.round+'/'+r.once.round,'18203/18202','tr1 四捨五入 10001+7001+1201 / 18201.5→18202');
  eq(r.each.ceil+'/'+r.once.ceil,'18203/18202','tr1 切り上げ 10001+7001+1201 / 18202');
  r=tr.compare('1005\n1005');
  eq(r.each.floor+'/'+r.once.floor,'200/201','tr2 切り捨て');
  eq(r.each.round+'/'+r.once.round,'202/201','tr2 四捨五入');
  eq(r.each.ceil+'/'+r.once.ceil,'202/201','tr2 切り上げ');
  r=tr.compare('');eq(r.sub,'0','tr3 空');eq(r.each.ceil,'0','tr3 空税');
  eq(tr.compare('品名,１２３４\n\n  \nB\t10').sub,'1244','tr4 全角・タブ・空行');
  eq(tr.compare('-5').ok,false,'tr5 負');
  eq(tr.compare('1.5').ok,false,'tr6 小数');
  eq(tr.compare('abc').ok,false,'tr7 文字');
  eq(tr.compare('品名,').ok,false,'tr8 金額なし');
  eq(tr.compare('0').each.floor,'0','tr9 ゼロ');
  eq(tr.compare('5').each.ceil+'/'+tr.compare('5').each.round+'/'+tr.compare('5').each.floor,'1/1/0','tr10 5円');
  let seed=777;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const hu=(a,b)=>Math.floor((2*a+b)/(2*b));
  let k=0;
  for(let n=0;n<20000;n++){
    const nl=1+Math.floor(rnd()*6);const a=[];let sub=0;
    for(let i=0;i<nl;i++){const v=Math.floor(rnd()*1000000);a.push(v);sub+=v;}
    const r=tr.compare(a.join('\n'));
    const f={floor:x=>Math.floor(x/10),round:x=>hu(x,10),ceil:x=>Math.ceil(x/10)};
    for(const m of ['floor','round','ceil']){
      const e=a.reduce((s,v)=>s+f[m](v),0),o=f[m](sub);k++;
      ok(r.sub===String(sub)&&r.each[m]===String(e)&&r.once[m]===String(o),'tr rnd '+a+' '+m+' got '+JSON.stringify(r));
    }
  }
  console.log('tax-rounding-compare '+k+' cases');
})();
// dup-check: 手計算ケース+独立実装(総当たり比較)との照合
(function(){
  const dc=load('tools/dup-check/body.html');
  const O=(e,a,w,c)=>({edge:e,all:a,width:w,nocase:c});
  let r=dc.dupCheck('a\nb\na\n\nc\nb\na',O(true,false,true,false));
  ok(r.total===6&&r.blank===1&&r.unique===3&&r.dupRows===3&&r.groups.length===2,'dc1 '+JSON.stringify([r.total,r.blank,r.unique,r.dupRows]));
  ok(r.groups[0].key==='a'&&r.groups[0].lines.join()==='1,3,7'&&r.groups[1].lines.join()==='2,6','dc1 lines');
  ok(r.keptText==='a\nb\nc','dc1 kept');
  ok(r.text.includes('a … 3回(行 1, 3, 7)'),'dc1 text');
  r=dc.dupCheck(' 山田 \n山田',O(true,false,true,false));ok(r.dupRows===1,'dc edge');
  r=dc.dupCheck(' 山田 \n山田',O(false,false,true,false));ok(r.dupRows===0,'dc no edge');
  r=dc.dupCheck('山田 太郎\n山田　太郎\n山田太郎',O(true,false,true,false));ok(r.dupRows===1&&r.unique===2,'dc inner space full=half');
  r=dc.dupCheck('山田 太郎\n山田　太郎\n山田太郎',O(true,false,false,false));ok(r.dupRows===0&&r.unique===3,'dc inner differs');
  r=dc.dupCheck('山田 太郎\n山田　太郎\n山田太郎',O(true,true,true,false));ok(r.dupRows===2&&r.unique===1,'dc all');
  r=dc.dupCheck('ＡＢＣ\nABC\nｱｲ\nアイ',O(true,false,true,false));ok(r.dupRows===2,'dc width');
  r=dc.dupCheck('ＡＢＣ\nABC',O(true,false,false,false));ok(r.dupRows===0,'dc no width');
  r=dc.dupCheck('Abc\nabc',O(true,false,true,true));ok(r.dupRows===1,'dc case');
  r=dc.dupCheck('Abc\nabc',O(true,false,true,false));ok(r.dupRows===0,'dc case off');
  r=dc.dupCheck('a*\nab\na?\nab',O(true,false,true,false));ok(r.dupRows===1&&r.groups[0].key==='ab','dc wildcard literal');
  r=dc.dupCheck('㈱山田\n(株)山田\n株式会社山田',O(true,false,true,false));ok(r.dupRows===1&&r.unique===2,'dc kabu');
  r=dc.dupCheck('',O(true,false,true,false));ok(r.total===0&&r.unique===0&&r.groups.length===0,'dc empty');
  r=dc.dupCheck('  \n　\n\t',O(true,false,true,false));ok(r.total===0&&r.blank===3,'dc blanks');
  r=dc.dupCheck('a\r\nb\r\na',O(true,false,true,false));ok(r.dupRows===1&&r.groups[0].lines.join()==='1,3','dc crlf');
  r=dc.dupCheck('x\n x\nx ',O(true,false,true,false));ok(r.keptText==='x'&&r.groups[0].lines.length===3,'dc first kept original');
  r=dc.dupCheck(' x\nx',O(true,false,true,false));ok(r.keptText===' x','dc keeps original notation');
  // 独立実装: 行ごとに文字を1つずつ処理して正規形を作り、O(n^2)で最初の一致を探す
  function refKey(s,o){
    let a=o.width?s.normalize('NFKC'):s;
    const sp=c=>c===' '||c==='　'||c==='\t'||c==='\n'||c==='\r'||c===' '||c==='\f'||c==='\v'||c===' '||c===' '||c===' '||c===' '||c===' '||c==='﻿';
    let out='';
    if(o.all){for(const ch of a)if(!sp(ch))out+=ch;}
    else if(o.edge){let st=0,en=a.length;while(st<en&&sp(a[st]))st++;while(en>st&&sp(a[en-1]))en--;out=a.slice(st,en);}
    else out=a;
    return o.nocase?out.toLowerCase():out;
  }
  const alpha=['A','Ａ','a','ａ','ｱ','ア','ｲ','1','１',' ','　','\t','株','㈱','(',')','*','?','山','田'];
  let seed=777;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  let n=0;
  for(let it=0;it<6000;it++){
    const nl=Math.floor(rnd()*9),L=[];
    for(let i=0;i<nl;i++){let s='';const len=Math.floor(rnd()*4);for(let j=0;j<len;j++)s+=alpha[Math.floor(rnd()*alpha.length)];L.push(s);}
    const o=O(rnd()<0.5,rnd()<0.5,rnd()<0.5,rnd()<0.5);
    const res=dc.dupCheck(L.join('\n'),o);n++;
    const keys=L.map(s=>refKey(s,o));
    const firstIdx=[],cnt=new Map();
    for(let i=0;i<keys.length;i++){if(keys[i]==='')continue;let f=-1;for(let j=0;j<i;j++)if(keys[j]===keys[i]){f=j;break;}if(f<0)firstIdx.push(i);}
    const refKept=firstIdx.map(i=>L[i]);
    let refDup=0,refTotal=0,refBlank=0;
    for(let i=0;i<keys.length;i++){if(keys[i]===''){refBlank++;continue;}refTotal++;for(let j=0;j<i;j++)if(keys[j]===keys[i]){refDup++;break;}}
    const refGroups=firstIdx.filter(i=>{let c=0;for(let j=0;j<keys.length;j++)if(keys[j]===keys[i])c++;return c>1;}).map(i=>{const ls=[];for(let j=0;j<keys.length;j++)if(keys[j]===keys[i])ls.push(j+1);return ls.join();});
    // 空入力('')は1行として数える: L=[] のとき text='' → 1行の空行
    const refBlankFix=nl===0?1:refBlank;
    ok(res.dupRows===refDup&&res.total===refTotal&&res.blank===refBlankFix&&res.unique===firstIdx.length&&res.kept.join('\n')===refKept.join('\n')&&res.groups.map(g=>g.lines.join()).join('|')===refGroups.join('|'),'dc rnd '+JSON.stringify(L)+JSON.stringify(o)+' got '+JSON.stringify([res.dupRows,res.total,res.blank,res.unique])+' ref '+JSON.stringify([refDup,refTotal,refBlankFix,firstIdx.length]));
  }
  console.log('dup-check '+n+' random cases');
})();
// list-diff: 手計算ケース+独立実装(総当たり比較)との照合
(function(){
  const ld=load('tools/list-diff/body.html');
  const O=(e,a,w,c)=>({edge:e,all:a,width:w,nocase:c});
  let r=ld.listDiff('a\nb\nc','b\nc\nd',O(true,false,true,false));
  ok(r.onlyA.join()==='a'&&r.onlyB.join()==='d'&&r.both.join()==='b,c','ld basic');
  r=ld.listDiff('',"",O(true,false,true,false));ok(r.aCount===0&&r.bCount===0&&r.both.length===0,'ld empty');
  r=ld.listDiff('a\na\nb','a',O(true,false,true,false));ok(r.aCount===2&&r.onlyA.join()==='b'&&r.both.join()==='a','ld dup within list');
  r=ld.listDiff(' 山田 \n佐藤','山田\n鈴木',O(true,false,true,false));ok(r.both.join()===' 山田 '&&r.onlyA.join()==='佐藤','ld edge keeps A notation');
  r=ld.listDiff(' 山田 ','山田',O(false,false,true,false));ok(r.both.length===0&&r.onlyA.length===1&&r.onlyB.length===1,'ld no edge');
  r=ld.listDiff('山田 太郎','山田　太郎',O(true,false,true,false));ok(r.both.length===1,'ld inner width');
  r=ld.listDiff('山田 太郎','山田太郎',O(true,true,true,false));ok(r.both.length===1,'ld all spaces');
  r=ld.listDiff('山田 太郎','山田太郎',O(true,false,true,false));ok(r.both.length===0,'ld inner differs');
  r=ld.listDiff('ＡＢＣ\nｱｲ','ABC\nアイ',O(true,false,true,false));ok(r.both.length===2,'ld width');
  r=ld.listDiff('Abc','abc',O(true,false,true,true));ok(r.both.length===1,'ld case');
  r=ld.listDiff('Abc','abc',O(true,false,true,false));ok(r.both.length===0,'ld case off');
  r=ld.listDiff('a*\nab','ab\na?',O(true,false,true,false));ok(r.both.join()==='ab'&&r.onlyA.join()==='a*'&&r.onlyB.join()==='a?','ld wildcard literal');
  r=ld.listDiff('a\r\nb','b\r\nc',O(true,false,true,false));ok(r.both.join()==='b','ld crlf');
  r=ld.listDiff('  \n　','\t',O(true,false,true,false));ok(r.aCount===0&&r.bCount===0,'ld blanks');
  r=ld.listDiff('a','a',O(true,false,true,false));ok(r.summary==='A 1件、B 1件(同じリスト内の重複と空行を除く)。Aだけ 0件、Bだけ 0件、両方 1件','ld summary');
  function refKey(s,o){
    let a=o.width?s.normalize('NFKC'):s;
    const sp=c=>c===' '||c==='　'||c==='\t'||c==='\n'||c==='\r'||c==='\f'||c==='\v'||c===' '||c==='﻿'||(c>=' '&&c<=' ')||c===' '||c===' '||c===' '||c===' '||c===' '||c==='　';
    let out='';
    if(o.all){for(const ch of a)if(!sp(ch))out+=ch;}
    else if(o.edge){let st=0,en=a.length;while(st<en&&sp(a[st]))st++;while(en>st&&sp(a[en-1]))en--;out=a.slice(st,en);}
    else out=a;
    return o.nocase?out.toLowerCase():out;
  }
  const alpha=['A','Ａ','a','ａ','ｱ','ア','1','１',' ','　','\t','株','㈱','(',')','*','?','山'];
  let seed=4242;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const mk=()=>{const nl=Math.floor(rnd()*8),L=[];for(let i=0;i<nl;i++){let s='';const len=Math.floor(rnd()*4);for(let j=0;j<len;j++)s+=alpha[Math.floor(rnd()*alpha.length)];L.push(s);}return L;};
  let n=0;
  for(let it=0;it<6000;it++){
    const LA=mk(),LB=mk(),o=O(rnd()<0.5,rnd()<0.5,rnd()<0.5,rnd()<0.5);
    const res=ld.listDiff(LA.join('\n'),LB.join('\n'),o);n++;
    const kA=LA.map(s=>refKey(s,o)),kB=LB.map(s=>refKey(s,o));
    const firstOf=(L,K)=>{const out=[];for(let i=0;i<K.length;i++){if(K[i]==='')continue;let dup=false;for(let j=0;j<i;j++)if(K[j]===K[i]){dup=true;break;}if(!dup)out.push(i);}return out;};
    const fa=firstOf(LA,kA),fb=firstOf(LB,kB);
    const inB=k=>{for(const x of kB)if(x===k)return true;return false;};
    const inA=k=>{for(const x of kA)if(x===k)return true;return false;};
    const rOnlyA=fa.filter(i=>!inB(kA[i])).map(i=>LA[i]),rBoth=fa.filter(i=>inB(kA[i])).map(i=>LA[i]),rOnlyB=fb.filter(i=>!inA(kB[i])).map(i=>LB[i]);
    ok(res.onlyA.join('\n')===rOnlyA.join('\n')&&res.both.join('\n')===rBoth.join('\n')&&res.onlyB.join('\n')===rOnlyB.join('\n')&&res.aCount===fa.length&&res.bCount===fb.length&&res.onlyA.length===rOnlyA.length&&res.onlyB.length===rOnlyB.length,'ld random '+it);
  }
  console.log('list-diff '+n+' random cases');
})();
// hourly-wage: 手計算ケース+Dateによる独立計算(BigInt)との照合
(function(){
  const hw=load('tools/hourly-wage/body.html');
  let r=hw.wageCalc('9:00 18:00 60','1200',1,'floor','floor');
  ok(r.ok&&r.totalMinutes===480&&r.wage===9600,'hw basic');
  r=hw.wageCalc('9:00 18:00 60\n10:00 15:30 45','1000',1,'floor','floor');
  ok(r.totalMinutes===480+285&&r.wage===12750,'hw two days');
  r=hw.wageCalc('9:00 9:50 0','1000',15,'floor','floor');ok(r.totalMinutes===45&&r.wage===750,'hw unit floor');
  r=hw.wageCalc('9:00 9:50 0','1000',15,'ceil','floor');ok(r.totalMinutes===60&&r.wage===1000,'hw unit ceil');
  r=hw.wageCalc('9:00 9:53 0','1000',15,'round','floor');ok(r.totalMinutes===60,'hw unit round up');
  r=hw.wageCalc('9:00 9:52 0','1000',15,'round','floor');ok(r.totalMinutes===45,'hw unit round down');
  r=hw.wageCalc('22:00 6:00 60','1000',1,'floor','floor');ok(r.totalMinutes===420,'hw overnight');
  r=hw.wageCalc('9:00 9:00 0','1000',1,'floor','floor');ok(r.totalMinutes===1440,'hw same time 24h');
  r=hw.wageCalc('９：００ １８時００分 ６０','１２００',1,'floor','floor');ok(r.ok&&r.wage===9600,'hw fullwidth');
  r=hw.wageCalc('9:00 18:00','1200',1,'floor','floor');ok(r.ok&&r.totalMinutes===540,'hw no break');
  r=hw.wageCalc('9:00,18:00,60\n\n  10:00 11:00 0 ','1000',1,'floor','floor');ok(r.ok&&r.rows.length===2,'hw comma and blank');
  r=hw.wageCalc('9:00 10:00 90','1000',1,'floor','floor');ok(!r.ok&&r.text.indexOf('1行目')===0,'hw break too long');
  r=hw.wageCalc('9:00','1000',1,'floor','floor');ok(!r.ok,'hw too few tokens');
  r=hw.wageCalc('24:00 25:00 0','1000',1,'floor','floor');ok(!r.ok,'hw bad time');
  r=hw.wageCalc('','1000',1,'floor','floor');ok(!r.ok,'hw empty');
  r=hw.wageCalc('9:00 10:00 0','abc',1,'floor','floor');ok(!r.ok,'hw bad wage');
  r=hw.wageCalc('9:00 10:00 0','100000',1,'floor','floor');ok(!r.ok,'hw wage too large');
  r=hw.wageCalc('9:00 9:01 0','1000',1,'floor','floor');ok(r.wage===16,'hw yen floor');
  r=hw.wageCalc('9:00 9:01 0','1000',1,'floor','round');ok(r.wage===17,'hw yen round');
  r=hw.wageCalc('9:00 9:01 0','1000',1,'floor','ceil');ok(r.wage===17,'hw yen ceil');
  r=hw.wageCalc('9:00 9:03 0','1000',1,'floor','round');ok(r.wage===50,'hw yen exact');
  // 独立計算: 5分刻みの全開始・終了+休憩の組、全丸め設定
  const ref=(s,e,b,unit,um,ym,h)=>{
    const d0=Date.UTC(2026,0,1,Math.floor(s/60),s%60),d1=Date.UTC(2026,0,1+(e<=s?1:0),Math.floor(e/60),e%60);
    const w=(d1-d0)/60000-b; if(w<0)return null;
    let c=w; if(unit>1){const q=Math.floor(w/unit),rem=w-q*unit;c=(um==='floor'||rem===0?q:um==='ceil'?q+1:(rem*2>=unit?q+1:q))*unit;}
    const num=BigInt(c)*BigInt(h);const q=num/60n,rem=num%60n;
    const y=rem===0n||ym==='floor'?q:ym==='ceil'?q+1n:(rem*2n>=60n?q+1n:q);
    return {c,y:Number(y)};
  };
  const f2=m=>Math.floor(m/60)+':'+String(m%60).padStart(2,'0');
  let n=0;
  for(const unit of [1,5,15,30])for(const um of ['floor','round','ceil'])for(const ym of ['floor','round','ceil'])
    for(let s=0;s<1440;s+=85)for(let e=0;e<1440;e+=95)for(const b of [0,30,45,60,120]){
      const h=[800,1013,1250,2999][(s+e+b)%4];
      const x=ref(s,e,b,unit,um,ym,h);
      const res=hw.wageCalc(f2(s)+' '+f2(e)+' '+b,String(h),unit,um,ym);n++;
      if(x===null)ok(!res.ok,'hw ref neg');
      else ok(res.ok&&res.totalMinutes===x.c&&res.wage===x.y,'hw ref '+f2(s)+' '+f2(e)+' '+b+' '+unit+um+ym);
    }
  console.log('hourly-wage '+n+' cases');
})();
console.log(`age ${ac} dates, wareki ${n} dates, tax ${c} combos, fail=${fail}`);process.exit(fail?1:0);
