type MessageHandler = (data: unknown) => void;

interface NetworkMessage {
  type: string;
  playerId?: string;
  roomId?: string;
  data?: unknown;
}

export class NetworkManager {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private serverUrl: string;

  playerId: string | null = null;
  roomId: string | null = null;
  playerNumber: number = 0;
  isHost: boolean = false;
  connected: boolean = false;

  constructor(serverUrl?: string) {
    // 自动使用当前页面的主机地址
    const host = window.location.hostname || 'localhost';
    this.serverUrl = serverUrl || `ws://${host}:9899`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.connected = true;
          console.log('Connected to server');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: NetworkMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.ws.onclose = () => {
          this.connected = false;
          console.log('Disconnected from server');
          this.emit('disconnected', null);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'room_created':
        this.roomId = message.roomId ?? null;
        this.playerId = message.playerId ?? null;
        this.playerNumber = (message as unknown as { playerNumber: number }).playerNumber;
        this.isHost = true;
        break;

      case 'room_joined':
        this.roomId = message.roomId ?? null;
        this.playerId = message.playerId ?? null;
        this.playerNumber = (message as unknown as { playerNumber: number }).playerNumber;
        this.isHost = false;
        break;
    }

    this.emit(message.type, message);
  }

  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(type: string, data: unknown): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  send(message: NetworkMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  createRoom(): void {
    this.send({ type: 'create_room' });
  }

  joinRoom(roomId: string): void {
    this.send({ type: 'join_room', roomId });
  }

  sendPlayerUpdate(data: {
    position: { x: number; y: number; z: number };
    rotation: number;
    pitch: number;
    speed: number;
  }): void {
    this.send({ type: 'player_update', data });
  }

  sendBulletFired(data: {
    position: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
  }): void {
    this.send({ type: 'fire_bullet', data });
  }

  sendBombDropped(data: {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
  }): void {
    this.send({ type: 'drop_bomb', data });
  }

  sendPlayerHit(targetId: string): void {
    this.send({ type: 'player_hit', data: { targetId } });
  }

  sendBuildingDestroyed(data: { buildingIndex: number; score: number }): void {
    this.send({ type: 'building_destroyed', data });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
