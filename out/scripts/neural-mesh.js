'use strict';
/**
 * Neural Mesh - Animated Canvas Background
 *
 * Features:
 * - Particle network visualization
 * - Dark Mode: Dark mesh + neon accents (cyberpunk)
 * - Light Mode: Light lines + soft gradients (clean futuristic)
 * - Respects prefers-reduced-motion (static fallback)
 * - Pauses when tab is hidden (performance)
 * - Responsive via ResizeObserver
 * - Performance-optimized: only transform/opacity, no layout shifts
 *
 * Usage:
 * <canvas id="neural-mesh" class="canvas-neural-mesh"></canvas>
 * <script src="@/scripts/neural-mesh.ts"></script>
 */
Object.defineProperty(exports, '__esModule', { value: true });
class NeuralMesh {
  constructor(canvasId) {
    this.particles = [];
    this.animationId = null;
    this.resizeObserver = null;
    this.isDarkMode = false;
    this.prefersReducedMotion = false;
    // Configuration
    this.PARTICLE_COUNT = 50; // Lower count for better mobile performance
    this.MAX_DISTANCE = 150;
    this.PARTICLE_SPEED = 0.3;
    this.PARTICLE_SIZE_MIN = 2;
    this.PARTICLE_SIZE_MAX = 4;
    // Colors
    this.COLORS = {
      dark: {
        background: 'rgba(17, 24, 39, 0.95)', // gray-900
        particle: 'rgba(75, 85, 99, 0.8)', // gray-600
        line: 'rgba(75, 85, 99, 0.3)', // gray-600
        accent: 'rgba(6, 182, 212, 0.6)', // cyan-500
      },
      light: {
        background: 'rgba(249, 250, 251, 0.5)', // gray-50
        particle: 'rgba(209, 213, 219, 0.8)', // gray-300
        line: 'rgba(229, 231, 235, 0.5)', // gray-200
        accent: 'rgba(6, 182, 212, 0.3)', // cyan-500
      },
    };
    this.animate = () => {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(this.animate);
    };
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn(`[NeuralMesh] Canvas with id "${canvasId}" not found`);
      return;
    }
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      console.warn('[NeuralMesh] Could not get 2D context');
      return;
    }
    this.ctx = ctx;
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersReducedMotion = mediaQuery.matches;
    // Listen for changes to reduced motion preference
    mediaQuery.addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
      if (this.prefersReducedMotion) {
        this.stop();
        this.renderStatic();
      } else {
        this.start();
      }
    });
    // Detect dark mode
    this.updateDarkMode();
    // Initialize
    this.init();
  }
  init() {
    this.setupCanvas();
    this.createParticles();
    this.setupListeners();
    if (this.prefersReducedMotion) {
      // Render static version for reduced motion
      this.renderStatic();
    } else {
      // Start animation
      this.start();
    }
  }
  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    // Set canvas display size
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }
  createParticles() {
    this.particles = [];
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * this.PARTICLE_SPEED,
        vy: (Math.random() - 0.5) * this.PARTICLE_SPEED,
        size:
          Math.random() * (this.PARTICLE_SIZE_MAX - this.PARTICLE_SIZE_MIN) +
          this.PARTICLE_SIZE_MIN,
      });
    }
  }
  setupListeners() {
    // Dark mode observer
    const darkModeObserver = new MutationObserver(() => {
      this.updateDarkMode();
    });
    darkModeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.setupCanvas();
      this.createParticles();
      if (this.prefersReducedMotion) {
        this.renderStatic();
      }
    });
    this.resizeObserver.observe(this.canvas);
    // Visibility change (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else if (!this.prefersReducedMotion) {
        this.start();
      }
    });
  }
  updateDarkMode() {
    this.isDarkMode = document.documentElement.classList.contains('dark');
  }
  getColors() {
    return this.isDarkMode ? this.COLORS.dark : this.COLORS.light;
  }
  renderStatic() {
    const colors = this.getColors();
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);
    // Fill background
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, width, height);
    // Draw static particles
    this.ctx.fillStyle = colors.particle;
    this.particles.forEach((particle) => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    // Draw static connections
    this.ctx.strokeStyle = colors.line;
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < this.MAX_DISTANCE) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }
  }
  update() {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    this.particles.forEach((particle) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      // Bounce off walls
      if (particle.x < 0 || particle.x > width) {
        particle.vx *= -1;
        particle.x = Math.max(0, Math.min(width, particle.x));
      }
      if (particle.y < 0 || particle.y > height) {
        particle.vy *= -1;
        particle.y = Math.max(0, Math.min(height, particle.y));
      }
    });
  }
  render() {
    const colors = this.getColors();
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);
    // Fill background
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, width, height);
    // Draw connections
    this.ctx.strokeStyle = colors.line;
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < this.MAX_DISTANCE) {
          const opacity = 1 - distance / this.MAX_DISTANCE;
          this.ctx.strokeStyle = colors.line.replace(/[\d.]+\)$/, `${opacity * 0.3})`);
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
          // Add accent glow for very close particles
          if (distance < this.MAX_DISTANCE * 0.5) {
            this.ctx.strokeStyle = colors.accent.replace(/[\d.]+\)$/, `${opacity * 0.6})`);
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
          }
        }
      }
    }
    // Draw particles
    this.particles.forEach((particle) => {
      this.ctx.fillStyle = colors.particle;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      // Add subtle glow
      this.ctx.fillStyle = colors.accent.replace(/[\d.]+\)$/, '0.4)');
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size + 2, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }
  start() {
    if (this.animationId !== null || this.prefersReducedMotion) return;
    this.animate();
  }
  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  destroy() {
    this.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  const init = () => {
    const canvas = document.getElementById('neural-mesh');
    if (canvas) {
      new NeuralMesh('neural-mesh');
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
exports.default = NeuralMesh;
