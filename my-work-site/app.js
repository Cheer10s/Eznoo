(function () {
  "use strict";

  var state = { sections: [], items: [], q: "", hover: null, pinned: null };
  var panelsEl = document.getElementById("panels");
  var searchEl = document.getElementById("q");
  var wide = window.matchMedia("(min-width: 761px)");
  var panelMap = {};
  var hoverTimer = null;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function loadJSON(path) {
    return fetch(path, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function fmtSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function matches(item) {
    if (!state.q) return true;
    return (item.title + " " + (item.description || "")).toLowerCase().indexOf(state.q) !== -1;
  }

  function itemsFor(slug) {
    return state.items
      .filter(function (i) { return i.section === slug && matches(i); })
      .sort(function (a, b) { return (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title); });
  }

  /* which strip is open: the one under the pointer, else the pinned one, else the first search hit */
  function expandedSlug() {
    var searchOpen = null;
    if (state.q) {
      for (var i = 0; i < state.sections.length; i++) {
        if (itemsFor(state.sections[i].slug).length) { searchOpen = state.sections[i].slug; break; }
      }
    }
    if (wide.matches) return state.hover || state.pinned || searchOpen;
    return state.pinned || searchOpen;
  }

  function applyExpanded() {
    var open = expandedSlug();
    state.sections.forEach(function (s) {
      var p = panelMap[s.slug];
      var on = s.slug === open;
      p.panel.classList.toggle("expanded", on);
      p.head.setAttribute("aria-expanded", on ? "true" : "false");
    });
  }

  function renderItem(item) {
    var li = el("li", "item");
    li.appendChild(el("h3", "", item.title));
    if (item.description) li.appendChild(el("p", "", item.description));

    var label = item.type === "pdf" ? "PDF" : item.type === "html" ? "Web page" : (item.label || "Link");
    var bits = [label];
    if ((item.type === "pdf" || item.type === "html") && item.size) bits.push(fmtSize(item.size));
    var d = fmtDate(item.date);
    if (d) bits.push(d);
    li.appendChild(el("div", "meta", bits.join(" · ")));

    var actions = el("div", "actions");
    if (item.type === "pdf" || item.type === "html") {
      var prev = el("button", "btn", "Preview");
      prev.type = "button";
      prev.addEventListener("click", function () { openViewer(item, prev); });
      actions.appendChild(prev);
      var a = el("a", "btn ghost", item.type === "pdf" ? "Download" : "Open");
      a.href = item.url;
      if (item.type === "pdf") a.setAttribute("download", "");
      else { a.target = "_blank"; a.rel = "noopener"; }
      actions.appendChild(a);
    } else {
      var open = el("a", "btn", "Open");
      open.href = item.url;
      open.target = "_blank";
      open.rel = "noopener";
      actions.appendChild(open);
    }
    li.appendChild(actions);
    return li;
  }

  function fill(section) {
    var p = panelMap[section.slug];
    var list = itemsFor(section.slug);
    p.count.textContent = list.length + (list.length === 1 ? " item" : " items");
    p.items.textContent = "";
    if (list.length) {
      p.items.hidden = false;
      p.empty.hidden = true;
      list.forEach(function (i) { p.items.appendChild(renderItem(i)); });
    } else {
      p.items.hidden = true;
      p.empty.hidden = false;
      p.empty.textContent = state.q ? "Nothing matches your search." : "Nothing here yet.";
    }
  }

  function togglePin(slug) {
    state.pinned = state.pinned === slug ? null : slug;
    try {
      history.replaceState(null, "", state.pinned ? "#" + state.pinned : location.pathname + location.search);
    } catch (e) { /* ignore */ }
    applyExpanded();
  }

  function build() {
    panelsEl.textContent = "";
    state.sections.forEach(function (s, idx) {
      var panel = el("section", "panel");
      panel.style.setProperty("--tint", "var(--p" + ((idx % 5) + 1) + ")");
      panel.dataset.slug = s.slug;

      var head = el("button", "head");
      head.type = "button";
      head.setAttribute("aria-expanded", "false");
      head.setAttribute("aria-controls", "body-" + s.slug);
      var name = el("span", "name", s.name);
      var count = el("span", "count", "0 items");
      head.appendChild(name);
      head.appendChild(count);

      var body = el("div", "body");
      body.id = "body-" + s.slug;
      if (s.blurb) body.appendChild(el("p", "blurb", s.blurb));
      var items = el("ul", "items");
      var empty = el("p", "empty", "Nothing here yet.");
      empty.hidden = true;
      body.appendChild(items);
      body.appendChild(empty);

      panel.appendChild(head);
      panel.appendChild(body);
      panelsEl.appendChild(panel);
      panelMap[s.slug] = { panel: panel, head: head, count: count, items: items, empty: empty };

      head.addEventListener("click", function () { togglePin(s.slug); });
      panel.addEventListener("pointerenter", function (e) {
        if (e.pointerType !== "mouse") return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { state.hover = s.slug; applyExpanded(); }, 70);
      });
      panel.addEventListener("focusin", function (e) {
        if (e.target.matches && e.target.matches(":focus-visible")) { state.hover = s.slug; applyExpanded(); }
      });
      fill(s);
    });
    applyExpanded();
  }

  function refresh() {
    state.sections.forEach(fill);
    applyExpanded();
  }

  panelsEl.addEventListener("pointerleave", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    clearTimeout(hoverTimer);
    state.hover = null;
    applyExpanded();
  });
  wide.addEventListener ? wide.addEventListener("change", applyExpanded) : wide.addListener(applyExpanded);

  /* ---- preview window ---- */
  var viewer = document.getElementById("viewer");
  var frame = document.getElementById("viewer-frame");
  var vTitle = document.getElementById("viewer-title");
  var vOpen = document.getElementById("viewer-open");
  var vDl = document.getElementById("viewer-dl");
  var vClose = document.getElementById("viewer-close");
  var lastFocus = null;

  function openViewer(item, from) {
    lastFocus = from || document.activeElement;
    vTitle.textContent = item.title;
    vOpen.href = item.url;
    vDl.href = item.url;
    if (item.type === "html") {
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-forms");
      frame.src = item.url;
    } else {
      frame.removeAttribute("sandbox");
      frame.src = item.url + "#view=FitH";
    }
    viewer.hidden = false;
    document.body.classList.add("noscroll");
    vClose.focus();
  }

  function closeViewer() {
    if (viewer.hidden) return;
    viewer.hidden = true;
    frame.src = "about:blank";
    document.body.classList.remove("noscroll");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  vClose.addEventListener("click", closeViewer);
  viewer.addEventListener("click", function (e) { if (e.target === viewer) closeViewer(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeViewer();
  });

  /* ---- start ---- */
  Promise.all([loadJSON("site.json"), loadJSON("pdfs.json")]).then(function (res) {
    var site = res[0] || { sections: [], links: [] };
    var files = (res[1] && res[1].items) || [];

    if (site.title) {
      document.getElementById("site-title").textContent = site.title;
      document.title = site.title;
    }
    if (site.tagline) document.getElementById("site-tagline").textContent = site.tagline;

    state.sections = site.sections || [];
    var links = (site.links || []).map(function (l) {
      return {
        section: l.section,
        title: l.title,
        description: l.description || "",
        type: "link",
        url: l.url,
        date: l.date || "",
        label: l.label || (/claude\.ai/i.test(l.url || "") ? "Claude artifact" : "Link")
      };
    });
    state.items = files.map(function (p) { p.type = p.type || "pdf"; return p; }).concat(links);

    var h = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (state.sections.some(function (s) { return s.slug === h; })) state.pinned = h;

    build();
  });

  searchEl.addEventListener("input", function (e) {
    state.q = e.target.value.trim().toLowerCase();
    refresh();
  });
})();
