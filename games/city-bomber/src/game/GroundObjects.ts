import * as THREE from 'three';

export class GroundObjects {
  group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.createRoads();
    this.createCars();
    this.createPeople();
    this.createMilitaryBases();
    this.createAntiAircraftGuns();
  }

  // 创建公路
  private createRoads(): void {
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    // 横向主干道
    for (let i = -5; i <= 5; i++) {
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(250, 0.1, 6),
        roadMaterial
      );
      road.position.set(0, 0.05, i * 20);
      road.receiveShadow = true;
      this.group.add(road);

      // 道路中线
      for (let j = -25; j < 25; j++) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(3, 0.12, 0.4),
          lineMaterial
        );
        line.position.set(j * 5, 0.1, i * 20);
        this.group.add(line);
      }
    }

    // 纵向主干道
    for (let i = -5; i <= 5; i++) {
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.1, 250),
        roadMaterial
      );
      road.position.set(i * 20, 0.05, 0);
      road.receiveShadow = true;
      this.group.add(road);

      // 道路中线
      for (let j = -25; j < 25; j++) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.12, 3),
          lineMaterial
        );
        line.position.set(i * 20, 0.1, j * 5);
        this.group.add(line);
      }
    }
  }

  // 创建汽车
  private createCars(): void {
    const carColors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff, 0x000000];

    for (let i = 0; i < 50; i++) {
      const carGroup = new THREE.Group();

      // 车身
      const bodyColor = carColors[Math.floor(Math.random() * carColors.length)];
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.8, 1.2),
        new THREE.MeshLambertMaterial({ color: bodyColor })
      );
      body.position.y = 0.5;
      carGroup.add(body);

      // 车顶
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.6, 1),
        new THREE.MeshLambertMaterial({ color: bodyColor })
      );
      roof.position.set(-0.2, 1.1, 0);
      carGroup.add(roof);

      // 车窗
      const windowMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
      const frontWindow = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.4, 0.8),
        windowMat
      );
      frontWindow.position.set(0.4, 1.0, 0);
      carGroup.add(frontWindow);

      // 轮子
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
      const wheelPositions = [
        [0.6, 0.2, 0.6], [0.6, 0.2, -0.6],
        [-0.6, 0.2, 0.6], [-0.6, 0.2, -0.6]
      ];
      for (const pos of wheelPositions) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.15, 8),
          wheelMat
        );
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(pos[0], pos[1], pos[2]);
        carGroup.add(wheel);
      }

      // 随机放在路上
      const roadIndex = Math.floor(Math.random() * 5) - 2;
      const isHorizontal = Math.random() > 0.5;

      if (isHorizontal) {
        carGroup.position.set(
          (Math.random() - 0.5) * 180,
          0,
          roadIndex * 40 + (Math.random() - 0.5) * 3
        );
      } else {
        carGroup.rotation.y = Math.PI / 2;
        carGroup.position.set(
          roadIndex * 40 + (Math.random() - 0.5) * 3,
          0,
          (Math.random() - 0.5) * 180
        );
      }

      carGroup.castShadow = true;
      this.group.add(carGroup);
    }
  }

  // 创建行人
  private createPeople(): void {
    const skinColors = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
    const clothColors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x000000, 0xffffff, 0x808080];

    for (let i = 0; i < 100; i++) {
      const personGroup = new THREE.Group();

      const skinColor = skinColors[Math.floor(Math.random() * skinColors.length)];
      const clothColor = clothColors[Math.floor(Math.random() * clothColors.length)];

      // 头
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshLambertMaterial({ color: skinColor })
      );
      head.position.y = 1.5;
      personGroup.add(head);

      // 身体
      const bodyMat = new THREE.MeshLambertMaterial({ color: clothColor });
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.5, 0.2),
        bodyMat
      );
      torso.position.y = 1.1;
      personGroup.add(torso);

      // 腿
      const legMat = new THREE.MeshLambertMaterial({ color: 0x000080 });
      const leftLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.5, 0.1),
        legMat
      );
      leftLeg.position.set(-0.08, 0.6, 0);
      personGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.5, 0.1),
        legMat
      );
      rightLeg.position.set(0.08, 0.6, 0);
      personGroup.add(rightLeg);

      // 随机位置（人行道上）
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      personGroup.position.set(x, 0, z);
      personGroup.rotation.y = Math.random() * Math.PI * 2;

      personGroup.castShadow = true;
      this.group.add(personGroup);
    }
  }

  // 创建军事基地
  private createMilitaryBases(): void {
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x4a5d23 }); // 军绿色

    for (let i = 0; i < 4; i++) {
      const baseGroup = new THREE.Group();

      // 主建筑
      const mainBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(12, 4, 8),
        baseMat
      );
      mainBuilding.position.y = 2;
      mainBuilding.castShadow = true;
      baseGroup.add(mainBuilding);

      // 屋顶
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(13, 0.5, 9),
        new THREE.MeshLambertMaterial({ color: 0x3a4a18 })
      );
      roof.position.y = 4.25;
      baseGroup.add(roof);

      // 围墙
      const wallMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
      const walls = [
        { size: [20, 2, 0.3], pos: [0, 1, 10] },
        { size: [20, 2, 0.3], pos: [0, 1, -10] },
        { size: [0.3, 2, 20], pos: [10, 1, 0] },
        { size: [0.3, 2, 20], pos: [-10, 1, 0] }
      ];
      for (const w of walls) {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]),
          wallMat
        );
        wall.position.set(w.pos[0], w.pos[1], w.pos[2]);
        wall.castShadow = true;
        baseGroup.add(wall);
      }

      // 瞭望塔
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(2, 8, 2),
        wallMat
      );
      tower.position.set(8, 4, 8);
      tower.castShadow = true;
      baseGroup.add(tower);

      // 旗杆
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0x888888 })
      );
      pole.position.set(-8, 5, 0);
      baseGroup.add(pole);

      // 旗帜
      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(3, 2, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      flag.position.set(-6.5, 9, 0);
      baseGroup.add(flag);

      // 放置在四个角落
      const positions = [
        [-70, -70], [70, -70], [-70, 70], [70, 70]
      ];
      baseGroup.position.set(positions[i][0], 0, positions[i][1]);
      baseGroup.rotation.y = Math.random() * Math.PI * 0.5;

      this.group.add(baseGroup);
    }
  }

  // 创建防空炮
  private createAntiAircraftGuns(): void {
    for (let i = 0; i < 8; i++) {
      const gunGroup = new THREE.Group();
      const metalMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
      const greenMat = new THREE.MeshLambertMaterial({ color: 0x4a5d23 });

      // 底座
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 2, 0.8, 12),
        greenMat
      );
      base.position.y = 0.4;
      base.castShadow = true;
      gunGroup.add(base);

      // 旋转平台
      const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 0.4, 12),
        metalMat
      );
      platform.position.y = 1;
      gunGroup.add(platform);

      // 炮管支架
      const mount = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1, 0.6),
        metalMat
      );
      mount.position.y = 1.7;
      gunGroup.add(mount);

      // 双管炮
      for (let j = -1; j <= 1; j += 2) {
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
          metalMat
        );
        barrel.rotation.x = -Math.PI / 4; // 45度仰角
        barrel.position.set(j * 0.3, 2.5, -1.2);
        gunGroup.add(barrel);
      }

      // 弹药箱
      const ammoBox = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.6, 0.6),
        greenMat
      );
      ammoBox.position.set(1.5, 0.3, 0);
      gunGroup.add(ammoBox);

      // 随机位置
      const angle = (i / 8) * Math.PI * 2;
      const radius = 50 + Math.random() * 30;
      gunGroup.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      gunGroup.rotation.y = angle + Math.PI; // 朝向中心

      this.group.add(gunGroup);
    }
  }
}
