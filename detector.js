(function () {
  "use strict";

  // Clases de COCO-SSD que nos interesan.
  const LABELS = { person: "Humano", dog: "Perro" };
  const COLORS = { person: "#4f8cff", dog: "#ffb454" };
  const MIN_SCORE = 0.5;
  const DETECT_INTERVAL_MS = 150;

  const video = document.getElementById("video");
  const canvas = document.getElementById("overlay");
  const ctx = canvas.getContext("2d");
  const placeholder = document.getElementById("placeholder");
  const resultEl = document.getElementById("result");
  const statusEl = document.getElementById("status");
  const toggleBtn = document.getElementById("toggle-btn");

  let model = null;
  let stream = null;
  let running = false;
  let lastRun = 0;

  function setStatus(text, isError) {
    statusEl.textContent = text || "";
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function setResult(kind, text) {
    resultEl.className = "result " + kind;
    resultEl.textContent = text;
  }

  async function loadModel() {
    if (model) return model;
    if (typeof cocoSsd === "undefined") {
      throw new Error("No se pudieron cargar las librerías (¿sin conexión?).");
    }
    setStatus("Cargando modelo…");
    // lite_mobilenet_v2 es la variante más pequeña y rápida.
    model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    setStatus("");
    return model;
  }

  async function startCamera() {
    toggleBtn.disabled = true;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Este navegador no permite acceder a la cámara (se necesita HTTPS o localhost).");
      }

      await loadModel();

      setStatus("Solicitando acceso a la cámara…");
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      video.srcObject = stream;
      await video.play();

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      placeholder.hidden = true;
      toggleBtn.textContent = "Detener cámara";
      setStatus("");
      setResult("none", "Buscando…");

      running = true;
      requestAnimationFrame(loop);
    } catch (err) {
      stopCamera();
      setStatus(describeError(err), true);
    } finally {
      toggleBtn.disabled = false;
    }
  }

  function stopCamera() {
    running = false;
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    video.srcObject = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    placeholder.hidden = false;
    toggleBtn.textContent = "Iniciar cámara";
    setResult("idle", "Pulsa «Iniciar cámara» para empezar");
  }

  function describeError(err) {
    switch (err && err.name) {
      case "NotAllowedError":
        return "Permiso de cámara denegado.";
      case "NotFoundError":
        return "No se encontró ninguna cámara.";
      case "NotReadableError":
        return "La cámara está siendo usada por otra aplicación.";
      default:
        return (err && err.message) || "Error desconocido.";
    }
  }

  async function loop(now) {
    if (!running) return;

    if (now - lastRun >= DETECT_INTERVAL_MS && video.readyState >= 2) {
      lastRun = now;
      try {
        const predictions = await model.detect(video);
        if (!running) return;
        const found = predictions.filter(function (p) {
          return LABELS[p.class] && p.score >= MIN_SCORE;
        });
        draw(found);
        summarize(found);
      } catch (err) {
        stopCamera();
        setStatus("Error al detectar: " + describeError(err), true);
        return;
      }
    }

    requestAnimationFrame(loop);
  }

  function draw(found) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = Math.max(2, canvas.width / 200);
    ctx.font = "bold " + Math.max(14, Math.round(canvas.width / 35)) + "px system-ui, sans-serif";
    ctx.textBaseline = "top";

    found.forEach(function (p) {
      const x = p.bbox[0], y = p.bbox[1], w = p.bbox[2], h = p.bbox[3];
      const color = COLORS[p.class];
      const label = LABELS[p.class] + " " + Math.round(p.score * 100) + "%";

      ctx.strokeStyle = color;
      ctx.strokeRect(x, y, w, h);

      const pad = 4;
      const textW = ctx.measureText(label).width + pad * 2;
      const textH = parseInt(ctx.font.match(/(\d+)px/)[1], 10) + pad * 2;
      const ly = y - textH >= 0 ? y - textH : y;
      ctx.fillStyle = color;
      ctx.fillRect(x, ly, textW, textH);
      ctx.fillStyle = "#000";
      ctx.fillText(label, x + pad, ly + pad);
    });
  }

  function summarize(found) {
    const hasHuman = found.some(function (p) { return p.class === "person"; });
    const hasDog = found.some(function (p) { return p.class === "dog"; });

    if (hasHuman && hasDog) setResult("both", "Humano y perro");
    else if (hasHuman) setResult("human", "Humano");
    else if (hasDog) setResult("dog", "Perro");
    else setResult("none", "Ni humano ni perro");
  }

  toggleBtn.addEventListener("click", function () {
    if (running) {
      stopCamera();
      setStatus("");
    } else {
      startCamera();
    }
  });
})();
