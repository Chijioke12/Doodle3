/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'preact/hooks';
import { DoodleJumpEngine, GameState } from './gameEngine';

export default function App() {
  const [gameLoaded, setGameLoaded] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: 0,
    gameOver: false,
    paused: false,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DoodleJumpEngine | null>(null);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new DoodleJumpEngine(canvasRef.current, (state) => {
        setGameState(state);
      });
      setGameLoaded(true);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  const handleLeftDown = (e: Event) => {
    e.preventDefault();
    if (engineRef.current) engineRef.current.setLeftKey(true);
  };

  const handleLeftUp = (e: Event) => {
    e.preventDefault();
    if (engineRef.current) engineRef.current.setLeftKey(false);
  };

  const handleRightDown = (e: Event) => {
    e.preventDefault();
    if (engineRef.current) engineRef.current.setRightKey(true);
  };

  const handleRightUp = (e: Event) => {
    e.preventDefault();
    if (engineRef.current) engineRef.current.setRightKey(false);
  };

  const handleShoot = (e: Event) => {
    e.preventDefault();
    if (engineRef.current) engineRef.current.shoot();
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
            onPointerDown={handleShoot}
            onContextMenu={(e) => e.preventDefault()}
            title="Shoot / Restart (Enter / 5)"
          >
            {gameState.gameOver ? '🔄' : '🔥'}
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
