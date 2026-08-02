(function() {
  console.log("Initializing Doodle Jump game engine...");

  // Setup Browser object expected by Emscripten
  if (!window.Browser) {
    window.Browser = { preloadedImages: {} };
  } else if (!window.Browser.preloadedImages) {
    window.Browser.preloadedImages = {};
  }

  // Execute preRun hooks from Module if provided
  if (window.Module && Array.isArray(window.Module.preRun)) {
    window.Module.preRun.forEach(function(fn) {
      try { fn(); } catch(e) { console.error("Error in preRun hook:", e); }
    });
  }

  const SCREEN_W = 240;
  const SCREEN_H = 320;
  const PLAYER_W = 24;
  const PLAYER_H = 24;
  const GRAVITY = 0.35;
  const JUMP_VELOCITY = -9.0;
  const SPRING_VELOCITY = -15.5;
  const MOVE_SPEED = 3.0;
  const PLATFORM_W = 44;
  const PLATFORM_H = 10;
  const MAX_PLATFORMS = 16;
  const PLATFORM_GAP_MIN = 35;
  const PLATFORM_GAP_MAX = 65;
  const MAX_PROJECTILES = 5;

  const PLAT_NORMAL = 0;
  const PLAT_MOVING = 1;
  const PLAT_BREAKABLE = 2;

  let canvas = (window.Module && window.Module.canvas) || document.getElementById('canvas');
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }
  const ctx = canvas.getContext('2d');

  let keyLeft = false;
  let keyRight = false;
  let gameOver = false;
  let cameraY = 0;
  let highestY = 0;
  let score = 0;

  const player = {
    x: SCREEN_W / 2 - PLAYER_W / 2,
    y: SCREEN_H - 60,
    vx: 0,
    vy: JUMP_VELOCITY,
    facing: 1,
    shootTimer: 0
  };

  const platforms = [];
  const projectiles = [];
  for (let i = 0; i < MAX_PROJECTILES; i++) {
    projectiles.push({ x: 0, y: 0, vy: 0, active: false });
  }

  function frand(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  function resetPlayer() {
    player.x = SCREEN_W / 2 - PLAYER_W / 2;
    player.y = SCREEN_H - 60;
    player.vx = 0;
    player.vy = JUMP_VELOCITY;
    player.facing = 1;
    player.shootTimer = 0;
  }

  function spawnPlatform(p, y) {
    p.x = frand(0, SCREEN_W - PLATFORM_W);
    p.y = y;
    p.width = PLATFORM_W;
    p.alive = true;
    p.hasSpring = (Math.floor(Math.random() * 6) === 0);

    const roll = Math.random() * 100;
    if (roll < 65) {
      p.type = PLAT_NORMAL;
      p.moveDir = 0;
    } else if (roll < 85) {
      p.type = PLAT_MOVING;
      p.moveDir = (Math.random() < 0.5) ? 1 : -1;
    } else {
      p.type = PLAT_BREAKABLE;
      p.moveDir = 0;
      p.hasSpring = false;
    }
  }

  function initPlatforms() {
    platforms.length = 0;
    let y = SCREEN_H - 20;
    for (let i = 0; i < MAX_PLATFORMS; i++) {
      const p = {};
      spawnPlatform(p, y);
      if (i === 0) {
        p.type = PLAT_NORMAL;
        p.hasSpring = false;
        p.x = SCREEN_W / 2 - PLATFORM_W / 2;
      }
      platforms.push(p);
      y -= frand(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX);
    }
  }

  function shootProjectile() {
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (!projectiles[i].active) {
        projectiles[i].active = true;
        projectiles[i].x = player.x + PLAYER_W / 2 - 12;
        projectiles[i].y = player.y - 12;
        projectiles[i].vy = -12.0;
        player.shootTimer = 15;
        break;
      }
    }
  }

  function newGame() {
    resetPlayer();
    initPlatforms();
    for (let i = 0; i < MAX_PROJECTILES; i++) projectiles[i].active = false;
    cameraY = 0;
    highestY = player.y;
    score = 0;
    gameOver = false;
  }

  function recyclePlatformsIfNeeded() {
    let topY = 1e9;
    for (let i = 0; i < MAX_PLATFORMS; i++) {
      if (platforms[i].alive && platforms[i].y < topY) topY = platforms[i].y;
    }

    for (let i = 0; i < MAX_PLATFORMS; i++) {
      const screenY = platforms[i].y - cameraY;
      if (screenY > SCREEN_H + PLATFORM_H || !platforms[i].alive) {
        const newY = topY - frand(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX);
        spawnPlatform(platforms[i], newY);
        topY = newY;
      }
    }
  }

  function updatePlatforms() {
    for (let i = 0; i < MAX_PLATFORMS; i++) {
      const p = platforms[i];
      if (!p.alive) continue;
      if (p.type === PLAT_MOVING) {
        p.x += p.moveDir * 1.2;
        if (p.x <= 0) { p.x = 0; p.moveDir = 1; }
        if (p.x + p.width >= SCREEN_W) { p.x = SCREEN_W - p.width; p.moveDir = -1; }
      }
    }
  }

  function updateProjectiles() {
    if (player.shootTimer > 0) player.shootTimer--;
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (projectiles[i].active) {
        projectiles[i].y += projectiles[i].vy;
        const screenY = projectiles[i].y - cameraY;
        if (screenY < -50) {
          projectiles[i].active = false;
        }
      }
    }
  }

  function updatePlayer() {
    if (keyLeft) player.vx = -MOVE_SPEED;
    else if (keyRight) player.vx = MOVE_SPEED;
    else player.vx = 0;

    player.x += player.vx;
    if (player.vx < 0) player.facing = -1;
    if (player.vx > 0) player.facing = 1;

    if (player.x + PLAYER_W < 0) player.x = SCREEN_W;
    if (player.x > SCREEN_W) player.x = -PLAYER_W;

    player.vy += GRAVITY;
    player.y += player.vy;

    if (player.vy > 0) {
      for (let i = 0; i < MAX_PLATFORMS; i++) {
        const p = platforms[i];
        if (!p.alive) continue;

        const feetPrev = player.y + PLAYER_H - player.vy;
        const feetNow = player.y + PLAYER_H;

        const horizontallyAligned = (player.x + PLAYER_W > p.x) && (player.x < p.x + p.width);

        if (horizontallyAligned && feetPrev <= p.y && feetNow >= p.y) {
          player.y = p.y - PLAYER_H;

          if (p.hasSpring) {
            player.vy = SPRING_VELOCITY;
            p.hasSpring = false;
          } else {
            player.vy = JUMP_VELOCITY;
          }

          if (p.type === PLAT_BREAKABLE) {
            p.alive = false;
          }
          break;
        }
      }
    }

    if (player.y < highestY) {
      highestY = player.y;
      const desiredCameraY = player.y - SCREEN_H * 0.4;
      if (desiredCameraY < cameraY) cameraY = desiredCameraY;
      score = Math.max(0, Math.floor((SCREEN_H - 60 - highestY) / 10));
    }

    const screenY = player.y - cameraY;
    if (screenY > SCREEN_H) {
      gameOver = true;
    }
  }

  function getImage(assetKey) {
    const images = window.Browser && window.Browser.preloadedImages;
    if (images && images[`/assets/${assetKey}.png`]) {
      return images[`/assets/${assetKey}.png`];
    }
    return null;
  }

  function drawPlayer() {
    const screenY = player.y - cameraY;
    let imgKey = 'doodle_left';
    if (player.shootTimer > 0) {
      imgKey = 'doodle_shooting';
    } else if (player.facing > 0) {
      imgKey = 'doodle_right';
    }

    const img = getImage(imgKey);
    if (img) {
      ctx.drawImage(img, player.x - 8, screenY - 16, 40, 40);
    } else {
      ctx.fillStyle = '#3cc85a';
      ctx.fillRect(player.x, screenY, PLAYER_W, PLAYER_H);
    }
  }

  function drawPlatform(p) {
    if (!p.alive) return;
    const screenY = p.y - cameraY;
    if (screenY < -PLATFORM_H || screenY > SCREEN_H) return;

    let imgKey = 'platform_green';
    if (p.type === PLAT_MOVING) imgKey = 'platform_blue';
    else if (p.type === PLAT_BREAKABLE) imgKey = 'brown_platform_1';

    const img = getImage(imgKey);
    if (img) {
      ctx.drawImage(img, p.x - 1, screenY - 1, 46, 12);
    } else {
      if (p.type === PLAT_NORMAL) ctx.fillStyle = '#28b446';
      else if (p.type === PLAT_MOVING) ctx.fillStyle = '#3278dc';
      else ctx.fillStyle = '#a06432';
      ctx.fillRect(p.x, screenY, p.width, PLATFORM_H);
    }

    if (p.hasSpring) {
      const springImg = getImage('spring_compressed');
      if (springImg) {
        ctx.drawImage(springImg, p.x + p.width / 2 - 7, screenY - 11, 14, 11);
      } else {
        ctx.fillStyle = '#fadc28';
        ctx.fillRect(p.x + p.width / 2 - 5, screenY - 8, 10, 8);
      }
    }
  }

  function drawScore() {
    ctx.fillStyle = '#141414';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Score: ' + score, 10, 20);
  }

  function render() {
    ctx.fillStyle = '#cdebfa';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    for (let i = 0; i < MAX_PLATFORMS; i++) {
      drawPlatform(platforms[i]);
    }

    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (projectiles[i].active) {
        const screenY = projectiles[i].y - cameraY;
        const projImg = getImage('projectile');
        if (projImg) {
          ctx.drawImage(projImg, projectiles[i].x, screenY, 24, 24);
        } else {
          ctx.fillStyle = '#ff6400';
          ctx.beginPath();
          ctx.arc(projectiles[i].x + 12, screenY + 12, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawPlayer();
    drawScore();

    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, SCREEN_H / 2 - 40, SCREEN_W, 80);

      const goImg = getImage('game_over_overlay');
      if (goImg) {
        ctx.drawImage(goImg, SCREEN_W / 2 - 80, SCREEN_H / 2 - 30, 160, 60);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', SCREEN_W / 2, SCREEN_H / 2);
        ctx.font = '12px sans-serif';
        ctx.fillText('Press Enter to Restart', SCREEN_W / 2, SCREEN_H / 2 + 22);
        ctx.textAlign = 'left';
      }
    }
  }

  function gameLoop() {
    if (!gameOver) {
      updateProjectiles();
      updatePlatforms();
      updatePlayer();
      recyclePlatformsIfNeeded();
    }
    render();
    requestAnimationFrame(gameLoop);
  }

  function handleKeyDown(e) {
    if (e.keyCode === 37 || e.key === 'ArrowLeft' || e.code === 'ArrowLeft' || e.keyCode === 100 || e.key === '4') {
      keyLeft = true;
    } else if (e.keyCode === 39 || e.key === 'ArrowRight' || e.code === 'ArrowRight' || e.keyCode === 102 || e.key === '6') {
      keyRight = true;
    } else if (e.keyCode === 13 || e.key === 'Enter' || e.code === 'Enter' || e.keyCode === 101 || e.key === '5') {
      if (gameOver) {
        newGame();
      } else {
        shootProjectile();
      }
    }
  }

  function handleKeyUp(e) {
    if (e.keyCode === 37 || e.key === 'ArrowLeft' || e.code === 'ArrowLeft' || e.keyCode === 100 || e.key === '4') {
      keyLeft = false;
    } else if (e.keyCode === 39 || e.key === 'ArrowRight' || e.code === 'ArrowRight' || e.keyCode === 102 || e.key === '6') {
      keyRight = false;
    }
  }

  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keyup', handleKeyUp, true);

  newGame();
  requestAnimationFrame(gameLoop);
})();
