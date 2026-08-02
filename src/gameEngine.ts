/**
 * Doodle Jump — High-Performance Game Engine
 * ------------------------------------------
 * Replaces Emscripten C-to-asm.js output with a 100% faithful,
 * high-fps TypeScript implementation using all authentic Doodle Jump assets.
 */

import { GAME_ASSETS } from './assets';

export interface GameState {
  score: number;
  highScore: number;
  gameOver: boolean;
  paused: boolean;
}

export class DoodleJumpEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private images: Record<string, HTMLImageElement> = {};
  private loaded: boolean = false;

  // Screen config
  private readonly SCREEN_W = 240;
  private readonly SCREEN_H = 320;

  // Physics config
  private readonly GRAVITY = 0.35;
  private readonly JUMP_VELOCITY = -9.0;
  private readonly SPRING_VELOCITY = -15.5;
  private readonly JETPACK_VELOCITY = -20.0;
  private readonly PROPELLER_VELOCITY = -14.0;
  private readonly MOVE_SPEED = 3.2;
  private readonly PLATFORM_W = 44;
  private readonly PLATFORM_H = 10;
  private readonly MAX_PLATFORMS = 16;
  private readonly MAX_PROJECTILES = 5;

  // Game State
  private player = {
    x: 108,
    y: 260,
    vx: 0,
    vy: -9.0,
    facing: 1, // 1 = right, -1 = left
    shootTimer: 0,
    hasJetpack: 0, // frames remaining
    hasPropeller: 0, // frames remaining
    hasSpringShoes: 0,
  };

  private cameraY = 0;
  private highestY = 260;
  public score = 0;
  public highScore = 0;
  public gameOver = false;
  public paused = false;

  private keyLeft = false;
  private keyRight = false;

  private platforms: Array<{
    x: number;
    y: number;
    width: number;
    type: 'normal' | 'moving' | 'breakable' | 'white';
    alive: boolean;
    moveDir: number;
    hasSpring: boolean;
    hasJetpack: boolean;
    hasPropeller: boolean;
    brokenFrame?: number;
  }> = [];

  private projectiles: Array<{
    x: number;
    y: number;
    vy: number;
    active: boolean;
  }> = [];

  private monsters: Array<{
    x: number;
    y: number;
    type: 'green' | 'purple' | 'red' | 'ufo';
    alive: boolean;
    moveDir: number;
    startX: number;
    frame: number;
  }> = [];

  private onStateChange?: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement, onStateChange?: (state: GameState) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2d context');
    this.ctx = context;
    this.onStateChange = onStateChange;

    const savedHigh = localStorage.getItem('doodle_high_score');
    if (savedHigh) {
      this.highScore = parseInt(savedHigh, 10) || 0;
    }

    this.preloadAssets().then(() => {
      this.loaded = true;
      this.newGame();
      this.setupEventListeners();
      this.startLoop();
    });
  }

  private async preloadAssets(): Promise<void> {
    const promises = Object.entries(GAME_ASSETS).map(([key, base64]) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
          this.images[key] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load asset: ${key}`);
          resolve();
        };
      });
    });
    await Promise.all(promises);
  }

  public newGame() {
    this.player = {
      x: this.SCREEN_W / 2 - 12,
      y: this.SCREEN_H - 60,
      vx: 0,
      vy: this.JUMP_VELOCITY,
      facing: 1,
      shootTimer: 0,
      hasJetpack: 0,
      hasPropeller: 0,
      hasSpringShoes: 0,
    };

    this.cameraY = 0;
    this.highestY = this.player.y;
    this.score = 0;
    this.gameOver = false;
    this.paused = false;

    this.initPlatforms();
    this.projectiles = Array.from({ length: this.MAX_PROJECTILES }, () => ({
      x: 0,
      y: 0,
      vy: 0,
      active: false,
    }));
    this.monsters = [];

    this.emitState();
  }

  private initPlatforms() {
    this.platforms = [];
    let y = this.SCREEN_H - 20;

    for (let i = 0; i < this.MAX_PLATFORMS; i++) {
      if (i === 0) {
        // First platform is always safe and directly under player
        this.platforms.push({
          x: this.SCREEN_W / 2 - this.PLATFORM_W / 2,
          y: y,
          width: this.PLATFORM_W,
          type: 'normal',
          alive: true,
          moveDir: 0,
          hasSpring: false,
          hasJetpack: false,
          hasPropeller: false,
        });
      } else {
        this.platforms.push(this.createPlatform(y));
      }
      y -= 35 + Math.random() * 30;
    }
  }

  private createPlatform(y: number) {
    const roll = Math.random() * 100;
    let type: 'normal' | 'moving' | 'breakable' | 'white' = 'normal';
    let moveDir = 0;

    if (roll < 55) {
      type = 'normal';
    } else if (roll < 75) {
      type = 'moving';
      moveDir = Math.random() < 0.5 ? 1 : -1;
    } else if (roll < 90) {
      type = 'breakable';
    } else {
      type = 'white';
    }

    const hasSpring = type !== 'breakable' && Math.random() < 0.15;
    const hasJetpack = !hasSpring && type === 'normal' && Math.random() < 0.04;
    const hasPropeller = !hasSpring && !hasJetpack && type === 'normal' && Math.random() < 0.06;

    return {
      x: Math.random() * (this.SCREEN_W - this.PLATFORM_W),
      y: y,
      width: this.PLATFORM_W,
      type,
      alive: true,
      moveDir,
      hasSpring,
      hasJetpack,
      hasPropeller,
    };
  }

  private spawnMonster(y: number) {
    if (Math.random() > 0.18 || this.monsters.length >= 2) return;

    const types: Array<'green' | 'purple' | 'red' | 'ufo'> = ['green', 'purple', 'red', 'ufo'];
    const type = types[Math.floor(Math.random() * types.length)];
    const startX = 20 + Math.random() * (this.SCREEN_W - 60);

    this.monsters.push({
      x: startX,
      y: y - 40,
      type,
      alive: true,
      moveDir: Math.random() < 0.5 ? 1 : -1,
      startX,
      frame: 0,
    });
  }

  private setupEventListeners() {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === '4') {
        this.keyLeft = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === '6') {
        this.keyRight = true;
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === '5') {
        if (this.gameOver) {
          this.newGame();
        } else {
          this.shoot();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === '4') {
        this.keyLeft = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === '6') {
        this.keyRight = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  public setLeftKey(down: boolean) {
    this.keyLeft = down;
  }

  public setRightKey(down: boolean) {
    this.keyRight = down;
  }

  public shoot() {
    if (this.gameOver) {
      this.newGame();
      return;
    }
    for (let i = 0; i < this.MAX_PROJECTILES; i++) {
      if (!this.projectiles[i].active) {
        this.projectiles[i].active = true;
        this.projectiles[i].x = this.player.x + 6;
        this.projectiles[i].y = this.player.y - 10;
        this.projectiles[i].vy = -12.0;
        this.player.shootTimer = 15;
        break;
      }
    }
  }

  private update() {
    if (this.gameOver || this.paused || !this.loaded) return;

    // Powerup durations
    if (this.player.hasJetpack > 0) {
      this.player.hasJetpack--;
      this.player.vy = this.JETPACK_VELOCITY;
    } else if (this.player.hasPropeller > 0) {
      this.player.hasPropeller--;
      this.player.vy = this.PROPELLER_VELOCITY;
    } else {
      // Normal gravity physics
      this.player.vy += this.GRAVITY;
    }

    // Horizontal movement
    if (this.keyLeft) {
      this.player.vx = -this.MOVE_SPEED;
      this.player.facing = -1;
    } else if (this.keyRight) {
      this.player.vx = this.MOVE_SPEED;
      this.player.facing = 1;
    } else {
      this.player.vx *= 0.8;
    }

    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Screen wraparound
    if (this.player.x + 24 < 0) this.player.x = this.SCREEN_W;
    if (this.player.x > this.SCREEN_W) this.player.x = -24;

    // Shoot timer
    if (this.player.shootTimer > 0) this.player.shootTimer--;

    // Update projectiles
    for (const p of this.projectiles) {
      if (p.active) {
        p.y += p.vy;
        if (p.y - this.cameraY < -50) {
          p.active = false;
        }

        // Check monster hits
        for (const m of this.monsters) {
          if (m.alive && Math.abs(p.x - m.x) < 25 && Math.abs(p.y - m.y) < 25) {
            m.alive = false;
            p.active = false;
            this.score += 200;
          }
        }
      }
    }

    // Platform collisions (only while falling down without powerups)
    if (this.player.vy > 0 && this.player.hasJetpack === 0 && this.player.hasPropeller === 0) {
      const feetPrev = this.player.y + 24 - this.player.vy;
      const feetNow = this.player.y + 24;

      for (const p of this.platforms) {
        if (!p.alive) continue;

        const alignX = this.player.x + 24 > p.x && this.player.x < p.x + p.width;
        if (alignX && feetPrev <= p.y && feetNow >= p.y) {
          this.player.y = p.y - 24;

          if (p.hasJetpack) {
            this.player.hasJetpack = 150;
            p.hasJetpack = false;
          } else if (p.hasPropeller) {
            this.player.hasPropeller = 120;
            p.hasPropeller = false;
          } else if (p.hasSpring) {
            this.player.vy = this.SPRING_VELOCITY;
            p.hasSpring = false;
          } else {
            this.player.vy = this.JUMP_VELOCITY;
          }

          if (p.type === 'breakable') {
            p.alive = false;
          }
          break;
        }
      }
    }

    // Monster collisions
    for (const m of this.monsters) {
      if (!m.alive) continue;
      m.frame++;
      m.x += m.moveDir * 0.8;
      if (Math.abs(m.x - m.startX) > 40) m.moveDir *= -1;

      // Distance check
      const dist = Math.hypot(this.player.x + 12 - (m.x + 16), this.player.y + 12 - (m.y + 16));
      if (dist < 22) {
        if (this.player.vy > 0 && this.player.y + 24 < m.y + 12) {
          // Bounce off monster head
          this.player.vy = this.JUMP_VELOCITY;
          m.alive = false;
          this.score += 100;
        } else if (this.player.hasJetpack === 0 && this.player.hasPropeller === 0) {
          // Player hit by monster
          this.gameOver = true;
          this.saveHighScore();
          this.emitState();
        }
      }
    }

    // Moving platforms
    for (const p of this.platforms) {
      if (p.type === 'moving' && p.alive) {
        p.x += p.moveDir * 1.2;
        if (p.x <= 0) { p.x = 0; p.moveDir = 1; }
        if (p.x + p.width >= this.SCREEN_W) { p.x = this.SCREEN_W - p.width; p.moveDir = -1; }
      }
    }

    // Camera scrolling (smooth tracking upwards)
    if (this.player.y < this.highestY) {
      this.highestY = this.player.y;
      const targetCam = this.player.y - this.SCREEN_H * 0.4;
      if (targetCam < this.cameraY) {
        this.cameraY = targetCam;
      }
      this.score = Math.max(this.score, Math.floor((this.SCREEN_H - 60 - this.highestY) / 5));
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveHighScore();
      }
      this.emitState();
    }

    // Recycle platforms below bottom screen
    let topY = 1e9;
    for (const p of this.platforms) {
      if (p.alive && p.y < topY) topY = p.y;
    }

    for (const p of this.platforms) {
      if (p.y - this.cameraY > this.SCREEN_H + 20 || !p.alive) {
        const newY = topY - (35 + Math.random() * 30);
        Object.assign(p, this.createPlatform(newY));
        topY = newY;
        this.spawnMonster(newY);
      }
    }

    // Check game over (falling below screen)
    if (this.player.y - this.cameraY > this.SCREEN_H) {
      this.gameOver = true;
      this.saveHighScore();
      this.emitState();
    }
  }

  private saveHighScore() {
    localStorage.setItem('doodle_high_score', this.highScore.toString());
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        gameOver: this.gameOver,
        paused: this.paused,
      });
    }
  }

  private render() {
    // Clear background (soft grid paper blue sky)
    this.ctx.fillStyle = '#cdebea';
    this.ctx.fillRect(0, 0, this.SCREEN_W, this.SCREEN_H);

    // Draw grid lines for classic Doodle Jump paper aesthetic
    this.ctx.strokeStyle = 'rgba(180, 220, 240, 0.4)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.SCREEN_W; x += 15) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.SCREEN_H);
      this.ctx.stroke();
    }
    const offsetY = Math.floor(-this.cameraY % 15);
    for (let y = offsetY; y < this.SCREEN_H; y += 15) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.SCREEN_W, y);
      this.ctx.stroke();
    }

    // Render Platforms
    for (const p of this.platforms) {
      if (!p.alive) continue;
      const screenY = p.y - this.cameraY;
      if (screenY < -20 || screenY > this.SCREEN_H + 20) continue;

      let key = 'platform_green';
      if (p.type === 'moving') key = 'platform_blue';
      else if (p.type === 'breakable') key = 'brown_platform_1';
      else if (p.type === 'white') key = 'platform_white';

      const img = this.images[key];
      if (img) {
        this.ctx.drawImage(img, p.x - 1, screenY - 1, 46, 12);
      } else {
        this.ctx.fillStyle = p.type === 'moving' ? '#3278dc' : '#28b446';
        this.ctx.fillRect(p.x, screenY, p.width, this.PLATFORM_H);
      }

      // Draw Spring
      if (p.hasSpring) {
        const springImg = this.images['spring_compressed'];
        if (springImg) {
          this.ctx.drawImage(springImg, p.x + p.width / 2 - 7, screenY - 11, 14, 11);
        }
      }

      // Draw Jetpack on platform
      if (p.hasJetpack) {
        const jetImg = this.images['jetpack'];
        if (jetImg) {
          this.ctx.drawImage(jetImg, p.x + p.width / 2 - 8, screenY - 18, 16, 18);
        }
      }

      // Draw Propeller hat on platform
      if (p.hasPropeller) {
        const propImg = this.images['propeller_hat'];
        if (propImg) {
          this.ctx.drawImage(propImg, p.x + p.width / 2 - 8, screenY - 14, 16, 14);
        }
      }
    }

    // Render Monsters
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const screenY = m.y - this.cameraY;
      if (screenY < -40 || screenY > this.SCREEN_H + 40) continue;

      let mKey = 'green_flying_monster_1';
      if (m.type === 'purple') mKey = 'monster_purple';
      else if (m.type === 'red') mKey = 'monster_red';
      else if (m.type === 'ufo') mKey = 'ufo';

      const mImg = this.images[mKey];
      if (mImg) {
        this.ctx.drawImage(mImg, m.x, screenY, 32, 32);
      }
    }

    // Render Projectiles
    for (const pr of this.projectiles) {
      if (!pr.active) continue;
      const screenY = pr.y - this.cameraY;
      const pImg = this.images['projectile'];
      if (pImg) {
        this.ctx.drawImage(pImg, pr.x, screenY, 12, 12);
      } else {
        this.ctx.fillStyle = '#ff6400';
        this.ctx.fillRect(pr.x, screenY, 8, 8);
      }
    }

    // Render Player
    const playerScreenY = this.player.y - this.cameraY;
    let pKey = this.player.facing > 0 ? 'doodle_right' : 'doodle_left';

    if (this.player.hasJetpack > 0) {
      pKey = Math.floor(Date.now() / 100) % 2 === 0 ? 'doodle_jetpack_1' : 'doodle_jetpack_2';
    } else if (this.player.hasPropeller > 0) {
      pKey = Math.floor(Date.now() / 100) % 2 === 0 ? 'doodle_propeller_1' : 'doodle_propeller_2';
    } else if (this.player.shootTimer > 0) {
      pKey = 'doodle_shooting';
    } else if (this.gameOver) {
      pKey = 'doodle_pissed';
    }

    const playerImg = this.images[pKey] || this.images['doodle_right'];
    if (playerImg) {
      this.ctx.drawImage(playerImg, this.player.x - 8, playerScreenY - 12, 40, 40);
    } else {
      this.ctx.fillStyle = '#3cc85a';
      this.ctx.fillRect(this.player.x, playerScreenY, 24, 24);
    }

    // Top Bar HUD
    const topBar = this.images['top_bar'];
    if (topBar) {
      this.ctx.drawImage(topBar, 0, 0, this.SCREEN_W, 25);
    } else {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      this.ctx.fillRect(0, 0, this.SCREEN_W, 25);
    }

    // Score text
    this.ctx.fillStyle = '#222';
    this.ctx.font = 'bold 12px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score}`, 8, 17);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`HIGH: ${this.highScore}`, this.SCREEN_W - 8, 17);

    // Game Over Overlay
    if (this.gameOver) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      this.ctx.fillRect(0, this.SCREEN_H / 2 - 50, this.SCREEN_W, 100);

      const goImg = this.images['game_over_overlay'];
      if (goImg) {
        this.ctx.drawImage(goImg, this.SCREEN_W / 2 - 80, this.SCREEN_H / 2 - 40, 160, 50);
      } else {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.SCREEN_W / 2, this.SCREEN_H / 2 - 10);
      }

      this.ctx.fillStyle = '#ffde00';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Press ENTER or FIRE to Play Again', this.SCREEN_W / 2, this.SCREEN_H / 2 + 30);
    }
  }

  private startLoop() {
    const loop = () => {
      this.update();
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
