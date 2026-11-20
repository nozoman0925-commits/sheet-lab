/*
 * 桜ミツ版（Web）を作る：桜ミツの構成のまま、業務管理の機能（営業・工事・カレンダー・ホワイトボード）を入れたもの
 *   node oubi/tools/build-web.js <出力先フォルダ> [--artifact]
 *   --artifact … claude.ai の Artifact に置く形（index.html の doctype・head・body を外す。PDF・画像の読み取りの部品は入れない）
 * 記録はこの端末の中だけ（業務管理は oubi/local-db.js）。
 */
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const EE = path.join(ROOT, 'easy-estimate'), OB = path.join(ROOT, 'oubi');
const OUT = process.argv[2]; const ART = process.argv.includes('--artifact');
if (!OUT) { console.error('出力先を指定してください'); process.exit(1); }
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const cp = (a, b) => fs.cpSync(a, b, { recursive: true });
cp(path.join(EE, 'css'), path.join(OUT, 'css'));
cp(path.join(EE, 'js'), path.join(OUT, 'js'));
if (!ART) { try { fs.symlinkSync(path.join(EE, 'vendor'), path.join(OUT, 'vendor')); } catch (e) {} }
fs.copyFileSync(path.join(OB, 'link.js'), path.join(OUT, 'js', 'oubi-link.js'));
fs.copyFileSync(path.join(OB, 'mitsu-bridge.js'), path.join(OUT, 'js', 'oubi-bridge.js'));
fs.writeFileSync(path.join(OUT, 'css', 'oubi-frame.css'),
`/* 桜ミツ版：業務管理の画面の枠（#/o/… のときだけ見せる） */
#ob-frame { display: none; flex: 1 1 auto; width: 100%; min-height: 0; border: 0; background: transparent; color-scheme: dark; }
body.ob-on #ob-frame { display: block; }
body.ob-on #view { display: none; }
`);

/* ---- 桜ミツの index.html：枠の見た目・つなぎを足し、起動を「業務管理の準備ができてから」に ---- */
let ix = fs.readFileSync(path.join(EE, 'index.html'), 'utf8');
const sub = (a, b) => { if (!ix.includes(a)) throw new Error('見つからない: ' + a.slice(0, 60)); ix = ix.replace(a, b); };
sub('<link rel="stylesheet" href="css/control.css">', '<link rel="stylesheet" href="css/control.css">\n<link rel="stylesheet" href="css/oubi-frame.css">');
sub('<script src="js/palette.js"></script>', '<script src="js/palette.js"></script>\n<script src="js/oubi-link.js"></script>\n<script src="js/oubi-bridge.js"></script>');
const bootA = ix.indexOf('  var started = false;'), bootB = ix.indexOf('</script>', bootA);
ix = ix.slice(0, bootA) + `  // 桜ミツ版：ログインした人を業務管理に渡し、工事・見積の記録がそろってから画面を開く
  var started = false, ready = false, wantIntro = false;
  function bootNow(user) {
    if (started) return; started = true;
    OUBI_LINK.start(user, function () { EE.app.boot({ deferIntro: true, user: user }); ready = true; if (wantIntro) EE.app.intro(); });
  }
  function intro() { if (ready) EE.app.intro(); else wantIntro = true; }
  var gate = EE.auth.current() ? null : EE.login.gate(function (user) { bootNow(user); intro(); });
  if (!gate) setTimeout(function () { bootNow(EE.auth.current()); }, 600);
  EE.splash.play({
    target: function () { return gate && gate.target(); },
    onReveal: function () { if (gate) gate.reveal(); else { bootNow(EE.auth.current()); intro(); } }
  });
` + ix.slice(bootB);
if (ART) {
  ix = ix.replace(/<!doctype html>\s*<html[^>]*>\s*<head>\s*/i, '').replace(/<meta[^>]*>\s*/g, '').replace('</head>', '')
    .replace(/<body[^>]*>\s*/, '').replace('</body>', '').replace('</html>', '').replace(/<script src="vendor\/[^"]*"><\/script>\s*/g, '');
  ix = ix.replace('</title>\n', '</title>\n<style>:root{color-scheme:dark} html,body{background:#06080e}</style>\n');
}
fs.writeFileSync(path.join(OUT, 'index.html'), ix.trim() + '\n');

/* ---- 業務管理の画面（oubi.html）：この端末だけの保存先・枠用の見た目。見積（桜ミツ）は親の画面のものを使う ---- */
let ob = fs.readFileSync(path.join(OB, 'index.html'), 'utf8');
const rm = re => { ob = ob.replace(re, ''); };
rm(/<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"[^>]*>\s*/);
rm(/<link rel="preconnect" href="https:\/\/[a-z0-9]+\.supabase\.co"[^>]*>\s*/);
rm(/<link rel="preload" as="script" href="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^>]*>\s*/);
rm(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^>]*><\/script>\s*/);
rm(/<script src="config\.js"><\/script>\s*/);
ob = ob.replace('<script src="supa.js"></script>', '<script src="embed.js"></script>\n<script src="local-db.js"></script>');
rm(/<link rel="stylesheet" href="mitsu\.css">\s*/); rm(/<link rel="stylesheet" href="mitsu-host\.css">\s*/);
ob = ob.replace('<link rel="stylesheet" href="theme-oumitsu.css">', '<link rel="stylesheet" href="theme-oumitsu.css">\n<link rel="stylesheet" href="embed.css">');
rm(/<script src="mitsu\.js" defer><\/script>\s*/); rm(/<script src="mitsu-bridge\.js" defer><\/script>\s*/);
rm(/<link rel="manifest"[^>]*>\s*/);
ob = ob.replace("if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});", '');
['@supabase', 'src="config.js"', 'src="supa.js"', 'src="mitsu.js"', 'href="mitsu.css"', 'href="mitsu-host.css"', 'serviceWorker.register'].forEach(k => { if (ob.includes(k)) throw new Error('残っている: ' + k); });
fs.writeFileSync(path.join(OUT, 'oubi.html'), ob);
['sales.js', 'features.js', 'health.js', 'theme-oumitsu.css', 'local-db.js', 'embed.js', 'embed.css', 'logo-s.jpg', 'logo.jpg', 'icon-192.png', 'icon-180.png'].forEach(f => fs.copyFileSync(path.join(OB, f), path.join(OUT, f)));
console.log('作成:', OUT, ART ? '（Artifact 用）' : '');
