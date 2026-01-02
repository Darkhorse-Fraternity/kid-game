import * as THREE from 'three';

interface MovingCar {
  group: THREE.Group;
  speed: number;
  direction: 'x' | 'z';
  positive: boolean;
}

export class GroundObjects {
  group: THREE.Group;
  cars: MovingCar[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.createRoads();
    this.createCars();
    this.createPeople();
    this.createMilitaryBases();
    this.createAntiAircraftGuns();
  }

  update(deltaTime: number): void {
    const gridSize = 32;
    const spacing = 10;
    const maxRange = (gridSize * spacing) / 2 + 10;

    for (const car of this.cars) {
      const moveAmount = car.speed * deltaTime * (car.positive ? 1 : -1);

      if (car.direction === 'x') {
        car.group.position.x += moveAmount;
        // 超出范围则循环
        if (car.group.position.x > maxRange) car.group.position.x = -maxRange;
        if (car.group.position.x < -maxRange) car.group.position.x = maxRange;
      } else {
        car.group.position.z += moveAmount;
        if (car.group.position.z > maxRange) car.group.position.z = -maxRange;
        if (car.group.position.z < -maxRange) car.group.position.z = maxRange;
      }
    }
  }

  // 创建公路 - 避开湖泊区域
  private createRoads(): void {
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    // 湖泊半径
    const lakeRadius = 65;

    // 左边城市道路 (x < -lakeRadius)
    this.createCityRoads(-200, 0, roadMaterial, lineMaterial, lakeRadius);
    // 右边城市道路 (x > lakeRadius)
    this.createCityRoads(250, 0, roadMaterial, lineMaterial, lakeRadius);

    // 桥上的道路（连接两座城市）
    const bridgeRoad = new THREE.Mesh(
      new THREE.BoxGeometry(120, 0.1, 8),
      roadMaterial
    );
    bridgeRoad.position.set(0, 8.1, 0);
    bridgeRoad.receiveShadow = true;
    this.group.add(bridgeRoad);
  }

  private createCityRoads(
    cityOffsetX: number,
    cityOffsetZ: number,
    roadMaterial: THREE.Material,
    lineMaterial: THREE.Material,
    lakeRadius: number
  ): void {
    const gridSize = 32;
    const spacing = 10;
    const offset = (gridSize * spacing) / 2;

    // 横向道路
    for (let i = 0; i <= gridSize; i++) {
      const z = i * spacing - offset + cityOffsetZ;

      // 道路分段，避开湖泊
      for (let seg = 0; seg < 2; seg++) {
        const segStartX = seg === 0 ? -offset + cityOffsetX : Math.max(lakeRadius, -offset + cityOffsetX);
        const segEndX = seg === 0 ? Math.min(-lakeRadius, offset + cityOffsetX) : offset + cityOffsetX;

        if (segEndX > segStartX && !this.isInLake((segStartX + segEndX) / 2, z)) {
          const roadLength = segEndX - segStartX;
          const road = new THREE.Mesh(
            new THREE.BoxGeometry(roadLength, 0.1, 4),
            roadMaterial
          );
          road.position.set((segStartX + segEndX) / 2, 0.05, z);
          road.receiveShadow = true;
          this.group.add(road);

          // 道路中心线
          const line = new THREE.Mesh(
            new THREE.BoxGeometry(roadLength, 0.02, 0.2),
            lineMaterial
          );
          line.position.set((segStartX + segEndX) / 2, 0.12, z);
          this.group.add(line);
        }
      }
    }

    // 纵向道路
    for (let i = 0; i <= gridSize; i++) {
      const x = i * spacing - offset + cityOffsetX;

      // 检查是否在湖泊区域外
      if (Math.abs(x) > lakeRadius) {
        const road = new THREE.Mesh(
          new THREE.BoxGeometry(4, 0.1, gridSize * spacing + 20),
          roadMaterial
        );
        road.position.set(x, 0.05, cityOffsetZ);
        road.receiveShadow = true;
        this.group.add(road);
      }
    }
  }

  // 创建汽车 - 只在两座城市的道路上行驶
  private createCars(): void {
    const carColors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff, 0x000000];

    // 在两座城市分别创建汽车
    this.createCityCars(-200, 0, carColors); // 左边城市
    this.createCityCars(250, 0, carColors);  // 右边城市
  }

  private createCityCars(cityOffsetX: number, cityOffsetZ: number, carColors: number[]): void {
    const gridSize = 32;
    const spacing = 10;
    const offset = (gridSize * spacing) / 2;

    // 在城市道路上放置汽车
    for (let i = 0; i <= gridSize; i++) {
      // 横向道路上的车（沿X轴行驶）
      const numCarsH = 1 + Math.floor(Math.random() * 2);
      for (let c = 0; c < numCarsH; c++) {
        const z = i * spacing - offset + cityOffsetZ;
        const x = (Math.random() - 0.5) * gridSize * spacing + cityOffsetX;

        const carGroup = this.createCarModel(carColors);
        const positive = Math.random() > 0.5;

        carGroup.position.set(x, 0, z + (positive ? 1 : -1));
        carGroup.rotation.y = positive ? 0 : Math.PI;

        this.group.add(carGroup);
        this.cars.push({
          group: carGroup,
          speed: 8 + Math.random() * 12,
          direction: 'x',
          positive
        });
      }

      // 纵向道路上的车（沿Z轴行驶）
      const numCarsV = 1 + Math.floor(Math.random() * 2);
      for (let c = 0; c < numCarsV; c++) {
        const x = i * spacing - offset + cityOffsetX;
        const z = (Math.random() - 0.5) * gridSize * spacing + cityOffsetZ;

        const carGroup = this.createCarModel(carColors);
        const positive = Math.random() > 0.5;

        carGroup.position.set(x + (positive ? 1 : -1), 0, z);
        carGroup.rotation.y = positive ? Math.PI / 2 : -Math.PI / 2;

        this.group.add(carGroup);
        this.cars.push({
          group: carGroup,
          speed: 8 + Math.random() * 12,
          direction: 'z',
          positive
        });
      }
    }
  }

  private createCarModel(carColors: number[]): THREE.Group {
    const carGroup = new THREE.Group();
    const bodyColor = carColors[Math.floor(Math.random() * carColors.length)];

    // 车身
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

    carGroup.castShadow = true;
    return carGroup;
  }

  // 检查位置是否在湖泊区域内
  private isInLake(x: number, z: number): boolean {
    // 湖泊在中心 (0, 0)，半径约60
    return x * x + z * z < 65 * 65;
  }

  // 创建行人 - 只在两座城市区域
  private createPeople(): void {
    const skinColors = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
    const clothColors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x000000, 0xffffff, 0x808080];

    // 在两座城市分别创建行人（增加到150人每城市）
    this.createCityPeople(-200, 0, 150, skinColors, clothColors); // 左边城市
    this.createCityPeople(250, 0, 150, skinColors, clothColors);  // 右边城市
  }

  private createCityPeople(
    cityOffsetX: number,
    cityOffsetZ: number,
    count: number,
    skinColors: number[],
    clothColors: number[]
  ): void {
    const gridSize = 32;
    const spacing = 10;
    const cityRadius = (gridSize * spacing) / 2;

    for (let i = 0; i < count; i++) {
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

      // 在城市范围内随机位置
      const x = (Math.random() - 0.5) * cityRadius * 2 + cityOffsetX;
      const z = (Math.random() - 0.5) * cityRadius * 2 + cityOffsetZ;
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

  // 创建防空炮（装饰性，少量）
  private createAntiAircraftGuns(): void {
    for (let i = 0; i < 3; i++) {
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
      const angle = (i / 3) * Math.PI * 2;
      const radius = 60 + Math.random() * 20;
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
