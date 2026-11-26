export interface FruitGameResult {
  caught: number;
  fruits: number;
  sparkles: number;
}

interface FallingFruit {
  x: number;
  y: number;
  speed: number;
  radius: number;
  color: string;
}

const COLORS = ['#f6a34a', '#f27f91', '#f7cf5a', '#8bc97c'];
const DURATION_MS = 25_000;

/** Lightweight canvas minigame: catch falling fruit with the little basket. */
export function startFruitGame(
  canvas: HTMLCanvasElement,
  onEnd: (result: FruitGameResult) => void,
  onCatch: () => void,
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let width = 1;
  let height = 1;
  let basketX = 0;
  let caught = 0;
  let fruits: FallingFruit[] = [];
  let lastSpawn = 0;
  let lastFrame = performance.now();
  const startedAt = lastFrame;
  let raf = 0;
  let destroyed = false;
  const keys = { left: false, right: false };

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    basketX = basketX || width / 2;
  }

  function move(event: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    basketX = Math.min(width - 36, Math.max(36, event.clientX - rect.left));
  }

  function keyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') keys.left = true;
    if (event.key === 'ArrowRight') keys.right = true;
  }

  function keyUp(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') keys.left = false;
    if (event.key === 'ArrowRight') keys.right = false;
  }

  function drawFruit(fruit: FallingFruit): void {
    if (!ctx) return;
    ctx.beginPath();
    ctx.fillStyle = fruit.color;
    ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#5c9b52';
    ctx.ellipse(fruit.x + 2, fruit.y - fruit.radius - 1, 5, 2.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 248, 232, 0.75)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#a8d18b';
    ctx.fillRect(0, height - 22, width, 22);

    fruits.forEach(drawFruit);

    // A soft woven basket that follows the pointer/finger.
    ctx.fillStyle = '#b9783e';
    ctx.beginPath();
    ctx.moveTo(basketX - 38, height - 52);
    ctx.lineTo(basketX + 38, height - 52);
    ctx.lineTo(basketX + 28, height - 16);
    ctx.lineTo(basketX - 28, height - 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8c522c';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(basketX, height - 50, 36, Math.PI, 0);
    ctx.stroke();

    const remaining = Math.max(0, Math.ceil((DURATION_MS - (performance.now() - startedAt)) / 1000));
    ctx.fillStyle = '#315b55';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🍊 ${caught}`, 14, 26);
    ctx.textAlign = 'right';
    ctx.fillText(`${remaining}s`, width - 14, 26);
  }

  function frame(now: number): void {
    if (destroyed) return;
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    if (keys.left) basketX = Math.max(36, basketX - 260 * dt);
    if (keys.right) basketX = Math.min(width - 36, basketX + 260 * dt);

    if (now - lastSpawn > 680 && now - startedAt < DURATION_MS - 1500) {
      lastSpawn = now;
      fruits.push({
        x: 30 + Math.random() * (width - 60),
        y: -18,
        speed: 95 + Math.random() * 70,
        radius: 12 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }

    fruits = fruits.filter((fruit) => {
      fruit.y += fruit.speed * dt;
      if (fruit.y > height - 60 && Math.abs(fruit.x - basketX) < 42 && fruit.y < height - 8) {
        caught += 1;
        onCatch();
        return false;
      }
      return fruit.y < height + 20;
    });

    draw();

    if (now - startedAt >= DURATION_MS) {
      destroy();
      onEnd({ caught, fruits: Math.max(1, Math.round(caught / 2)), sparkles: Math.min(8, Math.floor(caught / 2)) });
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
    canvas.removeEventListener('pointermove', move);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('resize', resize);
  }

  resize();
  canvas.addEventListener('pointermove', move);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(frame);

  return destroy;
}
