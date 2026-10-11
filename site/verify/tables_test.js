const fs=require('fs');let fail=0;
const h=fs.readFileSync('tools/wareki-table/body.html','utf8');
const fmt=n=>new Intl.DateTimeFormat('ja-JP-u-ca-japanese',{era:'long',year:'numeric',timeZone:'UTC'}).formatToParts(new Date(Date.UTC(n[0],n[1]-1,n[2]))).reduce((o,x)=>(o[x.type]=x.value,o),{});
const lab=p=>p.era+(p.year==='1'?'元':p.year)+'年';
let c=0;
for(const m of h.matchAll(/<tr><td>(\d{4})年<\/td><td>([^<]+)<\/td><\/tr>/g)){const y=+m[1];const a=lab(fmt([y,1,1])),b=lab(fmt([y,12,31]));const exp=a===b?a:`${a}(〜改元)/${b}`;c++;if(m[2]!==exp){fail++;console.log('NG',y,m[2],exp);}}
const t=fs.readFileSync('tools/tax-table/body.html','utf8');
for(const m of t.matchAll(/<tr><td>([\d,]+)円<\/td><td>([\d,]+)円<\/td><td>([\d,]+)円<\/td><\/tr>/g)){const a=+m[1].replace(/,/g,'');const i10=a+Math.floor(a*10/100),i8=a+Math.floor(a*8/100);c++;if(+m[2].replace(/,/g,'')!==i10||+m[3].replace(/,/g,'')!==i8){fail++;console.log('NG tax',a);}}
console.log('rows checked',c,'fail',fail);process.exit(fail?1:0);
