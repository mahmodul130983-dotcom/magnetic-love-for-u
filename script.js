(() => {

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  let W, H;


  const PARTICLE_COUNT = 2500;
  const particles = [];
  const floatingHearts = [];

  // Attractor Nodes
  const nodeA = { x: 0, y: 0, targetX: 0, targetY: 0, radius: 18, color: '#00f0ff', isDragging: false, touchId: null }; // Cyan
  const nodeB = { x: 0, y: 0, targetX: 0, targetY: 0, radius: 18, color: '#ff007f', isDragging: false, touchId: null }; // Pink

  let lastInteractionTime = 0;
  let merged = false;
  let activeNode = null;


  const heartPoints = [];
  const HEART_RESOLUTION = 600;

  function initHeartPoints() {
    heartPoints.length = 0;
    for (let i = 0; i < HEART_RESOLUTION; i++) {
      const t = (i / HEART_RESOLUTION) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      heartPoints.push({ x, y });
    }
  }


  function drawHeartShape(ctx, x, y, size, color) {
    ctx.save();
    ctx.beginPath();
    ctx.translate(x, y);
    ctx.moveTo(0, -size / 4);
    ctx.bezierCurveTo(-size / 2, -size * 3 / 4, -size, -size / 3, -size, 0);
    ctx.bezierCurveTo(-size, size / 2, -size / 3, size * 5 / 6, 0, size);
    ctx.bezierCurveTo(size / 3, size * 5 / 6, size, size / 2, size, 0);
    ctx.bezierCurveTo(size, -size / 3, size / 2, -size * 3 / 4, 0, -size / 4);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }


  class FloatingHeart {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 3;
      this.vy = -Math.random() * 4 - 2;
      this.size = Math.random() * 10 + 6;
      this.alpha = 1.0;
      this.color = Math.random() > 0.5 ? '#ff007f' : '#ff4b8b';
      this.decay = Math.random() * 0.012 + 0.008;
      this.rotation = (Math.random() - 0.5) * 0.4;
      this.rotSpeed = (Math.random() - 0.5) * 0.03;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.97;
      this.rotation += this.rotSpeed;
      this.alpha -= this.decay;
    }

    draw() {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      drawHeartShape(ctx, this.x, this.y, this.size, this.color);
      ctx.restore();
    }
  }


  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initAll = false) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 80 + 10;

      const center = Math.random() > 0.5 ? nodeA : nodeB;
      this.x = (initAll ? W / 2 : center.x) + Math.cos(angle) * r;
      this.y = (initAll ? H / 2 : center.y) + Math.sin(angle) * r;

      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;

      this.size = Math.random() * 1.4 + 0.6;
      this.damping = Math.random() * 0.04 + 0.92;
      this.speedFactor = Math.random() * 0.015 + 0.007;

      this.heartIdx = Math.floor(Math.random() * HEART_RESOLUTION);
    }

    update(now, dist, centerX, centerY, heartActive, heartScale) {
      const dxA = nodeA.x - this.x;
      const dyA = nodeA.y - this.y;
      const distA = Math.sqrt(dxA * dxA + dyA * dyA);

      const dxB = nodeB.x - this.x;
      const dyB = nodeB.y - this.y;
      const distB = Math.sqrt(dxB * dxB + dyB * dyB);

      let fx = 0;
      let fy = 0;

      if (heartActive) {

        const pt = heartPoints[this.heartIdx];

        const targetX = centerX + pt.x * heartScale;
        const targetY = centerY + pt.y * heartScale;

        const dxH = targetX - this.x;
        const dyH = targetY - this.y;

        fx += dxH * this.speedFactor * 1.6;
        fy += dyH * this.speedFactor * 1.6;


        const flow = Math.sin(this.heartIdx * 0.03 + now * 0.004) * 0.25;
        fx += Math.cos(now * 0.002 + this.y * 0.01) * flow;
        fy += Math.sin(now * 0.002 + this.x * 0.01) * flow;

      } else {

        const pullA = Math.min(2.5, 45 / (distA + 10));
        fx += dxA * pullA * this.speedFactor;
        fy += dyA * pullA * this.speedFactor;

        const pullB = Math.min(2.5, 45 / (distB + 10));
        fx += dxB * pullB * this.speedFactor;
        fy += dyB * pullB * this.speedFactor;


        if (distA < 180) {
          fx -= dyA * 0.0045;
          fy += dxA * 0.0045;
        }
        if (distB < 180) {
          fx -= dyB * 0.0045;
          fy += dxB * 0.0045;
        }
      }

      this.vx += fx;
      this.vy += fy;
      this.vx *= this.damping;
      this.vy *= this.damping;

      this.x += this.vx;
      this.y += this.vy;

      if (this.x < -10 || this.x > W + 10 || this.y < -10 || this.y > H + 10) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fill();
    }
  }


  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }
  }


  function triggerExplosion(x, y) {
    for (let i = 0; i < 45; i++) {
      floatingHearts.push(new FloatingHeart(x, y));
    }
  }


  let lastBeatTime = 0;
  function getHeartScale(now) {
    const cycle = (now * 0.0015) % 1.0;
    let pulse = 0;

    if (cycle < 0.15) {
      pulse = Math.sin((cycle / 0.15) * Math.PI); // first beat
    } else if (cycle > 0.22 && cycle < 0.42) {
      pulse = 0.55 * Math.sin(((cycle - 0.22) / 0.2) * Math.PI); // second beat
    }

    if (merged && pulse > 0.8 && now - lastBeatTime > 400) {
      lastBeatTime = now;
      const centerX = (nodeA.x + nodeB.x) / 2;
      const centerY = (nodeA.y + nodeB.y) / 2;
      floatingHearts.push(new FloatingHeart(centerX, centerY));
    }

    const baseScale = Math.min(W, H) * 0.015;
    return baseScale * (1 + pulse * 0.15);
  }

  function resetNodePositions() {
    if (W < H) {

      nodeA.x = W * 0.5;
      nodeA.y = H * 0.32;
      nodeB.x = W * 0.5;
      nodeB.y = H * 0.68;
    } else {

      nodeA.x = W * 0.3;
      nodeA.y = H * 0.5;
      nodeB.x = W * 0.7;
      nodeB.y = H * 0.5;
    }
    nodeA.targetX = nodeA.x;
    nodeA.targetY = nodeA.y;
    nodeB.targetX = nodeB.x;
    nodeB.targetY = nodeB.y;
  }


  const DRAG_OFFSET_Y = -48;

  function getTouchPos(touch) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  function handleTouchStart(e) {
    e.preventDefault();
    lastInteractionTime = performance.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const pos = getTouchPos(touch);

      const distA = Math.hypot(nodeA.x - pos.x, nodeA.y - pos.y);
      const distB = Math.hypot(nodeB.x - pos.x, nodeB.y - pos.y);
      const threshold = 90;

      if (distA < distB) {
        if (distA < threshold && nodeA.touchId === null) {
          nodeA.isDragging = true;
          nodeA.touchId = touch.identifier;
          nodeA.targetX = pos.x;
          nodeA.targetY = pos.y + DRAG_OFFSET_Y;
        } else if (distB < threshold && nodeB.touchId === null) {
          nodeB.isDragging = true;
          nodeB.touchId = touch.identifier;
          nodeB.targetX = pos.x;
          nodeB.targetY = pos.y + DRAG_OFFSET_Y;
        }
      } else {
        if (distB < threshold && nodeB.touchId === null) {
          nodeB.isDragging = true;
          nodeB.touchId = touch.identifier;
          nodeB.targetX = pos.x;
          nodeB.targetY = pos.y + DRAG_OFFSET_Y;
        } else if (distA < threshold && nodeA.touchId === null) {
          nodeA.isDragging = true;
          nodeA.touchId = touch.identifier;
          nodeA.targetX = pos.x;
          nodeA.targetY = pos.y + DRAG_OFFSET_Y;
        }
      }
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    lastInteractionTime = performance.now();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const pos = getTouchPos(touch);

      if (nodeA.isDragging && nodeA.touchId === touch.identifier) {
        nodeA.targetX = pos.x;
        nodeA.targetY = pos.y + DRAG_OFFSET_Y;
      }
      if (nodeB.isDragging && nodeB.touchId === touch.identifier) {
        nodeB.targetX = pos.x;
        nodeB.targetY = pos.y + DRAG_OFFSET_Y;
      }
    }
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (nodeA.touchId === touch.identifier) {
        nodeA.isDragging = false;
        nodeA.touchId = null;
      }
      if (nodeB.touchId === touch.identifier) {
        nodeB.isDragging = false;
        nodeB.touchId = null;
      }
    }
  }


  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function handleMouseDown(e) {
    lastInteractionTime = performance.now();
    const pos = getMousePos(e);

    const distA = Math.hypot(nodeA.x - pos.x, nodeA.y - pos.y);
    const distB = Math.hypot(nodeB.x - pos.x, nodeB.y - pos.y);
    const threshold = 60;

    if (distA < distB && distA < threshold) {
      nodeA.isDragging = true;
      nodeA.targetX = pos.x;
      nodeA.targetY = pos.y;
      activeNode = nodeA;
    } else if (distB < threshold) {
      nodeB.isDragging = true;
      nodeB.targetX = pos.x;
      nodeB.targetY = pos.y;
      activeNode = nodeB;
    }
  }

  function handleMouseMove(e) {
    lastInteractionTime = performance.now();
    if (activeNode && activeNode.isDragging) {
      const pos = getMousePos(e);
      activeNode.targetX = pos.x;
      activeNode.targetY = pos.y;
    }
  }

  function handleMouseUp() {
    if (activeNode) {
      activeNode.isDragging = false;
      activeNode = null;
    }
  }


  window.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);


  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);


  function drawNode(node) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 4.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  function render(now) {
    requestAnimationFrame(render);


    ctx.fillStyle = 'rgba(7, 6, 11, 0.16)';
    ctx.fillRect(0, 0, W, H);


    if (!nodeA.isDragging) {
      nodeA.targetX = nodeA.x;
      nodeA.targetY = nodeA.y;
    }
    if (!nodeB.isDragging) {
      nodeB.targetX = nodeB.x;
      nodeB.targetY = nodeB.y;
    }


    const idleTime = now - lastInteractionTime;
    if (idleTime > 1500 && !nodeA.isDragging && !nodeB.isDragging) {
      const t = now * 0.0012;
      const midX = W / 2;
      const midY = H / 2;

      if (W < H) {

        nodeA.targetY = H * 0.28 + Math.sin(t * 1.5) * 35;
        nodeB.targetY = H * 0.72 + Math.cos(t * 1.5) * 35;
        nodeA.targetX = midX + Math.cos(t) * 20;
        nodeB.targetX = midX - Math.cos(t) * 20;
      } else {

        nodeA.targetX = W * 0.28 + Math.cos(t * 1.5) * 35;
        nodeB.targetX = W * 0.72 - Math.cos(t * 1.5) * 35;
        nodeA.targetY = midY + Math.sin(t) * 20;
        nodeB.targetY = midY - Math.sin(t) * 20;
      }
    }


    const targetDist = Math.hypot(nodeB.targetX - nodeA.targetX, nodeB.targetY - nodeA.targetY);

    if (merged) {

      if (targetDist > 120) {
        merged = false;
      }
    } else {

      if (targetDist < 45) {
        merged = true;
        const centerX = (nodeA.targetX + nodeB.targetX) / 2;
        const centerY = (nodeA.targetY + nodeB.targetY) / 2;
        triggerExplosion(centerX, centerY);
      }
    }

    const lerpFactor = 0.15;
    if (merged) {

      const midX = (nodeA.targetX + nodeB.targetX) / 2;
      const midY = (nodeA.targetY + nodeB.targetY) / 2;
      nodeA.x += (midX - nodeA.x) * lerpFactor;
      nodeA.y += (midY - nodeA.y) * lerpFactor;
      nodeB.x += (midX - nodeB.x) * lerpFactor;
      nodeB.y += (midY - nodeB.y) * lerpFactor;
    } else {

      nodeA.x += (nodeA.targetX - nodeA.x) * lerpFactor;
      nodeA.y += (nodeA.targetY - nodeA.y) * lerpFactor;
      nodeB.x += (nodeB.targetX - nodeB.x) * lerpFactor;
      nodeB.y += (nodeB.targetY - nodeB.y) * lerpFactor;
    }

    const currentDist = Math.hypot(nodeB.x - nodeA.x, nodeB.y - nodeA.y);
    const connectionThreshold = W < H ? 190 : 200;
    const heartActive = currentDist < connectionThreshold;

    const centerX = (nodeA.x + nodeB.x) / 2;
    const centerY = (nodeA.y + nodeB.y) / 2;
    const heartScale = getHeartScale(now);


    if (heartActive && !merged) {
      const opacity = Math.min(1.0, (connectionThreshold - currentDist) / 50);
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.35})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }


    ctx.globalCompositeOperation = 'screen';
    for (const p of particles) {
      p.update(now, currentDist, centerX, centerY, heartActive, heartScale);
      p.draw();
    }

    for (let i = floatingHearts.length - 1; i >= 0; i--) {
      const heart = floatingHearts[i];
      heart.update();
      heart.draw();
      if (heart.alpha <= 0) {
        floatingHearts.splice(i, 1);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    drawNode(nodeA);
    drawNode(nodeB);
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const nodeScale = Math.min(W, H) * 0.038;
    nodeA.radius = Math.max(14, Math.min(22, nodeScale));
    nodeB.radius = Math.max(14, Math.min(22, nodeScale));

    initHeartPoints();
    if (!nodeA.isDragging && !nodeB.isDragging) {
      resetNodePositions();
    }
  }

  window.addEventListener('resize', resize);

  // Start engine
  resize();
  initParticles();
  requestAnimationFrame(render);
})();
