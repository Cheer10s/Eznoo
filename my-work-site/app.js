(function () {
  "use strict";

  var state = { sections: [], items: [], active: "all", q: "" };

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
    var hay = (item.title + " " + (item.description || "")).toLowerCase();
    return hay.indexOf(state.q) !== -1;
  }

  function readHash() {
    var h = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    var ok = h === "all" || state.sections.some(function (s) { return s.slug === h; });
    state.active = ok && h ? h : "all";
  }

  function renderTabs() {
    var nav = document.getElementById("tabs");
    nav.textContent = "";
    var total = state.items.filter(matches).length;
    nav.appendChild(tab("all", "All", total));
    state.sections.forEach(function (s) {
      var n = state.items.filter(function (i) { return i.section === s.slug && matches(i); }).length;
      nav.appendChild(tab(s.slug, s.name, n));
    });
  }

  function tab(slug, name, n) {
    var a = el("a", "tab");
    a.href = "#" + slug;
    a.setAttribute("aria-current", state.active === slug ? "true" : "false");
    a.appendChild(el("span", "", name));
    a.appendChild(el("span", "n", String(n)));
    return a;
  }

  function renderItem(item) {
    var li = el("li", "item");
    var info = el("div");
    info.appendChild(el("h3", "", item.title));
    if (item.description) info.appendChild(el("p", "", item.description));
    var bits = [item.type === "pdf" ? "PDF" : (item.label || "Link")];
    if (item.type === "pdf" && item.size) bits.push(fmtSize(item.size));
    var d = fmtDate(item.date);
    if (d) bits.push(d);
    info.appendChild(el("div", "meta", bits.join(" · ")));
    li.appendChild(info);

    var actions = el("div", "actions");
    var open = el("a", "btn", item.type === "pdf" ? "View" : "Open");
    open.href = item.url;
    open.target = "_blank";
    open.rel = "noopener";
    actions.appendChild(open);
    if (item.type === "pdf") {
      var dl = el("a", "btn ghost", "Download");
      dl.href = item.url;
      dl.setAttribute("download", "");
      actions.appendChild(dl);
    }
    li.appendChild(actions);
    return li;
  }

  function renderList() {
    var root = document.getElementById("list");
    root.textContent = "";
    var shown = state.sections.filter(function (s) { return state.active === "all" || s.slug === state.active; });
    shown.forEach(function (s) {
      var items = state.items
        .filter(function (i) { return i.section === s.slug && matches(i); })
        .sort(function (a, b) { return (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title); });

      // On the "All" view, hide empty sections while searching so results stay short.
      if (state.active === "all" && state.q && !items.length) return;

      var group = el("section", "group");
      var h2 = el("h2", "", s.name);
      h2.appendChild(el("span", "count", items.length + (items.length === 1 ? " item" : " items")));
      group.appendChild(h2);
      if (s.blurb) group.appendChild(el("p", "blurb", s.blurb));

      if (items.length) {
        var ul = el("ul", "items");
        items.forEach(function (i) { ul.appendChild(renderItem(i)); });
        group.appendChild(ul);
      } else {
        group.appendChild(el("p", "empty", state.q ? "Nothing matches your search." : "Nothing here yet."));
      }
      root.appendChild(group);
    });
    if (!root.children.length) root.appendChild(el("p", "empty", "Nothing matches your search."));
  }

  function render() {
    renderTabs();
    renderList();
  }

  Promise.all([loadJSON("site.json"), loadJSON("pdfs.json")]).then(function (res) {
    var site = res[0] || { sections: [], links: [] };
    var pdfs = (res[1] && res[1].items) || [];

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
    state.items = pdfs.map(function (p) { p.type = "pdf"; return p; }).concat(links);

    readHash();
    render();
  });

  window.addEventListener("hashchange", function () { readHash(); render(); });
  document.getElementById("q").addEventListener("input", function (e) {
    state.q = e.target.value.trim().toLowerCase();
    render();
  });
})();
