/* ============================================================
   LORDS AGENCY - cinematic eye-evolution intro (production)

   One eye, transforming. Not a slideshow of eyes.

   Plays once on page load, then removes itself. It is an overlay ON TOP of
   the real site: the page is never replaced, re-parented or re-rendered.

   MORPH ARCHITECTURE
   Every stage is the SAME parameter schema, and consecutive stages are
   blended by interpolating those parameters. Feature amplitudes fade in and
   out, and fractional feature COUNTS make elements appear one at a time
   (a 2 -> 3 blade transition draws two full blades plus one growing third).
   The result is continuous deformation: nothing crossfades, and the eye
   never resolves into two unrelated images.

   ALL GEOMETRY, DRAWN LIVE
   There are no images, sprites, frame ladders or video files anywhere in this
   intro - zero bytes of media payload. Every shape is drawn with Canvas 2D
   primitives at runtime, which is why the composition is resolution
   independent (it is sharp at any DPR and any viewport) and why nothing has
   to be downloaded, decoded or cached before it can play.

   The stage names below are NEUTRAL INTERNAL LABELS (eye-01 .. eye-final).
   They describe what is drawn. They are not claims about any specific eye
   from any specific fictional canon, and no third-party artwork, footage or
   asset is reproduced or bundled.

   COLOUR
   The intro is the only crimson thing on this site. Its final frames resolve
   to #0d1015, the top stop of the production hero gradient in styles.css, so
   the hand-off is a continuous move rather than a cut into a different site.

   TIMELINE (seconds, total 9.0)
     0.00 - 0.60  darkness / atmosphere
     0.60 - 1.30  eye-01     minimal ring + pupil
     1.30 - 2.00  eye-02     three-blade triskelion
     2.00 - 2.70  eye-03     four-blade pinwheel
     2.70 - 3.50  eye-04     six-blade spiral vortex
     3.50 - 4.30  eye-05     six-point star lattice
     4.30 - 5.10  eye-06     orbit nodes
     5.10 - 6.00  eye-07     concentric rings + nodes
     6.00 - 6.60  eye-final  eight-blade sigil + hex core
     6.55 - 7.45  lock + one pulse
     7.45 - 8.45  camera push-in, eye fills screen
     8.45 - 9.00  red energy + crows, then LORDS AGENCY
     9.00 - 9.90  hand-off: overlay fades, site fades up underneath
   ============================================================ */
(function () {
  'use strict';

  /* ---------- small helpers, declared before use ---------- */

  /* The colour the intro resolves into on its final frames.

     This is the TOP stop of the production hero gradient, declared literally
     in css/styles.css:

         .hero { background: ... linear-gradient(180deg, #0d1015, var(--bg-deep)); }

     It is deliberately NOT read from --bg-deep, which is that gradient's
     bottom stop (#07090c). The overlay is dismissed at the top of the page,
     so it has to land on the colour the visitor's eye is at that moment.

     One literal, with the source line named, so the two can be checked
     against each other by reading - rather than trusting a runtime lookup
     that would silently fall back if the custom property were renamed. */
  var SITE_TOP = '#0d1015';

  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return [13, 16, 21];
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }

  /* ============================================================
     BOOT GUARD
     If the overlay markup is absent (a stripped build, a partial deploy, a
     cached old page) there is nothing to play. Bail out quietly and leave the
     site exactly as it found it - never block the page on a missing intro.
     ============================================================ */
  var DURATION = 9.0;
  var BRAND_AT = 8.55;

  /* Render-resolution policy. The composition is vector, so resolution is a
     pure cost decision:
       - DPR is capped at 2. Beyond that the extra pixels buy almost nothing
         on a soft, glow-heavy composition but cost ~2x fill rate.
       - A hard ceiling on total backing-store pixels guards very large or
         very dense displays (8K panels, high-DPI 4K) where 2x DPR would
         allocate a canvas large enough to pressure memory. */
  var MAX_DPR = 2;
  var MAX_BACKING_PIXELS = 4096 * 2304;

  /* The production hero's top gradient stop (css/styles.css `.hero`).
     The intro's last frames resolve to exactly this, so the crossfade into
     the site is invisible. */
  var SITE_TOP_RGB = hexToRgb(SITE_TOP);

  var root    = document.getElementById('cinematic-intro');
  var canvas  = document.getElementById('cinematic-intro__canvas');
  var brand   = document.getElementById('cinematic-intro__brand');
  var ctx     = null;
  var W = 0, H = 0, DPR = 1;

  /* Everything the intro needs to undo. Collected here so the hand-off is a
     single, auditable teardown rather than a scattering of defensive removes. */
  var pageParts = [];   // top-level page elements given `inert`
  var scrollLock = null;  // scroll suppressor, active only during the intro
  var teardown = null;    // scheduled DOM removal
  var failsafe = null;    // hard timer that guarantees the site comes back
  var rafId = null, t0 = 0, brandShown = false, finished = false, reduced = false;

  /* Markup or 2D canvas unavailable: leave the site alone. */
  if (!root || !canvas || !canvas.getContext) return;
  ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ---------- maths ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function span(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function hump(t) { return Math.sin(clamp(t, 0, 1) * Math.PI); }
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function isMobile() { return W < 760; }

  /* ============================================================
     STAGE DEFINITIONS
     One schema. `a` is the feature amplitude (0 = absent), so features
     dissolve instead of popping. `n` may be fractional: we draw
     floor(n) complete elements plus one that is partially grown.
     ============================================================ */

  /* Named eyeStage, not stage: a bare `stage` would be ambiguous with the
     overlay element (`root`) and with the word "stage" used throughout the
     timeline comments above. */
  function eyeStage(o) {
    return {
      blade: { a: 0, n: 0, len: 0.62, wid: 0.20, curve: 0.7, spin: 0, taper: 1 },
      ring:  { a: 0, n: 0, r: 0.86, w: 0.014, broken: 0, spin: 0 },
      node:  { a: 0, n: 0, r: 0.62, size: 0.075, spin: 0 },
      star:  { a: 0, points: 0, rIn: 0.26, rOut: 0.80, spin: 0, lattice: 0 },
      spiral:{ a: 0, arms: 0, r: 0.80, turns: 1.6, w: 0.05, spin: 0 },
      pupil: { a: 1, r: 0.19 },
      core:  { a: 0, sides: 6, r: 0.22 }
    , ...o };
  }

  /* The eight stages. Complexity climbs monotonically. */
  var STAGES = [
    // 0 â€” minimal: a hairline ring, one tiny node, a pupil. Almost nothing.
    eyeStage({ ring: { a: 1, n: 1, r: 0.84, w: 0.012, broken: 0, spin: 0 },
            node: { a: 1, n: 1, r: 0.80, size: 0.045, spin: 0 },
            pupil: { a: 1, r: 0.185 } }),

    // 1 â€” three curved blades sweeping out of a small pupil
    eyeStage({ blade: { a: 1, n: 3, len: 0.66, wid: 0.19, curve: 0.85, spin: 0, taper: 1 },
            pupil: { a: 1, r: 0.16 } }),

    // 2 â€” four-blade pinwheel, blades thicken and reach further
    eyeStage({ blade: { a: 1, n: 4, len: 0.74, wid: 0.20, curve: 0.95, spin: 0, taper: 1 },
            ring:  { a: 1, n: 1, r: 0.88, w: 0.011, broken: 0, spin: 0 },
            pupil: { a: 1, r: 0.15 } }),

    // 3 â€” six-blade spiral vortex, deep curvature
    eyeStage({ blade: { a: 1, n: 6, len: 0.80, wid: 0.15, curve: 1.5, spin: 0, taper: 1 },
            spiral:{ a: 1, arms: 3, r: 0.78, turns: 1.7, w: 0.045, spin: 0 },
            pupil: { a: 1, r: 0.11 } }),

    // 4 â€” six-point star with an internal lattice
    eyeStage({ star:  { a: 1, points: 6, rIn: 0.28, rOut: 0.82, spin: 0, lattice: 1 },
            ring:  { a: 1, n: 2, r: 0.90, w: 0.010, broken: 0, spin: 0 },
            pupil: { a: 1, r: 0.085 } }),

    // 5 â€” orbit: nodes riding a broken ring
    eyeStage({ ring:  { a: 1, n: 1, r: 0.70, w: 0.030, broken: 1, spin: 0 },
            node:  { a: 1, n: 3, r: 0.70, size: 0.11, spin: 0.4 },
            pupil: { a: 1, r: 0.17 } }),

    // 6 â€” concentric rings with nodes on two of them
    eyeStage({ ring:  { a: 1, n: 3, r: 0.84, w: 0.018, broken: 0, spin: 0 },
            node:  { a: 1, n: 6, r: 0.66, size: 0.06, spin: 0.2 },
            pupil: { a: 1, r: 0.15 } }),

    // 7 â€” final: eight-blade sigil, lattice, hex core, node ring
    eyeStage({ blade: { a: 1, n: 8, len: 0.86, wid: 0.13, curve: 1.15, spin: 0, taper: 1 },
            star:  { a: 0.55, points: 8, rIn: 0.24, rOut: 0.72, spin: 0.2, lattice: 1 },
            node:  { a: 1, n: 8, r: 0.72, size: 0.055, spin: 0 },
            ring:  { a: 1, n: 1, r: 0.93, w: 0.014, broken: 0, spin: 0 },
            core:  { a: 1, sides: 6, r: 0.20 },
            pupil: { a: 0, r: 0.10 } })
  ];

  /* Arrival time of each stage. There are exactly 8 keys for 8 stages.
     Anything after the last key holds the final stage - the lock, the single
     pulse and the camera push are separate concerns handled in drawEye, not
     extra stages. (A 9th key here would index STAGES[8], which is undefined.) */
  var KEYS = [0.60, 1.30, 2.00, 2.70, 3.50, 4.30, 5.10, 6.00];

  function mixFeature(A, B, u) {
    var o = {};
    for (var k in A) {
      if (typeof A[k] === 'number') { o[k] = lerp(A[k], B[k], u); continue; }
      o[k] = {};
      for (var j in A[k]) o[k][j] = lerp(A[k][j], B[k][j], u);
    }
    return o;
  }

  /** Interpolated parameter set for any time in the sequence. */
  function paramsAt(t) {
    if (t <= KEYS[0]) {
      // before the first stage: hold stage 0's shape at zero amplitude so it
      // grows in rather than popping
      var s = mixFeature(STAGES[0], STAGES[0], 0);
      s.blade.a = 0; s.star.a = 0; s.spiral.a = 0; s.node.a = 0; s.ring.a = 0; s.pupil.a = 0; s.core.a = 0;
      return s;
    }
    if (t >= KEYS[KEYS.length - 1]) return mixFeature(STAGES[STAGES.length - 1], STAGES[STAGES.length - 1], 0);
    for (var i = 0; i < KEYS.length - 1; i++) {
      if (t <= KEYS[i + 1]) {
        var raw = (t - KEYS[i]) / (KEYS[i + 1] - KEYS[i]);
        // ease each morph so arrival settles rather than stopping dead
        return mixFeature(STAGES[i], STAGES[i + 1], easeInOut(raw));
      }
    }
    return STAGES[0];
  }

  /* ============================================================
     PATTERN FEATURES
     All cut in black out of the red disc, matching the reference's
     screen-print contrast.
     ============================================================ */

  /* A curved tapered blade sweeping outward along +X from near the centre. */
  function bladePath(R, len, wid, curve) {
    var x0 = R * 0.15, x1 = R * len;
    var c = curve * R * 0.30;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.bezierCurveTo(x0 + (x1 - x0) * 0.42, wid * R * 0.95 + c * 0.30,
                      x1 * 0.84, wid * R * 0.50 + c,
                      x1, 0);
    ctx.bezierCurveTo(x1 * 0.84, -wid * R * 0.34 + c,
                      x0 + (x1 - x0) * 0.42, wid * R * 0.06 + c * 0.15,
                      x0, 0);
    ctx.closePath();
  }

  /* Draw floor(n) whole elements plus one grown by the fraction, so element
     counts animate rather than jump. */
  function eachCount(n, fn) {
    var whole = Math.floor(n);
    var frac = n - whole;
    for (var i = 0; i < whole; i++) fn(i, 1);
    if (frac > 0.02) fn(whole, frac);
  }

  function drawBlades(ctx, R, f, rot) {
    if (f.a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha *= f.a;
    ctx.fillStyle = '#000';
    eachCount(f.n, function (i, g) {
      ctx.save();
      ctx.rotate(rot + (i / Math.max(1, f.n)) * Math.PI * 2);
      // the partially grown blade also grows from the centre outward
      if (g < 1) { ctx.scale(g, g); }
      bladePath(R, f.len, f.wid, f.curve);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  function drawRings(ctx, R, f, rot) {
    if (f.a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha *= f.a;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(1, R * f.w);
    eachCount(f.n, function (i, g) {
      var rr = R * f.r * (1 + i * 0.075);
      if (g < 1) rr *= 0.6 + 0.4 * g;
      ctx.save();
      ctx.rotate(rot);
      if (f.broken > 0.5) {
        // three arcs with gaps
        for (var s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.arc(0, 0, rr, s * 2.094 + 0.28, s * 2.094 + 1.82);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, 6.2832);
        ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  function drawNodes(ctx, R, f, rot) {
    if (f.a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha *= f.a;
    ctx.fillStyle = '#000';
    eachCount(f.n, function (i, g) {
      var a = rot + (i / Math.max(1, f.n)) * Math.PI * 2;
      var rad = R * f.size * (0.5 + 0.5 * g);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R * f.r, Math.sin(a) * R * f.r, rad, 0, 6.2832);
      ctx.fill();
    });
    ctx.restore();
  }

  function starPath(ctx, R, points, rIn, rOut) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      var r = (i % 2 === 0) ? rOut : rIn;
      var x = Math.cos(a) * R * r, y = Math.sin(a) * R * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawStar(ctx, R, f, rot) {
    if (f.a <= 0.01 || f.points < 3) return;
    ctx.save();
    ctx.globalAlpha *= f.a;
    ctx.fillStyle = '#000';
    ctx.rotate(rot);
    starPath(ctx, R, f.points, f.rIn, f.rOut);
    ctx.fill();
    if (f.lattice > 0.02) {
      // inner star + spokes: the internal lattice of the reference's star stages
      ctx.save();
      ctx.rotate(rot);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = Math.max(1, R * 0.016);
      var inner = f.points;
      for (var i = 0; i < inner; i++) {
        var a1 = (i / inner) * Math.PI * 2;
        var a2 = ((i + inner / 2) % inner) / inner * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a1) * R * f.rIn, Math.sin(a1) * R * f.rIn);
        ctx.lineTo(Math.cos(a2) * R * f.rIn, Math.sin(a2) * R * f.rIn);
        ctx.stroke();
      }
      starPath(ctx, R, inner, f.rIn * 0.52, f.rIn * 0.98);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawSpiral(ctx, R, f, rot) {
    if (f.a <= 0.01 || f.arms < 0.5) return;
    ctx.save();
    ctx.globalAlpha *= f.a;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(1, R * f.w);
    ctx.lineCap = 'round';
    eachCount(f.arms, function (k, g) {
      ctx.save();
      ctx.rotate(rot + (k / f.arms) * Math.PI * 2);
      var turns = f.turns * g;
      var steps = Math.max(8, Math.round(turns * 22));
      ctx.beginPath();
      for (var i = 0; i <= steps; i++) {
        var u = i / steps;
        var ang = u * turns * Math.PI * 2;
        var rr = R * f.r * (0.16 + 0.84 * u);
        var x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }

  function drawCore(ctx, R, f) {
    if (f.a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha *= f.a;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    for (var i = 0; i < f.sides; i++) {
      var a = (i / f.sides) * Math.PI * 2 - Math.PI / 2;
      var x = Math.cos(a) * R * f.r, y = Math.sin(a) * R * f.r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPupil(ctx, R, f) {
    if (f.a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha *= f.a;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, R * f.r, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }

  /* ============================================================
     THE EYE
     ============================================================ */

  /* Base disc scale as a fraction of viewport width, per the brief:
     20-30% early, 30-40% middle, 45-60% final. */
  function discScale(t) {
    if (t < 0.6) return 0;
    if (t < 3.5) return lerp(0.22, 0.34, span(t, 0.6, 3.5));
    if (t < 6.0) return lerp(0.34, 0.44, span(t, 3.5, 6.0));
    return lerp(0.44, 0.56, span(t, 6.0, 6.6));
  }

  function drawEye(t) {
    var appear = easeOut(span(t, 0.30, 0.85));
    if (appear <= 0.002) return;

    var push = easeInOut(span(t, 7.45, 8.45));   // camera push, full at 8.45
    // The dissolve must NOT start until the eye is actually at full size.
    // Overlapping it with the push (as an earlier pass did at 8.15 vs 8.45)
    // meant the disc was already half-faded at maximum scale, so the single
    // most important beat in the whole sequence lasted about 0.3s.
    var gone = easeInOut(span(t, 8.50, 8.88));
    var lock = span(t, 6.55, 7.10);
    var pulse = hump(span(t, 6.95, 7.45));      // ONE pulse

    var vis = appear * (1 - gone);
    if (vis <= 0.002) return;

    var p = paramsAt(t);
    // the pattern turns slowly and continuously; the push spins it up
    var spin = t * 0.30 + push * 2.4;

    var cx = W * 0.5, cy = H * 0.5;

    // diameter in CSS px, then the push drives it well past the viewport
    var base = Math.min(W * discScale(t), H * 0.72);
    var R = (base * 0.5) * (1 + push * 2.9);

    ctx.save();
    ctx.globalAlpha = clamp(vis, 0, 1);

    /* atmospheric bloom behind the disc */
    ctx.globalCompositeOperation = 'screen';
    var gr = R * (1.35 + pulse * 0.30 + push * 0.9);
    var gg = ctx.createRadialGradient(cx, cy, R * 0.25, cx, cy, gr);
    var ga = (0.20 + lock * 0.16 + pulse * 0.40 + push * 0.30) * vis;
    gg.addColorStop(0, 'rgba(255,58,84,' + ga.toFixed(4) + ')');
    gg.addColorStop(0.42, 'rgba(186,14,40,' + (ga * 0.5).toFixed(4) + ')');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
    ctx.globalCompositeOperation = 'source-over';

    /* the disc: FLAT saturated red, exactly like the reference */
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.2832);
    ctx.fillStyle = '#e01020';
    ctx.fill();

    /* pattern, cut in black */
    ctx.save();
    ctx.translate(cx, cy);

    // radial smear: ghost copies of the whole pattern, offset outward and
    // faded. Cheaper and more controllable than a real motion blur, and it
    // reads as the camera accelerating into the eye.
    if (push > 0.02) {
      for (var gI = 0; gI < 3; gI++) {
        var gs = 1 + (gI + 1) * 0.045 * push;
        ctx.save();
        ctx.globalAlpha = (1 - push) * 0.22 * push;
        ctx.scale(gs, gs);
        paintPattern(R, p, spin, 1);
        ctx.restore();
      }
    }

    paintPattern(R, p, spin, clamp(vis, 0, 1));
    ctx.restore();

    /* hot rim right at the disc edge, so the push still reads once the
       pattern has swollen past the frame */
    if (push > 0.01) {
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 6.2832);
      ctx.lineWidth = Math.max(2, R * 0.02);
      ctx.strokeStyle = 'rgba(255,70,96,' + (0.5 * push).toFixed(3) + ')';
      ctx.stroke();
    }

    ctx.restore();
  }

  function paintPattern(R, p, spin, alphaMul) {
    ctx.save();
    ctx.globalAlpha *= alphaMul;
    drawRings(ctx, R, p.ring, -spin * 0.6);
    drawSpiral(ctx, R, p.spiral, spin * 1.2);
    drawStar(ctx, R, p.star, spin * 0.35);
    drawBlades(ctx, R, p.blade, spin);
    drawNodes(ctx, R, p.node, -spin * 0.8);
    drawCore(ctx, R, p.core);
    drawPupil(ctx, R, p.pupil);
    ctx.restore();
  }

  /* ============================================================
     ATMOSPHERE
     ============================================================ */

  function drawBase(t) {
    var h = lerp(0.04, 0.22, span(t, 0.0, 1.2));
    var g = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(' + Math.round(18 + h * 150) + ',' + Math.round(3 + h * 6) + ',' + Math.round(7 + h * 14) + ',1)');
    g.addColorStop(0.58, 'rgba(7,2,5,1)');
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawSmoke(t) {
    var amt = span(t, 0.15, 1.0) * (1 - span(t, 8.5, 8.95));
    if (amt <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (var i = 0; i < 6; i++) {
      var ph = i * 1.7;
      var sx = W * (0.5 + 0.27 * Math.sin(t * 0.5 + ph));
      var sy = H * (0.5 + 0.21 * Math.cos(t * 0.38 + ph * 1.3));
      var rad = Math.max(W, H) * (0.15 + rnd(i) * 0.15);
      var a = amt * (0.045 + rnd(i + 9) * 0.045);
      var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
      g.addColorStop(0, 'rgba(178,20,44,' + a.toFixed(4) + ')');
      g.addColorStop(0.5, 'rgba(110,10,28,' + (a * 0.4).toFixed(4) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
    }
    ctx.restore();
  }

  function drawParticles(t) {
    var amt = span(t, 0.3, 1.1) * (1 - span(t, 8.6, 8.98));
    if (amt <= 0) return;
    var count = isMobile() ? 20 : 40;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (var i = 0; i < count; i++) {
      var r1 = rnd(i), r2 = rnd(i + 40), r3 = rnd(i + 80);
      var life = (t * (0.05 + r3 * 0.09) + r1) % 1;
      var px = W * (0.04 + r2 * 0.92) + Math.sin(t * 0.6 + i) * 14;
      var py = H * (1.02 - life * 1.08);
      var rad = (0.8 + r3 * 2.1) * (W / 1440 + 0.5);
      var al = amt * (0.16 + r3 * 0.42) * Math.sin(life * Math.PI);
      var g = ctx.createRadialGradient(px, py, 0, px, py, rad * 3.4);
      g.addColorStop(0, 'rgba(255,146,162,' + al.toFixed(4) + ')');
      g.addColorStop(0.4, 'rgba(206,22,50,' + (al * 0.4).toFixed(4) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, rad * 3.4, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }

  /* original bird silhouette, drawn not loaded */
  function birdPath(s, wingsUp) {
    ctx.beginPath();
    if (wingsUp) {
      ctx.moveTo(0, -0.10 * s);
      ctx.bezierCurveTo(0.30 * s, -0.62 * s, 0.95 * s, -0.72 * s, 1.45 * s, -0.34 * s);
      ctx.bezierCurveTo(1.00 * s, -0.30 * s, 0.52 * s, -0.20 * s, 0.16 * s, 0.18 * s);
      ctx.lineTo(0, 0.30 * s); ctx.lineTo(-0.16 * s, 0.18 * s);
      ctx.bezierCurveTo(-0.52 * s, -0.20 * s, -1.00 * s, -0.30 * s, -1.45 * s, -0.34 * s);
      ctx.bezierCurveTo(-0.95 * s, -0.72 * s, -0.30 * s, -0.62 * s, 0, -0.10 * s);
    } else {
      ctx.moveTo(0, -0.06 * s);
      ctx.bezierCurveTo(0.34 * s, 0.16 * s, 1.00 * s, 0.30 * s, 1.52 * s, 0.20 * s);
      ctx.bezierCurveTo(1.02 * s, 0.44 * s, 0.50 * s, 0.40 * s, 0.15 * s, 0.24 * s);
      ctx.lineTo(0, 0.34 * s); ctx.lineTo(-0.15 * s, 0.24 * s);
      ctx.bezierCurveTo(-0.50 * s, 0.40 * s, -1.02 * s, 0.44 * s, -1.52 * s, 0.20 * s);
      ctx.bezierCurveTo(-1.00 * s, 0.30 * s, -0.34 * s, 0.16 * s, 0, -0.06 * s);
    }
    ctx.closePath();
  }

  var BIRD_SPAN = 3.04;
  var CROWS = [
    { d: 1.2, dur: 4.6, y: 0.15, w: 76,  o: 0.30, up: false },
    { d: 1.5, dur: 4.1, y: 0.70, w: 96,  o: 0.36, up: true },
    { d: 1.9, dur: 3.7, y: 0.28, w: 116, o: 0.42, up: false },
    { d: 2.3, dur: 3.3, y: 0.82, w: 134, o: 0.48, up: true },
    { d: 2.7, dur: 3.0, y: 0.44, w: 152, o: 0.54, up: false },
    { d: 3.1, dur: 2.7, y: 0.90, w: 168, o: 0.60, up: true }
  ];

  function drawCrows(t) {
    var amt = span(t, 1.0, 1.8) * (1 - span(t, 7.0, 7.6));
    if (amt <= 0) return;
    var vf = (isMobile() ? 0.60 : 1) * (W / 1440);
    var n = isMobile() ? 4 : CROWS.length;
    ctx.save();
    for (var i = 0; i < n; i++) {
      var c = CROWS[i];
      var p = (t - c.d) / c.dur;
      if (p <= 0 || p >= 1) continue;
      var scale = (c.w * vf) / BIRD_SPAN;
      var x = lerp(-0.2, 1.2, p) * W;
      var y = c.y * H + Math.sin(t * 0.8 + i) * 11;
      var a = c.o * amt * Math.min(1, p * 5) * Math.min(1, (1 - p) * 5);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 1.1 + i * 1.4) * 0.08);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#000';
      birdPath(scale, c.up);
      ctx.fill();
      ctx.lineWidth = Math.max(0.7, scale * 0.014);
      ctx.strokeStyle = 'rgba(255,88,110,0.15)';
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /* Two large birds sweeping the foreground during the push, for depth. */
  function drawForegroundCrows(t) {
    var amt = span(t, 7.30, 7.60) * (1 - span(t, 8.55, 8.85));
    if (amt <= 0) return;
    var vf = (isMobile() ? 0.5 : 1) * (W / 1440);
    var set = [
      { p0: 7.48, dur: 0.95, y: 0.16, w: 250, up: true },
      { p0: 7.62, dur: 0.88, y: 0.78, w: 190, up: false }
    ];
    ctx.save();
    for (var i = 0; i < set.length; i++) {
      var c = set[i];
      var p = (t - c.p0) / c.dur;
      if (p <= 0 || p >= 1) continue;
      var scale = (c.w * vf) / BIRD_SPAN;
      var x = lerp(-0.32, 1.38, easeInOut(p)) * W;
      ctx.save();
      ctx.translate(x, c.y * H);
      ctx.rotate(-0.10 + p * 0.24);
      ctx.globalAlpha = amt * Math.min(1, p * 5) * Math.min(1, (1 - p) * 5) * 0.94;
      ctx.fillStyle = '#000';
      birdPath(scale, c.up);
      ctx.fill();
      ctx.lineWidth = Math.max(0.8, scale * 0.011);
      ctx.strokeStyle = 'rgba(255,78,102,0.20)';
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /* Radial energy + red flood, then a hard collapse to black. */
  function drawEnergy(t) {
    var p = span(t, 8.40, 8.98);
    if (p <= 0) return;
    var rise = span(p, 0, 0.38);
    var fall = easeInOut(span(p, 0.46, 1));
    var cx = W * 0.5, cy = H * 0.5;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var rad = lerp(Math.min(W, H) * 0.35, Math.max(W, H) * 1.05, easeOut(rise));
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    var a = 0.68 * Math.sin(clamp(p, 0, 1) * Math.PI);
    g.addColorStop(0, 'rgba(244,30,58,' + a.toFixed(4) + ')');
    g.addColorStop(0.4, 'rgba(170,12,38,' + (a * 0.58).toFixed(4) + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // radial streaks
    ctx.strokeStyle = 'rgba(255,120,140,' + (0.22 * (1 - p) * p * 4).toFixed(3) + ')';
    ctx.lineWidth = Math.max(1, W * 0.0025);
    for (var i = 0; i < 46; i++) {
      var ang = (i / 46) * Math.PI * 2 + i * 0.11;
      var r0 = rad * (0.42 + 0.2 * Math.sin(i * 2.3));
      var r1 = rad * (0.7 + 0.35 * ((i * 37 % 11) / 11));
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.stroke();
    }
    ctx.restore();

    if (fall > 0) {
      /* Resolve into the production hero's own colour, not into black.
         The crimson flood has already decayed by this point, so this reads as
         the energy dissipating *into* the page rather than the page cutting in
         over a dead screen.

         k reaches exactly 1.0, so the final frames ARE the hero top stop and
         the 0.9s overlay fade reveals an identical colour underneath. Leaving
         it short of 1.0 (tried at 0.95) leaves a measurable step at the centre
         of frame, which reads as a faint flash at the moment of hand-off. */
      var k = easeInOut(span(p, 0.50, 1));
      ctx.fillStyle = 'rgba(' + SITE_TOP_RGB[0] + ',' + SITE_TOP_RGB[1] + ',' + SITE_TOP_RGB[2] + ',' + k.toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawVignette(t) {
    var g = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.24,
                                     W * 0.5, H * 0.5, Math.max(W, H) * 0.74);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + (0.72 + span(t, 7.4, 8.4) * 0.2).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- composition ---------- */
  function render(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    drawBase(t);
    drawSmoke(t);
    drawParticles(t);
    drawEye(t);
    drawCrows(t);
    drawForegroundCrows(t);
    drawEnergy(t);
    drawVignette(t);
  }

  /* ---------- canvas resolution ---------- */
  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);

    /* Backing-store ceiling. Small viewports are already cheap in absolute
       pixels, so they keep full crispness; the cap only bites on large or very
       dense displays, where it trades imperceptible sharpness for a canvas
       that will not pressure memory. */
    var budget = Math.sqrt(MAX_BACKING_PIXELS / (w * h));
    if (budget < dpr) dpr = Math.max(1, budget);

    if (w === W && h === H && dpr === DPR) return false;
    W = w; H = h; DPR = dpr;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return true;
  }

  /* ---------- playback ---------- */
  /* ============================================================
     COMPLETION / HAND-OFF
     ============================================================
     This is the single seam a later production integration replaces. The
     order is deliberate and matches the required lifecycle:

         introComplete()
           -> overlay opacity 0
           -> visibility hidden
           -> pointer-events none
           -> remove inert from the website
           -> the LORDS AGENCY site is interactive

     The site is in normal document flow underneath the overlay for the
     whole sequence, so nothing is created, swapped or injected at the end -
     the overlay simply stops existing. `site` is inert while the intro
     plays, so the hero underneath cannot be focused, clicked or reached by
     a screen reader before the hand-off.
     ============================================================ */
  function introComplete() {
    if (finished) return;
    finished = true;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }

    /* Order is deliberate. The page becomes visible and interactive, and only
       then is the overlay allowed to be inert, hidden and unreachable:

         1. release the page: inert off, scroll unlocked
         2. fade the page in  (body class drives the CSS)
         3. fade the overlay out (its own class)
         4. drop the overlay from the a11y tree
         5. remove the overlay from the DOM entirely

       Step 5 is the real "cleanup": the canvas backing store is freed, the
       element can never intercept anything, and because the markup is gone
       there is no possibility of a replay on scroll, anchor navigation or
       resize. It is not merely hidden - it no longer exists. */
    releasePage();

    document.body.classList.add('is-intro-done');
    document.body.classList.remove('is-intro-pending');
    root.classList.add('is-done');

    window.setTimeout(function () {
      root.setAttribute('aria-hidden', 'true');
    }, 950);

    teardown = window.setTimeout(dispose, 1200);
  }

  /* Give the page back to the visitor: interactive, focusable, scrollable. */
  function releasePage() {
    if ('inert' in HTMLElement.prototype) {
      for (var i = 0; i < pageParts.length; i++) pageParts[i].removeAttribute('inert');
    }
    pageParts.length = 0;

    if (scrollLock) {
      window.removeEventListener('scroll', scrollLock, true);
      scrollLock = null;
    }
  }

  /* Remove the intro completely. Everything the intro allocated is released
     here, so after the hand-off the page carries no trace of it: no canvas,
     no compositor layer, no timers, no listeners, no DOM. */
  function dispose() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    if (teardown !== null) { window.clearTimeout(teardown); teardown = null; }
    if (failsafe !== null) { window.clearTimeout(failsafe); failsafe = null; }
    window.removeEventListener('resize', onResize);
    releasePage();

    if (canvas) {
      /* Zero the backing store before detaching, so the allocation is freed
         immediately rather than when the element happens to be collected. */
      try {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
      } catch (e) { /* a detached or zeroed canvas is not an error worth throwing */ }
    }
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = canvas = brand = ctx = null;
  }

  /* ---------- the page underneath: inert and un-scrollable while the intro
     plays, released at the hand-off ---------- */
  function claimPage() {
    var kids = document.body.children;

    /* `inert` on every top-level sibling except the overlay. This is the same
       set css/cinematic-intro.css suppresses with `body.is-intro-pending >
       *:not(#cinematic-intro)`, so what the visitor cannot interact with and
       what they cannot see are guaranteed to be the same elements. */
    if ('inert' in HTMLElement.prototype) {
      for (var i = 0; i < kids.length; i++) {
        var el = kids[i];
        if (el === root || el.nodeName === 'SCRIPT') continue;
        el.setAttribute('inert', '');
        pageParts.push(el);
      }
    }

    /* Hold the page at the top. Wheel, trackpad and keyboard scrolling all
       still reach the document even with the page inert, and scrolling the
       hero away during the intro would mean revealing the site mid-page
       instead of at its opening. Resetting scrollTop changes no layout, so
       this costs nothing and cannot shift anything. */
    var suppress = function () {
      if (window.pageYOffset !== 0 || document.documentElement.scrollTop !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', suppress, true);
    scrollLock = suppress;
    if (window.pageYOffset !== 0) window.scrollTo(0, 0);
  }

  function showBrand() {
    if (brandShown) return;
    brandShown = true;
    brand.classList.add('is-in');
  }

  function playSequence() {
    if (rafId !== null) return;
    render(0);
    var step = function (now) {
      var t = (now - t0) / 1000;
      if (t >= DURATION) { introComplete(); return; }
      render(t);
      if (t >= BRAND_AT) showBrand();
      rafId = requestAnimationFrame(step);
    };
    t0 = performance.now();
    rafId = requestAnimationFrame(step);
  }

  function playReduced() {
    /* No cinematic content at all: no evolution, no lock, no pulse, no push,
       no crows, no particles, no energy. The overlay is dismissed
       immediately and CSS shortens the fade to 0.25s, so the visitor is on
       the real site well inside the ~300ms budget. The lockup is
       display:none under reduced motion, so nothing flashes past. */
    introComplete();
  }

  /* ---------- boot ---------- */
  resizeCanvas();

  /* Mid-playback the render loop re-renders every frame, so a resize only has
     to update the backing store; the next frame picks up the new size by
     itself. `finished` latches, so the intro can never restart. The listener is
     removed in dispose() along with everything else. */
  function onResize() {
    if (resizeCanvas() && rafId === null && !finished) render(DURATION);
  }
  window.addEventListener('resize', onResize, { passive: true });

  document.body.classList.add('is-intro-pending');
  claimPage();

  if (reduced) playReduced(); else playSequence();

  /* Failsafe. The sequence is time-driven and cannot itself hang, but if a
     frame callback were ever lost the page must never be left permanently
     covered or permanently inert. This guarantees the site always comes
     back, and it is the only other caller of introComplete. */
  failsafe = window.setTimeout(function () {
    if (!finished) introComplete();
  }, (DURATION + 2.5) * 1000);
})();
