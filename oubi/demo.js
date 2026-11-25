/*
 * 桜ミツ（見せる用）：開くたびに見本のデータで始まる版。入力・変更は再読み込みで元に戻る。
 *   node oubi/tools/build-web.js <出力先> --artifact --demo で作る（本番の桜ミツとは別のページに置く）
 *   社員の練習・お客様や取引先への紹介用。見本の会社・お客様・見積はすべて架空（発行元だけ自社）。
 */
(function (root) {
  'use strict';
  root.OUMITSU_DEMO = true;
  var KEYS = /^(oubi\.|easy-estimate|oumitsu:)/;
  try { Object.keys(localStorage).filter(function (k) { return KEYS.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  try { indexedDB.deleteDatabase('oubi-local-files'); } catch (e) {}
  var D = root.EE.data, s = D.sampleState(), t = D.today();
  Object.assign(s.company, { name: '株式会社桜美建設', zip: '194-0022', address: '東京都町田市森野4-15-12 寺田ビルA-211号', tel: '042-794-7290', fax: '042-794-7291',
    email: '', rep: '', license: '', bank: '', invoiceRegNo: '' });
  // 見せどころ：確定した見積を1通「8日前にメールで提出・返事待ち」にしておく（ホームの「次の一手」に出る）
  var iss = s.documents.filter(function (d) { return d.status === 'issued'; })[0];
  if (iss) { iss.issueDate = D.addDays(t, -9); iss.validUntil = D.addDays(t, 21); iss.issuedAt = new Date(Date.now() - 9 * 864e5).toISOString(); iss.sent = [{ date: D.addDays(t, -8), via: 'メール', at: new Date(Date.now() - 8 * 864e5).toISOString() }]; }
  try {
    localStorage.setItem('easy-estimate:v1', JSON.stringify(s));
    localStorage.setItem('oubi.local.me', JSON.stringify({ id: 'usr_demo' }));
    localStorage.setItem('oubi.ldb.staff', JSON.stringify({ usr_demo: { name: '見本 太郎', createdAt: '2026-01-01T00:00:00Z' } }));
    localStorage.setItem('oubi.backup.at', new Date().toISOString());   // 見せる用ではバックアップの知らせを出さない
  } catch (e) {}
  // 「見せる用」の印：左の列の下（スマホは下のボタンの上）
  function mark() {
    if (document.getElementById('demo-mark')) return;
    var m = document.createElement('div'); m.id = 'demo-mark'; m.setAttribute('role', 'note');
    m.innerHTML = '<b>見せる用</b><span>ここでの入力・変更は保存されず、再読み込みで元に戻ります</span>';
    document.body.appendChild(m);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
})(this);
