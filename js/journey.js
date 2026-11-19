/* Ontario Speed Dating: the journey.
   A pinned full screen stage scrubbed by scroll through three pre-rendered
   frame sequences, crossfading at the chapter joins. Runs only in film mode
   (JavaScript on, no reduced motion preference). Otherwise the static poster
   hero from the HTML stays in place. */
(function () {
  "use strict";
  var doc = document.documentElement;
  if (!doc.classList.contains("js-film")) return;

  var journey = document.getElementById("journey");
  var stage = journey.querySelector(".stage");
  var canvas = journey.querySelector(".stage-canvas");
  var ctx = canvas.getContext("2d", { alpha: false });
  var title = journey.querySelector(".hero-title");
  var captions = Array.prototype.slice.call(journey.querySelectorAll(".caption"));
  var railItems = Array.prototype.slice.call(journey.querySelectorAll(".rail-item"));
  var fill = journey.querySelector(".rail-progress-fill");
  var cue = journey.querySelector(".scroll-cue");
  var fade = journey.querySelector(".stage-fade");

  var COUNT = 60;
  /* Timeline (0..1 of the pinned scroll). Night covers chapters 03 and 04. */
  var SEGMENTS = [
    { name: "city", from: 0.0, to: 0.25 },
    { name: "room", from: 0.25, to: 0.5 },
    { name: "night", from: 0.5, to: 0.95 }
  ];
  var JOINS = [0.25, 0.5];
  var XF = 0.03;                               /* crossfade half width at each join */
  var CHAPTER_STARTS = [0, 0.25, 0.5, 0.725];  /* 04 starts at the night film's midpoint */

  /* ---------- Frame loading: city first, then room, then night ---------- */
  var frames = {};
  var queue = [];
  SEGMENTS.forEach(function (s) {
    frames[s.name] = new Array(COUNT);
    /* coarse pass first (every 6th frame) so scrubbing works early, then fill in */
    var order = [];
    for (var i = 0; i < COUNT; i += 6) order.push(i);
    for (var j = 0; j < COUNT; j++) if (j % 6) order.push(j);
    order.forEach(function (k) { queue.push([s.name, k]); });
  });
  var inflight = 0, MAX = 6;
  function pump() {
    while (inflight < MAX && queue.length) {
      (function (item) {
        var img = new Image();
        img.decoding = "async";
        inflight++;
        img.onload = function () {
          inflight--;
          frames[item[0]][item[1]] = img;
          needsDraw = true;
          pump();
        };
        img.onerror = function () { inflight--; pump(); };
        img.src = "assets/film/frames-" + item[0] + "/f" + String(item[1] + 1).padStart(3, "0") + ".jpg";
      })(queue.shift());
    }
  }
  pump();

  function nearest(name, idx) {
    var arr = frames[name];
    idx = Math.max(0, Math.min(COUNT - 1, Math.round(idx)));
    if (arr[idx]) return arr[idx];
    for (var d = 1; d < COUNT; d++) {
      if (idx - d >= 0 && arr[idx - d]) return arr[idx - d];
      if (idx + d < COUNT && arr[idx + d]) return arr[idx + d];
    }
    return null;
  }

  /* ---------- Canvas sizing ---------- */
  var W = 0, H = 0;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = stage.clientWidth, h = stage.clientHeight;
    var nw = Math.round(w * dpr), nh = Math.round(h * dpr);
    if (nw !== W || nh !== H) {
      W = canvas.width = nw; H = canvas.height = nh;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      needsDraw = true;
    }
    measure();
  }

  function drawCover(img, alpha) {
    if (!img) return false;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var s = Math.max(W / iw, H / ih);
    var dw = iw * s, dh = ih * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return true;
  }

  function localFrame(seg, p) {
    var t = (p - seg.from) / (seg.to - seg.from);
    return Math.max(0, Math.min(1, t)) * (COUNT - 1);
  }
  function smooth(a, b, x) {
    var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  var drawnKey = "";
  var hasDrawn = false;
  function draw(p) {
    /* which segment owns p, and is a join near? */
    var layers = [];
    var segIdx = p < 0.25 ? 0 : p < 0.5 ? 1 : 2;
    var joinIdx = -1;
    for (var j = 0; j < JOINS.length; j++) if (Math.abs(p - JOINS[j]) < XF) joinIdx = j;
    if (joinIdx >= 0) {
      var a = SEGMENTS[joinIdx], b = SEGMENTS[joinIdx + 1];
      var t = smooth(JOINS[joinIdx] - XF, JOINS[joinIdx] + XF, p);
      layers.push([a.name, localFrame(a, p), 1]);
      layers.push([b.name, localFrame(b, p), t]);
    } else {
      var s = SEGMENTS[segIdx];
      layers.push([s.name, localFrame(s, p), 1]);
    }
    var key = layers.map(function (l) { return l[0] + Math.round(l[1]) + ":" + l[2].toFixed(2); }).join("|");
    if (key === drawnKey && !needsDraw) return;
    var base = nearest(layers[0][0], layers[0][1]);
    if (!base) return; /* poster image underneath covers until frames arrive */
    drawnKey = key;
    needsDraw = false;
    drawCover(base, 1);
    if (layers[1] && layers[1][2] > 0.001) drawCover(nearest(layers[1][0], layers[1][1]), layers[1][2]);
    ctx.globalAlpha = 1;
    if (!hasDrawn) { hasDrawn = true; journey.classList.add("has-film"); }
  }

  /* ---------- Scroll mapping ---------- */
  var top = 0, span = 1;
  function measure() {
    var r = journey.getBoundingClientRect();
    top = r.top + window.scrollY;
    span = Math.max(1, journey.offsetHeight - stage.offsetHeight);
  }
  function progress() {
    return Math.max(0, Math.min(1, (window.scrollY - top) / span));
  }

  var chapter = -1;
  function setChapter(c) {
    if (c === chapter) return;
    chapter = c;
    captions.forEach(function (el, i) { el.classList.toggle("is-active", i === c); });
    railItems.forEach(function (el, i) {
      var on = i === c;
      el.classList.toggle("is-active", on);
      if (on) el.setAttribute("aria-current", "step"); else el.removeAttribute("aria-current");
    });
  }

  var needsDraw = true;
  var lastP = -1;
  function tick() {
    var p = progress();
    if (p !== lastP || needsDraw) {
      lastP = p;
      draw(p);
      var c = 0;
      for (var i = CHAPTER_STARTS.length - 1; i >= 0; i--) if (p >= CHAPTER_STARTS[i]) { c = i; break; }
      setChapter(c);
      /* headline belongs to the first beat */
      var h = 1 - smooth(0.1, 0.2, p);
      title.style.opacity = h.toFixed(3);
      title.style.transform = "translate3d(0," + ((1 - h) * -28).toFixed(1) + "px,0)";
      title.style.visibility = h < 0.01 ? "hidden" : "";
      cue.classList.toggle("is-gone", p > 0.012);
      fill.style.transform = "scaleX(" + p.toFixed(4) + ")";
      fade.style.opacity = (smooth(0.955, 1, p) * 0.55).toFixed(3);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Chapter rail: jump to a chapter ---------- */
  railItems.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var i = Number(btn.dataset.goto);
      measure();
      var target = i === 0 ? 0 : CHAPTER_STARTS[i] + 0.035;
      var y = top + target * span;
      if (window.ONSD && window.ONSD.scrollToY) window.ONSD.scrollToY(y, { duration: 2.2 });
      else window.scrollTo(0, y);
    });
  });

  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
  window.addEventListener("load", measure);
  resize();
  requestAnimationFrame(tick);
})();
