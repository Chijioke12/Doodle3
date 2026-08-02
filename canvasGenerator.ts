import { createCanvas, CanvasRenderingContext2D, Image } from '@napi-rs/canvas';

export interface AssetInfo {
  id: string;
  name: string;
  fileName: string;
  category: 'player' | 'platforms' | 'powerups' | 'monsters' | 'ui';
  description: string;
  width: number;
  height: number;
}

export const ASSET_CATALOG: AssetInfo[] = [
  // Player
  { id: 'doodle_left', name: 'Doodler (Facing Left)', fileName: 'doodle-left.png', category: 'player', description: 'Facing left default jump state', width: 80, height: 80 },
  { id: 'doodle_right', name: 'Doodler (Facing Right)', fileName: 'doodle-right.png', category: 'player', description: 'Facing right default jump state', width: 80, height: 80 },
  { id: 'doodle_shooting', name: 'Doodler (Shooting)', fileName: 'doodle-shoot.png', category: 'player', description: 'Snout pointing upwards shooting nose pellets', width: 80, height: 80 },
  { id: 'doodle_pissed', name: 'Doodler (Dizzy/Falling)', fileName: 'doodle_dizzy.png', category: 'player', description: 'Dizzy spiral eyes falling state', width: 80, height: 80 },
  { id: 'doodle_propeller_1', name: 'Doodler Propeller (Frame 1)', fileName: 'doodle-propeller-1.png', category: 'player', description: 'Flying with propeller hat frame 1', width: 80, height: 95 },
  { id: 'doodle_propeller_2', name: 'Doodler Propeller (Frame 2)', fileName: 'doodle-propeller-2.png', category: 'player', description: 'Flying with propeller hat frame 2', width: 80, height: 95 },
  { id: 'doodle_jetpack_1', name: 'Doodler Jetpack (Frame 1)', fileName: 'doodle-jetpack-1.png', category: 'player', description: 'Rocketing with jetpack frame 1', width: 90, height: 100 },
  { id: 'doodle_jetpack_2', name: 'Doodler Jetpack (Frame 2)', fileName: 'doodle-jetpack-2.png', category: 'player', description: 'Rocketing with jetpack frame 2', width: 90, height: 100 },
  { id: 'doodle_spring_shoes', name: 'Doodler Spring Shoes', fileName: 'doodle-spring-shoes.png', category: 'player', description: 'Doodler equipped with bouncy spring shoes', width: 80, height: 95 },

  // Platforms
  { id: 'platform_green', name: 'Green Platform', fileName: 'green_platform.png', category: 'platforms', description: 'Standard stationary platform', width: 115, height: 32 },
  { id: 'platform_blue', name: 'Blue Platform', fileName: 'blue_platform.png', category: 'platforms', description: 'Horizontally moving platform', width: 115, height: 32 },
  { id: 'platform_white', name: 'White Cloud Platform', fileName: 'white_platform.png', category: 'platforms', description: 'Vanish after single jump platform', width: 115, height: 32 },
  { id: 'brown_platform_1', name: 'Brown Platform (Cracking)', fileName: 'brown_platform_1.png', category: 'platforms', description: 'Stage 1 crack', width: 115, height: 32 },
  { id: 'brown_platform_2', name: 'Brown Platform (Breaking)', fileName: 'brown_platform_2.png', category: 'platforms', description: 'Stage 2 break in middle', width: 115, height: 36 },
  { id: 'brown_platform_3', name: 'Brown Platform (Falling)', fileName: 'brown_platform_3.png', category: 'platforms', description: 'Stage 3 falling pieces', width: 115, height: 48 },
  { id: 'platform_red', name: 'Red Platform', fileName: 'red_platform.png', category: 'platforms', description: 'Exploding timed red platform', width: 115, height: 32 },

  // Powerups & Items
  { id: 'spring_compressed', name: 'Spring (Resting)', fileName: 'spring_compressed.png', category: 'powerups', description: 'Coiled spring at rest on platform', width: 36, height: 28 },
  { id: 'spring_full', name: 'Spring (Extended)', fileName: 'spring_full.png', category: 'powerups', description: 'Extended bounce spring frame', width: 36, height: 50 },
  { id: 'trampoline', name: 'Trampoline (Neutral)', fileName: 'trampoline.png', category: 'powerups', description: 'Bouncy trampoline resting state', width: 50, height: 26 },
  { id: 'trampoline_down', name: 'Trampoline (Pressed)', fileName: 'trampoline_down.png', category: 'powerups', description: 'Trampoline pressed down frame', width: 50, height: 20 },
  { id: 'propeller_hat', name: 'Propeller Hat Item', fileName: 'propeller.png', category: 'powerups', description: 'Propeller cap pickup item', width: 44, height: 32 },
  { id: 'jetpack', name: 'Jetpack Item', fileName: 'jetpack.png', category: 'powerups', description: 'Rocket jetpack pickup item', width: 40, height: 52 },
  { id: 'spring_shoes', name: 'Spring Shoes Item', fileName: 'spring_shoes.png', category: 'powerups', description: 'Spring shoes pickup item', width: 46, height: 32 },
  { id: 'shield', name: 'Shield Aura', fileName: 'shield.png', category: 'powerups', description: 'Protective blue bubble aura', width: 110, height: 110 },

  // Monsters & Hazards
  { id: 'green_flying_monster_1', name: 'Green Monster (Wings Up)', fileName: 'green_flying_monster_1.png', category: 'monsters', description: 'Flying enemy wings up frame', width: 90, height: 70 },
  { id: 'green_flying_monster_2', name: 'Green Monster (Wings Down)', fileName: 'green_flying_monster_2.png', category: 'monsters', description: 'Flying enemy wings down frame', width: 90, height: 70 },
  { id: 'monster_purple', name: 'Purple Monster', fileName: 'purple_monster.png', category: 'monsters', description: 'Single-eyed purple stationary enemy', width: 95, height: 80 },
  { id: 'monster_red', name: 'Red Spiky Monster', fileName: 'red_monster.png', category: 'monsters', description: 'Spiked dangerous red enemy', width: 90, height: 85 },
  { id: 'black_hole', name: 'Black Hole', fileName: 'blackhole.png', category: 'monsters', description: 'Gravitational anomaly vortex', width: 100, height: 100 },
  { id: 'ufo', name: 'UFO Saucer', fileName: 'ufo.png', category: 'monsters', description: 'Alien spacecraft with tractor beam', width: 110, height: 110 },
  { id: 'projectile', name: 'Nose Pellet', fileName: 'ball.png', category: 'monsters', description: 'Small projectile fired by Doodler', width: 24, height: 24 },

  // UI & Environment
  { id: 'bg_notebook', name: 'Notebook Grid Paper Background', fileName: 'background.png', category: 'ui', description: 'Classic graph paper notebook texture', width: 400, height: 600 },
  { id: 'top_bar', name: 'Top Score Header Bar', fileName: 'top_bar.png', category: 'ui', description: 'HUD top bar for score and pause button', width: 400, height: 60 },
  { id: 'pause_button', name: 'Pause Button', fileName: 'pause.png', category: 'ui', description: 'Hand-drawn pause icon', width: 40, height: 40 },
  { id: 'resume_button', name: 'Resume Button (Normal)', fileName: 'resume.png', category: 'ui', description: 'Play triangle resume icon', width: 40, height: 40 },
  { id: 'resume_button_on', name: 'Resume Button (Pressed)', fileName: 'resume-on.png', category: 'ui', description: 'Pressed play triangle icon', width: 40, height: 40 },
  { id: 'game_over_overlay', name: 'Game Over Banner', fileName: 'game_over.png', category: 'ui', description: 'Hand-drawn Game Over title banner', width: 320, height: 120 },
  { id: 'play_again_button', name: 'Play Again Button', fileName: 'play_again.png', category: 'ui', description: 'Interactive play again action button', width: 180, height: 50 },
];

function drawDoodlerBase(ctx: CanvasRenderingContext2D, x: number, y: number, facingRight: boolean, isShooting = false, isDizzy = false) {
  ctx.save();
  
  // Body stroke style (hand-drawn thick green doodle)
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2b2b2b';
  ctx.fillStyle = '#8bc34a'; // Signature lime-green doodle tone

  const dir = facingRight ? 1 : -1;

  // 4 Stubby Legs
  ctx.fillStyle = '#7cb342';
  for (let i = 0; i < 4; i++) {
    const lx = x + (i - 1.5) * 11;
    const ly = y + 26;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Oval Body
  ctx.fillStyle = '#8bc34a';
  ctx.beginPath();
  ctx.ellipse(x, y, 24, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Snout / Nose
  ctx.beginPath();
  if (isShooting) {
    // Snout pointing straight UP
    ctx.moveTo(x - 8, y - 20);
    ctx.quadraticCurveTo(x - 10, y - 42, x - 2, y - 42);
    ctx.lineTo(x + 2, y - 42);
    ctx.quadraticCurveTo(x + 10, y - 42, x + 8, y - 20);
  } else {
    // Normal snout pointing left/right
    const noseX = x + dir * 22;
    ctx.moveTo(x + dir * 12, y - 6);
    ctx.quadraticCurveTo(noseX + dir * 18, y - 4, noseX + dir * 18, y + 4);
    ctx.quadraticCurveTo(noseX + dir * 18, y + 12, x + dir * 12, y + 10);
  }
  ctx.fillStyle = '#8bc34a';
  ctx.fill();
  ctx.stroke();

  // Eyes
  const eyeY = y - 14;
  if (isDizzy) {
    // Spiral dizzy eyes
    for (const eyeX of [x - 10, x + 10]) {
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(eyeX - 4, eyeY - 4);
      ctx.lineTo(eyeX + 4, eyeY + 4);
      ctx.moveTo(eyeX + 4, eyeY - 4);
      ctx.lineTo(eyeX - 4, eyeY + 4);
      ctx.strokeStyle = '#d32f2f';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else if (isShooting) {
    // Concentrated eyes
    for (const eyeX of [x - 10, x + 10]) {
      ctx.beginPath();
      ctx.arc(eyeX, eyeY - 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(eyeX, eyeY - 4, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#212121';
      ctx.fill();
    }
  } else {
    // Classic 2 big eyes on top
    const eyeOffset1 = facingRight ? -4 : -14;
    const eyeOffset2 = facingRight ? 10 : 0;
    
    // Left eye
    ctx.beginPath();
    ctx.arc(x + eyeOffset1, eyeY, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + eyeOffset1 + dir * 2, eyeY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#212121';
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.arc(x + eyeOffset2, eyeY, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + eyeOffset2 + dir * 2, eyeY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#212121';
    ctx.fill();
  }

  ctx.restore();
}

export function generateAssetCanvas(assetId: string): Buffer {
  const meta = ASSET_CATALOG.find((a) => a.id === assetId) || ASSET_CATALOG[0];
  const canvas = createCanvas(meta.width, meta.height);
  const ctx = canvas.getContext('2d');

  switch (assetId) {
    case 'doodle_left':
      drawDoodlerBase(ctx, 40, 42, false);
      break;

    case 'doodle_right':
      drawDoodlerBase(ctx, 40, 42, true);
      break;

    case 'doodle_shooting':
      drawDoodlerBase(ctx, 40, 48, true, true);
      break;

    case 'doodle_pissed':
      drawDoodlerBase(ctx, 40, 42, false, false, true);
      break;

    case 'doodle_propeller_1':
    case 'doodle_propeller_2': {
      drawDoodlerBase(ctx, 40, 52, true);
      // Propeller Hat on top
      ctx.save();
      ctx.fillStyle = '#fbc02d';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#2b2b2b';
      // Beanie base
      ctx.beginPath();
      ctx.arc(40, 28, 12, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      // Propeller stem
      ctx.beginPath();
      ctx.moveTo(40, 16);
      ctx.lineTo(40, 8);
      ctx.stroke();
      // Propeller blades
      ctx.fillStyle = '#e53935';
      if (assetId === 'doodle_propeller_1') {
        ctx.beginPath();
        ctx.ellipse(30, 8, 10, 3, -0.2, 0, Math.PI * 2);
        ctx.ellipse(50, 8, 10, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(40, 8, 14, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'doodle_jetpack_1':
    case 'doodle_jetpack_2': {
      // Draw Jetpack behind
      ctx.save();
      ctx.fillStyle = '#9e9e9e';
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 2.5;
      // Twin tanks
      ctx.beginPath();
      ctx.roundRect(14, 30, 14, 32, 6);
      ctx.roundRect(26, 30, 14, 32, 6);
      ctx.fill();
      ctx.stroke();

      // Red caps
      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.arc(21, 30, 7, Math.PI, 0);
      ctx.arc(33, 30, 7, Math.PI, 0);
      ctx.fill();

      // Flames
      ctx.fillStyle = assetId === 'doodle_jetpack_1' ? '#ff9800' : '#ff5722';
      const flameLen = assetId === 'doodle_jetpack_1' ? 24 : 32;
      ctx.beginPath();
      ctx.moveTo(16, 62);
      ctx.lineTo(21, 62 + flameLen);
      ctx.lineTo(26, 62);
      ctx.moveTo(28, 62);
      ctx.lineTo(33, 62 + flameLen);
      ctx.lineTo(38, 62);
      ctx.fill();
      ctx.restore();

      drawDoodlerBase(ctx, 52, 45, true);
      break;
    }

    case 'doodle_spring_shoes': {
      drawDoodlerBase(ctx, 40, 38, true);
      // Spring shoes on feet
      ctx.save();
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 3;
      for (const sx of [25, 55]) {
        ctx.beginPath();
        ctx.moveTo(sx - 8, 64);
        ctx.lineTo(sx + 8, 64);
        ctx.lineTo(sx - 6, 70);
        ctx.lineTo(sx + 6, 76);
        ctx.lineTo(sx - 8, 82);
        ctx.lineTo(sx + 8, 82);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    // Platforms
    case 'platform_green': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1b5e20';
      ctx.fillStyle = '#7cb342';
      ctx.beginPath();
      ctx.roundRect(4, 4, 107, 24, 12);
      ctx.fill();
      ctx.stroke();
      // Grass texture doodle lines
      ctx.strokeStyle = '#558b2f';
      ctx.lineWidth = 2;
      for (let i = 15; i < 100; i += 12) {
        ctx.beginPath();
        ctx.moveTo(i, 8);
        ctx.lineTo(i + 4, 18);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'platform_blue': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0d47a1';
      ctx.fillStyle = '#29b6f6';
      ctx.beginPath();
      ctx.roundRect(4, 4, 107, 24, 12);
      ctx.fill();
      ctx.stroke();
      // Directional arrows doodle
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Left arrow
      ctx.moveTo(25, 16); ctx.lineTo(15, 16); ctx.lineTo(19, 12); ctx.moveTo(15, 16); ctx.lineTo(19, 20);
      // Right arrow
      ctx.moveTo(90, 16); ctx.lineTo(100, 16); ctx.lineTo(96, 12); ctx.moveTo(100, 16); ctx.lineTo(96, 20);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'platform_white': {
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#78909c';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.roundRect(4, 4, 107, 24, 12);
      ctx.fill();
      ctx.stroke();
      // Cloud puffy curves inside
      ctx.setLineDash([]);
      ctx.strokeStyle = '#b0bec5';
      ctx.beginPath();
      ctx.arc(35, 12, 8, 0, Math.PI * 2);
      ctx.arc(58, 10, 10, 0, Math.PI * 2);
      ctx.arc(80, 12, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'brown_platform_1':
    case 'brown_platform_2':
    case 'brown_platform_3': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3e2723';
      ctx.fillStyle = '#8d6e63';

      if (assetId === 'brown_platform_1') {
        ctx.beginPath();
        ctx.roundRect(4, 4, 107, 24, 12);
        ctx.fill();
        ctx.stroke();
        // Crack in middle
        ctx.strokeStyle = '#271510';
        ctx.beginPath();
        ctx.moveTo(50, 4); ctx.lineTo(54, 12); ctx.lineTo(51, 18); ctx.lineTo(56, 28);
        ctx.stroke();
      } else if (assetId === 'brown_platform_2') {
        // Splitting into two
        ctx.beginPath();
        ctx.roundRect(4, 4, 50, 24, 8);
        ctx.roundRect(61, 8, 50, 24, 8);
        ctx.fill();
        ctx.stroke();
      } else {
        // Falling fragments
        ctx.beginPath();
        ctx.roundRect(6, 6, 40, 20, 6);
        ctx.roundRect(50, 16, 25, 20, 4);
        ctx.roundRect(80, 24, 30, 18, 5);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'platform_red': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#b71c1c';
      ctx.fillStyle = '#ef5350';
      ctx.beginPath();
      ctx.roundRect(4, 4, 107, 24, 12);
      ctx.fill();
      ctx.stroke();
      // Hazard stripes
      ctx.strokeStyle = '#ffcdd2';
      ctx.lineWidth = 3;
      for (let i = 16; i < 100; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 6);
        ctx.lineTo(i - 8, 26);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    // Powerups & Items
    case 'spring_compressed': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#37474f';
      ctx.fillStyle = '#b0bec5';
      // Base plate
      ctx.beginPath();
      ctx.roundRect(4, 22, 28, 5, 2);
      ctx.fill();
      ctx.stroke();
      // Tight coils
      ctx.beginPath();
      ctx.moveTo(8, 22); ctx.lineTo(28, 18); ctx.lineTo(8, 14); ctx.lineTo(28, 10); ctx.lineTo(8, 6);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'spring_full': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#37474f';
      ctx.fillStyle = '#b0bec5';
      ctx.beginPath();
      ctx.roundRect(4, 44, 28, 5, 2);
      ctx.fill();
      ctx.stroke();
      // Extended coils
      ctx.beginPath();
      ctx.moveTo(8, 44);
      ctx.lineTo(28, 36);
      ctx.lineTo(8, 28);
      ctx.lineTo(28, 20);
      ctx.lineTo(8, 12);
      ctx.lineTo(28, 4);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'trampoline':
    case 'trampoline_down': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#212121';
      ctx.fillStyle = '#e53935';
      const pressed = assetId === 'trampoline_down';
      const topY = pressed ? 12 : 6;
      // Fabric
      ctx.beginPath();
      ctx.moveTo(4, 8);
      ctx.quadraticCurveTo(25, topY + 10, 46, 8);
      ctx.lineTo(46, topY + 6);
      ctx.quadraticCurveTo(25, topY + 14, 4, topY + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Legs
      ctx.beginPath();
      ctx.moveTo(8, topY + 8); ctx.lineTo(4, 24);
      ctx.moveTo(42, topY + 8); ctx.lineTo(46, 24);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'propeller_hat': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#2b2b2b';
      ctx.fillStyle = '#fbc02d';
      ctx.beginPath();
      ctx.arc(22, 24, 14, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(22, 10); ctx.lineTo(22, 4);
      ctx.stroke();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.ellipse(22, 4, 16, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'jetpack': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#212121';
      ctx.fillStyle = '#b0bec5';
      ctx.beginPath();
      ctx.roundRect(6, 12, 12, 34, 5);
      ctx.roundRect(22, 12, 12, 34, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(12, 12, 6, Math.PI, 0);
      ctx.arc(28, 12, 6, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'spring_shoes': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#212121';
      ctx.fillStyle = '#ab47bc';
      // Shoe 1
      ctx.beginPath(); ctx.roundRect(4, 4, 18, 12, 4); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 16); ctx.lineTo(18, 20); ctx.lineTo(8, 24); ctx.lineTo(18, 28); ctx.stroke();
      // Shoe 2
      ctx.beginPath(); ctx.roundRect(24, 4, 18, 12, 4); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(28, 16); ctx.lineTo(38, 20); ctx.lineTo(28, 24); ctx.lineTo(38, 28); ctx.stroke();
      ctx.restore();
      break;
    }

    case 'shield': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0288d1';
      ctx.fillStyle = 'rgba(129, 212, 250, 0.35)';
      ctx.beginPath();
      ctx.arc(55, 55, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Shield highlight shine
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(55, 55, 42, -Math.PI * 0.7, -Math.PI * 0.3);
      ctx.stroke();
      ctx.restore();
      break;
    }

    // Monsters & Hazards
    case 'green_flying_monster_1':
    case 'green_flying_monster_2': {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1b5e20';
      ctx.fillStyle = '#66bb6a';

      const wingsUp = assetId === 'green_flying_monster_1';

      // Bat Wings
      ctx.beginPath();
      if (wingsUp) {
        ctx.moveTo(35, 35); ctx.quadraticCurveTo(10, 5, 2, 25); ctx.quadraticCurveTo(20, 30, 35, 40);
        ctx.moveTo(55, 35); ctx.quadraticCurveTo(80, 5, 88, 25); ctx.quadraticCurveTo(70, 30, 55, 40);
      } else {
        ctx.moveTo(35, 35); ctx.quadraticCurveTo(10, 60, 2, 45); ctx.quadraticCurveTo(20, 40, 35, 40);
        ctx.moveTo(55, 35); ctx.quadraticCurveTo(80, 60, 88, 45); ctx.quadraticCurveTo(70, 40, 55, 40);
      }
      ctx.fillStyle = '#81c784';
      ctx.fill();
      ctx.stroke();

      // Body
      ctx.fillStyle = '#43a047';
      ctx.beginPath();
      ctx.ellipse(45, 40, 20, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Big center eye
      ctx.beginPath(); ctx.arc(45, 35, 10, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(45, 35, 4, 0, Math.PI * 2); ctx.fillStyle = '#212121'; ctx.fill();

      // Fangs
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(40, 48); ctx.lineTo(43, 55); ctx.lineTo(45, 48);
      ctx.moveTo(45, 48); ctx.lineTo(47, 55); ctx.lineTo(50, 48);
      ctx.fill(); ctx.stroke();

      ctx.restore();
      break;
    }

    case 'monster_purple': {
      ctx.save();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#311b92';
      ctx.fillStyle = '#7e57c2';
      // Fuzzy round body
      ctx.beginPath();
      ctx.ellipse(47, 42, 36, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Eye
      ctx.beginPath(); ctx.arc(47, 34, 14, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(47, 34, 6, 0, Math.PI * 2); ctx.fillStyle = '#d50000'; ctx.fill();
      // Mouth with teeth
      ctx.beginPath(); ctx.arc(47, 54, 12, 0, Math.PI); ctx.stroke();
      ctx.restore();
      break;
    }

    case 'monster_red': {
      ctx.save();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#b71c1c';
      ctx.fillStyle = '#e53935';
      // Horns
      ctx.beginPath();
      ctx.moveTo(25, 30); ctx.lineTo(15, 10); ctx.lineTo(32, 24);
      ctx.moveTo(65, 30); ctx.lineTo(75, 10); ctx.lineTo(58, 24);
      ctx.fill(); ctx.stroke();
      // Spiky Body
      ctx.beginPath();
      ctx.ellipse(45, 48, 30, 26, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Angry eyes
      for (const ex of [34, 56]) {
        ctx.beginPath(); ctx.arc(ex, 42, 7, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(ex, 42, 3, 0, Math.PI * 2); ctx.fillStyle = '#212121'; ctx.fill();
      }
      // Angry eyebrow
      ctx.beginPath(); ctx.moveTo(28, 34); ctx.lineTo(62, 34); ctx.stroke();
      ctx.restore();
      break;
    }

    case 'black_hole': {
      ctx.save();
      ctx.fillStyle = '#120024';
      ctx.beginPath(); ctx.arc(50, 50, 42, 0, Math.PI * 2); ctx.fill();
      // Swirling spiral arms
      ctx.strokeStyle = '#b388ff';
      ctx.lineWidth = 3;
      for (let r = 10; r < 40; r += 8) {
        ctx.beginPath();
        ctx.arc(50, 50, r, r * 0.2, r * 0.2 + Math.PI * 1.2);
        ctx.stroke();
      }
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(50, 50, 18, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }

    case 'ufo': {
      ctx.save();
      // Tractor beam
      ctx.fillStyle = 'rgba(255, 235, 59, 0.35)';
      ctx.beginPath();
      ctx.moveTo(40, 45); ctx.lineTo(10, 105); ctx.lineTo(100, 105); ctx.lineTo(70, 45);
      ctx.fill();
      // Saucer dome
      ctx.lineWidth = 3; ctx.strokeStyle = '#212121'; ctx.fillStyle = '#80deea';
      ctx.beginPath(); ctx.arc(55, 32, 20, Math.PI, 0); ctx.fill(); ctx.stroke();
      // Metallic disk
      ctx.fillStyle = '#b0bec5';
      ctx.beginPath(); ctx.ellipse(55, 42, 40, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Lights
      ctx.fillStyle = '#ffeb3b';
      for (let x = 25; x <= 85; x += 15) {
        ctx.beginPath(); ctx.arc(x, 42, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 'projectile': {
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#e65100'; ctx.fillStyle = '#ff9800';
      ctx.beginPath(); ctx.arc(12, 12, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      break;
    }

    // UI & Environment
    case 'bg_notebook': {
      ctx.save();
      // Paper background cream color
      ctx.fillStyle = '#f7f6ed';
      ctx.fillRect(0, 0, 400, 600);
      // Graph grid lines
      ctx.strokeStyle = '#e0ecf8';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 400; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke();
      }
      for (let y = 0; y <= 600; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(400, y); ctx.stroke();
      }
      // Top red margin line
      ctx.strokeStyle = '#ffcdd2'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40, 600); ctx.stroke();
      ctx.restore();
      break;
    }

    case 'top_bar': {
      ctx.save();
      ctx.fillStyle = '#f7f6ed'; ctx.fillRect(0, 0, 400, 60);
      ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 1.5;
      for (let x = 0; x <= 400; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 60); ctx.stroke();
      }
      ctx.strokeStyle = '#37474f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 58); ctx.lineTo(400, 58); ctx.stroke();
      ctx.restore();
      break;
    }

    case 'pause_button': {
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = '#37474f'; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.roundRect(2, 2, 36, 36, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#37474f';
      ctx.fillRect(11, 10, 5, 20); ctx.fillRect(24, 10, 5, 20);
      ctx.restore();
      break;
    }

    case 'resume_button':
    case 'resume_button_on': {
      ctx.save();
      const pressed = assetId === 'resume_button_on';
      ctx.lineWidth = 3; ctx.strokeStyle = '#37474f'; ctx.fillStyle = pressed ? '#e0e0e0' : '#ffffff';
      ctx.beginPath(); ctx.roundRect(2, 2, 36, 36, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath(); ctx.moveTo(14, 10); ctx.lineTo(28, 20); ctx.lineTo(14, 30); ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }

    case 'game_over_overlay': {
      ctx.save();
      ctx.fillStyle = '#f7f6ed'; ctx.lineWidth = 4; ctx.strokeStyle = '#212121';
      ctx.beginPath(); ctx.roundRect(6, 6, 308, 108, 16); ctx.fill(); ctx.stroke();
      // Inner grid style
      ctx.strokeStyle = '#e0ecf8'; ctx.lineWidth = 1;
      for (let x = 20; x < 300; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, 110); ctx.stroke();
      }
      // Hand drawn text "GAME OVER"
      ctx.fillStyle = '#d32f2f'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', 160, 60);
      ctx.restore();
      break;
    }

    case 'play_again_button': {
      ctx.save();
      ctx.fillStyle = '#8bc34a'; ctx.lineWidth = 3.5; ctx.strokeStyle = '#2b2b2b';
      ctx.beginPath(); ctx.roundRect(4, 4, 172, 42, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PLAY AGAIN', 90, 25);
      ctx.restore();
      break;
    }

    default:
      ctx.fillStyle = '#cccccc'; ctx.fillRect(0, 0, meta.width, meta.height);
      break;
  }

  return canvas.toBuffer('image/png');
}

export function generateSpriteSheet(): { buffer: Buffer; atlas: any } {
  // Pack all catalog items into a grid sprite sheet
  const padding = 10;
  const cols = 5;
  let currentX = padding;
  let currentY = padding;
  let maxHeightInRow = 0;

  const frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};

  // Compute positions
  let colIndex = 0;
  for (const asset of ASSET_CATALOG) {
    if (asset.id === 'bg_notebook') continue; // Skip large bg from main compact sheet

    if (colIndex >= cols) {
      colIndex = 0;
      currentX = padding;
      currentY += maxHeightInRow + padding;
      maxHeightInRow = 0;
    }

    frames[asset.id] = {
      frame: { x: currentX, y: currentY, w: asset.width, h: asset.height },
    };

    maxHeightInRow = Math.max(maxHeightInRow, asset.height);
    currentX += asset.width + padding;
    colIndex++;
  }

  const sheetWidth = 600;
  const sheetHeight = currentY + maxHeightInRow + padding;

  const canvas = createCanvas(sheetWidth, sheetHeight);
  const ctx = canvas.getContext('2d');

  // Draw each asset into sprite sheet
  for (const asset of ASSET_CATALOG) {
    if (!frames[asset.id]) continue;
    const pos = frames[asset.id].frame;

    // Generate canvas buffer for single asset
    const singleCanvas = createCanvas(asset.width, asset.height);
    const sCtx = singleCanvas.getContext('2d');
    
    // Draw directly using logic
    const imgBuf = generateAssetCanvas(asset.id);
    const img = new Image();
    img.src = imgBuf;
    ctx.drawImage(img, pos.x, pos.y);
  }

  const atlas = {
    frames,
    meta: {
      app: 'Doodle Jump Backend Node Canvas Generator',
      version: '1.0',
      image: 'spritesheet.png',
      size: { w: sheetWidth, h: sheetHeight },
    },
  };

  return { buffer: canvas.toBuffer('image/png'), atlas };
}
