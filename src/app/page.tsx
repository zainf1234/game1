'use client';

import React, { useEffect, useState, useRef } from 'react';

type Level = {
  id: number;
  name: string;
  coins: { x: number; y: number }[];
  enemies: { x: number; y: number }[];
  platforms: { x: number; y: number; width: number; height: number }[];
  width: number;
  height: number;
};

const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Level 1',
    width: 800,
    height: 400,
    coins: [
      { x: 200, y: 300 },
      { x: 350, y: 250 },
      { x: 700, y: 300 },
    ],
    enemies: [{ x: 450, y: 350 }],
    platforms: [
      { x: 0, y: 380, width: 800, height: 20 }, // ground
      { x: 300, y: 320, width: 100, height: 10 },
    ],
  },
  {
    id: 2,
    name: 'Level 2',
    width: 1000,
    height: 400,
    coins: [
      { x: 150, y: 300 },
      { x: 500, y: 300 },
      { x: 800, y: 300 },
    ],
    enemies: [{ x: 600, y: 350 }, { x: 900, y: 350 }],
    platforms: [
      { x: 0, y: 380, width: 1000, height: 20 }, // ground
      { x: 450, y: 320, width: 120, height: 10 },
      { x: 750, y: 280, width: 100, height: 10 },
    ],
  },
];

const PLAYER_SIZE = 30;
const GRAVITY = 0.8;
const JUMP_VELOCITY = -15;
const MOVE_SPEED = 6;

export default function Home() {
  const [mode, setMode] = useState<'level-select' | 'playing' | 'game-over'>(
    'level-select'
  );
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

  const [playerPos, setPlayerPos] = useState({ x: 50, y: 0 });
  const [playerVel, setPlayerVel] = useState({ x: 0, y: 0 });
  const [onGround, setOnGround] = useState(false);
  const [lives, setLives] = useState(3);
  const [coinsCollected, setCoinsCollected] = useState<number[]>([]);
  const [enemies, setEnemies] = useState<
    { x: number; y: number; alive: boolean }[]
  >([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const level = LEVELS.find((lvl) => lvl.id === selectedLevelId) || null;

  // Reset game state on level start
  useEffect(() => {
    if (mode === 'playing' && level) {
      setPlayerPos({ x: 50, y: 0 });
      setPlayerVel({ x: 0, y: 0 });
      setLives(3);
      setCoinsCollected([]);
      setEnemies(level.enemies.map((e) => ({ ...e, alive: true })));
    }
  }, [mode, level]);

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      if (['ArrowLeft', 'ArrowRight', ' ', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (!level || mode !== 'playing') return;

    let animationFrameId: number;

    const update = () => {
      // Update horizontal velocity
      setPlayerVel((prev) => {
        let newX = 0;
        let newY = prev.y + GRAVITY;

        if (keysPressed.current['ArrowLeft']) newX = -MOVE_SPEED;
        else if (keysPressed.current['ArrowRight']) newX = MOVE_SPEED;

        // Jump: space OR arrow up, only if on ground
        if (
          (keysPressed.current[' '] || keysPressed.current['ArrowUp']) &&
          onGround
        ) {
          newY = JUMP_VELOCITY;
          setOnGround(false);
        }

        return { x: newX, y: newY };
      });

      setPlayerPos((prev) => {
        let newX = prev.x + playerVel.x;
        let newY = prev.y + playerVel.y;

        // Boundaries left and right
        if (newX < 0) newX = 0;
        if (newX > level.width - PLAYER_SIZE)
          newX = level.width - PLAYER_SIZE;

        // Platform collisions: check vertical collisions separately for top and bottom
        let grounded = false;
        let hitCeiling = false;

        for (const plat of level.platforms) {
          // Horizontal overlap?
          const horizontalOverlap =
            newX + PLAYER_SIZE > plat.x && newX < plat.x + plat.width;

          if (horizontalOverlap) {
            // Check if landing on platform top (falling down)
            if (
              prev.y + PLAYER_SIZE <= plat.y && // previously above platform
              newY + PLAYER_SIZE >= plat.y && // now below or at platform top
              playerVel.y >= 0 // moving down or stationary
            ) {
              newY = plat.y - PLAYER_SIZE;
              grounded = true;
              hitCeiling = false;
            }
            // Check if hitting bottom of platform (jumping up)
            else if (
              prev.y >= plat.y + plat.height && // previously below platform bottom
              newY <= plat.y + plat.height && // now inside or above bottom
              playerVel.y < 0 // moving up
            ) {
              newY = plat.y + plat.height + 0.5; // push player just below platform
              hitCeiling = true;
            }
          }
        }

        // Ground floor
        if (newY > level.height - PLAYER_SIZE) {
          newY = level.height - PLAYER_SIZE;
          grounded = true;
          hitCeiling = false;
        }

        if (hitCeiling) {
          // Cancel upward velocity if hitting bottom of platform
          setPlayerVel((vel) => ({ ...vel, y: 0 }));
        }

        setOnGround(grounded);

        return { x: newX, y: newY };
      });

      // Coins collision
      if (level.coins.length > 0) {
        level.coins.forEach((coin, i) => {
          if (
            !coinsCollected.includes(i) &&
            playerPos.x + PLAYER_SIZE > coin.x &&
            playerPos.x < coin.x + 20 &&
            playerPos.y + PLAYER_SIZE > coin.y &&
            playerPos.y < coin.y + 20
          ) {
            setCoinsCollected((prev) => [...prev, i]);
          }
        });
      }

      // Enemies collision
      enemies.forEach((enemy, i) => {
        if (!enemy.alive) return;

        const enemyBox = { x: enemy.x, y: enemy.y, width: 30, height: 30 };
        const playerBox = {
          x: playerPos.x,
          y: playerPos.y,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
        };

        const isColliding =
          playerBox.x < enemyBox.x + enemyBox.width &&
          playerBox.x + playerBox.width > enemyBox.x &&
          playerBox.y < enemyBox.y + enemyBox.height &&
          playerBox.y + playerBox.height > enemyBox.y;

        if (isColliding) {
          if (playerVel.y > 0 && playerPos.y + PLAYER_SIZE <= enemy.y + 10) {
            // stomp enemy
            setEnemies((prev) =>
              prev.map((e, idx) => (idx === i ? { ...e, alive: false } : e))
            );
            setPlayerVel((vel) => ({ ...vel, y: JUMP_VELOCITY / 2 }));
          } else {
            // hit by enemy, lose a life and reset position
            setLives((l) => {
              const newLives = l - 1;
              if (newLives <= 0) {
                setMode('game-over');
              }
              return newLives;
            });
            setPlayerPos({ x: 50, y: 0 });
            setPlayerVel({ x: 0, y: 0 });
          }
        }
      });

      // Level complete check
      if (
        coinsCollected.length === level.coins.length &&
        enemies.every((e) => !e.alive)
      ) {
        setUnlockedLevels((prev) => {
          if (
            !prev.includes(level.id + 1) &&
            LEVELS.some((l) => l.id === level.id + 1)
          ) {
            return [...prev, level.id + 1];
          }
          return prev;
        });
        setSelectedLevelId(null);
        setMode('level-select');
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationFrameId);
  }, [playerPos, playerVel, coinsCollected, enemies, onGround, level, mode]);

  if (mode === 'level-select') {
    return (
      <main className="level-select">
        <h1>Circle Platformer - Select Level</h1>
        <ul>
          {LEVELS.map((lvl) => (
            <li key={lvl.id}>
              <button
                disabled={!unlockedLevels.includes(lvl.id)}
                onClick={() => {
                  setSelectedLevelId(lvl.id);
                  setMode('playing');
                }}
              >
                {lvl.name} {unlockedLevels.includes(lvl.id) ? '' : '(Locked)'}
              </button>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  if (mode === 'game-over') {
    return (
      <main className="game-over">
        <h1>Game Over</h1>
        <button
          onClick={() => {
            setLives(3);
            setPlayerPos({ x: 50, y: 0 });
            setPlayerVel({ x: 0, y: 0 });
            setCoinsCollected([]);
            setEnemies(level ? level.enemies.map((e) => ({ ...e, alive: true })) : []);
            setMode('playing');
          }}
        >
          Restart Level
        </button>
        <button
          onClick={() => {
            setMode('level-select');
            setSelectedLevelId(null);
          }}
        >
          Back to Level Select
        </button>
      </main>
    );
  }

  return (
    <main
      className="game-screen"
      style={{ width: level?.width, height: level?.height }}
    >
      <div className="hud">
        <div>Lives: {lives}</div>
        <div>
          Coins: {coinsCollected.length} / {level?.coins.length}
        </div>
      </div>
      <div
        className="game-area"
        style={{ width: level?.width, height: level?.height }}
      >
        {level?.platforms.map((plat, i) => (
          <div
            key={i}
            className="platform"
            style={{
              left: plat.x,
              top: plat.y,
              width: plat.width,
              height: plat.height,
            }}
          />
        ))}

        {level?.coins.map((coin, i) => {
          if (coinsCollected.includes(i)) return null;
          return (
            <div
              key={i}
              className="coin"
              style={{ left: coin.x, top: coin.y, width: 20, height: 20 }}
            />
          );
        })}

        {enemies.map(
          (enemy, i) =>
            enemy.alive && (
              <div
                key={i}
                className="enemy"
                style={{ left: enemy.x, top: enemy.y, width: 30, height: 30 }}
              />
            )
        )}

        <div
          className="player"
          style={{
            left: playerPos.x,
            top: playerPos.y,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
          }}
        />
      </div>
    </main>
  );
}
