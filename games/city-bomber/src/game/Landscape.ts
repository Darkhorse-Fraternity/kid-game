import * as THREE from 'three';

export class Landscape {
  group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.createMountains();
    this.createLake();
    this.createBridge();
  }

  private createMountains(): void {
    const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x5a6e4a });
    const snowMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x7a7a7a });

    // 在湖泊周围创建山脉（避开桥的位置 z=-10 到 z=10）
    const mountainData = [
      // 北侧山脉 (z > 0)
      { x: -40, z: 80, height: 45, radius: 25 },
      { x: 0, z: 100, height: 60, radius: 30 },
      { x: 40, z: 85, height: 50, radius: 28 },
      { x: -70, z: 70, height: 35, radius: 20 },
      { x: 70, z: 75, height: 40, radius: 22 },
      // 南侧山脉 (z < 0)
      { x: -45, z: -80, height: 50, radius: 26 },
      { x: 5, z: -95, height: 55, radius: 28 },
      { x: 50, z: -85, height: 45, radius: 24 },
      { x: -75, z: -65, height: 38, radius: 20 },
      { x: 75, z: -70, height: 42, radius: 22 },
    ];

    for (const data of mountainData) {
      const mountainGroup = new THREE.Group();

      // 主山体 - 锥形
      const geometry = new THREE.ConeGeometry(data.radius, data.height, 8);
      const mountain = new THREE.Mesh(geometry, mountainMaterial);
      mountain.position.y = data.height / 2;
      mountain.castShadow = true;
      mountain.receiveShadow = true;
      mountainGroup.add(mountain);

      // 雪顶
      if (data.height > 40) {
        const snowGeometry = new THREE.ConeGeometry(data.radius * 0.3, data.height * 0.2, 8);
        const snow = new THREE.Mesh(snowGeometry, snowMaterial);
        snow.position.y = data.height * 0.9;
        mountainGroup.add(snow);
      }

      // 随机添加岩石
      for (let i = 0; i < 3; i++) {
        const rockSize = 3 + Math.random() * 5;
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(rockSize, 0),
          rockMaterial
        );
        const angle = Math.random() * Math.PI * 2;
        const dist = data.radius * 0.6 + Math.random() * data.radius * 0.3;
        rock.position.set(
          Math.cos(angle) * dist,
          rockSize * 0.5,
          Math.sin(angle) * dist
        );
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        mountainGroup.add(rock);
      }

      mountainGroup.position.set(data.x, 0, data.z);
      this.group.add(mountainGroup);
    }

    // 添加一些小山丘填充空隙
    const hillMaterial = new THREE.MeshLambertMaterial({ color: 0x4a5e3a });
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 40;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // 避开桥的区域
      if (Math.abs(z) < 15) continue;

      const hillHeight = 10 + Math.random() * 20;
      const hillRadius = 8 + Math.random() * 12;
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(hillRadius, hillHeight, 6),
        hillMaterial
      );
      hill.position.set(x, hillHeight / 2, z);
      hill.castShadow = true;
      this.group.add(hill);
    }
  }

  private createLake(): void {
    // 湖泊 - 放在两座城市之间
    const lakeShape = new THREE.Shape();

    // 创建不规则湖泊形状
    lakeShape.moveTo(0, -30);
    lakeShape.bezierCurveTo(40, -35, 50, -10, 45, 20);
    lakeShape.bezierCurveTo(40, 40, 10, 50, -20, 45);
    lakeShape.bezierCurveTo(-50, 40, -55, 10, -50, -15);
    lakeShape.bezierCurveTo(-45, -35, -20, -40, 0, -30);

    const lakeGeometry = new THREE.ShapeGeometry(lakeShape);
    const lakeMaterial = new THREE.MeshLambertMaterial({
      color: 0x2277aa,
      transparent: true,
      opacity: 0.8
    });

    const lake = new THREE.Mesh(lakeGeometry, lakeMaterial);
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(0, 0.2, 0);
    lake.receiveShadow = true;
    this.group.add(lake);

    // 湖泊边缘 - 沙滩
    const beachShape = new THREE.Shape();
    beachShape.moveTo(0, -35);
    beachShape.bezierCurveTo(45, -40, 55, -12, 50, 22);
    beachShape.bezierCurveTo(45, 45, 12, 55, -22, 50);
    beachShape.bezierCurveTo(-55, 45, -60, 12, -55, -17);
    beachShape.bezierCurveTo(-50, -40, -22, -45, 0, -35);

    // 挖掉湖泊中心
    const holeShape = new THREE.Shape();
    holeShape.moveTo(0, -30);
    holeShape.bezierCurveTo(40, -35, 50, -10, 45, 20);
    holeShape.bezierCurveTo(40, 40, 10, 50, -20, 45);
    holeShape.bezierCurveTo(-50, 40, -55, 10, -50, -15);
    holeShape.bezierCurveTo(-45, -35, -20, -40, 0, -30);
    beachShape.holes.push(holeShape);

    const beachGeometry = new THREE.ShapeGeometry(beachShape);
    const beachMaterial = new THREE.MeshLambertMaterial({ color: 0xc2b280 });

    const beach = new THREE.Mesh(beachGeometry, beachMaterial);
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(0, 0.15, 0);
    beach.receiveShadow = true;
    this.group.add(beach);

    // 水面波纹效果 - 几个同心圆
    for (let i = 0; i < 3; i++) {
      const ripple = new THREE.Mesh(
        new THREE.RingGeometry(10 + i * 12, 12 + i * 12, 32),
        new THREE.MeshBasicMaterial({
          color: 0x3388bb,
          transparent: true,
          opacity: 0.3
        })
      );
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.set(0, 0.25, 0);
      this.group.add(ripple);
    }
  }

  private createBridge(): void {
    const bridgeGroup = new THREE.Group();

    // 桥面
    const deckMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(120, 1, 12),
      deckMaterial
    );
    deck.position.y = 8;
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridgeGroup.add(deck);

    // 桥面道路标线
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -5; i <= 5; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.1, 0.5),
        lineMaterial
      );
      line.position.set(i * 10, 8.6, 0);
      bridgeGroup.add(line);
    }

    // 桥墩 - 4个
    const pierMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const pierPositions = [-40, -15, 15, 40];
    for (const x of pierPositions) {
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(4, 16, 8),
        pierMaterial
      );
      pier.position.set(x, 0, 0);
      pier.castShadow = true;
      bridgeGroup.add(pier);
    }

    // 桥塔 - 两个主塔
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0xcc0000 });
    const towerPositions = [-30, 30];
    for (const x of towerPositions) {
      // 主塔
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(3, 35, 3),
        towerMaterial
      );
      tower.position.set(x, 17.5, -4);
      tower.castShadow = true;
      bridgeGroup.add(tower);

      const tower2 = new THREE.Mesh(
        new THREE.BoxGeometry(3, 35, 3),
        towerMaterial
      );
      tower2.position.set(x, 17.5, 4);
      tower2.castShadow = true;
      bridgeGroup.add(tower2);

      // 塔顶横梁
      const topBeam = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 12),
        towerMaterial
      );
      topBeam.position.set(x, 34, 0);
      bridgeGroup.add(topBeam);
    }

    // 悬索 - 主缆
    const cableMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });

    // 左右两侧主缆
    for (const z of [-5, 5]) {
      // 主缆曲线
      const cablePoints = [];
      for (let i = -60; i <= 60; i += 5) {
        const y = 30 - Math.pow(i / 20, 2) * 2;
        cablePoints.push(new THREE.Vector3(i, y, z));
      }
      const cableCurve = new THREE.CatmullRomCurve3(cablePoints);
      const cableGeometry = new THREE.TubeGeometry(cableCurve, 50, 0.3, 8, false);
      const cable = new THREE.Mesh(cableGeometry, cableMaterial);
      bridgeGroup.add(cable);

      // 垂直吊索
      for (let i = -55; i <= 55; i += 10) {
        const cableY = 30 - Math.pow(i / 20, 2) * 2;
        const hanger = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, cableY - 8, 8),
          cableMaterial
        );
        hanger.position.set(i, 8 + (cableY - 8) / 2, z);
        bridgeGroup.add(hanger);
      }
    }

    // 护栏
    const railMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    for (const z of [-6, 6]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(120, 1.5, 0.3),
        railMaterial
      );
      rail.position.set(0, 9.5, z);
      bridgeGroup.add(rail);

      // 护栏柱子
      for (let i = -58; i <= 58; i += 4) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 1.5, 0.2),
          railMaterial
        );
        post.position.set(i, 9.5, z);
        bridgeGroup.add(post);
      }
    }

    // 放置桥在湖泊上（x=0，与湖泊对齐）
    bridgeGroup.position.set(0, 0, 0);
    this.group.add(bridgeGroup);
  }
}
