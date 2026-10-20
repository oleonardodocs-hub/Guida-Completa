// Costruisce l'HTML per i PDF (singola carta + guida completa)
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const cardsData = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8")).cards;
const sprite = fs.readFileSync(path.join(ROOT, "assets/icons/cards-sprite.svg"), "utf8");

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

var baseStyle = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin:0; padding:0; background:#3A0712; }
  body { font-family: 'Jost', 'Segoe UI', sans-serif; color:#F3E4C8; }
  h1,h2,h3,h4 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight:600; margin:0 0 8px; }
  p { margin:0 0 10px; color:#D8BE93; line-height:1.55; }
  .page { width:210mm; min-height:297mm; padding:14mm 15mm; position:relative; page-break-after: always; background:
    radial-gradient(ellipse 60% 40% at 15% 0%, rgba(201,151,46,0.12), transparent 60%),
    radial-gradient(ellipse 50% 50% at 90% 10%, rgba(150,26,54,0.35), transparent 60%),
    #3A0712; }
  .page:last-child { page-break-after: auto; }
  .brand-row { display:flex; align-items:center; gap:8px; margin-bottom: 5mm; color:#C9972E; font-family:'Cormorant Garamond',serif; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; }
  .card-num { color:#C9972E; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:3px; }
  .card-title { font-size:28px; color:#F3E4C8; margin-bottom:2px; }
  .card-subtitle { font-style:italic; color:#B89468; margin-bottom:8px; font-size:12.5px; }
  .chip-row { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px; }
  .chip { font-size:9.5px; padding:2px 9px; border-radius:999px; background:#E8C878; border:1px solid #C9972E; color:#4A0714; }
  .icon-wrap { width:58px; height:58px; border-radius:50%; background:#E8C878; border:1px solid #C9972E; display:flex; align-items:center; justify-content:center; color:#6B0A1E; float:right; }
  .icon-wrap svg { width:32px; height:32px; }
  .meaning-grid { display:flex; gap:8mm; margin-bottom: 5mm; clear:both; }
  .meaning-box { flex:1; background:#4F0918; border:1px solid #7A2030; border-radius:10px; padding:9px 12px; }
  .meaning-box.upright { border-left:3px solid #7FB56A; }
  .meaning-box.reversed { border-left:3px solid #E08A4F; }
  .meaning-box h4 { font-family:'Jost',sans-serif; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; color:#B89468; margin-bottom:4px; }
  .meaning-box p { font-size:11px; color:#F3E4C8; margin:0; line-height:1.4; }
  .life-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:5mm; }
  .life-card { background:#5C0B1D; border:1px solid #7A2030; border-radius:10px; padding:8px 10px; }
  .life-card .label { font-family:'Cormorant Garamond',serif; font-weight:600; color:#C9972E; font-size:12.5px; margin-bottom:3px; }
  .life-card p { font-size:10.5px; margin:0; line-height:1.4; color:#D8BE93; }
  .sp-grid { display:flex; gap:8mm; margin-bottom:5mm; }
  .sp-box { flex:1; background:#4F0918; border:1px solid #7A2030; border-radius:10px; padding:9px 12px; }
  .sp-box h4 { font-size:11px; margin-bottom:5px; }
  .sp-box.strengths h4 { color:#7FB56A; }
  .sp-box.attention h4 { color:#E08A4F; }
  .sp-box ul { margin:0; padding:0; list-style:none; }
  .sp-box li { font-size:10px; color:#D8BE93; margin-bottom:4px; padding-left:11px; position:relative; line-height:1.35; }
  .sp-box li::before { content:"·"; position:absolute; left:0; color:#C9972E; }
  .combo-title { font-size:13.5px; color:#C9972E; margin-bottom:6px; }
  .combo-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px; }
  .combo-item { background:#4F0918; border:1px solid #7A2030; border-radius:8px; padding:6px 8px; font-size:9.3px; color:#D8BE93; line-height:1.3; }
  .combo-item b { color:#F3E4C8; display:block; font-size:9.8px; margin-bottom:2px; }
  .footer-note { position:absolute; bottom:8mm; left:15mm; right:15mm; text-align:center; font-size:8.5px; color:#B89468; border-top:1px solid #7A2030; padding-top:5px; }
  .cover { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; height:261mm; }
  .cover .mark { font-size:40px; color:#C9972E; margin-bottom:16px; }
  .cover h1 { font-size:46px; max-width:140mm; }
  .cover .gold { color:#C9972E; }
  .cover p.sub { max-width:120mm; font-size:14px; }
  .toc-list { columns:2; gap:14mm; }
  .toc-list div { font-size:12px; color:#D8BE93; margin-bottom:8px; }
  .toc-list span { color:#C9972E; margin-right:6px; font-weight:600; }
  .bonus-sec h3 { color:#C9972E; font-size:17px; margin:14px 0 6px; }
  .bonus-sec ul { margin:0 0 10px; padding:0; list-style:none; }
  .bonus-sec li { font-size:11.5px; color:#D8BE93; margin-bottom:8px; padding-left:14px; position:relative; }
  .bonus-sec li::before { content:"✦"; position:absolute; left:0; top:2px; font-size:8px; color:#C9972E; }
  table.insert { width:100%; border-collapse:collapse; font-size:10.5px; }
  table.insert th, table.insert td { text-align:left; padding:5px 8px; border-bottom:1px solid #7A2030; }
  table.insert th { color:#C9972E; }
  .rune-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
  .rune-card { background:#4F0918; border:1px solid #7A2030; border-radius:8px; padding:8px; text-align:center; }
  .rune-sym { font-size:22px; color:#C9972E; font-family: serif; }
  .rune-card h4 { font-size:11px; margin:4px 0 2px; }
  .rune-card p { font-size:9px; margin:0; }
`;

function iconSvg(id) {
  return '<svg viewBox="0 0 100 100">' + extractSymbolInner(id) + "</svg>";
}
function extractSymbolInner(id) {
  var re = new RegExp('<symbol id="ico-' + id + '"[^>]*>([\\s\\S]*?)<\\/symbol>');
  var m = sprite.match(re);
  return m ? m[1] : "";
}

function cardPageHtml(c, isStandalone) {
  var combos = c.combinations.map(function (combo) {
    var target = cardsData.filter(function (x) { return x.id === combo.with; })[0];
    return '<div class="combo-item"><b>+ ' + esc(target ? target.name : "") + "</b>" + esc(combo.text) + "</div>";
  }).join("");

  return (
    '<div class="page">' +
      '<div class="brand-row">✦ Guida alle Carte Lenormand &mdash; Metodo Completo</div>' +
      '<div class="icon-wrap">' + iconSvg(c.id) + "</div>" +
      '<div class="card-num">Carta N. ' + String(c.id).padStart(2, "0") + '</div>' +
      '<h1 class="card-title">' + esc(c.name) + "</h1>" +
      '<div class="card-subtitle">' + esc(c.subtitle || "") + "</div>" +
      '<div class="chip-row">' + c.keywords.map(function (k) { return '<span class="chip">' + esc(k) + "</span>"; }).join("") + "</div>" +

      '<div class="meaning-grid">' +
        '<div class="meaning-box upright"><h4>Significato Dritto</h4><p>' + esc(c.uprightMeaning) + "</p></div>" +
        '<div class="meaning-box reversed"><h4>Significato Rovesciato</h4><p>' + esc(c.reversedMeaning) + "</p></div>" +
      "</div>" +

      '<div class="life-grid">' +
        '<div class="life-card"><div class="label">Amore</div><p>' + esc(c.love) + "</p></div>" +
        '<div class="life-card"><div class="label">Lavoro</div><p>' + esc(c.work) + "</p></div>" +
        '<div class="life-card"><div class="label">Finanze</div><p>' + esc(c.finance) + "</p></div>" +
        '<div class="life-card"><div class="label">Spiritualit&agrave;</div><p>' + esc(c.spirituality) + "</p></div>" +
      "</div>" +

      '<div class="sp-grid">' +
        '<div class="sp-box strengths"><h4>Punti di Forza</h4><ul>' + c.strengths.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div>" +
        '<div class="sp-box attention"><h4>Punti di Attenzione</h4><ul>' + c.attention.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div>" +
      "</div>" +

      '<div class="combo-title">Combinazioni con altre carte</div>' +
      '<div class="combo-grid">' + combos + "</div>" +

      '<div class="footer-note">Guida alle Carte Lenormand &middot; Contenuto informativo ed educativo &middot; oleonardodocs-hub.github.io/guida-lenormand</div>' +
    "</div>"
  );
}

function wrapDoc(bodyHtml) {
  return (
    "<!DOCTYPE html><html lang=\"it\"><head><meta charset=\"UTF-8\">" +
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500;600;700&display=swap" rel="stylesheet">' +
    "<style>" + baseStyle + "</style></head><body>" + bodyHtml + "</body></html>"
  );
}

function coverPageHtml() {
  return (
    '<div class="page"><div class="cover">' +
      '<div class="mark">✦</div>' +
      '<h1>Guida alle Carte <span class="gold">Lenormand</span></h1>' +
      '<p class="sub">Il Metodo Completo: le 36 carte, le loro combinazioni e i 5 bonus esclusivi, raccolti in un\'unica guida.</p>' +
    "</div></div>"
  );
}

function tocPageHtml() {
  var cols = cardsData.map(function (c) {
    return '<div><span>' + String(c.id).padStart(2, "0") + "</span>" + esc(c.name) + "</div>";
  }).join("");
  return (
    '<div class="page">' +
      '<div class="brand-row">✦ Guida alle Carte Lenormand</div>' +
      "<h2 style=\"color:#C9972E; margin-bottom:14px;\">Indice delle 36 Carte</h2>" +
      '<div class="toc-list">' + cols + "</div>" +
      '<div class="footer-note">Guida alle Carte Lenormand &middot; Metodo Completo</div>' +
    "</div>"
  );
}

function bonusPagesHtml() {
  var corte = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bonus-corte.json"), "utf8"));
  var arcani = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bonus-arcani-minori.json"), "utf8"));
  var rituali = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bonus-rituali.json"), "utf8"));
  var rune = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bonus-rune.json"), "utf8"));
  var diario = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bonus-diario.json"), "utf8"));

  function sectionsHtml(data) {
    var h = '<p style="font-size:12px;">' + esc(data.intro) + "</p>";
    (data.sections || []).forEach(function (s) {
      h += '<div class="bonus-sec">';
      if (s.heading) h += "<h3>" + esc(s.heading) + "</h3>";
      if (s.body) h += "<p style=\"font-size:11.5px;\">" + esc(s.body) + "</p>";
      if (s.items) h += "<ul>" + s.items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>";
      if (s.table) {
        h += '<table class="insert"><thead><tr><th>Carta</th><th>Carta inserita</th></tr></thead><tbody>';
        h += s.table.map(function (r) { return "<tr><td>" + esc(r.card) + "</td><td>" + esc(r.insert) + "</td></tr>"; }).join("");
        h += "</tbody></table>";
      }
      h += "</div>";
    });
    return h;
  }

  function bonusPage(title, subtitle, innerHtml) {
    return (
      '<div class="page">' +
        '<div class="brand-row">✦ Guida alle Carte Lenormand &mdash; Bonus</div>' +
        '<h2 style="font-size:28px; margin-bottom:2px;">' + esc(title) + "</h2>" +
        '<p style="font-style:italic; color:#B89468; margin-bottom:12px; font-size:12px;">' + esc(subtitle) + "</p>" +
        innerHtml +
        '<div class="footer-note">Guida alle Carte Lenormand &middot; Bonus Esclusivo</div>' +
      "</div>"
    );
  }

  var out = "";
  out += bonusPage(corte.title, corte.subtitle, sectionsHtml(corte));
  out += bonusPage(arcani.title, arcani.subtitle, sectionsHtml(arcani));
  out += bonusPage(rituali.title, rituali.subtitle, sectionsHtml(rituali) +
    '<div class="bonus-sec" style="margin-top:8px;"><p style="font-size:10px; color:#B89468;">' + esc(rituali.disclaimer) + "</p></div>");

  var runeGrid = '<div class="rune-grid">' + rune.runes.map(function (r) {
    return '<div class="rune-card"><div class="rune-sym">' + r.symbol + "</div><h4>" + esc(r.name) + "</h4><p>" + esc(r.meaning) + "</p></div>";
  }).join("") + "</div>";
  out += bonusPage(rune.title, rune.subtitle, '<p style="font-size:11.5px;">' + esc(rune.intro) + "</p>" + runeGrid);
  out += bonusPage(diario.title, diario.subtitle, sectionsHtml(diario));

  return out;
}

module.exports = { cardsData, wrapDoc, cardPageHtml, coverPageHtml, tocPageHtml, bonusPagesHtml, slugify };
