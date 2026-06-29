/* Automatic table-of-contents sidebar for blog posts.
 * Drop-in: <script src="toc.js" defer></script> before </body>.
 * - Builds a TOC from top-level <h2> sections (reusing existing section ids).
 * - Fixed in the left gutter of the centered column; auto-hides when the
 *   window is too narrow to fit it without overlapping the text.
 * - Scroll-spy highlights the section you're currently reading.
 * No per-post configuration or markup changes required.
 */
(function () {
  "use strict";

  function slugify(s) {
    return s.toLowerCase().trim()
      .replace(/\$[^$]*\$/g, "")        // drop inline LaTeX
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);
  }

  function init() {
    // Collect section headings, skipping anything inside the TOC itself.
    var headings = Array.prototype.slice
      .call(document.querySelectorAll("h2"))
      .filter(function (h) {
        return h.textContent.trim().length && !h.closest(".blog-toc");
      });

    if (headings.length < 3) return; // too short to be worth a sidebar

    var items = headings.map(function (h) {
      var id = h.id;
      if (!id) {
        var sec = h.closest("section[id]");
        if (sec && sec.id) id = sec.id;
      }
      if (!id) id = slugify(h.textContent) || ("sec-" + Math.random().toString(36).slice(2, 8));
      if (!h.id) h.id = id;            // make the heading itself a stable anchor
      return { el: h, id: h.id, text: h.textContent.trim() };
    });

    // Pick up the post's accent colour from the h2 underline, if any.
    var accent = "#3498db";
    var bc = getComputedStyle(headings[0]).borderBottomColor;
    if (bc && bc !== "rgba(0, 0, 0, 0)" && bc !== "transparent") accent = bc;

    // --- Build the nav -----------------------------------------------------
    var nav = document.createElement("nav");
    nav.className = "blog-toc";
    nav.setAttribute("aria-label", "Table of contents");
    var html = '<div class="blog-toc-title">Contents</div><ul>';
    items.forEach(function (it) {
      html += '<li><a href="#' + it.id + '" data-id="' + it.id + '">' +
        it.text.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</a></li>";
    });
    nav.innerHTML = html + "</ul>";
    document.body.appendChild(nav);

    var css = document.createElement("style");
    css.textContent = [
      "h2{scroll-margin-top:24px;}",
      ".blog-toc{position:fixed;top:90px;width:200px;max-height:calc(100vh - 140px);overflow-y:auto;font-size:0.82em;line-height:1.35;z-index:50;}",
      ".blog-toc .blog-toc-title{text-transform:uppercase;letter-spacing:0.08em;font-size:0.82em;font-weight:700;color:#94a3b8;margin-bottom:0.8em;}",
      ".blog-toc ul{list-style:none;margin:0;padding:0;}",
      ".blog-toc li{margin:0;}",
      ".blog-toc a{display:block;padding:5px 0 5px 12px;border-left:2px solid #e5e7eb;color:#64748b;text-decoration:none;font-weight:500;transition:color .15s,border-color .15s;}",
      ".blog-toc a:hover{color:#1e293b;}",
      ".blog-toc::-webkit-scrollbar{width:6px;}",
      ".blog-toc::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:3px;}"
    ].join("");
    document.head.appendChild(css);

    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));

    links.forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var t = document.getElementById(a.dataset.id);
        if (!t) return;
        t.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#" + a.dataset.id);
      });
    });

    function setActive(id) {
      links.forEach(function (a) {
        var on = a.dataset.id === id;
        a.style.color = on ? accent : "";
        a.style.borderLeftColor = on ? accent : "";
        a.style.fontWeight = on ? "600" : "";
      });
    }

    // --- Place in the left gutter; hide if there isn't room ----------------
    function position() {
      var rect = document.body.getBoundingClientRect();
      var pad = 16, gap = 24, maxW = 210, minW = 140;
      var width = Math.min(maxW, rect.left - gap - pad);
      if (width < minW) { nav.style.display = "none"; return; }
      nav.style.display = "";
      nav.style.width = width + "px";
      nav.style.left = Math.max(pad, (rect.left - gap - width) / 2) + "px";
    }

    // --- Scroll-spy --------------------------------------------------------
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var threshold = 140, current = items[0].id;
        for (var i = 0; i < items.length; i++) {
          if (items[i].el.getBoundingClientRect().top - threshold <= 0) current = items[i].id;
          else break;
        }
        setActive(current);
        ticking = false;
      });
    }

    position();
    onScroll();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", onScroll, { passive: true });

    // Render any LaTeX that ended up in heading text.
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([nav]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();