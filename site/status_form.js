var KINDS = {"記事": "article", "無料ツール": "tool", "商品": "product", "サイトの修正": "fix", "その他": "other"};
var REPO = "nozoman0925-commits/sheet-lab";
function jstParts(now) {
  var d = new Date(now.getTime() + 9 * 3600 * 1000);
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return {
    ymd: "" + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()),
    hm: p(d.getUTCHours()) + p(d.getUTCMinutes()),
    label: d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate()) + " " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + " JST"
  };
}
function buildRequest(kind, theme, detail, urgent, now) {
  var t = jstParts(now);
  var path = "pdca/requests/" + t.ymd + "-" + t.hm + "-" + (KINDS[kind] || "other") + ".md";
  var content = "# 依頼\n\n- 受付: " + t.label + "\n- 種類: " + kind + "\n- テーマ: " + theme +
    "\n- 急ぎ: " + (urgent ? "はい" : "いいえ") + "\n\n## 詳しい内容\n\n" + (detail || "") + "\n\n## 対応結果(AIが記入)\n\n";
  var url = "https://github.com/" + REPO + "/new/main?filename=" + encodeURIComponent(path) + "&value=" + encodeURIComponent(content);
  return {path: path, content: content, url: url};
}
if (typeof module !== "undefined") { module.exports = {buildRequest: buildRequest}; }
