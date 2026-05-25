(function() {
  const canvas = document.getElementById("study-globe-canvas");
  const nodeEls = Array.from(document.querySelectorAll("[data-orbit-node]"));
  if (!canvas || !nodeEls.length) return;

  const ctx = canvas.getContext("2d");
  const pointer = { x: 0, y: 0, active: false };
  const particles = Array.from({ length: 110 }, function(_, index) {
    const seed = index + 1;
    return {
      x: (Math.sin(seed * 93.17) + 1) / 2,
      y: (Math.sin(seed * 41.73) + 1) / 2,
      size: 0.7 + ((seed * 17) % 11) / 10,
      speed: 0.08 + ((seed * 7) % 9) / 100
    };
  });

  const nodes = nodeEls.map(function(el, index) {
    return {
      el: el,
      angle: Number(el.dataset.angle || index),
      lat: Number(el.dataset.lat || 0) * Math.PI / 180,
      speed: 0.14 + index * 0.006,
      screen: { x: 0, y: 0, z: 0 }
    };
  });

  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastFrame = 0;
  let time = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(320, Math.floor(rect.width));
    height = Math.max(420, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rotatePoint(point, rotX, rotY) {
    let x = point.x;
    let y = point.y;
    let z = point.z;

    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    return { x: x1, y: y1, z: z2 };
  }

  function spherePoint(lat, lon) {
    const cosLat = Math.cos(lat);
    return {
      x: cosLat * Math.cos(lon),
      y: Math.sin(lat),
      z: cosLat * Math.sin(lon)
    };
  }

  function getScene() {
    const mobile = width < 760;
    return {
      cx: mobile ? width * 0.5 : width * 0.66,
      cy: mobile ? height * 0.54 : height * 0.5,
      radius: Math.min(width, height) * (mobile ? 0.31 : 0.27),
      rotX: pointer.y * 0.24,
      rotY: pointer.x * 0.34
    };
  }

  function project(point, scene) {
    const rotated = rotatePoint(point, scene.rotX, scene.rotY);
    const perspective = 1.15 / (1.85 - rotated.z * 0.58);
    return {
      x: scene.cx + rotated.x * scene.radius * perspective,
      y: scene.cy + rotated.y * scene.radius * perspective,
      z: rotated.z,
      scale: perspective
    };
  }

  function drawBackground() {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#070711");
    bg.addColorStop(0.42, "#101026");
    bg.addColorStop(1, "#05050a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    drawSoftGlow(width * 0.12, height * 0.12, width * 0.46, "rgba(124, 58, 237, 0.24)");
    drawSoftGlow(width * 0.83, height * 0.22, width * 0.28, "rgba(34, 211, 238, 0.15)");
    drawSoftGlow(width * 0.58, height * 0.86, width * 0.34, "rgba(16, 185, 129, 0.13)");

    ctx.save();
    particles.forEach(function(particle) {
      const x = (particle.x * width + Math.sin(time * particle.speed) * 18) % width;
      const y = (particle.y * height + Math.cos(time * particle.speed) * 12) % height;
      ctx.globalAlpha = 0.24 + Math.sin(time * 0.8 + x) * 0.16;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawSoftGlow(x, y, radius, color) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGlobe(scene) {
    const sphere = ctx.createRadialGradient(
      scene.cx - scene.radius * 0.42,
      scene.cy - scene.radius * 0.48,
      scene.radius * 0.08,
      scene.cx,
      scene.cy,
      scene.radius * 1.16
    );
    sphere.addColorStop(0, "rgba(255, 255, 255, 0.44)");
    sphere.addColorStop(0.25, "rgba(124, 58, 237, 0.46)");
    sphere.addColorStop(0.58, "rgba(34, 211, 238, 0.16)");
    sphere.addColorStop(1, "rgba(9, 9, 20, 0.92)");

    ctx.save();
    ctx.beginPath();
    ctx.arc(scene.cx, scene.cy, scene.radius, 0, Math.PI * 2);
    ctx.fillStyle = sphere;
    ctx.fill();
    ctx.clip();

    for (let lat = -60; lat <= 60; lat += 20) {
      drawOrbitLine(scene, lat * Math.PI / 180, null, "rgba(255,255,255,0.12)");
    }
    for (let lon = 0; lon < 360; lon += 20) {
      drawOrbitLine(scene, null, lon * Math.PI / 180 + time * 0.18, "rgba(255,255,255,0.09)");
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(scene.cx, scene.cy, scene.radius + 1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(scene.cx, scene.cy, scene.radius * 1.16, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(124, 58, 237, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawOrbitLine(scene, lat, lon, color) {
    ctx.beginPath();
    let started = false;
    const steps = 90;

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const point = lat === null ? spherePoint(Math.sin(t) * 0.98, lon) : spherePoint(lat, t + time * 0.18);
      const pos = project(point, scene);
      if (pos.z < -0.74) {
        started = false;
        continue;
      }

      if (!started) {
        ctx.moveTo(pos.x, pos.y);
        started = true;
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function updateNodes(scene) {
    nodes.forEach(function(node) {
      const lon = node.angle + time * node.speed;
      const position = project(spherePoint(node.lat, lon), scene);
      node.screen = position;

      const front = Math.max(0, Math.min(1, (position.z + 1) / 1.65));
      node.el.style.left = position.x + "px";
      node.el.style.top = position.y + "px";
      node.el.style.opacity = String(0.34 + front * 0.66);
      node.el.style.transform = "translate(-50%, -50%) scale(" + (0.82 + front * 0.2).toFixed(3) + ")";
      node.el.style.zIndex = String(20 + Math.round(front * 40));
      node.el.classList.toggle("is-front", position.z > 0.08);
    });
  }

  function drawNodeConnections() {
    ctx.save();
    for (let i = 0; i < nodes.length; i++) {
      const current = nodes[i].screen;
      const next = nodes[(i + 1) % nodes.length].screen;
      const alpha = Math.max(0, Math.min(0.2, (current.z + next.z + 2) / 12));
      ctx.strokeStyle = "rgba(168, 85, 247, " + alpha + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(current.x, current.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawNodeLights() {
    nodes.forEach(function(node) {
      const pos = node.screen;
      const alpha = Math.max(0.12, Math.min(0.92, (pos.z + 1) / 2));
      ctx.save();
      ctx.globalAlpha = alpha;
      drawSoftGlow(pos.x, pos.y, 32 * pos.scale, "rgba(34, 211, 238, 0.22)");
      ctx.fillStyle = pos.z > 0 ? "#f5f3ff" : "#7c3aed";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(2.2, 4.8 * pos.scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function animate(frame) {
    const delta = Math.min(40, frame - lastFrame || 16);
    lastFrame = frame;
    time += delta / 1000;

    drawBackground();
    const scene = getScene();
    drawGlobe(scene);
    updateNodes(scene);
    drawNodeConnections();
    drawNodeLights();

    requestAnimationFrame(animate);
  }

  function bindPointer() {
    window.addEventListener("pointermove", function(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      pointer.active = true;
    });

    window.addEventListener("pointerleave", function() {
      pointer.x = 0;
      pointer.y = 0;
      pointer.active = false;
    });

    canvas.addEventListener("click", function(event) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nearest = nodes.reduce(function(best, node) {
        const dx = node.screen.x - x;
        const dy = node.screen.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < best.distance ? { node: node, distance: distance } : best;
      }, { node: null, distance: Infinity });

      if (nearest.node && nearest.distance < 46) {
        window.location.href = nearest.node.el.getAttribute("href");
      }
    });
  }

  window.addEventListener("resize", resize);
  resize();
  bindPointer();
  requestAnimationFrame(animate);
})();
