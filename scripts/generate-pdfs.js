const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const tpl = require("./pdf-template");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets/pdf");
const TMP_DIR = path.join(ROOT, "scripts/.tmp-html");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

async function renderPdf(browser, html, outPath) {
  const tmpFile = path.join(TMP_DIR, "tmp-" + Date.now() + "-" + Math.random().toString(36).slice(2) + ".html");
  fs.writeFileSync(tmpFile, html, "utf8");
  const page = await browser.newPage();
  await page.goto("file://" + tmpFile, { waitUntil: "networkidle" });
  await page.pdf({ path: outPath, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
  await page.close();
  fs.unlinkSync(tmpFile);
}

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  // 1. Per-card PDFs
  for (const c of tpl.cardsData) {
    const html = tpl.wrapDoc(tpl.cardPageHtml(c));
    const num = String(c.id).padStart(2, "0");
    const fileName = "carta-" + num + "-" + tpl.slugify(c.name) + ".pdf";
    await renderPdf(browser, html, path.join(OUT_DIR, fileName));
    console.log("OK:", fileName);
  }

  // 2. Combined guide PDF
  let combinedBody = tpl.coverPageHtml() + tpl.tocPageHtml();
  for (const c of tpl.cardsData) {
    combinedBody += tpl.cardPageHtml(c);
  }
  combinedBody += tpl.bonusPagesHtml();
  const combinedHtml = tpl.wrapDoc(combinedBody);
  await renderPdf(browser, combinedHtml, path.join(OUT_DIR, "guida-completa.pdf"));
  console.log("OK: guida-completa.pdf");

  await browser.close();
  fs.rmdirSync(TMP_DIR, { recursive: true });
}

main().catch((e) => { console.error(e); process.exit(1); });
