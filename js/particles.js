/**
 * ECHOES – Particle System
 * Atmospheric floating particles for immersive background
 */

export class ParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas?.getContext('2d');
    this.particles = [];
    this.animFrameId = null;
    this.ghostMode = false;
    this.width = 0;
    this.height = 0;

    if (!this.canvas) return;
    this.resize();
    this.init();
    this.bindEvents();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.init();
    });
  }

  init() {
    this.particles = [];
    const count = this.ghostMode ? 120 : 60;
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  createParticle(random = false) {
    const types = this.ghostMode
      ? ['wisp', 'wisp', 'dust', 'ember', 'star']
      : ['dust', 'dust', 'ember', 'star', 'petal'];

    const type = types[Math.floor(Math.random() * types.length)];

    return {
      x: Math.random() * this.width,
      y: random ? Math.random() * this.height : this.height + 10,
      type,
      size: this.getSize(type),
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -(Math.random() * 0.5 + 0.1),
      opacity: Math.random() * 0.6 + 0.1,
      opacitySpeed: (Math.random() - 0.5) * 0.005,
      life: 1,
      maxLife: Math.random() * 200 + 100,
      currentLife: 0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      color: this.getColor(type),
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
    };
  }

  getSize(type) {
    const sizes = {
      dust: Math.random() * 2 + 0.5,
      ember: Math.random() * 3 + 1,
      star: Math.random() * 1.5 + 0.5,
      wisp: Math.random() * 4 + 2,
      petal: Math.random() * 3 + 2,
    };
    return sizes[type] || 1;
  }

  getColor(type) {
    const colors = {
      dust: ['rgba(107, 70, 193,', 'rgba(168, 85, 247,', 'rgba(192, 132, 252,'],
      ember: ['rgba(255, 107, 43,', 'rgba(255, 165, 0,', 'rgba(212, 160, 23,'],
      star: ['rgba(255, 255, 255,', 'rgba(240, 192, 64,', 'rgba(192, 132, 252,'],
      wisp: ['rgba(168, 85, 247,', 'rgba(107, 70, 193,', 'rgba(200, 162, 255,'],
      petal: ['rgba(107, 70, 193,', 'rgba(212, 160, 23,', 'rgba(192, 132, 252,'],
    };
    const palette = colors[type] || colors.dust;
    return palette[Math.floor(Math.random() * palette.length)];
  }

  drawParticle(p) {
    const { ctx } = this;
    if (!ctx) return;

    p.pulse += p.pulseSpeed;
    const pulseSize = p.size * (1 + Math.sin(p.pulse) * 0.3);
    const alpha = p.opacity * (1 - p.currentLife / p.maxLife);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = Math.max(0, alpha);

    switch (p.type) {
      case 'dust':
      case 'wisp':
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha})`;
        ctx.fill();
        // Glow
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize * 3);
        grad.addColorStop(0, `${p.color}${alpha * 0.5})`);
        grad.addColorStop(1, `${p.color}0)`);
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        break;

      case 'ember':
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha})`;
        ctx.fill();
        // Tail
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(p.speedX * -15, p.speedY * -15);
        ctx.strokeStyle = `${p.color}${alpha * 0.3})`;
        ctx.lineWidth = pulseSize * 0.5;
        ctx.stroke();
        break;

      case 'star':
        this.drawStar(ctx, 0, 0, 4, pulseSize * 1.5, pulseSize * 0.6);
        ctx.fillStyle = `${p.color}${alpha})`;
        ctx.fill();
        break;

      case 'petal':
        ctx.beginPath();
        ctx.ellipse(0, 0, pulseSize, pulseSize * 0.5, p.rotation, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha * 0.6})`;
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
  }

  update() {
    this.particles.forEach(p => {
      p.x += p.speedX + (Math.sin(p.currentLife * 0.02) * 0.2);
      p.y += p.speedY;
      p.rotation += p.rotationSpeed;
      p.opacity += p.opacitySpeed;
      p.currentLife++;

      if (p.opacity < 0.05) p.opacitySpeed = Math.abs(p.opacitySpeed);
      if (p.opacity > 0.7) p.opacitySpeed = -Math.abs(p.opacitySpeed);
    });

    // Replace dead/offscreen particles
    this.particles = this.particles.filter(p => {
      return p.y > -50 &&
        p.x > -50 &&
        p.x < this.width + 50 &&
        p.currentLife < p.maxLife;
    });

    const target = this.ghostMode ? 120 : 60;
    while (this.particles.length < target) {
      this.particles.push(this.createParticle(false));
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.update();
    this.particles.forEach(p => this.drawParticle(p));
  }

  start() {
    if (this.animFrameId) return;
    const loop = () => {
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  setGhostMode(enabled) {
    this.ghostMode = enabled;
    this.init();
  }
}

