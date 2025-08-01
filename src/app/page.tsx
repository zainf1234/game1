'use client';

import React, { useState, useEffect, useRef } from 'react';

type Level = {
  id: number;
  name: string;
  width: number;
  height: number;
  platforms: { x: number; y: number; width: number; height: number }[];
  coins: { x: number; y: number }[];
  enemies: { x: number; y: number }[];
};

const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Level 1',
    width: 800,
    height: 400,
    platforms: [
      { x: 0, y: 380, width: 800, height: 20 }, // ground
      { x: 300, y: 320, width: 100, height: 10 },
    ],
    coins: [
      { x: 200, y: 300 },
      { x: 350, y: 250 },
      { x: 700, y: 300 },
    ],
    enemies: [{ x: 450, y: 350 }],
  },
  {
    id: 2,
    name: 'Level 2',
    width: 1000,
    height: 400,
    platforms: [
      { x: 0, y: 380, width: 1000, height: 20 },
      { x: 450, y: 320, width: 120, height: 10 },
      { x: 750, y: 280, width: 100, height: 10 },
    ],
    coins: [
      { x: 150, y: 300 },
      { x: 500, y: 300 },
      { x: 800, y: 300 },
    ],
    enemies: [
      { x: 600, y: 350 },
      { x: 900, y: 350 },
    ],
  },
];

const PLAYER_SIZE = 30;
const GRAVITY = 0.8;
const JUMP_VELOCITY = -15;
const MOVE_SPEED = 6;

export default function Home() {
  // Game modes: level-select, playing, game-over
  const [mode, setMode] = useState<'level-select' | 'playing' | 'game-over'>(
    'level-select'
  );

  // Levels unlocked (start with level 1)
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

  // Player state
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 0 });
  const [playerVel, setPlayerVel] = useState({ x: 0, y: 0 });
  const [onGround, setOnGround] = useState(false);
  const [lives, setLives] = useState(3);
  const [coinsCollected, setCoinsCollected] = useState<number[]>([]);
  const [enemies, setEnemies] = useState<
    { x: number; y: number; alive: boolean }[]
  >([]);

  // Keyboard input tracking
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const level = LEVELS.find((lvl) => lvl.id === selectedLevelId) || null;

  // Reset game when starting a level
  useEffect(() => {
    if (mode === 'playing' && level) {
      setPlayerPos({ x: 50, y: 0 });
      setPlayerVel({ x: 0, y: 0 });
      setLives(3);
      setCoinsCollected([]);
      setEnemies(level.enemies.map((e) => ({ ...e, alive: true })));
      setOnGround(false);
    }
  }, [mode, level]);

  // Keyboard listeners
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
      // Update velocities
      setPlayerVel((prev) => {
        let newX = 0;
        let newY = prev.y + GRAVITY;

        if (keysPressed.current['ArrowLeft']) newX = -MOVE_SPEED;
        else if (keysPressed.current['ArrowRight']) newX = MOVE_SPEED;

        // Jump if space or up arrow AND on ground
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

        // Keep player inside level horizontal bounds
        if (newX < 0) newX = 0;
        if (level && newX > level.width - PLAYER_SIZE)
          newX = level.width - PLAYER_SIZE;

        // Platform collision detection
        let grounded = false;
        let hitCeiling = false;

        for (const plat of level.platforms) {
          // Check horizontal overlap
          const horizontalOverlap =
            newX + PLAYER_SIZE > plat.x && newX < plat.x + plat.width;

          if (horizontalOverlap) {
            // Landing on top of platform
            if (
              prev.y + PLAYER_SIZE <= plat.y && // was above platform
              newY + PLAYER_SIZE >= plat.y && // now at or below platform top
              playerVel.y >= 0 // falling or stationary
            ) {
              newY = plat.y - PLAYER_SIZE;
              grounded = true;
              hitCeiling = false;
            }
            // Hitting bottom of platform
            else if (
              prev.y >= plat.y + plat.height && // was below platform bottom
              newY <= plat.y + plat.height && // now inside or above bottom
              playerVel.y < 0 // moving up
            ) {
              newY = plat.y + plat.height + 0.5; // push just below platform
              hitCeiling = true;
            }
          }
        }

        // Ground boundary
        if (level && newY > level.height - PLAYER_SIZE) {
          newY = level.height - PLAYER_SIZE;
          grounded = true;
          hitCeiling = false;
        }

        if (hitCeiling) {
          // Cancel upward velocity on hitting bottom
          setPlayerVel((vel) => ({ ...vel, y: 0 }));
        }

        setOnGround(grounded);

        return { x: newX, y: newY };
      });

      // Check coins collected
      if (level) {
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

      // Enemy collisions
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
            // bounce player upward a bit
            setPlayerVel((vel) => ({ ...vel, y: JUMP_VELOCITY / 2 }));
          } else {
            // hit by enemy, lose life & reset player position
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

      // Check level completion: all coins collected & all enemies dead
      if (
        level &&
        coinsCollected.length === level.coins.length &&
        enemies.every((e) => !e.alive)
      ) {
        // Unlock next level if any
        setUnlockedLevels((prev) => {
          if (
            !prev.includes(level.id + 1) &&
            LEVELS.some((l) => l.id === level.id + 1)
          ) {
            return [...prev, level.id + 1];
          }
          return prev;
        });
        // Back to level select screen
        setSelectedLevelId(null);
        setMode('level-select');
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationFrameId);
  }, [playerPos, playerVel, coinsCollected, enemies, onGround, level, mode]);

  // Render UI

  if (mode === 'level-select') {
    return (
      <main className="level-select">
        <h1>Circle Platformer — Select Level</h1>
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
            if (level) {
              setLives(3);
              setPlayerPos({ x: 50, y: 0 });
              setPlayerVel({ x: 0, y: 0 });
              setCoinsCollected([]);
              setEnemies(level.enemies.map((e) => ({ ...e, alive: true })));
              setOnGround(false);
              setMode('playing');
            } else {
              setMode('level-select');
            }
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

  // Actual game screen rendering
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
        {/* Platforms */}
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

        {/* Coins */}
        {level?.coins.map((coin, i) =>
          coinsCollected.includes(i) ? null : (
            <div
              key={i}
              className="coin"
              style={{ left: coin.x, top: coin.y, width: 20, height: 20 }}
            />
          )
        )}

        {/* Enemies */}
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

        {/* Player */}
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
