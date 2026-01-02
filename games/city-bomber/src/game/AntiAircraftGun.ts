import * as THREE from 'three';

interface Bullet {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

export class AntiAircraftGun {
  group: THREE.Group;
  turret: THREE.Group;
  position: THREE.Vector3;
  bullets: Bullet[] = [];
  fireTimer = 0;
  fireRate = 0.5; // 每0.5秒发射一次
  range = 150; // 射程

  constructor(x: number, z: number) {
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(x, 0, z);
    this.turret = new THREE.Group();
    this.createGun();
    this.group.position.set(x, 0, z);
  }

  private createGun(): void {
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const greenMat = new THREE.MeshLambertMaterial({ color: 0x4a5d23 });

    // 底座
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2, 0.8, 12),
      greenMat
    );
    base.position.y = 0.4;
    base.castShadow = true;
    this.group.add(base);

    // 旋转平台
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.4, 12),
      metalMat
    );
    platform.position.y = 1;
    this.group.add(platform);

    // 炮塔（可旋转部分）
    this.turret.position.y = 1.2;

    // 炮管支架
    const mount = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1, 0.6),
      metalMat
    );
    mount.position.y = 0.5;
    this.turret.add(mount);

    // 双管炮
    for (let j = -1; j <= 1; j += 2) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
        metalMat
      );
      barrel.rotation.x = -Math.PI / 4; // 45度仰角
      barrel.position.set(j * 0.3, 1.3, -1.2);
      this.turret.add(barrel);
    }

    // 弹药箱
    const ammoBox = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.6, 0.6),
      greenMat
    );
    ammoBox.position.set(1.5, 0.3, 0);
    this.turret.add(ammoBox);

    this.group.add(this.turret);
  }

  update(deltaTime: number, airplanePos: THREE.Vector3, scene: THREE.Scene): boolean {
    // 计算到飞机的距离
    const toAirplane = airplanePos.clone().sub(this.position);
    const distance = toAirplane.length();

    // 更新炮塔朝向飞机
    if (distance < this.range) {
      const angle = Math.atan2(toAirplane.x, toAirplane.z);
      this.turret.rotation.y = angle;
    }

    // 更新子弹
    let hitAirplane = false;
    this.bullets = this.bullets.filter(bullet => {
      bullet.mesh.position.add(bullet.velocity.clone().multiplyScalar(deltaTime));
      bullet.life -= deltaTime;

      // 检查是否击中飞机
      const bulletToPlane = airplanePos.clone().sub(bullet.mesh.position);
      if (bulletToPlane.length() < 5) {
        hitAirplane = true;
        scene.remove(bullet.mesh);
        bullet.mesh.geometry.dispose();
        (bullet.mesh.material as THREE.Material).dispose();
        return false;
      }

      // 子弹超时或落地
      if (bullet.life <= 0 || bullet.mesh.position.y < 0) {
        scene.remove(bullet.mesh);
        bullet.mesh.geometry.dispose();
        (bullet.mesh.material as THREE.Material).dispose();
        return false;
      }

      return true;
    });

    // 发射子弹
    this.fireTimer -= deltaTime;
    if (distance < this.range && this.fireTimer <= 0) {
      this.fire(airplanePos, scene);
      this.fireTimer = this.fireRate;
    }

    return hitAirplane;
  }

  private fire(targetPos: THREE.Vector3, scene: THREE.Scene): void {
    const bulletSpeed = 80;

    // 计算发射方向（预判飞机位置）
    const gunWorldPos = this.position.clone();
    gunWorldPos.y = 2.5;

    const direction = targetPos.clone().sub(gunWorldPos).normalize();

    // 创建子弹
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(gunWorldPos);

    scene.add(bullet);

    this.bullets.push({
      mesh: bullet,
      velocity: direction.multiplyScalar(bulletSpeed),
      life: 3 // 3秒后消失
    });
  }

  dispose(): void {
    for (const bullet of this.bullets) {
      bullet.mesh.geometry.dispose();
      (bullet.mesh.material as THREE.Material).dispose();
    }
  }
}
