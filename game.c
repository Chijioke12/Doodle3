/*
 * Doodle Jump — KaiOS Edition
 * -----------------------------------------------------------
 * Written in C using SDL2 (the standard way to target
 * Emscripten/asm.js — SDL2 calls map cleanly onto <canvas>).
 *
 * Screen is sized for a typical KaiOS feature phone (240x320).
 * Controls:
 *   Left / Right arrow (or numpad 4 / 6)  -> move player
 *   Enter / numpad 5                       -> restart after game over
 *
 * Build for asm.js (you said you'll handle transpilation, but
 * for reference):
 *   emcc game.c -O2 -s WASM=0 -s USE_SDL=2 -s USE_SDL_IMAGE=2 \
 *        -s SDL2_IMAGE_FORMATS='["png"]' --preload-file public/assets@/assets \
 *        -s ALLOW_MEMORY_GROWTH=1 -o game.js
 *
 * Game features:
 *   - Procedurally generated platforms as the player climbs
 *   - Normal, moving (oscillating), and breakable platforms
 *   - Spring power-ups for a bigger boost
 *   - Horizontal screen wraparound (classic Doodle Jump feel)
 *   - Score tracking (max height climbed) + game over / restart
 */

#include <SDL2/SDL.h>
#include <SDL2/SDL_image.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

/* ---------- Config ---------- */
#define SCREEN_W        240
#define SCREEN_H        320
#define PLAYER_W        24
#define PLAYER_H        24
#define GRAVITY         0.35f
#define JUMP_VELOCITY   -9.0f
#define SPRING_VELOCITY -15.5f
#define TRAMPOLINE_VEL  -18.0f
#define MOVE_SPEED      3.0f
#define PLATFORM_W      44
#define PLATFORM_H      10
#define MAX_PLATFORMS   16
#define PLATFORM_GAP_MIN 35
#define PLATFORM_GAP_MAX 65
#define MAX_PROJECTILES 5

typedef enum {
    PLAT_NORMAL = 0,
    PLAT_MOVING,
    PLAT_BREAKABLE,
    PLAT_WHITE
} PlatformType;

typedef enum {
    POWERUP_NONE = 0,
    POWERUP_SPRING,
    POWERUP_TRAMPOLINE,
    POWERUP_PROPELLER,
    POWERUP_JETPACK
} PowerupType;

typedef struct {
    float x, y;
    int   width;
    PlatformType type;
    int   alive;        /* 0 = broken/removed */
    float moveDir;      /* +1 or -1 for moving platforms */
    PowerupType powerup;
    int   springTimer;  /* > 0 when bouncing animation active */
    int   breakFrame;   /* 0 = intact, 1-15 = breaking animation ticker */
} Platform;

typedef struct {
    float x, y;
    float vx, vy;
    int   facing; /* 1 = right, -1 = left */
    int   shootTimer; /* > 0 when shooting */
    int   propellerTimer; /* > 0 when flying with propeller hat */
    int   jetpackTimer;   /* > 0 when flying with jetpack */
    int   animFrame; /* frame ticker for propellers/jetpack */
} Player;

typedef struct {
    float x, y;
    float vy;
    int active;
} Projectile;

/* ---------- Globals ---------- */
static SDL_Window   *gWindow   = NULL;
static SDL_Renderer *gRenderer = NULL;

/* Background & HUD */
static SDL_Texture *tex_bg = NULL;
static SDL_Texture *tex_top_bar = NULL;

/* Player Sprites & Animations */
static SDL_Texture *tex_player_left = NULL;
static SDL_Texture *tex_player_right = NULL;
static SDL_Texture *tex_player_shoot = NULL;
static SDL_Texture *tex_player_pissed = NULL;
static SDL_Texture *tex_player_propeller_1 = NULL;
static SDL_Texture *tex_player_propeller_2 = NULL;
static SDL_Texture *tex_player_jetpack_1 = NULL;
static SDL_Texture *tex_player_jetpack_2 = NULL;

/* Platforms */
static SDL_Texture *tex_plat_green = NULL;
static SDL_Texture *tex_plat_blue = NULL;
static SDL_Texture *tex_plat_white = NULL;
static SDL_Texture *tex_plat_break_1 = NULL;
static SDL_Texture *tex_plat_break_2 = NULL;
static SDL_Texture *tex_plat_break_3 = NULL;

/* Items & Powerups */
static SDL_Texture *tex_spring_compressed = NULL;
static SDL_Texture *tex_spring_full = NULL;
static SDL_Texture *tex_trampoline = NULL;
static SDL_Texture *tex_trampoline_down = NULL;
static SDL_Texture *tex_propeller_item = NULL;
static SDL_Texture *tex_jetpack_item = NULL;

/* UI & FX */
static SDL_Texture *tex_game_over = NULL;
static SDL_Texture *tex_projectile = NULL;

static Platform platforms[MAX_PLATFORMS];
static Projectile projectiles[MAX_PROJECTILES];
static Player   player;

static float cameraY = 0.0f;       /* interpolated world-space Y camera position */
static float targetCameraY = 0.0f; /* target camera position focused on player */
static float highestY = 0.0f;      /* smallest (highest) player.y ever reached, for scoring */
static int   score = 0;
static int   gameOver = 0;
static int   keyLeft = 0, keyRight = 0;
static int   quitRequested = 0;

/* ---------- Utility ---------- */
static float frand(float lo, float hi) {
    return lo + ((float)rand() / (float)RAND_MAX) * (hi - lo);
}

static void resetPlayer(void) {
    player.x = SCREEN_W / 2.0f - PLAYER_W / 2.0f;
    player.y = SCREEN_H - 60.0f;
    player.vx = 0;
    player.vy = JUMP_VELOCITY;
    player.facing = 1;
    player.shootTimer = 0;
    player.propellerTimer = 0;
    player.jetpackTimer = 0;
    player.animFrame = 0;
}

static void shootProjectile(void) {
    for (int i = 0; i < MAX_PROJECTILES; i++) {
        if (!projectiles[i].active) {
            projectiles[i].active = 1;
            projectiles[i].x = player.x + PLAYER_W / 2.0f - 12.0f; // Center projectile (24x24)
            projectiles[i].y = player.y - 12.0f;
            projectiles[i].vy = -12.0f;
            player.shootTimer = 15; // Show shoot sprite for 15 frames
            break;
        }
    }
}

/* Spawn a single platform at a given world-space y, random x */
static void spawnPlatform(Platform *p, float y) {
    p->x = frand(0.0f, (float)(SCREEN_W - PLATFORM_W));
    p->y = y;
    p->width = PLATFORM_W;
    p->alive = 1;
    p->springTimer = 0;
    p->breakFrame = 0;
    p->powerup = POWERUP_NONE;

    int roll = rand() % 100;
    if (roll < 55) {
        p->type = PLAT_NORMAL;
        p->moveDir = 0;
    } else if (roll < 75) {
        p->type = PLAT_MOVING;
        p->moveDir = (rand() % 2 == 0) ? 1.0f : -1.0f;
    } else if (roll < 88) {
        p->type = PLAT_BREAKABLE;
        p->moveDir = 0;
    } else {
        p->type = PLAT_WHITE;
        p->moveDir = 0;
    }

    /* Attach powerups to solid non-breakable platforms */
    if (p->type == PLAT_NORMAL || p->type == PLAT_MOVING) {
        int itemRoll = rand() % 100;
        if (itemRoll < 12) {
            p->powerup = POWERUP_SPRING;
        } else if (itemRoll < 18) {
            p->powerup = POWERUP_TRAMPOLINE;
        } else if (itemRoll < 22) {
            p->powerup = POWERUP_PROPELLER;
        } else if (itemRoll < 25) {
            p->powerup = POWERUP_JETPACK;
        }
    }
}

/* Build the initial ladder of platforms below/around the player */
static void initPlatforms(void) {
    float y = SCREEN_H - 20.0f;
    for (int i = 0; i < MAX_PLATFORMS; i++) {
        spawnPlatform(&platforms[i], y);
        /* Force the very first platform to be safe/normal under the player */
        if (i == 0) {
            platforms[i].type = PLAT_NORMAL;
            platforms[i].powerup = POWERUP_NONE;
            platforms[i].x = SCREEN_W / 2.0f - PLATFORM_W / 2.0f;
        }
        y -= frand(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX);
    }
}

static void newGame(void) {
    srand((unsigned int)time(NULL));
    resetPlayer();
    initPlatforms();
    for (int i = 0; i < MAX_PROJECTILES; i++) projectiles[i].active = 0;
    targetCameraY = player.y - SCREEN_H * 0.45f;
    cameraY = targetCameraY;
    highestY = player.y;
    score = 0;
    gameOver = 0;
}

static void recyclePlatformsIfNeeded(void) {
    float topY = 1e9f;
    for (int i = 0; i < MAX_PLATFORMS; i++) {
        if (platforms[i].alive && platforms[i].y < topY) topY = platforms[i].y;
    }

    for (int i = 0; i < MAX_PLATFORMS; i++) {
        float screenY = platforms[i].y - cameraY;
        if (screenY > SCREEN_H + PLATFORM_H) {
            float newY = topY - frand(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX);
            spawnPlatform(&platforms[i], newY);
            topY = newY;
        } else if (!platforms[i].alive && platforms[i].breakFrame == 0) {
            /* Broken platform completely finished crumble: bring back from top */
            float newY = topY - frand(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX);
            spawnPlatform(&platforms[i], newY);
            topY = newY;
        }
    }
}

static void updatePlatforms(void) {
    for (int i = 0; i < MAX_PLATFORMS; i++) {
        Platform *p = &platforms[i];
        if (p->springTimer > 0) p->springTimer--;
        
        if (p->breakFrame > 0) {
            p->breakFrame++;
            if (p->breakFrame > 15) {
                p->alive = 0;
            }
        }

        if (!p->alive) continue;

        if (p->type == PLAT_MOVING) {
            p->x += p->moveDir * 1.2f;
            if (p->x <= 0) { p->x = 0; p->moveDir = 1; }
            if (p->x + p->width >= SCREEN_W) { p->x = SCREEN_W - p->width; p->moveDir = -1; }
        }
    }
}

static void updateProjectiles(void) {
    if (player.shootTimer > 0) player.shootTimer--;
    for (int i = 0; i < MAX_PROJECTILES; i++) {
        if (projectiles[i].active) {
            projectiles[i].y += projectiles[i].vy;
            float screenY = projectiles[i].y - cameraY;
            if (screenY < -50.0f) {
                projectiles[i].active = 0;
            }
        }
    }
}

static void updatePlayer(void) {
    player.animFrame++;

    /* Powerup flight logic */
    if (player.jetpackTimer > 0) {
        player.jetpackTimer--;
        player.vy = -16.0f; /* High speed rocket ascension */
    } else if (player.propellerTimer > 0) {
        player.propellerTimer--;
        player.vy = -11.0f; /* Smooth propeller flight */
    } else {
        /* Standard gravity */
        player.vy += GRAVITY;
    }

    /* Horizontal movement */
    if (keyLeft)  player.vx = -MOVE_SPEED;
    else if (keyRight) player.vx = MOVE_SPEED;
    else player.vx = 0;

    player.x += player.vx;
    if (player.vx < 0) player.facing = -1;
    if (player.vx > 0) player.facing = 1;

    /* Screen wraparound */
    if (player.x + PLAYER_W < 0) player.x = SCREEN_W;
    if (player.x > SCREEN_W) player.x = -PLAYER_W;

    /* Vertical physics */
    player.y += player.vy;

    /* Collide with platforms only while falling (vy > 0) */
    if (player.vy > 0 && player.jetpackTimer == 0 && player.propellerTimer == 0) {
        for (int i = 0; i < MAX_PLATFORMS; i++) {
            Platform *p = &platforms[i];
            if (!p->alive || p->breakFrame > 0) continue;

            float feetPrev = player.y + PLAYER_H - player.vy;
            float feetNow  = player.y + PLAYER_H;

            int horizontallyAligned =
                (player.x + PLAYER_W > p->x) && (player.x < p->x + p->width);

            if (horizontallyAligned && feetPrev <= p->y && feetNow >= p->y) {
                /* Landed */
                player.y = p->y - PLAYER_H;

                if (p->powerup == POWERUP_SPRING) {
                    player.vy = SPRING_VELOCITY;
                    p->springTimer = 12;
                    p->powerup = POWERUP_NONE;
                } else if (p->powerup == POWERUP_TRAMPOLINE) {
                    player.vy = TRAMPOLINE_VEL;
                    p->springTimer = 12;
                    p->powerup = POWERUP_NONE;
                } else if (p->powerup == POWERUP_PROPELLER) {
                    player.propellerTimer = 110;
                    p->powerup = POWERUP_NONE;
                } else if (p->powerup == POWERUP_JETPACK) {
                    player.jetpackTimer = 140;
                    p->powerup = POWERUP_NONE;
                } else {
                    player.vy = JUMP_VELOCITY;
                }

                if (p->type == PLAT_BREAKABLE) {
                    p->breakFrame = 1; /* Trigger crumble animation */
                } else if (p->type == PLAT_WHITE) {
                    p->alive = 0; /* Cloud vanishes on jump */
                }
                break;
            }
        }
    }

    /* Camera follows player upward smoothly */
    if (player.y < highestY) {
        highestY = player.y;
        score = (int)((SCREEN_H - 60.0f - highestY) / 10.0f);
        if (score < 0) score = 0;
    }

    float desiredCamera = player.y - SCREEN_H * 0.45f;
    if (desiredCamera < targetCameraY) {
        targetCameraY = desiredCamera;
    }
    /* Smooth camera interpolation (lerp) */
    cameraY += (targetCameraY - cameraY) * 0.15f;

    /* Game over: player's feet fall below the bottom of the visible screen */
    float screenY = player.y - cameraY;
    if (screenY > SCREEN_H) {
        gameOver = 1;
    }
}

/* ---------- Rendering ---------- */
static SDL_Texture* loadTexture(const char* path) {
    SDL_Surface* surface = IMG_Load(path);
    if (!surface) {
        if (path[0] == '/') {
            surface = IMG_Load(path + 1);
        }
    }
    if (!surface) {
        fprintf(stderr, "Failed to load image %s: %s\n", path, IMG_GetError());
        return NULL;
    }
    SDL_Texture* tex = SDL_CreateTextureFromSurface(gRenderer, surface);
    SDL_FreeSurface(surface);
    return tex;
}

static void drawPlayer(void) {
    int screenY = (int)(player.y - cameraY + 0.5f);
    int screenX = (int)(player.x + 0.5f);
    
    SDL_Texture* tex = tex_player_left;

    if (gameOver && tex_player_pissed) {
        tex = tex_player_pissed;
    } else if (player.jetpackTimer > 0) {
        tex = (player.animFrame % 6 < 3 && tex_player_jetpack_2) ? tex_player_jetpack_2 : tex_player_jetpack_1;
    } else if (player.propellerTimer > 0) {
        tex = (player.animFrame % 8 < 4 && tex_player_propeller_2) ? tex_player_propeller_2 : tex_player_propeller_1;
    } else if (player.shootTimer > 0 && tex_player_shoot) {
        tex = tex_player_shoot;
    } else if (player.facing > 0) {
        tex = tex_player_right;
    }
    
    if (tex) {
        // Render 40x40 centered over 24x24 player box
        SDL_Rect dest = { screenX - 8, screenY - 16, 40, 40 };
        SDL_RenderCopy(gRenderer, tex, NULL, &dest);
    } else {
        /* Fallback color body */
        SDL_SetRenderDrawColor(gRenderer, 60, 200, 90, 255);
        SDL_Rect body = { screenX, screenY, PLAYER_W, PLAYER_H };
        SDL_RenderFillRect(gRenderer, &body);

        /* Eyes */
        SDL_SetRenderDrawColor(gRenderer, 255, 255, 255, 255);
        int eyeOffset = (player.facing > 0) ? 12 : 4;
        SDL_Rect eye1 = { screenX + eyeOffset,     screenY + 6, 5, 5 };
        SDL_Rect eye2 = { screenX + eyeOffset + 7, screenY + 6, 5, 5 };
        SDL_RenderFillRect(gRenderer, &eye1);
        SDL_RenderFillRect(gRenderer, &eye2);
    }
}

static void drawPlatform(Platform *p) {
    if (!p->alive && p->breakFrame == 0) return;
    int screenY = (int)(p->y - cameraY + 0.5f);
    int screenX = (int)(p->x + 0.5f);
    if (screenY < -PLATFORM_H || screenY > SCREEN_H) return;

    SDL_Texture* tex = NULL;
    if (p->breakFrame > 0) {
        if (p->breakFrame <= 5) tex = tex_plat_break_1;
        else if (p->breakFrame <= 10) tex = tex_plat_break_2;
        else tex = tex_plat_break_3;
    } else {
        switch (p->type) {
            case PLAT_NORMAL:    tex = tex_plat_green; break;
            case PLAT_MOVING:    tex = tex_plat_blue; break;
            case PLAT_BREAKABLE: tex = tex_plat_break_1; break;
            case PLAT_WHITE:     tex = tex_plat_white; break;
        }
    }
    
    if (tex) {
        SDL_Rect dest = { screenX - 1, screenY - 1, 46, 12 };
        SDL_RenderCopy(gRenderer, tex, NULL, &dest);
    } else {
        switch (p->type) {
            case PLAT_NORMAL:    SDL_SetRenderDrawColor(gRenderer,  40, 180,  70, 255); break;
            case PLAT_MOVING:    SDL_SetRenderDrawColor(gRenderer,  50, 120, 220, 255); break;
            case PLAT_BREAKABLE: SDL_SetRenderDrawColor(gRenderer, 160, 100,  50, 255); break;
            case PLAT_WHITE:     SDL_SetRenderDrawColor(gRenderer, 230, 230, 230, 255); break;
        }
        SDL_Rect rect = { screenX, screenY, p->width, PLATFORM_H };
        SDL_RenderFillRect(gRenderer, &rect);
    }

    /* Draw attached powerup item on platform */
    if (p->powerup != POWERUP_NONE || p->springTimer > 0) {
        if (p->powerup == POWERUP_SPRING || (p->springTimer > 0 && tex_spring_full)) {
            SDL_Texture* springTex = (p->springTimer > 0) ? tex_spring_full : tex_spring_compressed;
            if (springTex) {
                SDL_Rect springDest = { screenX + p->width / 2 - 7, screenY - 11, 14, 11 };
                SDL_RenderCopy(gRenderer, springTex, NULL, &springDest);
            }
        } else if (p->powerup == POWERUP_TRAMPOLINE || (p->springTimer > 0 && tex_trampoline_down)) {
            SDL_Texture* trampTex = (p->springTimer > 0) ? tex_trampoline_down : tex_trampoline;
            if (trampTex) {
                SDL_Rect trampDest = { screenX + p->width / 2 - 10, screenY - 8, 20, 9 };
                SDL_RenderCopy(gRenderer, trampTex, NULL, &trampDest);
            }
        } else if (p->powerup == POWERUP_PROPELLER) {
            if (tex_propeller_item) {
                SDL_Rect propDest = { screenX + p->width / 2 - 8, screenY - 12, 16, 12 };
                SDL_RenderCopy(gRenderer, tex_propeller_item, NULL, &propDest);
            }
        } else if (p->powerup == POWERUP_JETPACK) {
            if (tex_jetpack_item) {
                SDL_Rect jetDest = { screenX + p->width / 2 - 7, screenY - 14, 14, 15 };
                SDL_RenderCopy(gRenderer, tex_jetpack_item, NULL, &jetDest);
            }
        }
    }
}

static void drawScore(void) {
    if (tex_top_bar) {
        SDL_Rect barDest = { 0, 0, SCREEN_W, 30 };
        SDL_RenderCopy(gRenderer, tex_top_bar, NULL, &barDest);
    }

    /* Minimal score visual bar */
    SDL_SetRenderDrawColor(gRenderer, 30, 30, 30, 255);
    SDL_Rect bar = { 6, 6, 10 + (score % 999) / 2, 6 };
    if (bar.w > 120) bar.w = 120;
    SDL_RenderFillRect(gRenderer, &bar);
}

static void render(void) {
    /* Draw Notebook Paper Background */
    if (tex_bg) {
        SDL_Rect bgRect = { 0, 0, SCREEN_W, SCREEN_H };
        SDL_RenderCopy(gRenderer, tex_bg, NULL, &bgRect);
    } else {
        SDL_SetRenderDrawColor(gRenderer, 247, 246, 237, 255); /* Paper cream */
        SDL_RenderClear(gRenderer);
    }

    for (int i = 0; i < MAX_PLATFORMS; i++) drawPlatform(&platforms[i]);
    
    // Draw projectiles
    for (int i = 0; i < MAX_PROJECTILES; i++) {
        if (projectiles[i].active) {
            int screenY = (int)(projectiles[i].y - cameraY + 0.5f);
            int screenX = (int)(projectiles[i].x + 0.5f);
            if (tex_projectile) {
                SDL_Rect dest = { screenX, screenY, 24, 24 };
                SDL_RenderCopy(gRenderer, tex_projectile, NULL, &dest);
            } else {
                SDL_SetRenderDrawColor(gRenderer, 255, 100, 0, 255);
                SDL_Rect proj = { screenX, screenY, 10, 10 };
                SDL_RenderFillRect(gRenderer, &proj);
            }
        }
    }
    
    drawPlayer();
    drawScore();

    if (gameOver) {
        SDL_SetRenderDrawColor(gRenderer, 0, 0, 0, 140);
        SDL_Rect overlay = { 0, SCREEN_H / 2 - 40, SCREEN_W, 80 };
        SDL_RenderFillRect(gRenderer, &overlay);
        
        if (tex_game_over) {
            SDL_Rect go_dest = { SCREEN_W / 2 - 80, SCREEN_H / 2 - 30, 160, 60 };
            SDL_RenderCopy(gRenderer, tex_game_over, NULL, &go_dest);
        } else {
            SDL_SetRenderDrawColor(gRenderer, 255, 255, 255, 255);
            SDL_Rect textBar = { SCREEN_W / 2 - 40, SCREEN_H / 2 - 6, 80, 12 };
            SDL_RenderFillRect(gRenderer, &textBar);
        }
    }

    SDL_RenderPresent(gRenderer);
}

/* ---------- Input ---------- */
static void handleEvents(void) {
    SDL_Event e;
    while (SDL_PollEvent(&e)) {
        switch (e.type) {
            case SDL_QUIT:
                quitRequested = 1;
                break;
            case SDL_KEYDOWN:
                switch (e.key.keysym.sym) {
                    case SDLK_LEFT:
                    case SDLK_KP_4:
                    case SDLK_4:
                        keyLeft = 1;
                        break;
                    case SDLK_RIGHT:
                    case SDLK_KP_6:
                    case SDLK_6:
                        keyRight = 1;
                        break;
                    case SDLK_RETURN:
                    case SDLK_KP_ENTER:
                    case SDLK_SPACE:
                    case SDLK_KP_5:
                    case SDLK_5:
                        if (gameOver) {
                            newGame();
                        } else {
                            shootProjectile();
                        }
                        break;
                }
                break;
            case SDL_KEYUP:
                switch (e.key.keysym.sym) {
                    case SDLK_LEFT:
                    case SDLK_KP_4:
                    case SDLK_4:
                        keyLeft = 0;
                        break;
                    case SDLK_RIGHT:
                    case SDLK_KP_6:
                    case SDLK_6:
                        keyRight = 0;
                        break;
                }
                break;
        }
    }
}

/* ---------- Main loop ---------- */
#ifdef __EMSCRIPTEN__
static Uint32 lastTime = 0;
static float  timeAccumulator = 0.0f;
static const float FIXED_DT = 1.0f / 60.0f;

static void mainLoop(void) {
    Uint32 now = SDL_GetTicks();
    if (lastTime == 0) lastTime = now;
    float dt = (now - lastTime) / 1000.0f;
    lastTime = now;

    if (dt > 0.1f) dt = 0.1f; /* Cap max delta time to prevent physics explosion */
    timeAccumulator += dt;

    handleEvents();

    while (timeAccumulator >= FIXED_DT) {
        if (!gameOver) {
            updateProjectiles();
            updatePlatforms();
            updatePlayer();
            recyclePlatformsIfNeeded();
        }
        timeAccumulator -= FIXED_DT;
    }

    render();
}
#else
static void mainLoop(void) {
    handleEvents();

    if (!gameOver) {
        updateProjectiles();
        updatePlatforms();
        updatePlayer();
        recyclePlatformsIfNeeded();
    }

    render();
}
#endif

int main(int argc, char **argv) {
    (void)argc; (void)argv;

    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        fprintf(stderr, "SDL_Init failed: %s\n", SDL_GetError());
        return 1;
    }
    if (!(IMG_Init(IMG_INIT_PNG) & IMG_INIT_PNG)) {
        fprintf(stderr, "IMG_Init failed: %s\n", IMG_GetError());
    }

    /* Set rendering hints for KaiOS performance */
    SDL_SetHint(SDL_HINT_RENDER_SCALE_QUALITY, "0"); /* Nearest neighbor scaling */
    SDL_SetHint(SDL_HINT_RENDER_VSYNC, "1");

    gWindow = SDL_CreateWindow(
        "Doodle Jump - KaiOS Edition",
        SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
        SCREEN_W, SCREEN_H, SDL_WINDOW_SHOWN
    );
    gRenderer = SDL_CreateRenderer(gWindow, -1, SDL_RENDERER_ACCELERATED);

    // Load textures
    tex_bg = loadTexture("/assets/background.png");
    tex_top_bar = loadTexture("/assets/top_bar.png");

    tex_player_left = loadTexture("/assets/doodle_left.png");
    tex_player_right = loadTexture("/assets/doodle_right.png");
    tex_player_shoot = loadTexture("/assets/doodle_shooting.png");
    tex_player_pissed = loadTexture("/assets/doodle_pissed.png");
    tex_player_propeller_1 = loadTexture("/assets/doodle_propeller_1.png");
    tex_player_propeller_2 = loadTexture("/assets/doodle_propeller_2.png");
    tex_player_jetpack_1 = loadTexture("/assets/doodle_jetpack_1.png");
    tex_player_jetpack_2 = loadTexture("/assets/doodle_jetpack_2.png");

    tex_plat_green = loadTexture("/assets/platform_green.png");
    tex_plat_blue = loadTexture("/assets/platform_blue.png");
    tex_plat_white = loadTexture("/assets/platform_white.png");
    tex_plat_break_1 = loadTexture("/assets/brown_platform_1.png");
    tex_plat_break_2 = loadTexture("/assets/brown_platform_2.png");
    tex_plat_break_3 = loadTexture("/assets/brown_platform_3.png");

    tex_spring_compressed = loadTexture("/assets/spring_compressed.png");
    tex_spring_full = loadTexture("/assets/spring_full.png");
    tex_trampoline = loadTexture("/assets/trampoline.png");
    tex_trampoline_down = loadTexture("/assets/trampoline_down.png");
    tex_propeller_item = loadTexture("/assets/propeller_hat.png");
    tex_jetpack_item = loadTexture("/assets/jetpack.png");

    tex_game_over = loadTexture("/assets/game_over_overlay.png");
    tex_projectile = loadTexture("/assets/projectile.png");

    newGame();

#ifdef __EMSCRIPTEN__
    emscripten_set_main_loop(mainLoop, 0, 1);
#else
    while (!quitRequested) {
        mainLoop();
        SDL_Delay(16); /* ~60 fps for a native desktop test build */
    }
#endif

    return 0;
}

