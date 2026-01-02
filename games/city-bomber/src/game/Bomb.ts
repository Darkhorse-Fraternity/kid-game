import * as THREE from 'three';

export class Bomb {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  gravity = 30;
  active = true;

  constructor(position: THREE.Vector3, initialVelocity: THREE.Vector3) {
    this.mesh = this.createAtomicBomb();
    this.mesh.position.copy(position);

    this.velocity = initialVelocity.clone();
  }

  private createAtomicBomb(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const noseMat = new THREE.MeshLambertMaterial({ color: 0xff4400 });
    const finMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });

    // 主弹体 - 胖子原子弹的椭球形身体
    const bodyGeometry = new THREE.SphereGeometry(1.2, 16, 12);
    bodyGeometry.scale(1, 1, 1.8);
    const body = new THREE.Mesh(bodyGeometry, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // 弹头 - 红色锥形
    const noseGeometry = new THREE.ConeGeometry(0.6, 1.5, 12);
    const nose = new THREE.Mesh(noseGeometry, noseMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = 2.8;
    group.add(nose);

    // 尾部收窄
    const tailGeometry = new THREE.CylinderGeometry(0.8, 0.5, 1.5, 12);
    const tail = new THREE.Mesh(tailGeometry, bodyMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = -2;
    group.add(tail);

    // 尾翼 - 4片十字形
    for (let i = 0; i < 4; i++) {
      const finGeometry = new THREE.BoxGeometry(0.1, 1.5, 1.2);
      const fin = new THREE.Mesh(finGeometry, finMat);
      fin.position.z = -2.5;
      fin.rotation.z = (i * Math.PI) / 2;
      fin.position.x = Math.cos((i * Math.PI) / 2) * 0.8;
      fin.position.y = Math.sin((i * Math.PI) / 2) * 0.8;
      fin.castShadow = true;
      group.add(fin);
    }

    // 黄色警示条纹
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    for (let i = -1; i <= 1; i++) {
      const stripe = new THREE.Mesh(
        new THREE.TorusGeometry(1.2, 0.08, 8, 24),
        stripeMat
      );
      stripe.position.z = i * 0.8;
      stripe.rotation.x = Math.PI / 2;
      group.add(stripe);
    }

    // 整体缩小一点
    group.scale.set(0.5, 0.5, 0.5);

    return group;
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    this.velocity.y -= this.gravity * deltaTime;
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  dispose(): void {
    for (const child of this.mesh.children) {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }
}
