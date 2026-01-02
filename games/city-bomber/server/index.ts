import { WebSocketServer, WebSocket } from 'ws';

interface Player {
  id: string;
  ws: WebSocket;
  position: { x: number; y: number; z: number };
  rotation: number;
  pitch: number;
  speed: number;
  alive: boolean;
  score: number;
  health: number;
}

interface Room {
  id: string;
  players: Map<string, Player>;
  gameStarted: boolean;
}

interface GameMessage {
  type: string;
  playerId?: string;
  roomId?: string;
  data?: unknown;
}

const PORT = 9899;
const rooms = new Map<string, Room>();

const wss = new WebSocketServer({ port: PORT });

console.log(`🎮 City Bomber Server running on port ${PORT}`);

// 玩家ID计数器
let playerIdCounter = 0;

function generatePlayerId(): string {
  // 每个玩家唯一ID
  playerIdCounter++;
  return `player_${playerIdCounter}`;
}

function generateRoomId(): string {
  // 测试阶段固定房间号
  return '1111';
}

function broadcast(room: Room, message: GameMessage, excludeId?: string): void {
  const data = JSON.stringify(message);
  room.players.forEach((player, id) => {
    if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  const playerId = generatePlayerId();
  let currentRoom: Room | null = null;

  console.log(`Player ${playerId} connected`);

  ws.on('message', (rawData: Buffer) => {
    try {
      const message: GameMessage = JSON.parse(rawData.toString());

      switch (message.type) {
        case 'create_room': {
          const roomId = generateRoomId();
          const room: Room = {
            id: roomId,
            players: new Map(),
            gameStarted: false,
          };

          const player: Player = {
            id: playerId,
            ws,
            position: { x: -50, y: 40, z: 0 },
            rotation: 0,
            pitch: 0,
            speed: 30,
            alive: true,
            score: 0,
            health: 10,
          };

          room.players.set(playerId, player);
          rooms.set(roomId, room);
          currentRoom = room;

          ws.send(JSON.stringify({
            type: 'room_created',
            roomId,
            playerId,
            playerNumber: 1,
            health: 10,
          }));

          console.log(`Room ${roomId} created by player ${playerId}`);
          break;
        }

        case 'join_room': {
          const roomId = message.roomId as string;
          const room = rooms.get(roomId);

          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
            break;
          }

          if (room.players.size >= 2) {
            ws.send(JSON.stringify({ type: 'error', message: '房间已满' }));
            break;
          }

          const player: Player = {
            id: playerId,
            ws,
            position: { x: 50, y: 40, z: 0 },
            rotation: Math.PI,
            pitch: 0,
            speed: 30,
            alive: true,
            score: 0,
            health: 10,
          };

          room.players.set(playerId, player);
          currentRoom = room;

          ws.send(JSON.stringify({
            type: 'room_joined',
            roomId,
            playerId,
            playerNumber: 2,
            health: 10,
          }));

          // 通知房主
          broadcast(room, {
            type: 'player_joined',
            playerId,
          }, playerId);

          // 如果有两个玩家，开始游戏
          if (room.players.size === 2) {
            room.gameStarted = true;
            // 发送给所有人（不排除任何人）
            const startMsg = JSON.stringify({ type: 'game_start' });
            for (const [, player] of room.players) {
              if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(startMsg);
              }
            }
            console.log(`Game started in room ${roomId}`);
          }

          console.log(`Player ${playerId} joined room ${roomId}`);
          break;
        }

        case 'player_update': {
          if (!currentRoom) break;

          const player = currentRoom.players.get(playerId);
          if (!player) break;

          const updateData = message.data as {
            position: { x: number; y: number; z: number };
            rotation: number;
            pitch: number;
            speed: number;
          };

          player.position = updateData.position;
          player.rotation = updateData.rotation;
          player.pitch = updateData.pitch;
          player.speed = updateData.speed;

          broadcast(currentRoom, {
            type: 'player_state',
            playerId,
            data: updateData,
          }, playerId);
          break;
        }

        case 'fire_bullet': {
          if (!currentRoom) break;

          broadcast(currentRoom, {
            type: 'bullet_fired',
            playerId,
            data: message.data,
          }, playerId);
          break;
        }

        case 'drop_bomb': {
          if (!currentRoom) break;

          broadcast(currentRoom, {
            type: 'bomb_dropped',
            playerId,
            data: message.data,
          }, playerId);
          break;
        }

        case 'player_hit': {
          if (!currentRoom) break;

          const attacker = currentRoom.players.get(playerId);
          if (!attacker) break;

          // 找到对方玩家
          let targetPlayer: Player | undefined;
          for (const [id, player] of currentRoom.players) {
            if (id !== playerId) {
              targetPlayer = player;
              break;
            }
          }

          if (targetPlayer) {
            targetPlayer.health -= 1;
            attacker.score += 100;

            // 广播血量更新
            broadcast(currentRoom, {
              type: 'player_damaged',
              playerId: targetPlayer.id,
              data: {
                health: targetPlayer.health,
                attackerId: playerId,
              },
            });

            console.log(`Player ${targetPlayer.id} hit by ${playerId}, health: ${targetPlayer.health}`);

            // 如果血量归零
            if (targetPlayer.health <= 0) {
              targetPlayer.alive = false;
              attacker.score += 1000;

              broadcast(currentRoom, {
                type: 'player_killed',
                playerId: targetPlayer.id,
                data: { killerId: playerId, score: attacker.score },
              });

              // 2秒后复活
              const roomRef = currentRoom;
              setTimeout(() => {
                if (targetPlayer && roomRef) {
                  targetPlayer.health = 10;
                  targetPlayer.alive = true;
                  broadcast(roomRef, {
                    type: 'player_respawn',
                    playerId: targetPlayer.id,
                    data: { health: 10 },
                  });
                }
              }, 2000);

              console.log(`Player ${targetPlayer.id} killed by ${playerId}`);
            }
          }
          break;
        }

        case 'building_destroyed': {
          if (!currentRoom) break;

          const player = currentRoom.players.get(playerId);
          if (player) {
            const scoreData = message.data as { score: number };
            player.score += scoreData.score;
          }

          broadcast(currentRoom, {
            type: 'building_destroyed',
            playerId,
            data: message.data,
          }, playerId);
          break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Player ${playerId} disconnected`);

    if (currentRoom) {
      currentRoom.players.delete(playerId);

      broadcast(currentRoom, {
        type: 'player_left',
        playerId,
      });

      if (currentRoom.players.size === 0) {
        rooms.delete(currentRoom.id);
        console.log(`Room ${currentRoom.id} deleted`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error(`Player ${playerId} error:`, error);
  });
});
