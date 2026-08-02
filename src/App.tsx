/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'preact/hooks';
import { GAME_ASSETS } from './assets.ts';

import { GAME_DATA_BASE64 } from './gameData.ts';

export default function App() {
  const [gameLoaded, setGameLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Auto-load game script on mount
    if (!document.querySelector('script[src*="game.js"]') && canvasRef.current) {
      
      const loadImages = async () => {
        const preloadedCanvases: Record<string, HTMLCanvasElement> = {};
        
        for (const [key, base64] of Object.entries(GAME_ASSETS)) {
          try {
            await new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.src = base64;
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                }
                preloadedCanvases[`/assets/${key}.png`] = canvas;
                resolve();
              };
              img.onerror = reject;
            });
          } catch (err) {
            console.error(`Failed to preload image: ${key}`, err);
          }
        }
        
        // Convert base64 to ArrayBuffer
        const binaryString = window.atob(GAME_DATA_BASE64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const buffer = bytes.buffer;
        
        const canvasElem = canvasRef.current || (document.getElementById('canvas') as HTMLCanvasElement);
        (window as any).Module = {
          noImageDecoding: true,
          canvas: canvasElem,
          print: (text: string) => console.log(text),
          printErr: (text: string) => console.error(text),
          getPreloadedPackage: (remotePackageName: string, remotePackageSize: number) => {
            return buffer;
          },
          preRun: [() => {
            const b = (window as any).Browser || (window as any).Module?.Browser;
            if (b) {
              b.preloadedImages = b.preloadedImages || {};
              Object.assign(b.preloadedImages, preloadedCanvases);
              console.log("Successfully injected preloaded images into Browser object.");
            } else {
              console.warn("Browser object not initialized in preRun yet.");
            }
          }]
        };
        
        // Dynamically import src/game.js so Vite and @vitejs/plugin-legacy process it
        try {
          await import('./game.js');
          setGameLoaded(true);
        } catch (err) {
          console.error("Error loading game.js:", err);
          setGameLoaded(true);
        }
      };
      
      loadImages();
    } else {
      setGameLoaded(true);
    }
  }, []);

  // Helper to simulate key presses for game controls
  const simulateKeyEvent = (type: 'keydown' | 'keyup', key: string, keyCode: number, code: string) => {
    const event = new KeyboardEvent(type, {
      key: key,
      keyCode: keyCode,
      code: code,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    if (canvasRef.current) {
      canvasRef.current.dispatchEvent(event);
    }
  };

  const handleControlDown = (key: string, keyCode: number, code: string) => (e: Event) => {
    e.preventDefault();
    simulateKeyEvent('keydown', key, keyCode, code);
  };

  const handleControlUp = (key: string, keyCode: number, code: string) => (e: Event) => {
    e.preventDefault();
    simulateKeyEvent('keyup', key, keyCode, code);
  };

  return (
    <div className="app-container">
      {/* Canvas Target */}
      <div className="canvas-wrapper">
        {!gameLoaded && (
          <div className="loading-overlay">
            <div className="loading-text">Loading Game...</div>
          </div>
        )}
        <canvas 
          id="canvas"
          ref={canvasRef}
          width="240" 
          height="320" 
          className="game-canvas"
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* On-screen Controls */}
      <div className="controls-container">
        <div className="controls-row">
          <button
            className="control-btn"
            onPointerDown={handleControlDown('ArrowLeft', 37, 'ArrowLeft')}
            onPointerUp={handleControlUp('ArrowLeft', 37, 'ArrowLeft')}
            onPointerOut={handleControlUp('ArrowLeft', 37, 'ArrowLeft')}
            onContextMenu={(e) => e.preventDefault()}
          >
            ←
          </button>
          
          <button
            className="control-btn"
            onPointerDown={handleControlDown('Enter', 13, 'Enter')}
            onPointerUp={handleControlUp('Enter', 13, 'Enter')}
            onPointerOut={handleControlUp('Enter', 13, 'Enter')}
            onContextMenu={(e) => e.preventDefault()}
          >
            🔥
          </button>

          <button
            className="control-btn"
            onPointerDown={handleControlDown('ArrowRight', 39, 'ArrowRight')}
            onPointerUp={handleControlUp('ArrowRight', 39, 'ArrowRight')}
            onPointerOut={handleControlUp('ArrowRight', 39, 'ArrowRight')}
            onContextMenu={(e) => e.preventDefault()}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
