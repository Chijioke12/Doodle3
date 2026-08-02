/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'preact/hooks';

export default function App() {
  const [gameLoaded, setGameLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Configure Emscripten Module
    (window as any).Module = {
      canvas: canvasRef.current,
      locateFile: (path: string, prefix: string) => {
        if (path.endsWith('.mem')) return '/game.js.mem';
        if (path.endsWith('.data')) return '/game.data';
        return prefix + path;
      },
      print: (text: string) => console.log('[Emscripten]', text),
      printErr: (text: string) => console.error('[Emscripten]', text),
      onRuntimeInitialized: () => {
        console.log('Emscripten runtime initialized!');
        setGameLoaded(true);
      },
      postRun: [
        () => {
          setGameLoaded(true);
        },
      ],
    };

    const scriptId = 'emscripten-game-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = '/game.js';
      script.async = true;
      script.onerror = () => {
        setLoadError('Failed to load game.js binary.');
      };
      document.body.appendChild(script);
    } else {
      setGameLoaded(true);
    }
  }, []);

  const dispatchKey = (type: 'keydown' | 'keyup', key: string, keyCode: number) => {
    const event = new KeyboardEvent(type, {
      key: key,
      code: key,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    if (canvasRef.current) {
      canvasRef.current.dispatchEvent(event);
    }
  };

  const handleLeftDown = (e: Event) => {
    e.preventDefault();
    dispatchKey('keydown', 'ArrowLeft', 37);
  };

  const handleLeftUp = (e: Event) => {
    e.preventDefault();
    dispatchKey('keyup', 'ArrowLeft', 37);
  };

  const handleRightDown = (e: Event) => {
    e.preventDefault();
    dispatchKey('keydown', 'ArrowRight', 39);
  };

  const handleRightUp = (e: Event) => {
    e.preventDefault();
    dispatchKey('keyup', 'ArrowRight', 39);
  };

  const handleShootDown = (e: Event) => {
    e.preventDefault();
    dispatchKey('keydown', 'Enter', 13);
  };

  const handleShootUp = (e: Event) => {
    e.preventDefault();
    dispatchKey('keyup', 'Enter', 13);
  };

  return (
    <div className="app-container">
      {/* Canvas Target */}
      <div className="canvas-wrapper">
        {!gameLoaded && !loadError && (
          <div className="loading-overlay">
            <div className="loading-text">Loading C/asm.js Binary...</div>
          </div>
        )}
        {loadError && (
          <div className="loading-overlay">
            <div className="loading-text" style={{ color: '#ff6b6b' }}>
              {loadError}
            </div>
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
            onPointerDown={handleLeftDown}
            onPointerUp={handleLeftUp}
            onPointerOut={handleLeftUp}
            onContextMenu={(e) => e.preventDefault()}
            title="Move Left (or Left Arrow / 4)"
          >
            ←
          </button>

          <button
            className="control-btn fire-btn"
            onPointerDown={handleShootDown}
            onPointerUp={handleShootUp}
            onContextMenu={(e) => e.preventDefault()}
            title="Shoot / Restart (Enter / 5)"
          >
            🔥
          </button>

          <button
            className="control-btn"
            onPointerDown={handleRightDown}
            onPointerUp={handleRightUp}
            onPointerOut={handleRightUp}
            onContextMenu={(e) => e.preventDefault()}
            title="Move Right (or Right Arrow / 6)"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

