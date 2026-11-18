const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
let src=fs.readFileSync('bushido.html','utf8');const i=src.lastIndexOf('})();\n</script>');src=src.slice(0,i)+'ui.grpAll=true;ui.noPrologue=true;window.__T={ui,get S(){return S},totalExp,render,victories};\n'+src.slice(i);
await p.setContent('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+src+'</body></html>');
await p.waitForTimeout(300);await p.click('[data-act=demo]');await p.waitForTimeout(300);
console.log('ceremony on demo start (should be hidden):',await p.evaluate(()=>document.getElementById('ceremony').hidden));
await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(200);
// 即時フィードバック：掟を1つ押す
await p.click('#sec-okite .okmain');await p.waitForTimeout(250);await p.screenshot({path:'g_exp.png',clip:{x:0,y:0,width:390,height:120}});
console.log('exp text:',await p.textContent('#expn'));
// 昇格演出
await p.evaluate(()=>{__T.ui.rankUp=2;__T.render()});await p.waitForTimeout(700);await p.screenshot({path:'g_cer.png'});
await p.click('[data-cer=cert]');await p.waitForTimeout(1500);await p.screenshot({path:'g_cert.png'});
await p.click('#sheet .grid2 [data-act=closeSheet]');
// 姿見の写真
await p.click('#tabs [data-tab=roku]');await p.waitForTimeout(300);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(150)}
const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#sec-mirror [data-act=photo]')]);await fc.setFiles('face.jpg');await p.waitForTimeout(800);
await (await p.$('#sec-mirror')).scrollIntoViewIfNeeded();await p.screenshot({path:'g_mirror.png'});
console.log('photo flag:',await p.evaluate(()=>!!Object.values(__T.S.days).some(d=>d.photo)),'img loaded:',await p.evaluate(()=>{const im=document.querySelector('#sec-mirror img');return !!(im&&im.src.startsWith('data:image/jpeg'))}));
console.log('errors',JSON.stringify(errs));await b.close()})();
