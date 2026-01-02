export function AddGameCard() {
  const handleClick = () => {
    alert(
      "💡 创建新游戏：\n\n" +
        "1. 在终端运行: bun run new 游戏名称\n" +
        "2. 打开 games/游戏名称/src/main.ts\n" +
        "3. 告诉 AI 你想做什么游戏！"
    );
  };

  return (
    <div class="game-card add-game" onClick={handleClick}>
      <div class="add-icon">➕</div>
      <div class="add-text">创建新游戏</div>
      <p class="add-hint">告诉 AI 你想做什么游戏</p>
    </div>
  );
}
