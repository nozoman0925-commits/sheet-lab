const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
let src=fs.readFileSync('bushido.html','utf8');const i=src.lastIndexOf('})();\n</script>');src=src.slice(0,i)+'ui.grpAll=true;ui.noPrologue=true;window.__T={ui,get S(){return S},flowX,QMAP,render};\n'+src.slice(i);
await p.setContent('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+src+'</body></html>');
await p.waitForTimeout(300);
await p.evaluate(()=>{const T=__T;T.ui.ob={m:{motive:'rival',name:'x',gender:'male'},sign:'t'};T.ui.obStep=T.flowX().indexOf('tone');T.render()});
await p.screenshot({path:'y0.png'});await p.click('[data-act=obTone][data-v=oni]');await p.waitForTimeout(300);
// 一番悪い答え（最初の選択肢）を選び続ける。心・けが・睡眠時間で煽られたら記録
const taunted=[];let g=0,shot=0;
while(g++<220){const id=await p.evaluate(()=>__T.ui.obPick?"pick":__T.flowX()[__T.ui.obStep]);
  if(id==="plan")break;
  if(await p.evaluate(()=>!document.getElementById('taunt').hidden)){if(shot++<1)await p.screenshot({path:'y1.png'});await p.click('[data-act=tauntNext]');await p.waitForTimeout(150);continue}
  if(id==="building"){await p.waitForTimeout(3300);continue}
  if(id==="type"){await p.screenshot({path:'y2.png',fullPage:true});console.log('type:',await p.textContent('.type-name'),await p.textContent('.type-code'));await p.click('[data-act=obNext]');continue}
  if(id==="result"||id.startsWith("ch:")){await p.click('[data-act=obNext]');continue}
  if(id==="s1"){await p.click('[data-act=obTimes]');continue}
  if(await p.$(".pair-o")){await p.click(".pair-o.p1");await p.waitForTimeout(260);continue}
  if(await p.$('[data-act=obMulti]')){await p.click('.qopt >> nth=0');await p.click('[data-act=obNext]');continue}
  const q=await p.evaluate(()=>{const id=__T.flowX()[__T.ui.obStep];const q=__T.QMAP[id];let best=0,bs=-1;q.opts.forEach((o,i)=>{if(o.s!=null&&o.s>bs){bs=o.s;best=i}});return{id,best}});
  await p.click('.qopt >> nth='+q.best);await p.waitForTimeout(300);
  if(await p.evaluate(()=>!document.getElementById('taunt').hidden))taunted.push(q.id);
}
console.log('taunted count:',taunted.length,'| protected taunted:',taunted.filter(x=>/^m|^b9|^b10|^s3|^s8/.test(x)));
console.log('errors',JSON.stringify(errs));await b.close()})();
