import type { GameInfo } from "../types";

interface Props {
  game: GameInfo;
}

export function GameCard(props: Props) {
  const { game } = props;
  const gameUrl = import.meta.env.DEV
    ? `http://localhost:${game.port}`
    : `/games/${game.id}/`;

  return (
    <div class="game-card">
      <div
        class="game-preview"
        style={{
          background: `linear-gradient(135deg, ${game.color}33, ${game.color}11)`,
        }}
      >
        {game.emoji}
      </div>
      <div class="game-info">
        <h3 class="game-title">{game.title}</h3>
        <p class="game-desc">{game.description}</p>
        <div class="difficulty">难度: {game.difficulty}</div>
        <a href={gameUrl} class="play-btn" target="_blank" rel="noreferrer">
          开始游戏
        </a>
      </div>
    </div>
  );
}
