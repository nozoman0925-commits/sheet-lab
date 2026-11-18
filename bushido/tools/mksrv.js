// テスト用の配信ページを作る：本体の最後に、内部を覗く口（window.__T）を差し込んだコピー
// 使い方: node tools/mksrv.js <bushido.html> <出力フォルダ>
const fs=require('fs');const [,,SRC,OUT]=process.argv;
let src=fs.readFileSync(SRC,'utf8');const i=src.lastIndexOf('})();\n</script>');
if(i<0)throw new Error("差し込み位置が見つからない");
src=src.slice(0,i)+'ui.grpAll=true;ui.noPrologue=true;window.__T={ui,get S(){return S},totalExp,todayKey,day,flowX,typeOf,mLine,adviceBody,TYPES,render,A,photoLoad,streak,catLevel,missionPlan,MISSIONS,MBYID,addDays,MDATA,expEvents,warn,painActive,unsupDays,swordSVG,QUOTES,quoteOfDay,icsFile};\n'+src.slice(i);
const PAGE='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+src+'</body></html>';
fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(OUT+'/index.html',PAGE);fs.writeFileSync(OUT+'/pl.html',PAGE.replace('ui.noPrologue=true;',''));
