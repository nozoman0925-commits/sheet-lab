const fs=require('fs');
function load(f){const h=fs.readFileSync(f,'utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);return new Function(m[1]+';return {'+ (f.includes('wareki')?'toWareki,toSeireki':f.includes('tax')?'calcTax,divRound':f.includes('age')?'calcAge,leap':f.includes('zenkaku')?'toHalf,toFull,H2F,F2H':f.includes('space-remove')?'cleanSpaces':f.includes('phone-format')?'cleanPhones':'countText')+'}')();}
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
console.log(`age ${ac} dates, wareki ${n} dates, tax ${c} combos, fail=${fail}`);process.exit(fail?1:0);
