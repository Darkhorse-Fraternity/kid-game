import * as THREE from 'three';

export class Building {
  group: THREE.Group;
  mesh: THREE.Mesh;
  height: number;
  width: number;
  depth: number;
  destroyed = false;
  burning = false;

  constructor(x: number, z: number, width: number, depth: number, height: number, color: number) {
    this.height = height;
    this.width = width;
    this.depth = depth;
    this.group = new THREE.Group();

    // 建筑主体
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, height / 2, 0);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // 添加窗户
    this.addWindows(width, depth, height);

    this.group.position.set(x, 0, z);
  }

  private addWindows(width: number, depth: number, height: number): void {
    const windowColor = 0xffff99; // 暖黄色窗户灯光
    const windowMaterial = new THREE.MeshBasicMaterial({ color: windowColor });

    const windowWidth = 0.8;
    const windowHeight = 1.2;
    const windowDepth = 0.1;

    const floorHeight = 3;
    const floors = Math.floor(height / floorHeight);

    // 前后面窗户
    const windowsPerRowFront = Math.max(1, Math.floor((width - 1) / 2));
    for (let floor = 0; floor < floors; floor++) {
      for (let w = 0; w < windowsPerRowFront; w++) {
        const windowGeom = new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth);

        // 前面
        const windowFront = new THREE.Mesh(windowGeom, windowMaterial);
        const xPos = (w - (windowsPerRowFront - 1) / 2) * 2;
        const yPos = floor * floorHeight + floorHeight / 2 + 1;
        windowFront.position.set(xPos, yPos, depth / 2 + 0.05);
        this.group.add(windowFront);

        // 后面
        const windowBack = new THREE.Mesh(windowGeom, windowMaterial);
        windowBack.position.set(xPos, yPos, -depth / 2 - 0.05);
        this.group.add(windowBack);
      }
    }

    // 左右面窗户
    const windowsPerRowSide = Math.max(1, Math.floor((depth - 1) / 2));
    for (let floor = 0; floor < floors; floor++) {
      for (let w = 0; w < windowsPerRowSide; w++) {
        const windowGeom = new THREE.BoxGeometry(windowDepth, windowHeight, windowWidth);

        // 右面
        const windowRight = new THREE.Mesh(windowGeom, windowMaterial);
        const zPos = (w - (windowsPerRowSide - 1) / 2) * 2;
        const yPos = floor * floorHeight + floorHeight / 2 + 1;
        windowRight.position.set(width / 2 + 0.05, yPos, zPos);
        this.group.add(windowRight);

        // 左面
        const windowLeft = new THREE.Mesh(windowGeom, windowMaterial);
        windowLeft.position.set(-width / 2 - 0.05, yPos, zPos);
        this.group.add(windowLeft);
      }
    }
  }

  // 建筑被击中开始燃烧
  startBurning(): void {
    this.burning = true;
    this.destroyed = true;

    // 建筑变黑
    (this.mesh.material as THREE.MeshLambertMaterial).color.setHex(0x222222);

    // 窗户变成橙红色(火光)
    for (const child of this.group.children) {
      if (child !== this.mesh && child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).color.setHex(0xff4400);
      }
    }
  }

  getScore(): number {
    return Math.floor(this.height * 10);
  }

  getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.mesh);
  }

  getWorldPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }
}
