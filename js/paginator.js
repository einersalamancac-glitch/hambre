// ============================================================
// paginator.js — parte el contenido del libro en páginas que
// caben exactamente en la pantalla actual (ancho, alto y tamaño
// de letra). Se recalcula al cambiar el tamaño de ventana o el
// tamaño de letra. El texto nunca se recorta a mitad de palabra:
// la prosa siempre queda íntegra y continua entre páginas.
// ============================================================
const Paginator = (function () {

  function esc(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ---- construye la lista ordenada de "unidades" a paginar ----
  function buildUnits(data) {
    const units = [];

    units.push({ kind: "titlepage", data: data.front[0] });
    units.push({ kind: "legal", data: data.front[1] });
    units.push({ kind: "dedication", data: data.front[2] });

    data.chapters.forEach((ch) => {
      if (ch.part) {
        const [label, title] = ch.part.split(" - ");
        units.push({ kind: "part", label: label, title: title || "" });
      }
      units.push({ kind: "chapterStart", num: ch.num });
      ch.blocks.forEach((b) => {
        if (b.type === "p") units.push({ kind: "p", text: b.text });
        else if (b.type === "verse") units.push({ kind: "verse", lines: b.lines });
      });
    });

    units.push({ kind: "end", text: data.ending });
    return units;
  }

  // ---- medidor: comprueba si el contenido actual desborda la página ----
  function makeMeasurer(pageW, pageH) {
    const el = document.getElementById("measurer");
    el.style.width = pageW + "px";
    el.style.height = pageH + "px";
    el.innerHTML = "";
    return el;
  }

  function overflow(bodyEl) {
    return bodyEl.scrollHeight > bodyEl.clientHeight + 1;
  }

  // Busca por bisección cuántas palabras (desde el principio) caben.
  function fitWords(words, pEl, bodyEl) {
    let lo = 1, hi = words.length, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      pEl.textContent = words.slice(0, mid).join(" ");
      if (overflow(bodyEl)) {
        hi = mid - 1;
      } else {
        best = mid;
        lo = mid + 1;
      }
    }
    return best;
  }

  function fitLines(lines, verseEl, bodyEl, lineTemplate) {
    let lo = 1, hi = lines.length, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      verseEl.innerHTML = lines
        .slice(0, mid)
        .map((l) => `<p>${esc(l)}</p>`)
        .join("");
      if (overflow(bodyEl)) {
        hi = mid - 1;
      } else {
        best = mid;
        lo = mid + 1;
      }
    }
    return best;
  }

  // ---- construye el marcado de una página especial (una sola página) ----
  function specialPageHtml(unit) {
    if (unit.kind === "titlepage") {
      const d = unit.data;
      return `<div class="page-content"><div class="book-title-block">
        <div class="t-author">${esc(d.lines[0])}</div>
        <div class="t-title">${esc(d.lines[1])}<br>${esc(d.lines[2])}<br>${esc(d.lines[3])}</div>
        <div class="t-translator">${esc(d.lines[4])}</div>
      </div></div>`;
    }
    if (unit.kind === "legal") {
      const d = unit.data;
      return `<div class="page-content"><div class="legal-block">${d.lines
        .map((l) => `<p>${esc(l)}</p>`)
        .join("")}</div></div>`;
    }
    if (unit.kind === "dedication") {
      return `<div class="page-content"><div class="dedication-block">${esc(unit.data.text)}</div></div>`;
    }
    if (unit.kind === "part") {
      return `<div class="page-content"><div class="part-block">
        <div class="p-label">${esc(unit.label)}</div>
        <div class="p-title">${esc(unit.title)}</div>
      </div></div>`;
    }
    if (unit.kind === "end") {
      return `<div class="page-content"><div class="dedication-block">${esc(unit.text)}</div></div>`;
    }
    return `<div class="page-content"></div>`;
  }

  // ---- proceso principal ----
  function paginate(data, pageW, pageH) {
    const units = buildUnits(data);
    const measurer = makeMeasurer(pageW, pageH);
    const pages = [];
    const toc = [];

    let chapterNum = null;
    let pageBuf = null; // { headingHtml, blocksHtml: [] }

    function bodyHtmlOf(buf) {
      return buf.blocksHtml.join("");
    }

    function startNewPage(headingHtml) {
      pageBuf = { headingHtml: headingHtml || "", blocksHtml: [] };
    }

    function commitPage() {
      if (!pageBuf) return;
      const html =
        `<div class="page-content">` +
        (pageBuf.headingHtml || "") +
        `<div class="page-body">${bodyHtmlOf(pageBuf)}</div>` +
        `</div>`;
      pages.push({ html: html, chapterNum: chapterNum, isSpecial: false });
      pageBuf = null;
    }

    // Prepara el medidor con el estado actual (heading + bloques ya comprometidos)
    function renderMeasurerState(extraLastNodeType) {
      measurer.innerHTML =
        `<div class="page-content">` +
        (pageBuf.headingHtml || "") +
        `<div class="page-body">${bodyHtmlOf(pageBuf)}</div>` +
        `</div>`;
      const bodyEl = measurer.querySelector(".page-body");
      return bodyEl;
    }

    let uIdx = 0;
    while (uIdx < units.length) {
      const unit = units[uIdx];

      if (unit.kind === "titlepage" || unit.kind === "legal" ||
          unit.kind === "dedication" || unit.kind === "part" || unit.kind === "end") {
        pages.push({ html: specialPageHtml(unit), chapterNum: null, isSpecial: true, specialKind: unit.kind });
        if (unit.kind === "part") toc.push({ pageIndex: pages.length - 1, title: unit.label + " · " + unit.title, isPart: true });
        uIdx++;
        continue;
      }

      if (unit.kind === "chapterStart") {
        if (pageBuf) commitPage();
        chapterNum = unit.num;
        const heading = `<h3 class="chapter-heading">CAPÍTULO ${unit.num}</h3>`;
        startNewPage(heading);
        toc.push({ pageIndex: pages.length, title: "Capítulo " + unit.num, isPart: false });
        uIdx++;
        continue;
      }

      if (unit.kind === "p") {
        const words = unit.text.split(" ");
        let idx = 0;
        let firstSeg = true;
        while (idx < words.length) {
          if (!pageBuf) startNewPage("");
          // Añadimos un <p> vacío temporal al final de los bloques actuales para medir
          const cls = firstSeg ? "" : " cont";
          pageBuf.blocksHtml.push(`<p class="pfit${cls}"></p>`);
          let bodyEl = renderMeasurerState();
          const pEl = bodyEl.querySelector("p.pfit:last-of-type");
          const remaining = words.slice(idx);

          // ¿Cabe el párrafo completo?
          pEl.textContent = remaining.join(" ");
          if (!overflow(bodyEl)) {
            // cabe entero: fijamos el texto definitivo y avanzamos
            pageBuf.blocksHtml[pageBuf.blocksHtml.length - 1] =
              `<p class="${cls.trim()}">${esc(remaining.join(" "))}</p>`;
            idx = words.length;
            firstSeg = false;
            continue;
          }

          // no cabe entero: averiguamos cuántas palabras caben
          const n = fitWords(remaining, pEl, bodyEl);
          if (n <= 0) {
            // no cabe ni una palabra en esta página: la página actual
            // se cierra tal cual (sin el <p> vacío) y se reintenta en una nueva
            pageBuf.blocksHtml.pop();
            if (pageBuf.blocksHtml.length === 0 && !pageBuf.headingHtml) {
              // página completamente vacía y aun así no cabe una palabra:
              // forzamos al menos una palabra para evitar bucle infinito
              pageBuf.blocksHtml.push(`<p class="${cls.trim()}">${esc(remaining[0])}</p>`);
              idx += 1;
              firstSeg = false;
            }
            commitPage();
            startNewPage("");
            continue;
          }

          pageBuf.blocksHtml[pageBuf.blocksHtml.length - 1] =
            `<p class="${cls.trim()}">${esc(remaining.slice(0, n).join(" "))}</p>`;
          idx += n;
          firstSeg = false;

          // cerramos esta página y seguimos el resto del párrafo en la siguiente
          commitPage();
          startNewPage("");
        }
        uIdx++;
        continue;
      }

      if (unit.kind === "verse") {
        if (!pageBuf) startNewPage("");
        pageBuf.blocksHtml.push(`<div class="verse vfit"></div>`);
        let bodyEl = renderMeasurerState();
        const vEl = bodyEl.querySelector(".vfit:last-of-type");
        vEl.innerHTML = unit.lines.map((l) => `<p>${esc(l)}</p>`).join("");

        if (!overflow(bodyEl)) {
          pageBuf.blocksHtml[pageBuf.blocksHtml.length - 1] =
            `<div class="verse">${unit.lines.map((l) => `<p>${esc(l)}</p>`).join("")}</div>`;
          uIdx++;
          continue;
        }

        const n = fitLines(unit.lines, vEl, bodyEl);
        if (n > 0) {
          pageBuf.blocksHtml[pageBuf.blocksHtml.length - 1] =
            `<div class="verse">${unit.lines.slice(0, n).map((l) => `<p>${esc(l)}</p>`).join("")}</div>`;
          commitPage();
          startNewPage("");
          // el resto de la canción continúa como una nueva unidad de verso
          if (n < unit.lines.length) {
            units.splice(uIdx + 1, 0, { kind: "verse", lines: unit.lines.slice(n) });
          }
        } else {
          // no cabe ni una línea en página nueva (caso extremo): forzamos una línea
          pageBuf.blocksHtml[pageBuf.blocksHtml.length - 1] =
            `<div class="verse"><p>${esc(unit.lines[0])}</p></div>`;
          commitPage();
          startNewPage("");
          if (unit.lines.length > 1) {
            units.splice(uIdx + 1, 0, { kind: "verse", lines: unit.lines.slice(1) });
          }
        }
        uIdx++;
        continue;
      }

      // tipo desconocido: avanzar para evitar bucle infinito
      uIdx++;
    }

    if (pageBuf) commitPage();
    measurer.innerHTML = "";

    return { pages: pages, toc: toc };
  }

  return { paginate: paginate };
})();
