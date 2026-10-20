/* ============================================================
   Guida alle Carte Lenormand — App logic
   Vanilla JS, hash router, nessuna dipendenza esterna.
   ============================================================ */

(function () {
  "use strict";

  var state = {
    cards: [],
    cardsById: {},
    bonuses: {
      "segreti-della-corte": null,
      "arcani-minori-combinati": null,
      "consacrazione-rituali": null,
      "guida-alle-rune": null,
      "diario-delle-letture": null
    },
    loaded: false
  };

  var BONUS_META = [
    { slug: "segreti-della-corte", file: "data/bonus-corte.json", icon: "crown" },
    { slug: "arcani-minori-combinati", file: "data/bonus-arcani-minori.json", icon: "layers" },
    { slug: "consacrazione-rituali", file: "data/bonus-rituali.json", icon: "flame" },
    { slug: "guida-alle-rune", file: "data/bonus-rune.json", icon: "rune" },
    { slug: "diario-delle-letture", file: "data/bonus-diario.json", icon: "notebook" }
  ];

  var DIARIO_KEY = "lenormand_diario_v1";

  /* ---------------- Utilities ---------------- */

  function slugify(name) {
    return name
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/'/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function pdfFileFor(card) {
    var num = String(card.id).padStart(2, "0");
    return "assets/pdf/carta-" + num + "-" + slugify(card.name) + ".pdf";
  }

  function icon(name, extraClass) {
    return '<svg class="' + (extraClass || "") + '" aria-hidden="true"><use href="#ico-' + name + '"></use></svg>';
  }

  function cardIcon(id, extraClass) { return icon(id, extraClass); }

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var toastTimer = null;
  function toast(msg) {
    var el = qs("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  /* ---------------- Data loading ---------------- */

  function loadSprite() {
    return fetch("assets/icons/cards-sprite.svg")
      .then(function (r) { return r.text(); })
      .then(function (svgText) {
        var wrap = document.createElement("div");
        wrap.style.display = "none";
        wrap.innerHTML = svgText;
        document.body.insertBefore(wrap, document.body.firstChild);
      })
      .catch(function (e) { console.warn("Sprite non caricato", e); });
  }

  function loadData() {
    var cardsP = fetch("data/cards.json").then(function (r) { return r.json(); });
    var bonusPs = BONUS_META.map(function (b) {
      return fetch(b.file).then(function (r) { return r.json(); }).then(function (data) {
        state.bonuses[b.slug] = data;
      });
    });
    return Promise.all([cardsP].concat(bonusPs)).then(function (results) {
      state.cards = results[0].cards;
      state.cards.forEach(function (c) { state.cardsById[c.id] = c; });
      state.loaded = true;
    });
  }

  /* ---------------- Diario (localStorage) ---------------- */

  function getDiario() {
    try {
      var raw = localStorage.getItem(DIARIO_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveDiarioEntry(entry) {
    try {
      var list = getDiario();
      list.unshift(entry);
      localStorage.setItem(DIARIO_KEY, JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  function deleteDiarioEntry(id) {
    try {
      var list = getDiario().filter(function (e) { return e.id !== id; });
      localStorage.setItem(DIARIO_KEY, JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  function updateDiarioNote(id, notes) {
    try {
      var list = getDiario();
      list.forEach(function (e) { if (e.id === id) e.followUp = notes; });
      localStorage.setItem(DIARIO_KEY, JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- Templates: Card tile / detail ---------------- */

  function cardTileHtml(c) {
    return (
      '<div class="card-tile" data-nav="/carta/' + c.id + '">' +
        '<div class="tile-num">N. ' + String(c.id).padStart(2, "0") + '</div>' +
        '<div class="tile-icon">' + cardIcon(c.id) + '</div>' +
        "<h3>" + escapeHtml(c.name) + "</h3>" +
        '<div class="tile-sub">' + escapeHtml(c.subtitle || "") + "</div>" +
      "</div>"
    );
  }

  function comboItemHtml(combo) {
    var target = state.cardsById[combo.with];
    if (!target) return "";
    return (
      '<div class="combo-item" data-nav="/carta/' + target.id + '">' +
        '<div class="combo-icon">' + cardIcon(target.id) + '</div>' +
        '<div class="combo-text"><span class="combo-name">+ ' + escapeHtml(target.name) + '</span>' + escapeHtml(combo.text) + "</div>" +
      "</div>"
    );
  }

  function lifeAreaBox(iconId, label, text) {
    return (
      '<div class="life-area-card">' +
        '<div class="area-label"><span class="badge-icon">' + icon(iconId) + '</span><span class="badge-label">' + label + "</span></div>" +
        "<p>" + escapeHtml(text) + "</p>" +
      "</div>"
    );
  }

  function cardDetailHtml(c) {
    var combosHtml = c.combinations.map(comboItemHtml).join("");
    return (
      '<a href="#/carte" class="back-link">&larr; Torna a tutte le carte</a>' +
      '<div class="card-detail-head">' +
        '<div class="card-detail-icon">' + cardIcon(c.id) + '</div>' +
        '<div class="card-detail-meta">' +
          '<div class="tile-num">CARTA N. ' + String(c.id).padStart(2, "0") + '</div>' +
          "<h1>" + escapeHtml(c.name) + "</h1>" +
          '<div class="subtitle">' + escapeHtml(c.subtitle || "") + "</div>" +
          '<div class="keyword-chip-row">' + c.keywords.map(function (k) { return '<span class="chip">' + escapeHtml(k) + "</span>"; }).join("") + "</div>" +
          '<div class="card-detail-actions">' +
            '<a class="btn btn-primary btn-small" href="' + pdfFileFor(c) + '" download>' + icon("download") + ' Scarica il PDF di questa carta</a>' +
          "</div>" +
        "</div>" +
      "</div>" +

      '<div class="mindmap-grid">' +
        '<div class="mindmap-col">' +
          '<div class="mindmap-box strengths">' +
            '<div class="mindmap-box-head"><span class="badge-icon">' + icon("sparkle") + '</span><span class="badge-label">Punti di Forza</span></div>' +
            "<ul>" + c.strengths.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("") + "</ul>" +
          "</div>" +
          '<div class="mindmap-box attention">' +
            '<div class="mindmap-box-head"><span class="badge-icon">' + icon("sparkle") + '</span><span class="badge-label">Punti di Attenzione</span></div>' +
            "<ul>" + c.attention.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("") + "</ul>" +
          "</div>" +
        "</div>" +

        '<div class="mindmap-col">' +
          '<div class="card-portrait">' +
            '<div class="frame-number">' + String(c.id).padStart(2, "0") + '</div>' +
            '<div class="frame-icon">' + cardIcon(c.id) + '</div>' +
            "<h1>" + escapeHtml(c.name) + "</h1>" +
            '<div class="frame-sub">' + escapeHtml(c.subtitle || "") + "</div>" +
          "</div>" +
          '<div class="mindmap-box significato-box">' +
            '<div class="mindmap-box-head"><span class="badge-icon">' + icon("book-open") + '</span><span class="badge-label">Significato Generale</span></div>' +
            '<div class="sig-block"><h4 class="dritto">Dritto</h4><p>' + escapeHtml(c.uprightMeaning) + "</p></div>" +
            '<div class="sig-block"><h4 class="rovesciato">Rovesciato</h4><p>' + escapeHtml(c.reversedMeaning) + "</p></div>" +
          "</div>" +
        "</div>" +

        '<div class="mindmap-col">' +
          '<div class="mindmap-box">' +
            '<div class="mindmap-box-head"><span class="badge-icon">' + icon("layers") + '</span><span class="badge-label">Combinazioni Tipiche</span></div>' +
            '<ul>' + c.combinations.slice(0, 5).map(function (combo) {
              var t = state.cardsById[combo.with];
              return "<li><b>+ " + escapeHtml(t ? t.name : "") + ":</b> " + escapeHtml(combo.text) + "</li>";
            }).join("") + "</ul>" +
          "</div>" +
        "</div>" +
      "</div>" +

      '<div class="life-areas">' +
        lifeAreaBox("sparkle", "In Amore", c.love) +
        lifeAreaBox("sparkle", "Nel Lavoro", c.work) +
        lifeAreaBox("sparkle", "Nelle Finanze", c.finance) +
        lifeAreaBox("sparkle", "Spiritualit&agrave;", c.spirituality) +
      "</div>" +

      '<div class="combo-section">' +
        "<h3><span class=\"badge-icon\">" + icon("layers") + "</span> Tutte le combinazioni con altre carte</h3>" +
        '<div class="combo-grid">' + combosHtml + "</div>" +
      "</div>"
    );
  }

  /* ---------------- Views ---------------- */

  function renderHome() {
    return (
      '<section class="hero">' +
        '<span class="hero-eyebrow">Metodo Completo &middot; Edizione Italiana</span>' +
        "<h1>La guida completa alle <em>36 Carte Lenormand</em>, sempre con te</h1>" +
        '<p class="hero-sub">Significati, combinazioni, bonus esclusivi e un PDF scaricabile per ogni carta. Tutto in un\'unica app, pensata per accompagnare ogni tua lettura.</p>' +
        '<div class="hero-actions">' +
          '<a class="btn btn-primary" href="#/carte">Esplora le 36 carte</a>' +
          '<a class="btn btn-ghost" href="#/estrai">' + icon("shuffle", "mini") + ' Estrai una carta</a>' +
        "</div>" +
      "</section>" +

      '<section class="section container">' +
        '<div class="section-head">' +
          '<span class="section-eyebrow">Cosa trovi nell\'app</span>' +
          "<h2>Uno strumento completo per leggere con sicurezza</h2>" +
        "</div>" +
        '<div class="feature-grid">' +
          '<div class="feature-card"><div class="ico-circle">' + icon("book-open") + '</div><h3>36 carte, nel dettaglio</h3><p>Significato dritto e rovesciato, amore, lavoro, finanze e spiritualit&agrave; per ogni carta del mazzo.</p></div>' +
          '<div class="feature-card"><div class="ico-circle">' + icon("layers") + '</div><h3>Combinazioni reali</h3><p>Le combinazioni pi&ugrave; comuni tra le carte, spiegate in modo chiaro e pratico.</p></div>' +
          '<div class="feature-card"><div class="ico-circle">' + icon("shuffle") + '</div><h3>Estrai una carta</h3><p>Una stesa singola o a tre carte, direttamente nell\'app, con la possibilit&agrave; di salvarla nel diario.</p></div>' +
          '<div class="feature-card"><div class="ico-circle">' + icon("download") + '</div><h3>PDF per ogni carta</h3><p>Scarica il PDF di ogni singola carta, oppure la guida completa in un unico file.</p></div>' +
          '<div class="feature-card"><div class="ico-circle">' + icon("crown") + '</div><h3>5 bonus esclusivi</h3><p>Segreti della Corte, Arcani Minori Combinati, Consacrazione e Rituali, Guida alle Rune, Diario delle Letture.</p></div>' +
          '<div class="feature-card"><div class="ico-circle">' + icon("notebook") + '</div><h3>Il tuo diario personale</h3><p>Salva ogni lettura e torna a rileggerla quando vuoi, in totale privacy sul tuo dispositivo.</p></div>' +
        "</div>" +
      "</section>" +

      '<section class="section container">' +
        '<div class="section-head">' +
          '<span class="section-eyebrow">Bonus Inclusi</span>' +
          "<h2>Cinque bonus pensati per approfondire la pratica</h2>" +
        "</div>" +
        '<div class="bonus-grid">' + BONUS_META.map(bonusPreviewCard).join("") + "</div>" +
      "</section>"
    );
  }

  function bonusPreviewCard(meta) {
    var data = state.bonuses[meta.slug];
    if (!data) return "";
    return (
      '<div class="bonus-card" data-nav="/bonus/' + meta.slug + '">' +
        '<div class="ico-circle">' + icon(meta.icon) + '</div>' +
        "<h3>" + escapeHtml(data.title) + "</h3>" +
        "<p>" + escapeHtml(data.subtitle) + "</p>" +
      "</div>"
    );
  }

  function renderCardList(query) {
    var q = (query || "").trim().toLowerCase();
    var filtered = state.cards.filter(function (c) {
      if (!q) return true;
      var hay = (c.name + " " + (c.subtitle || "") + " " + c.keywords.join(" ")).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    var grid = filtered.length
      ? '<div class="card-grid">' + filtered.map(cardTileHtml).join("") + "</div>"
      : '<div class="empty-state">Nessuna carta trovata per questa ricerca.</div>';
    return (
      '<section class="container section">' +
        '<div class="section-head" style="margin-bottom: 1.5rem;">' +
          '<span class="section-eyebrow">Le 36 Carte</span>' +
          "<h2>Tutte le carte del mazzo Lenormand</h2>" +
        "</div>" +
        '<div class="toolbar">' +
          '<input type="search" class="search-input" id="card-search" placeholder="Cerca una carta, una parola chiave..." value="' + escapeHtml(query || "") + '">' +
        "</div>" +
        grid +
      "</section>"
    );
  }

  function renderCardDetail(id) {
    var c = state.cardsById[id];
    if (!c) return '<div class="container section"><p>Carta non trovata.</p><a class="back-link" href="#/carte">&larr; Torna alle carte</a></div>';
    return '<section class="container section">' + cardDetailHtml(c) + "</section>";
  }

  var drawState = { mode: "singola", drawn: [] };

  function randomCards(n) {
    var pool = state.cards.slice();
    var out = [];
    while (out.length < n && pool.length) {
      var idx = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }

  function renderDraw() {
    var positions = drawState.mode === "tre-carte" ? ["Passato", "Presente", "Futuro"] : ["La tua carta"];
    var stageHtml;
    if (!drawState.drawn.length) {
      stageHtml = positions.map(function (label) {
        return '<div class="card-back">' + icon("sparkle", "mini") + "</div>";
      }).join("");
    } else {
      stageHtml = drawState.drawn.map(function (c, i) {
        return (
          '<div class="drawn-card" data-nav="/carta/' + c.id + '">' +
            '<div class="position-label">' + positions[i] + "</div>" +
            '<div class="tile-icon">' + cardIcon(c.id) + '</div>' +
            "<h4>" + escapeHtml(c.name) + "</h4>" +
            '<div class="tile-num">N. ' + String(c.id).padStart(2, "0") + "</div>" +
          "</div>"
        );
      }).join("");
    }
    return (
      '<section class="container section draw-wrap">' +
        '<div class="section-head">' +
          '<span class="section-eyebrow">Estrai una Carta</span>' +
          "<h2>Lascia che le carte rispondano alla tua domanda</h2>" +
          '<p>Concentrati sulla tua domanda, respira e quando sei pronta o pronto estrai le carte.</p>' +
        "</div>" +
        '<div class="draw-modes">' +
          '<button class="mode-btn' + (drawState.mode === "singola" ? " active" : "") + '" data-mode="singola">Una carta</button>' +
          '<button class="mode-btn' + (drawState.mode === "tre-carte" ? " active" : "") + '" data-mode="tre-carte">Passato &middot; Presente &middot; Futuro</button>' +
        "</div>" +
        '<div class="draw-stage">' + stageHtml + "</div>" +
        '<div class="hero-actions" style="margin-bottom: var(--space-4);">' +
          '<button class="btn btn-primary" id="draw-btn">' + icon("shuffle", "mini") + (drawState.drawn.length ? " Estrai di nuovo" : " Estrai ora") + "</button>" +
        "</div>" +
        (drawState.drawn.length ?
          '<div class="draw-reading-note">' +
            '<label for="draw-question" style="font-size:0.85rem; color: var(--color-text-faint);">La tua domanda (facoltativa)</label>' +
            '<input type="text" id="draw-question" class="search-input" style="margin:8px 0 12px;" placeholder="Es. Come evolver&agrave; questa situazione?">' +
            '<label for="draw-notes" style="font-size:0.85rem; color: var(--color-text-faint);">Le tue note</label>' +
            '<textarea id="draw-notes" placeholder="Scrivi qui la tua interpretazione..."></textarea>' +
            '<div class="hero-actions" style="justify-content:flex-start; margin-top:12px;">' +
              '<button class="btn btn-ghost btn-small" id="save-diario-btn">' + icon("notebook", "mini") + " Salva nel Diario</button>" +
            "</div>" +
          "</div>"
        : "") +
      "</section>"
    );
  }

  function bonusSectionHtml(section) {
    var html = "<div class=\"bonus-section\">";
    if (section.heading) html += "<h3>" + escapeHtml(section.heading) + "</h3>";
    if (section.body) html += "<p>" + escapeHtml(section.body) + "</p>";
    if (section.items) html += "<ul>" + section.items.map(function (i) { return "<li>" + escapeHtml(i) + "</li>"; }).join("") + "</ul>";
    if (section.table) {
      html += '<div class="table-scroll"><table class="insert-table"><thead><tr><th>Carta Lenormand</th><th>Carta inserita</th></tr></thead><tbody>';
      html += section.table.map(function (row) { return "<tr><td>" + escapeHtml(row.card) + "</td><td>" + escapeHtml(row.insert) + "</td></tr>"; }).join("");
      html += "</tbody></table></div>";
    }
    html += "</div>";
    return html;
  }

  function renderBonusList() {
    return (
      '<section class="container section">' +
        '<div class="section-head">' +
          '<span class="section-eyebrow">Bonus Inclusi</span>' +
          "<h2>I 5 bonus del Metodo Completo</h2>" +
        "</div>" +
        '<div class="bonus-grid">' + BONUS_META.map(bonusPreviewCard).join("") + "</div>" +
      "</section>"
    );
  }

  function renderBonusDetail(slug) {
    var meta = BONUS_META.filter(function (b) { return b.slug === slug; })[0];
    var data = state.bonuses[slug];
    if (!meta || !data) return '<div class="container section"><p>Bonus non trovato.</p></div>';

    var body = "";
    if (data.intro) body += '<p class="intro-text">' + escapeHtml(data.intro) + "</p>";

    if (data.sections) body += data.sections.map(bonusSectionHtml).join("");

    if (data.runes) {
      body += '<div class="rune-grid">' + data.runes.map(function (r) {
        return '<div class="rune-card"><div class="rune-symbol">' + r.symbol + "</div><h4>" + escapeHtml(r.name) + "</h4><p>" + escapeHtml(r.meaning) + "</p></div>";
      }).join("") + "</div>";
      if (data.comeUsarle) body += '<div class="bonus-section" style="margin-top:1.5rem;"><h3>Come usarle</h3><p>' + escapeHtml(data.comeUsarle) + "</p></div>";
    }

    if (data.disclaimer) body += '<div class="disclaimer-box">' + escapeHtml(data.disclaimer) + "</div>";

    return (
      '<section class="container section bonus-detail">' +
        '<a href="#/bonus" class="back-link">&larr; Tutti i bonus</a>' +
        '<div class="ico-circle" style="margin-bottom: var(--space-3);">' + icon(meta.icon) + '</div>' +
        "<h1>" + escapeHtml(data.title) + "</h1>" +
        '<p class="subtitle" style="color:var(--color-text-faint); font-style: italic; margin-bottom: var(--space-4);">' + escapeHtml(data.subtitle) + "</p>" +
        body +
      "</section>"
    );
  }

  function renderDiario() {
    var entries = getDiario();
    var listHtml;
    if (!entries.length) {
      listHtml = '<div class="empty-state">Non hai ancora salvato nessuna lettura. Vai su <a href="#/estrai" style="color:var(--color-gold-light);">Estrai una Carta</a> per iniziare il tuo diario.</div>';
    } else {
      listHtml = '<div class="diario-list">' + entries.map(function (e) {
        var cardNames = e.cardIds.map(function (id) { return state.cardsById[id] ? state.cardsById[id].name : "?"; }).join(" &middot; ");
        return (
          '<div class="diario-entry" data-entry-id="' + e.id + '">' +
            '<div class="entry-head"><span class="entry-date">' + escapeHtml(e.date) + '</span></div>' +
            '<div class="entry-cards">' + cardNames + "</div>" +
            (e.question ? '<div class="entry-question">' + escapeHtml(e.question) + "</div>" : "") +
            (e.notes ? '<div class="entry-notes">' + escapeHtml(e.notes) + "</div>" : "") +
            (e.followUp ? '<div class="entry-notes" style="margin-top:6px; color: var(--color-gold-light);">Aggiornamento: ' + escapeHtml(e.followUp) + "</div>" : "") +
            '<div class="entry-actions">' +
              '<button class="link-btn" data-action="followup" data-id="' + e.id + '">Aggiungi aggiornamento</button>' +
              '<button class="link-btn" data-action="delete" data-id="' + e.id + '">Elimina</button>' +
            "</div>" +
          "</div>"
        );
      }).join("") + "</div>";
    }
    return (
      '<section class="container section">' +
        '<div class="section-head">' +
          '<span class="section-eyebrow">Il Tuo Diario</span>' +
          "<h2>Le letture che hai salvato</h2>" +
          '<p>Tutto resta privato: i dati sono conservati solo su questo dispositivo.</p>' +
        "</div>" +
        listHtml +
      "</section>"
    );
  }

  function renderDownload() {
    var rows = state.cards.map(function (c) {
      return '<div class="pdf-row"><span>' + String(c.id).padStart(2, "0") + ". " + escapeHtml(c.name) + '</span><a href="' + pdfFileFor(c) + '" download>Scarica</a></div>';
    }).join("");
    return (
      '<section class="container section">' +
        '<div class="download-card">' +
          '<div class="ico-circle">' + icon("download") + '</div>' +
          "<h2>La Guida Completa in PDF</h2>" +
          '<p>Scarica tutte le 36 carte raccolte in un unico documento, pronto per essere letto offline o stampato.</p>' +
          '<a class="btn btn-primary" href="assets/pdf/guida-completa.pdf" download>' + icon("download", "mini") + " Scarica il PDF completo</a>" +
          '<div class="pdf-list">' + rows + "</div>" +
        "</div>" +
      "</section>"
    );
  }

  /* ---------------- Router ---------------- */

  function parseHash() {
    var h = location.hash.replace(/^#/, "") || "/";
    return h;
  }

  function setActiveNav(route) {
    qsa(".main-nav a").forEach(function (a) { a.classList.remove("active"); });
    var top = "/" + route.split("/")[1];
    var match = qsa(".main-nav a").filter(function (a) { return a.getAttribute("href") === "#" + top; })[0];
    if (match) match.classList.add("active");
  }

  function render() {
    if (!state.loaded) return;
    var route = parseHash();
    var view = qs("#view");
    var html = "";
    var parts = route.split("/").filter(Boolean);

    if (route === "/" || parts.length === 0) {
      html = renderHome();
    } else if (parts[0] === "carte") {
      html = renderCardList(drawState.cardQuery || "");
    } else if (parts[0] === "carta" && parts[1]) {
      html = renderCardDetail(parseInt(parts[1], 10));
    } else if (parts[0] === "estrai") {
      html = renderDraw();
    } else if (parts[0] === "bonus" && parts[1]) {
      html = renderBonusDetail(parts[1]);
    } else if (parts[0] === "bonus") {
      html = renderBonusList();
    } else if (parts[0] === "diario") {
      html = renderDiario();
    } else if (parts[0] === "download") {
      html = renderDownload();
    } else {
      html = '<div class="container section"><p>Pagina non trovata.</p><a class="back-link" href="#/">&larr; Torna alla home</a></div>';
    }

    view.innerHTML = html;
    setActiveNav(route);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    qs("#main-nav").classList.remove("open");
    wireViewEvents(route);
  }

  function wireViewEvents(route) {
    qsa("[data-nav]").forEach(function (el) {
      el.addEventListener("click", function () {
        location.hash = "#" + el.getAttribute("data-nav");
      });
    });

    var search = qs("#card-search");
    if (search) {
      search.addEventListener("input", function () {
        drawState.cardQuery = search.value;
        var grid = qs(".card-grid, .empty-state");
        var filtered = state.cards.filter(function (c) {
          var q = search.value.trim().toLowerCase();
          if (!q) return true;
          var hay = (c.name + " " + (c.subtitle || "") + " " + c.keywords.join(" ")).toLowerCase();
          return hay.indexOf(q) !== -1;
        });
        var newHtml = filtered.length
          ? '<div class="card-grid">' + filtered.map(cardTileHtml).join("") + "</div>"
          : '<div class="empty-state">Nessuna carta trovata per questa ricerca.</div>';
        if (grid) grid.outerHTML = newHtml;
        qsa("[data-nav]").forEach(function (el) {
          el.addEventListener("click", function () { location.hash = "#" + el.getAttribute("data-nav"); });
        });
      });
    }

    var modeBtns = qsa(".mode-btn");
    modeBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        drawState.mode = btn.getAttribute("data-mode");
        drawState.drawn = [];
        render();
      });
    });

    var drawBtn = qs("#draw-btn");
    if (drawBtn) {
      drawBtn.addEventListener("click", function () {
        var n = drawState.mode === "tre-carte" ? 3 : 1;
        drawState.drawn = randomCards(n);
        render();
      });
    }

    var saveBtn = qs("#save-diario-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var question = qs("#draw-question") ? qs("#draw-question").value.trim() : "";
        var notes = qs("#draw-notes") ? qs("#draw-notes").value.trim() : "";
        var entry = {
          id: "e" + Date.now(),
          date: new Date().toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" }),
          cardIds: drawState.drawn.map(function (c) { return c.id; }),
          question: question,
          notes: notes,
          followUp: ""
        };
        if (saveDiarioEntry(entry)) {
          toast("Lettura salvata nel diario.");
        } else {
          toast("Non è stato possibile salvare la lettura.");
        }
      });
    }

    qsa('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (confirm("Eliminare questa lettura dal diario?")) {
          deleteDiarioEntry(btn.getAttribute("data-id"));
          render();
        }
      });
    });

    qsa('[data-action="followup"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        var note = prompt("Come si è evoluta questa situazione?");
        if (note !== null) {
          updateDiarioNote(btn.getAttribute("data-id"), note);
          render();
        }
      });
    });
  }

  /* ---------------- Nav toggle (mobile) ---------------- */

  function wireNavToggle() {
    var toggle = qs("#nav-toggle");
    var nav = qs("#main-nav");
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------------- Service worker ---------------- */

  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  /* ---------------- Init ---------------- */

  window.addEventListener("hashchange", render);

  Promise.all([loadSprite(), loadData()]).then(function () {
    wireNavToggle();
    render();
    registerSW();
  }).catch(function (err) {
    console.error(err);
    qs("#view").innerHTML = '<div class="container section"><p>Si è verificato un errore nel caricamento dei contenuti. Ricarica la pagina.</p></div>';
  });

})();
