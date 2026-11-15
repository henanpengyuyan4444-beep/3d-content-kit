/* 全景看店：球面贴图 + 热点标注 + 手机拖动 */
(function () {
  "use strict";
  const SPACE = window.SPACE || { name: "空间", pano: "pano.jpg", hotspots: [] };
  const canvas = document.getElementById("scene");
  const labelLayer = document.getElementById("labels");
  const titleEl = document.getElementById("spaceName");
  const hintEl = document.getElementById("hint");
  const card = document.getElementById("card");
  const btnRotate = document.getElementById("btnRotate");
  const btnLabels = document.getElementById("btnLabels");

  titleEl.textContent = SPACE.name || "空间";
  let yaw = 0;
  let pitch = 0;
  let vYaw = 0;
  let vPitch = 0;
  let dragging = false;
  let autoRotate = false;
  let showLabels = true;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200);
  camera.rotation.order = "YXZ";

  const loader = new THREE.TextureLoader();
  loader.load(
    SPACE.pano || "pano.jpg",
    (tex) => {
    tex.encoding = THREE.sRGBEncoding;
    const geo = new THREE.SphereGeometry(60, 64, 40);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.scale.set(-1, 1, 1);
    scene.add(sphere);
    },
    undefined,
    (err) => console.error("全景图加载失败", err),
  );

  const hotspots = (SPACE.hotspots || []).map((h) => {
    const el = document.createElement("button");
    el.className = "hotspot";
    el.innerHTML = `<i></i><span>${h.label}</span>`;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      openCard(h);
    });
    labelLayer.appendChild(el);
    return { ...h, el };
  });

  function openCard(h) {
    card.innerHTML = `<b>${h.label}</b>${h.desc ? `<p>${h.desc}</p>` : ""}${h.price ? `<em>${h.price}</em>` : ""}
      <button class="card-x" aria-label="关闭">×</button>`;
    card.classList.add("on");
    card.querySelector(".card-x").addEventListener("click", () => card.classList.remove("on"));
  }

  function dir(yawDeg, pitchDeg) {
    const y = (yawDeg * Math.PI) / 180;
    const p = (pitchDeg * Math.PI) / 180;
    return new THREE.Vector3(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p));
  }

  let aspect = 1;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  const tmp = new THREE.Vector3();
  function project(h) {
    const offset = SPACE.yawOffset || 0;
    tmp.copy(dir(h.yaw + offset, h.pitch)).multiplyScalar(50);
    tmp.project(camera);
    const x = (tmp.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-tmp.y * 0.5 + 0.5) * canvas.clientHeight;
    const visible = tmp.z < 1;
    return { x, y, visible };
  }

  // 拖动：鼠标与触摸统一走 pointer 事件
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    hintEl.classList.add("gone");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    vYaw = dx * 0.12;
    vPitch = dy * 0.12;
    yaw -= vYaw;
    pitch = Math.max(-85, Math.min(85, pitch - vPitch));
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  btnRotate.addEventListener("click", () => {
    autoRotate = !autoRotate;
    btnRotate.classList.toggle("on", autoRotate);
  });
  btnLabels.addEventListener("click", () => {
    showLabels = !showLabels;
    btnLabels.classList.toggle("on", showLabels);
    labelLayer.style.display = showLabels ? "block" : "none";
  });

  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!dragging) {
      yaw -= vYaw;
      pitch = Math.max(-85, Math.min(85, pitch - vPitch));
      vYaw *= 0.92;
      vPitch *= 0.92;
    }
    if (autoRotate && !dragging) yaw += dt * 6;
    camera.rotation.y = (yaw * Math.PI) / 180;
    camera.rotation.x = (pitch * Math.PI) / 180;

    hotspots.forEach((h) => {
      const p = project(h);
      if (!p.visible) {
        h.el.style.opacity = "0";
        h.el.style.pointerEvents = "none";
        return;
      }
      h.el.style.opacity = "1";
      h.el.style.pointerEvents = "auto";
      h.el.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)`;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  resize();
  tick();
})();
