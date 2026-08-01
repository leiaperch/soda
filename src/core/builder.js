import * as THREE from 'three';

/**
 * Geometry builder: accumulates raw triangles into one buffer per material key,
 * so a whole city block collapses into a handful of draw calls instead of
 * hundreds of Meshes. Generators are written once in local space and stamped
 * anywhere through the matrix stack.
 */
export class Builder {
  constructor() {
    this._buckets = new Map();
    this._stack = [new THREE.Matrix4()];
    this._m = new THREE.Matrix4();
    this._v = new THREE.Vector3();
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._c = new THREE.Vector3();
    this._n = new THREE.Vector3();
  }

  get matrix() { return this._stack[this._stack.length - 1]; }

  push(matrix) {
    this._stack.push(this.matrix.clone().multiply(matrix));
    return this;
  }

  pop() {
    if (this._stack.length > 1) this._stack.pop();
    return this;
  }

  /** Convenience transform: translate, rotate around Y, uniform-ish scale. */
  at(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = sx, sz = sx) {
    this._m.identity()
      .makeRotationY(ry)
      .premultiply(new THREE.Matrix4().makeTranslation(x, y, z))
      .multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
    return this.push(this._m);
  }

  _bucket(key) {
    let b = this._buckets.get(key);
    if (!b) {
      b = { pos: [], nor: [], col: [] };
      this._buckets.set(key, b);
    }
    return b;
  }

  /** Emit one triangle with a flat face normal (the crisp low-poly facet look). */
  tri(key, p0, p1, p2, color) {
    const b = this._bucket(key);
    const m = this.matrix;
    this._a.fromArray(p0).applyMatrix4(m);
    this._b.fromArray(p1).applyMatrix4(m);
    this._c.fromArray(p2).applyMatrix4(m);
    this._n.copy(this._c).sub(this._a).cross(this._v.copy(this._b).sub(this._a)).normalize();
    for (const p of [this._a, this._b, this._c]) {
      b.pos.push(p.x, p.y, p.z);
      b.nor.push(this._n.x, this._n.y, this._n.z);
      b.col.push(color.r, color.g, color.b);
    }
    return this;
  }

  quad(key, p0, p1, p2, p3, color) {
    this.tri(key, p0, p1, p2, color);
    this.tri(key, p0, p2, p3, color);
    return this;
  }

  /** Axis-aligned box centred on x/z, sitting on `y`. */
  box(key, x, y, z, w, h, d, color, tint = 1) {
    const c = color.clone().multiplyScalar(tint);
    const x0 = x - w / 2, x1 = x + w / 2;
    const y0 = y, y1 = y + h;
    const z0 = z - d / 2, z1 = z + d / 2;
    const v = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    ];
    this.quad(key, v[4], v[5], v[6], v[7], c);            // +Z
    this.quad(key, v[1], v[0], v[3], v[2], c);            // -Z
    this.quad(key, v[0], v[4], v[7], v[3], c.clone().multiplyScalar(0.88)); // -X
    this.quad(key, v[5], v[1], v[2], v[6], c.clone().multiplyScalar(0.88)); // +X
    this.quad(key, v[3], v[7], v[6], v[2], c.clone().multiplyScalar(1.08)); // +Y
    this.quad(key, v[0], v[1], v[5], v[4], c.clone().multiplyScalar(0.7));  // -Y
    return this;
  }

  /**
   * Box with the top face inset, i.e. a tapered slab. The Ring is built almost
   * entirely out of these: nothing in a Y2K skyline has a hard right angle.
   */
  taper(key, x, y, z, w, h, d, inset, color, tint = 1) {
    const c = color.clone().multiplyScalar(tint);
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const tx0 = x0 + inset, tx1 = x1 - inset, tz0 = z0 + inset, tz1 = z1 - inset;
    const y1 = y + h;
    const b = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
    const t = [[tx0, y1, tz0], [tx1, y1, tz0], [tx1, y1, tz1], [tx0, y1, tz1]];
    this.quad(key, b[3], b[2], t[2], t[3], c);
    this.quad(key, b[1], b[0], t[0], t[1], c);
    this.quad(key, b[0], b[3], t[3], t[0], c.clone().multiplyScalar(0.88));
    this.quad(key, b[2], b[1], t[1], t[2], c.clone().multiplyScalar(0.88));
    this.quad(key, t[0], t[1], t[2], t[3], c.clone().multiplyScalar(1.1));
    return this;
  }

  /** Vertical cylinder / prism. Low segment counts read as faceted chrome. */
  cyl(key, x, y, z, rBottom, rTop, h, seg, color, tint = 1) {
    const c = color.clone().multiplyScalar(tint);
    const cSide = c.clone().multiplyScalar(0.94);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const b0 = [x + Math.cos(a0) * rBottom, y, z + Math.sin(a0) * rBottom];
      const b1 = [x + Math.cos(a1) * rBottom, y, z + Math.sin(a1) * rBottom];
      const t0 = [x + Math.cos(a0) * rTop, y + h, z + Math.sin(a0) * rTop];
      const t1 = [x + Math.cos(a1) * rTop, y + h, z + Math.sin(a1) * rTop];
      this.quad(key, b0, b1, t1, t0, cSide);
      if (rTop > 0.001) this.tri(key, t0, t1, [x, y + h, z], c.clone().multiplyScalar(1.12));
      if (rBottom > 0.001) this.tri(key, b1, b0, [x, y, z], c.clone().multiplyScalar(0.7));
    }
    return this;
  }

  /** Half dome, the single most Y2K silhouette there is. */
  dome(key, x, y, z, r, h, seg, rings, color, tint = 1) {
    const c = color.clone().multiplyScalar(tint);
    for (let j = 0; j < rings; j++) {
      const p0 = j / rings, p1 = (j + 1) / rings;
      const r0 = r * Math.cos(p0 * Math.PI / 2), r1 = r * Math.cos(p1 * Math.PI / 2);
      const y0 = y + h * Math.sin(p0 * Math.PI / 2), y1 = y + h * Math.sin(p1 * Math.PI / 2);
      const shade = c.clone().multiplyScalar(0.9 + p1 * 0.22);
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const q0 = [x + Math.cos(a0) * r0, y0, z + Math.sin(a0) * r0];
        const q1 = [x + Math.cos(a1) * r0, y0, z + Math.sin(a1) * r0];
        const q2 = [x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1];
        const q3 = [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1];
        if (r1 < 0.001) this.tri(key, q0, q1, [x, y1, z], shade);
        else this.quad(key, q0, q1, q2, q3, shade);
      }
    }
    return this;
  }

  /** Torus arc in the XY plane, used for RELAY gates and skyline arches. */
  arch(key, x, y, z, r, tube, seg, tubeSeg, color, sweep = Math.PI, start = 0) {
    const c = color.clone();
    for (let i = 0; i < seg; i++) {
      const a0 = start + (i / seg) * sweep;
      const a1 = start + ((i + 1) / seg) * sweep;
      for (let j = 0; j < tubeSeg; j++) {
        const b0 = (j / tubeSeg) * Math.PI * 2;
        const b1 = ((j + 1) / tubeSeg) * Math.PI * 2;
        const pt = (a, b) => [
          x + (r + tube * Math.cos(b)) * Math.cos(a),
          y + (r + tube * Math.cos(b)) * Math.sin(a),
          z + tube * Math.sin(b),
        ];
        this.quad(key, pt(a0, b0), pt(a1, b0), pt(a1, b1), pt(a0, b1), c);
      }
    }
    return this;
  }

  /** Flat horizontal slab on the XZ plane (roads, decks, awnings). */
  slab(key, x, y, z, w, d, color) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    this.quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], color);
    return this;
  }

  /** Build one merged Mesh per material key and parent them to a Group. */
  toGroup(materials) {
    const group = new THREE.Group();
    for (const [key, b] of this._buckets) {
      const material = materials[key];
      if (!material || b.pos.length === 0) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, material);
      mesh.frustumCulled = false; // the bend shader moves verts far from their bounds
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
    return group;
  }
}

/** Dispose every geometry under a group. Never touches the shared materials. */
export function disposeGroup(group) {
  group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
}
