// 専門家レビュー用の表（CSV・Excelで開ける）を本体から書き出す
// 使い方: node tools/export_review.js  → docs/review/missions.csv, quotes.csv
const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'..');
const s=fs.readFileSync(ROOT+'/bushido.html','utf8');
const js=s.slice(s.indexOf('<script>',s.indexOf('</script>'))+8,s.lastIndexOf('</script>'));
function grab(n){const st=js.indexOf('const '+n+'=')+n.length+7;let d=0,q=null,j=st;
  for(;j<js.length;j++){const c=js[j];if(q){if(c==='\\'){j++;continue}if(c===q)q=null;continue}
    if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{'||c==='[')d++;if(c==='}'||c===']'){d--;if(!d)break}}
  return Function('return ('+js.slice(st,j+1)+')')()}
const RAW=grab('MISSIONS_RAW'),MDATA=grab('MDATA'),OPP=grab('OPP_M'),QU=grab('QUOTES'),CATS=grab('CATS'),MP=grab('MPURPOSE');
const esc=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const csv=(rows)=>'﻿'+rows.map(r=>r.map(esc).join(',')).join('\r\n')+'\r\n';
const H=['ID','分類','課題文','難度(1-9)','狙い（目的）','所要時間','いつやるか','最小版（できない日の版）','実行の手順','安全面の確認','表現の確認','判定（可/要修正/削除）','コメント'];
const rows=[H];
Object.keys(RAW).forEach(c=>RAW[c].forEach((x,i)=>{const id=c+'-'+i,d=MDATA[id]||[],q=x[2];
  rows.push([id,(CATS[c]&&CATS[c].name)||'人間関係・礼節',x[0],x[1],q?(MP[q]||MP[q[0]]||''):'',d[0],d[1],d[2],d[3],'','','',''])}));
Object.keys(OPP).forEach(L=>OPP[L].forEach((x,j)=>{const id='o-'+L+j,d=MDATA[id]||[];
  rows.push([id,'型の弱点を鍛える（'+L+'）',x[0],x[1],'',d[0],d[1],d[2],d[3],'','','',''])}));
fs.writeFileSync(ROOT+'/docs/review/missions.csv',csv(rows));
const Q=[['番号','言葉','人物','出典','場面タグ','注記（訳＝現代語訳など）','人物・出典は正しいか','言葉は原文どおりか','判定（可/要修正/削除）','コメント']];
QU.forEach((x,i)=>Q.push([i+1,x[0],x[1],x[2],x[3],x[4]||'','','','','']));
fs.writeFileSync(ROOT+'/docs/review/quotes.csv',csv(Q));
console.log('課題',rows.length-1,'件 / 言葉',Q.length-1,'件');
