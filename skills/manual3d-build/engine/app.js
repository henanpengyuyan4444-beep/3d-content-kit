/* 3D 装配说明书 · 渲染引擎
   一个引擎 + 每个 SKU 一份数据（data/*.js），换型号只换数据文件。 */
(function () {
  "use strict";

  const MANUALS = window.MANUALS;
  const SKU_KEYS = Object.keys(MANUALS);
  const Q = (s, r) => (r || document).querySelector(s);
  const QA = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const state = {
    sku: SKU_KEYS[0],
    step: 0,
    explode: 0,
    playing: false,
    showLabels: true,
    showHardware: true,
    hovered: null
  };

  let M = MANUALS[state.sku];

  /* ---------------- three 基础 ---------------- */
  const canvas = Q("#scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xece5d9);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
  camera.position.fromArray(M.camera.pos);

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.target.fromArray(M.camera.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 0.75;
  controls.maxDistance = 6.5;
  controls.maxPolarAngle = Math.PI * 0.53;
  controls.enablePan = false;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8d78, 0.48));

  const key = new THREE.DirectionalLight(0xfff2df, 1.95);
  key.position.set(2.4, 4.0, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -2.2;
  key.shadow.camera.right = 2.2;
  key.shadow.camera.top = 3.0;
  key.shadow.camera.bottom = -1.0;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 14;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 2.5;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.55);
  fill.position.set(-3.2, 1.8, -1.6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.38);
  rim.position.set(-0.6, 2.6, -3.4);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0xe4dac8, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  floor.receiveShadow = true;
  scene.add(floor);

  // 地面接触阴影（柔光圆盘）
  const discCanvas = document.createElement("canvas");
  discCanvas.width = discCanvas.height = 256;
  (function () {
    const g = discCanvas.getContext("2d");
    const grd = g.createRadialGradient(128, 128, 20, 128, 128, 126);
    grd.addColorStop(0, "rgba(52,44,34,0.20)");
    grd.addColorStop(0.55, "rgba(52,44,34,0.08)");
    grd.addColorStop(1, "rgba(52,44,34,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
  })();
  const discTex = new THREE.CanvasTexture(discCanvas);
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: discTex, transparent: true, depthWrite: false })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.002;
  scene.add(disc);

  /* ---------------- 木纹 ---------------- */
  function makeWoodTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#f7f2e8";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 340; i++) {
      const x = Math.random() * 512;
      const a = 0.03 + Math.random() * 0.06;
      g.strokeStyle = `rgba(${168 + Math.random() * 40},${146 + Math.random() * 40},${112 + Math.random() * 40},${a})`;
      g.lineWidth = 0.4 + Math.random() * 1.4;
      g.beginPath();
      g.moveTo(x, -10);
      g.bezierCurveTo(x + 8, 150, x - 9, 340, x + 4, 522);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 2.6);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  const woodTex = makeWoodTexture();

  /* ---------------- 材质 ---------------- */
  const MAT = {
    metal: new THREE.MeshStandardMaterial({ color: 0xa9aeb5, roughness: 0.32, metalness: 0.88 }),
    cam: new THREE.MeshStandardMaterial({ color: 0x8f959d, roughness: 0.4, metalness: 0.8 }),
    dowel: new THREE.MeshStandardMaterial({ color: 0xcaa878, roughness: 0.72, metalness: 0.05 }),
    nail: new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.35, metalness: 0.85 })
  };

  /* ---------------- 产品与零件 ---------------- */
  const product = new THREE.Group();
  scene.add(product);

  const parts = new Map();
  const partMeshes = [];

  function clearProduct() {
    while (product.children.length) product.remove(product.children[0]);
    parts.clear();
    partMeshes.length = 0;
  }

  // 零件第一次出场的步骤：既可能被安装，也可能是某一步五金件的载体
  function revealOf(id) {
    let n = Infinity;
    M.steps.forEach((s) => {
      if ((s.added || []).includes(id)) n = Math.min(n, s.n);
      if ((s.hardware || []).some((h) => h.host === id)) n = Math.min(n, s.n);
    });
    return n === Infinity ? 1 : n;
  }

  function buildParts() {
    M.parts.forEach((cfg) => {
      const [w, h, d] = cfg.dims;
      const r = Math.min(0.0045, Math.min(w, h, d) / 3);
      const geo = new THREE.RoundedBoxGeometry(w, h, d, 2, r);
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color || 0xf2ece1,
        map: woodTex,
        roughness: cfg.back ? 0.94 : 0.74,
        metalness: 0.02,
        emissive: new THREE.Color(0xd97706),
        emissiveIntensity: 0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.partId = cfg.id;

      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x3a332a, transparent: true, opacity: cfg.back ? 0.06 : 0.20
      });
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), edgeMat);

      const group = new THREE.Group();
      group.add(mesh, edges);
      product.add(group);

      const rec = {
        cfg, group, mesh, mat, edges, edgeMat,
        final: new THREE.Vector3().fromArray(cfg.at),
        offset: new THREE.Vector3().fromArray(cfg.explode),
        alpha: 0, target: 0,
        reveal: revealOf(cfg.id),
        hardware: []
      };
      group.position.copy(rec.final).add(rec.offset);
      parts.set(cfg.id, rec);
      partMeshes.push(mesh);
    });
  }

  /* ---------------- 五金件 ---------------- */
  function hwGeo(type) {
    const g = new THREE.Group();
    if (type === "dowel") {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.04, 12), MAT.dowel);
      m.rotation.z = Math.PI / 2;
      g.add(m);
    } else if (type === "camscrew") {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.03, 14), MAT.metal);
      body.rotation.z = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.005, 16), MAT.metal);
      head.rotation.z = Math.PI / 2;
      head.position.x = 0.016;
      g.add(body, head);
    } else if (type === "screw") {
      const n = Math.max(1, Math.round(part.screwCount || 4));
      const r = Math.min(w, d) * 0.32;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n;
        out.push({ p: [Math.cos(a) * r, -h / 2, Math.sin(a) * r], r: [0, 0, 0] });
      }
    } else if (type === "cam") {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.011, 18), MAT.cam);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0012, 0.0022), MAT.metal);
      slot.position.y = 0.005;
      g.add(body, slot);
      g.userData.spin = { axis: "y", from: 0, to: Math.PI };
    } else if (type === "support") {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.013, 10), MAT.metal);
      pin.rotation.z = Math.PI / 2;
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.003, 12), MAT.metal);
      foot.position.x = 0.007;
      foot.rotation.z = Math.PI / 2;
      g.add(pin, foot);
    } else if (type === "screw") {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.022, 10), MAT.metal);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.003, 12), MAT.metal);
      head.position.y = 0.011;
      g.add(body, head);
    } else if (type === "nail") {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.024, 8), MAT.nail);
      body.rotation.x = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.0016, 12), MAT.nail);
      head.rotation.x = Math.PI / 2;
      head.position.z = 0.011;
      g.add(body, head);
    } else if (type === "bracket") {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.055, 0.004), MAT.metal);
      v.position.set(0, 0.026, 0);
      const hmm = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.004, 0.05), MAT.metal);
      hmm.position.set(0, 0.002, -0.023);
      g.add(v, hmm);
    }
    return g;
  }

  // 依据零件尺寸生成五金件位置（示意孔位）
  function hwPositions(type, part) {
    const [w, h, d] = part.dims;
    const out = [];
    const halfW = w / 2, halfH = h / 2, halfD = d / 2;
    if (type === "dowel") {
      const zz = Math.min(0.06, halfD * 0.55);
      [-1, 1].forEach((sx) => {
        [-zz, zz].forEach((z) => out.push({ p: [sx * halfW, 0, z], r: [0, 0, 0] }));
      });
    } else if (type === "camscrew") {
      const inner = part.side === "L" ? halfW : -halfW;
      [0.075, 0.72, 2.011].forEach((y) => {
        [-0.08, 0.08].forEach((z) => out.push({ p: [inner, y - part.at[1], z], r: [0, 0, 0] }));
      });
    } else if (type === "cam") {
      const ys = -halfH + 0.001;
      const n = part.camCount || 2;
      const zlist = n >= 6 ? [-0.08, 0, 0.08] : n >= 4 ? [-0.08, 0.08] : [0];
      [-1, 1].forEach((sx) => {
        zlist.forEach((z) => out.push({ p: [sx * (halfW - 0.07), ys, z], r: [0, 0, 0] }));
      });
      return { items: out, spin: true };
    } else if (type === "support") {
      const inner = part.side === "L" ? halfW : -halfW;
      // 层板托的高度从层板本身推出来，不再写死某一款产品的层高
      const shelfYs = (M.parts || []).filter((p) => /层板|搁板/.test(p.name)).map((p) => p.at[1]);
      const ys = shelfYs.length ? shelfYs : [0.98, 1.22, 1.46, 1.72];
      ys.forEach((y) => {
        [-0.09, 0.09].forEach((z) => out.push({ p: [inner, y - part.at[1], z], r: [0, 0, 0] }));
      });
    } else if (type === "nail") {
      const zf = halfD + 0.001;
      const xs = [-0.30, -0.15, 0, 0.15, 0.30];
      const ysEdge = halfH - 0.055;
      xs.forEach((x) => out.push({ p: [x, ysEdge, zf], r: [0, 0, 0] }));
      xs.forEach((x) => out.push({ p: [x, -ysEdge, zf], r: [0, 0, 0] }));
      const xEdge = halfW - 0.035;
      [-0.76, -0.30, 0.30, 0.76].forEach((y) => out.push({ p: [-xEdge, y, zf], r: [0, 0, 0] }));
      [-0.76, -0.30, 0.30, 0.76].forEach((y) => out.push({ p: [xEdge, y, zf], r: [0, 0, 0] }));
    } else if (type === "bracket") {
      [-0.26, 0.26].forEach((x) => out.push({ p: [x, halfH, -halfD + 0.03], r: [0, 0, 0] }));
    }
    return { items: out, spin: false };
  }

  let hwObjects = [];

  function buildHardware() {
    hwObjects = [];
    M.steps.forEach((step) => {
      (step.hardware || []).forEach((spec) => {
        const part = parts.get(spec.host);
        if (!part) return;
        const cfg = part.cfg;
        // 通用：侧板按 x 正负分左右，偏心轮数量按数据里的 count 走，不再写死型号
        if (spec.type === "camscrew") cfg.side = (cfg.at ? cfg.at[0] : 0) > 0 ? "R" : "L";
        if (spec.type === "cam") cfg.camCount = Math.max(2, Math.round(spec.count || 2));
        if (spec.type === "screw") cfg.screwCount = Math.max(1, Math.round(spec.count || 4));
        const { items, spin } = hwPositions(spec.type, cfg);
        const group = new THREE.Group();
        items.forEach((it) => {
          const mesh = hwGeo(spec.type);
          mesh.position.fromArray(it.p);
          mesh.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
          group.add(mesh);
        });
        group.matrixAutoUpdate = true;
        part.group.add(group);
        hwObjects.push({ step: step.n, type: spec.type, group, host: part, spin: !!spin, persist: !!spec.persist, spinT: 0 });
      });
    });
  }

  function updateHardwareVisibility() {
    const cur = state.step + 1;
    hwObjects.forEach((hw) => {
      const visible = state.showHardware && cur >= hw.step && (hw.persist || cur === hw.step);
      hw.group.visible = visible;
      if (!visible) return;
      if (hw.spin) {
        const t = cur > hw.step ? 1 : clamp(hw.spinT, 0, 1);
        hw.group.children.forEach((c) => {
          c.rotation.y = hw.persist ? 0 : lerp(0, Math.PI, t);
        });
      }
    });
  }

  /* ---------------- 组装进度 ---------------- */
  function assembledSet(stepIdx) {
    const set = new Set();
    for (let i = 0; i <= stepIdx; i++) {
      (M.steps[i].added || []).forEach((id) => set.add(id));
    }
    return set;
  }

  let camAnim = null;
  let refitTimer = 0;
  let userOrbit = false;

  function computeFrame() {
    const box = new THREE.Box3();
    parts.forEach((rec) => {
      if (state.step + 1 < rec.reveal) return;
      // 取景按"装好以后"的包围盒算，零件从画面外飞进来，画面不会因为拆散而忽远忽近
      const c = rec.final.clone();
      const [w, h, d] = rec.cfg.dims;
      box.expandByPoint(c.clone().add(new THREE.Vector3(w / 2, h / 2, d / 2)));
      box.expandByPoint(c.clone().sub(new THREE.Vector3(w / 2, h / 2, d / 2)));
    });
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const vFov = (camera.fov * Math.PI) / 180;
    const dV = size.y / 2 / Math.tan(vFov / 2);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dH = size.x / 2 / Math.tan(hFov / 2);
    let dist = Math.max(dV, dH) * 1.28 + size.z / 2 + 0.10;
    dist = Math.max(dist, 2.55);
    return { center, dist, flat: size.y < 0.9 };
  }

  function frameStep(instant) {
    const step = M.steps[state.step];
    const dirSrc = step.camera || M.camera;
    const dir = new THREE.Vector3().fromArray(dirSrc.pos).sub(new THREE.Vector3().fromArray(dirSrc.target));
    if (dir.lengthSq() < 1e-5) dir.set(1.2, 0.7, 1.6);
    dir.normalize();
    const { center, dist, flat } = computeFrame();
    if (flat) { dir.y = Math.max(dir.y, 1.05); dir.normalize(); }
    const stageW = Q("#stage").clientWidth;
    const shiftX = stageW > 900 ? -0.16 : 0;
    const shiftY = stageW > 900 ? 0 : 0;
    center.x += shiftX;
    center.y += shiftY;
    const to = center.clone().addScaledVector(dir, dist);
    if (instant) {
      camera.position.copy(to);
      controls.target.copy(center);
      camAnim = null;
    } else {
      camAnim = { t: 0, dur: 0.85, from: camera.position.clone(), to, ft: controls.target.clone(), tt: center };
    }
  }

  function setStep(i, opts) {
    const o = opts || {};
    const prev = state.step;
    state.step = clamp(i, 0, M.steps.length - 1);
    const step = M.steps[state.step];
    const set = assembledSet(state.step);
    parts.forEach((rec, id) => { rec.target = set.has(id) ? 1 : 0; });

    frameStep(!!o.instant);
    if (state.step !== prev) {
      hwObjects.forEach((hw) => { if (hw.step === state.step && hw.spin) hw.spinT = 0; });
    }
    updateHardwareVisibility();
    syncUI();
  }

  /* ---------------- 界面 ---------------- */
  const labelLayer = Q("#labels");
  let labels = new Map();

  function buildLabels() {
    labelLayer.innerHTML = "";
    labels.clear();
    M.parts.forEach((p) => {
      const el = document.createElement("div");
      el.className = "label";
      el.textContent = p.name;
      labelLayer.appendChild(el);
      labels.set(p.id, el);
    });
  }

  function buildStepList() {
    const list = Q("#stepList");
    list.innerHTML = "";
    M.steps.forEach((s, i) => {
      const b = document.createElement("button");
      b.className = "step-item";
      b.dataset.i = String(i);
      b.innerHTML = `<span class="num">${String(s.n).padStart(2, "0")}</span><span class="t">${s.title}</span>`;
      b.addEventListener("click", () => { stopPlay(); setStep(i); });
      list.appendChild(b);
    });
  }

  function syncUI() {
    const step = M.steps[state.step];
    QA(".step-item").forEach((b, i) => b.classList.toggle("active", i === state.step));
    Q("#stepNo").textContent = `${String(step.n).padStart(2, "0")} / ${M.steps.length}`;
    Q("#stepTitle").textContent = step.title;
    Q("#stepText").textContent = step.text;
    Q("#progressBar").style.width = `${((state.step + 1) / M.steps.length) * 100}%`;

    const chips = Q("#stepChips");
    chips.innerHTML = "";
    (step.hardware || []).forEach((spec) => {
      const cat = M.hardwareCatalog[spec.type];
      if (!cat) return;
      let count = 0;
      if (spec.type === "cam") count = step.hardware.filter((h) => h.type === "cam").reduce((a, h) => a + (h.host === "top" ? 6 : h.host === "bottom" ? 4 : 2), 0);
      else if (spec.type === "dowel") count = 4;
      else if (spec.type === "camscrew") count = 6;
      else if (spec.type === "support") count = 8;
      else if (spec.type === "nail") count = 18;
      else count = 2;
      const el = document.createElement("span");
      el.className = "chip";
      el.innerHTML = `<b>${cat.name}</b><i>${cat.no}</i><em>×${count}</em>`;
      chips.appendChild(el);
    });
    if (!(step.hardware || []).length) {
      const el = document.createElement("span");
      el.className = "chip ghost";
      el.textContent = "本步不需要五金件";
      chips.appendChild(el);
    }

    const tools = Q("#stepTools");
    tools.innerHTML = "";
    (M.tools || []).forEach((t) => {
      const el = document.createElement("span");
      el.className = "tool";
      el.textContent = t;
      tools.appendChild(el);
    });

    const warn = Q("#stepWarn");
    warn.style.display = step.warn ? "block" : "none";

    const img = Q("#refImg");
    if (step.ref) {
      img.src = step.ref;
      img.classList.remove("hidden");
      Q("#refHint").textContent = `原说明书 · 第 ${String(step.refPage || stepPageOf(step.ref))} 页`;
    } else {
      img.classList.add("hidden");
    }
    Q("#btnPrev").disabled = state.step === 0;
    Q("#btnNext").disabled = state.step === M.steps.length - 1;
    Q("#playIcon").textContent = state.playing ? "❚❚" : "▶";
  }

  function stepPageOf(path) {
    const m = /p(\d+)\.png$/.exec(path || "");
    return m ? Number(m[1]) : "";
  }

  /* ---------------- 交互 ---------------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pickPart(ev) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(partMeshes, false);
    return hits.length ? parts.get(hits[0].object.userData.partId) : null;
  }

  canvas.addEventListener("pointermove", (ev) => {
    const rec = pickPart(ev);
    state.hovered = rec ? rec.cfg.id : null;
    canvas.style.cursor = rec ? "pointer" : "grabbing";
    if (rec) showPartCard(rec, ev.clientX, ev.clientY);
    else hidePartCard();
  });

  canvas.addEventListener("click", (ev) => {
    const rec = pickPart(ev);
    if (rec) showPartCard(rec, ev.clientX, ev.clientY, true);
  });

  const partCard = Q("#partCard");
  function showPartCard(rec, x, y, pin) {
    const [w, h, d] = rec.cfg.dims;
    partCard.innerHTML = `
      <div class="pc-name">${rec.cfg.name}</div>
      <div class="pc-dim">${Math.round(w * 100)} × ${Math.round(h * 100)} × ${Math.round(d * 100)} mm</div>
      <div class="pc-note">${rec.target > 0.5 ? "已装好" : "待安装"}</div>`;
    partCard.classList.add("on");
    const r = canvas.getBoundingClientRect();
    const px = clamp(x + 14, r.left + 8, r.right - 190);
    const py = clamp(y + 14, r.top + 8, r.bottom - 110);
    partCard.style.transform = `translate(${px}px, ${py}px)`;
    if (pin) partCard.dataset.pin = "1";
  }
  function hidePartCard() { if (!partCard.dataset.pin) partCard.classList.remove("on"); }

  controls.addEventListener("start", () => { camAnim = null; userOrbit = true; partCard.dataset.pin = ""; hidePartCard(); });

  /* ---------------- 播放 ---------------- */
  let playAcc = 0;
  function stopPlay() { state.playing = false; Q("#playIcon").textContent = "▶"; }
  function togglePlay() {
    state.playing = !state.playing;
    Q("#playIcon").textContent = state.playing ? "❚❚" : "▶";
    if (state.playing && state.step === M.steps.length - 1) setStep(0);
  }

  function bindUI() {
    Q("#btnPrev").addEventListener("click", () => { stopPlay(); setStep(state.step - 1); });
    Q("#btnNext").addEventListener("click", () => { stopPlay(); setStep(state.step + 1); });
    Q("#btnPlay").addEventListener("click", togglePlay);
    Q("#btnReset").addEventListener("click", () => {
      camAnim = null;
      userOrbit = false;
      camera.position.fromArray(M.camera.pos);
      controls.target.fromArray(M.camera.target);
    });
    Q("#explode").addEventListener("input", (e) => {
      state.explode = Number(e.target.value) / 100;
      Q("#explodeVal").textContent = Math.round(state.explode * 100) + "%";
      if (refitTimer) clearTimeout(refitTimer);
      refitTimer = setTimeout(() => frameStep(false), 140);
    });
    Q("#toggleLabels").addEventListener("click", (e) => {
      state.showLabels = !state.showLabels;
      e.currentTarget.classList.toggle("on", state.showLabels);
      labelLayer.style.display = state.showLabels ? "block" : "none";
    });
    Q("#toggleHW").addEventListener("click", (e) => {
      state.showHardware = !state.showHardware;
      e.currentTarget.classList.toggle("on", state.showHardware);
      updateHardwareVisibility();
    });
    Q("#refImg").addEventListener("click", () => {
      Q("#lightbox img").src = Q("#refImg").src;
      Q("#lightbox").classList.add("on");
    });
    Q("#lightbox").addEventListener("click", () => Q("#lightbox").classList.remove("on"));

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { stopPlay(); setStep(state.step + 1); }
      if (e.key === "ArrowLeft") { stopPlay(); setStep(state.step - 1); }
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
    });

    QA("[data-sku]").forEach((b) => {
      b.addEventListener("click", () => {
        if (b.dataset.sku === state.sku) return;
        state.sku = b.dataset.sku;
        loadManual();
      });
    });
  }

  /* ---------------- 尺寸自适应 ---------------- */
  function resize() {
    const wrap = Q("#stage");
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!userOrbit) {
      if (refitTimer) clearTimeout(refitTimer);
      refitTimer = setTimeout(() => frameStep(true), 80);
    }
  }

  /* ---------------- 主循环 ---------------- */
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3();
  const tmpQ = new THREE.Vector3();

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // 相机补间
    if (camAnim) {
      camAnim.t += dt / camAnim.dur;
      const k = easeInOut(clamp(camAnim.t, 0, 1));
      camera.position.lerpVectors(camAnim.from, camAnim.to, k);
      controls.target.lerpVectors(camAnim.ft, camAnim.tt, k);
      if (camAnim.t >= 1) camAnim = null;
    }

    // 零件归位
    let moving = false;
    parts.forEach((rec, id) => {
      const speed = 5.4;
      rec.alpha += (rec.target - rec.alpha) * Math.min(1, dt * speed);
      if (Math.abs(rec.target - rec.alpha) > 0.001) moving = true;
      const sep = Math.max(1 - rec.alpha, state.explode);
      rec.group.position.copy(rec.final).addScaledVector(rec.offset, sep);
      rec.group.visible = state.step + 1 >= rec.reveal;
      // 高亮：本步新增的零件
      const step = M.steps[state.step];
      const isNew = (step.added || []).includes(id);
      const isHover = state.hovered === id;
      const targetEmissive = isHover ? 0.17 : isNew ? 0.1 : 0;
      rec.mat.emissiveIntensity = lerp(rec.mat.emissiveIntensity, targetEmissive, Math.min(1, dt * 8));
      rec.edgeMat.opacity = (rec.cfg.back ? 0.06 : 0.20) + (isNew ? 0.25 : 0) + (isHover ? 0.2 : 0);
    });

    // 偏心轮拧动
    hwObjects.forEach((hw) => {
      if (!hw.spin) return;
      const cur = state.step + 1;
      if (cur === hw.step) hw.spinT = Math.min(1, hw.spinT + dt * 0.55);
    });
    updateHardwareVisibility();

    // 自动播放
    if (state.playing) {
      playAcc += dt;
      if (playAcc > 3.0) {
        playAcc = 0;
        if (state.step < M.steps.length - 1) setStep(state.step + 1);
        else stopPlay();
      }
    }

    // 标签
    if (state.showLabels) {
      const step = M.steps[state.step];
      const active = new Set([...(step.added || []), ...(step.hardware || []).map((h) => h.host)]);
      labels.forEach((el, id) => {
        const rec = parts.get(id);
        const show = (active.has(id) || state.hovered === id) && rec.group.visible;
        if (!show) { el.style.opacity = "0"; return; }
        rec.group.getWorldPosition(tmpV);
        tmpV.y += 0.12;
        tmpQ.copy(tmpV).project(camera);
        if (tmpQ.z > 1) { el.style.opacity = "0"; return; }
        const x = (tmpQ.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-tmpQ.y * 0.5 + 0.5) * canvas.clientHeight;
        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        el.style.opacity = String(clamp(1 - state.explode * 0.4, 0.5, 1));
      });
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  /* ---------------- 载入 ---------------- */
  function loadManual() {
    M = MANUALS[state.sku];
    state.step = 0;
    stopPlay();
    clearProduct();
    buildParts();
    buildHardware();
    buildLabels();
    buildStepList();
    Q("#skuName").textContent = M.sku;
    Q("#skuSub").textContent = M.subtitle || "";
    Q("#srcLink").href = M.source.url;
    Q("#srcLink").textContent = M.source.name;
    setStep(0, { instant: true });
    parts.forEach((rec) => { rec.alpha = rec.target; });
    updateHardwareVisibility();
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    window.__app = { state, parts, step: () => M.steps[state.step], setStep, get m() { return M; }, camera, controls, frame: computeFrame, anim: () => camAnim };
    bindUI();
    resize();
    new ResizeObserver(resize).observe(Q("#stage"));
    loadManual();
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
