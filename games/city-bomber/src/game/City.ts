import * as THREE from 'three';
import { Building } from './Building';

export class City {
  buildings: Building[] = [];
  group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.generate();
  }

  generate(): void {
    const gridSize = 32;
    const spacing = 10;
    const offset = (gridSize * spacing) / 2;

    // 丰富多彩的建筑颜色
    const colors = [
      // 蓝色系
      0x4a90d9, 0x2c5aa0, 0x1e3a5f, 0x5ba3e0,
      // 红色/橙色系
      0xc94c4c, 0xe07b53, 0xb85450, 0xd4724e,
      // 绿色系
      0x4a9b6e, 0x2d6e4f, 0x5cb87a, 0x3d8b5f,
      // 黄色/米色系
      0xd4a84b, 0xc9b896, 0xe8d4a8, 0xbfa76f,
      // 紫色系
      0x7b5ea7, 0x9370db, 0x6a4c93,
      // 青色系
      0x4db6ac, 0x26a69a, 0x00897b,
      // 灰色系（保留一些现代感）
      0x78909c, 0x607d8b, 0x546e7a
    ];

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (Math.random() > 0.02) {
          const x = i * spacing - offset + (Math.random() - 0.5) * 2;
          const z = j * spacing - offset + (Math.random() - 0.5) * 2;

          const width = 2 + Math.random() * 3;
          const depth = 2 + Math.random() * 3;
          const height = 5 + Math.random() * 30;
          const color = colors[Math.floor(Math.random() * colors.length)];

          const building = new Building(x, z, width, depth, height, color);
          this.buildings.push(building);
          this.group.add(building.group);
        }
      }
    }
  }

  destroyBuilding(building: Building): void {
    building.destroyed = true;
    this.group.remove(building.group);
    building.mesh.geometry.dispose();
    (building.mesh.material as THREE.Material).dispose();
  }

  getActiveBuildings(): Building[] {
    return this.buildings.filter(b => !b.destroyed);
  }

  getTotalBuildings(): number {
    return this.buildings.length;
  }

  getDestroyedCount(): number {
    return this.buildings.filter(b => b.destroyed).length;
  }
}
