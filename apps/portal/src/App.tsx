import { For } from "solid-js";
import { GameCard } from "./components/GameCard";
import { AddGameCard } from "./components/AddGameCard";
import type { GameInfo } from "./types";

// 游戏列表 - 添加新游戏时在这里注册
const games: GameInfo[] = [
  {
    id: "catch-the-stars",
    title: "接星星",
    description: "用键盘左右移动篮子，接住从天上掉下来的星星！",
    emoji: "⭐",
    difficulty: "⭐",
    color: "#ffd700",
    port: 3001,
  },
  {
    id: "flappy-bird",
    title: "Flappy Bird",
    description: "按空格键控制小鸟飞行，躲避障碍物！",
    emoji: "🐦",
    difficulty: "⭐⭐",
    color: "#48dbfb",
    port: 3002,
  },
];

export default function App() {
  return (
    <div class="container">
      <h1>🎮 游戏乐园</h1>
      <p class="subtitle">和 AI 一起创造属于你的游戏世界！</p>

      <div class="games-grid">
        <For each={games}>{(game) => <GameCard game={game} />}</For>
        <AddGameCard />
      </div>
    </div>
  );
}
