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
    PLAT_BREAKABLE
} PlatformType;

typedef struct {
    float x, y;
    int   width;
    PlatformType type;
    int   alive;       /* 0 = broken/removed */
    float moveDir;      /* +1 or -1 for moving platforms */
    int   hasSpring;    /* 1 if a spring sits on this platform */
} Platform;

typedef struct {
    float x, y;
    float vx, vy;
    int   facing; /* 1 = right, -1 = left */
    int   shootTimer; /* > 0 when shooting */
} Player;

typedef struct {
    float x, y;
    float vy;
    int active;
} Projectile;

/* ---------- Globals ---------- */
static SDL_Window   *gWindow   = NULL;
static SDL_Renderer *gRenderer = NULL;

static SDL_Texture *tex_player_left = NULL;
static SDL_Texture *tex_player_right = NULL;
static SDL_Texture *tex_player_shoot = NULL;
static SDL_Texture *tex_plat_green = NULL;
static SDL_Texture *tex_plat_blue = NULL;
static SDL_Texture *tex_plat_break = NULL;
static SDL_Texture *tex_spring = NULL;
static SDL_Texture *tex_game_over = NULL;
static SDL_Texture *tex_projectile = NULL;

static Platform platforms[MAX_PLATFORMS];
static Projectile projectiles[MAX_PROJECTILES];
static Player   player;

static float cameraY = 0.0f;     /* world-space Y the camera is looking at (top of screen) */
static float highestY = 0.0f;    /* smallest (highest) player.y ever reached, for scoring */
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
    p->hasSpring = (rand() % 6 == 0); /* ~17% chance */

    int roll = rand() % 100;
    if (roll < 65) {
        p->type = PLAT_NORMAL;
        p->moveDir = 0;
    } else if (roll < 85) {
        p->type = PLAT_MOVING;
        p->moveDir = (rand() % 2 == 0) ? 1.0f : -1.0f;
    } else {
        p->type = PLAT_BREAKABLE;
        p->moveDir = 0;
        p->hasSpring = 0; /* keep breakables simple */
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
            platforms[i].hasSpring = 0;
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
    cameraY = 0.0f;
    highestY = player.y;
    score = 0;
    gameOver = 0;
}

/* Recycle the lowest platform to a new spot above the highest one
 * whenever it scrolls off the bottom of the screen. Keeps exactly
 * MAX_PLATFORMS active at all times without heap allocation. */
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
        } else if (!platforms[i].alive) {
            /* Broken platform: bring it back into rotation from the top */
            float newY = topY - frand(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX);
            spawnPlatform(&platforms[i], newY);
            topY = newY;
        }
    }
}

static void updatePlatforms(void) {
    for (int i = 0; i < MAX_PLATFORMS; i++) {
        Platform *p = &platforms[i];
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
    player.vy += GRAVITY;
    player.y += player.vy;

    /* Collide with platforms only while falling (vy > 0) */
    if (player.vy > 0) {
        for (int i = 0; i < MAX_PLATFORMS; i++) {
            Platform *p = &platforms[i];
            if (!p->alive) continue;

            float feetPrev = player.y + PLAYER_H - player.vy;
            float feetNow  = player.y + PLAYER_H;

            int horizontallyAligned =
                (player.x + PLAYER_W > p->x) && (player.x < p->x + p->width);

            if (horizontallyAligned && feetPrev <= p->y && feetNow >= p->y) {
                /* Landed */
                player.y = p->y - PLAYER_H;

                if (p->hasSpring) {
                    player.vy = SPRING_VELOCITY;
                    p->hasSpring = 0; /* consumed */
                } else {
                    player.vy = JUMP_VELOCITY;
                }

                if (p->type == PLAT_BREAKABLE) {
                    p->alive = 0; /* platform crumbles */
                }
                break;
            }
        }
    }

    /* Camera follows the player upward only (never scrolls back down) */
    if (player.y < highestY) {
        highestY = player.y;
        float desiredCameraY = player.y - SCREEN_H * 0.4f;
        if (desiredCameraY < cameraY) cameraY = desiredCameraY;
        score = (int)((SCREEN_H - 60.0f - highestY) / 10.0f);
        if (score < 0) score = 0;
    }

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
        fprintf(stderr, "Failed to load image %s: %s\n", path, IMG_GetError());
        return NULL;
    }
    SDL_Texture* tex = SDL_CreateTextureFromSurface(gRenderer, surface);
    SDL_FreeSurface(surface);
    return tex;
}

static void drawPlayer(void) {
    float screenY = player.y - cameraY;
    
    SDL_Texture* tex = tex_player_left;
    if (player.shootTimer > 0 && tex_player_shoot) {
        tex = tex_player_shoot;
    } else if (player.facing > 0) {
        tex = tex_player_right;
    }
    
    if (tex) {
        // Player hitbox is 24x24, original image is 80x80. Center it roughly.
        SDL_Rect dest = { (int)player.x - 8, (int)screenY - 16, 40, 40 };
        SDL_RenderCopy(gRenderer, tex, NULL, &dest);
    } else {
        /* Body */
        SDL_SetRenderDrawColor(gRenderer, 60, 200, 90, 255);
        SDL_Rect body = { (int)player.x, (int)screenY, PLAYER_W, PLAYER_H };
        SDL_RenderFillRect(gRenderer, &body);

        /* Simple eyes to show facing direction */
        SDL_SetRenderDrawColor(gRenderer, 255, 255, 255, 255);
        int eyeOffset = (player.facing > 0) ? 12 : 4;
        SDL_Rect eye1 = { (int)player.x + eyeOffset,     (int)screenY + 6, 5, 5 };
        SDL_Rect eye2 = { (int)player.x + eyeOffset + 7, (int)screenY + 6, 5, 5 };
        SDL_RenderFillRect(gRenderer, &eye1);
        SDL_RenderFillRect(gRenderer, &eye2);
    }
}

static void drawPlatform(Platform *p) {
    if (!p->alive) return;
    float screenY = p->y - cameraY;
    if (screenY < -PLATFORM_H || screenY > SCREEN_H) return;

    SDL_Texture* tex = NULL;
    switch (p->type) {
        case PLAT_NORMAL:    tex = tex_plat_green; break;
        case PLAT_MOVING:    tex = tex_plat_blue; break;
        case PLAT_BREAKABLE: tex = tex_plat_break; break;
    }
    
    if (tex) {
        // Platform hitbox is 44x10, original image is 115x32
        SDL_Rect dest = { (int)p->x - 1, (int)screenY - 1, 46, 12 };
        SDL_RenderCopy(gRenderer, tex, NULL, &dest);
    } else {
        switch (p->type) {
            case PLAT_NORMAL:    SDL_SetRenderDrawColor(gRenderer,  40, 180,  70, 255); break;
            case PLAT_MOVING:    SDL_SetRenderDrawColor(gRenderer,  50, 120, 220, 255); break;
            case PLAT_BREAKABLE: SDL_SetRenderDrawColor(gRenderer, 160, 100,  50, 255); break;
        }
        SDL_Rect rect = { (int)p->x, (int)screenY, p->width, PLATFORM_H };
        SDL_RenderFillRect(gRenderer, &rect);
    }

    if (p->hasSpring) {
        if (tex_spring) {
            // Spring hitbox is 10x8, original is 36x28
            SDL_Rect springDest = { (int)p->x + p->width / 2 - 7, (int)screenY - 11, 14, 11 };
            SDL_RenderCopy(gRenderer, tex_spring, NULL, &springDest);
        } else {
            SDL_SetRenderDrawColor(gRenderer, 250, 220, 40, 255);
            SDL_Rect spring = { (int)p->x + p->width / 2 - 5, (int)screenY - 8, 10, 8 };
            SDL_RenderFillRect(gRenderer, &spring);
        }
    }
}

static void drawScore(void) {
    /* Minimal blocky "digit bars" score readout (no font dependency) */
    SDL_SetRenderDrawColor(gRenderer, 20, 20, 20, 255);
    SDL_Rect bar = { 4, 4, 10 + (score % 999) / 2, 6 };
    if (bar.w > 120) bar.w = 120;
    SDL_RenderFillRect(gRenderer, &bar);
}

static void render(void) {
    SDL_SetRenderDrawColor(gRenderer, 205, 235, 250, 255); /* sky */
    SDL_RenderClear(gRenderer);

    for (int i = 0; i < MAX_PLATFORMS; i++) drawPlatform(&platforms[i]);
    
    // Draw projectiles
    for (int i = 0; i < MAX_PROJECTILES; i++) {
        if (projectiles[i].active) {
            float screenY = projectiles[i].y - cameraY;
            if (tex_projectile) {
                SDL_Rect dest = { (int)projectiles[i].x, (int)screenY, 24, 24 };
                SDL_RenderCopy(gRenderer, tex_projectile, NULL, &dest);
            } else {
                SDL_SetRenderDrawColor(gRenderer, 255, 100, 0, 255);
                SDL_Rect proj = { (int)projectiles[i].x, (int)screenY, 10, 10 };
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
            // Original image is 320x120, we can fit it into 160x60
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
                    case SDLK_KP_5:
                    case SDLK_5:
                        if (gameOver) newGame();
                        else shootProjectile();
                        break;
                    default: break;
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
                    default: break;
                }
                break;
        }
    }
}

/* ---------- Main loop ---------- */
static void mainLoop(void) {
    handleEvents();

    if (!gameOver) {
        updateProjectiles();
        updatePlatforms();
        updatePlayer();
        recyclePlatformsIfNeeded();
    }

    render();

#ifndef __EMSCRIPTEN__
    if (quitRequested) {
        SDL_DestroyRenderer(gRenderer);
        SDL_DestroyWindow(gWindow);
        SDL_Quit();
        exit(0);
    }
#endif
}

int main(int argc, char **argv) {
    (void)argc; (void)argv;

    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        fprintf(stderr, "SDL_Init failed: %s\n", SDL_GetError());
        return 1;
    }
    if (!(IMG_Init(IMG_INIT_PNG) & IMG_INIT_PNG)) {
        fprintf(stderr, "IMG_Init failed: %s\n", IMG_GetError());
    }

    gWindow = SDL_CreateWindow(
        "Doodle Jump - KaiOS Edition",
        SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
        SCREEN_W, SCREEN_H, SDL_WINDOW_SHOWN
    );
    gRenderer = SDL_CreateRenderer(gWindow, -1, SDL_RENDERER_ACCELERATED);

    // Load textures
    tex_player_left = loadTexture("/assets/doodle_left.png");
    tex_player_right = loadTexture("/assets/doodle_right.png");
    tex_plat_green = loadTexture("/assets/platform_green.png");
    tex_plat_blue = loadTexture("/assets/platform_blue.png");
    tex_plat_break = loadTexture("/assets/brown_platform_1.png");
    tex_spring = loadTexture("/assets/spring_compressed.png");
    tex_game_over = loadTexture("/assets/game_over_overlay.png");
    tex_projectile = loadTexture("/assets/projectile.png");
    tex_player_shoot = loadTexture("/assets/doodle_shooting.png");

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
