// Procedural Voxel Diorama Engine + Mesher + AO/Shadows/BFS Light + Binary .GLB Exporter
// Pure ES Module — works in both Browser (WebGL) and Node.js (asset generation)

export const GRID_X = 56;
export const GRID_Y = 40;
export const GRID_Z = 56;

export const MAT = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  DARK_STONE: 4,
  SAND: 5,
  WATER: 6,
  FOAM: 7,
  WOOD_LOG: 8,
  PLANK: 9,
  WOOD_DARK: 10,
  LEAF_OAK: 11,
  LEAF_PINE: 12,
  LEAF_SAKURA: 13,
  ROOF_RED: 14,
  ROOF_THATCH: 15,
  WALL_CREAM: 16,
  COBBLE: 17,
  ORE_GOLD: 18,
  ORE_CRYSTAL: 19,
  APPLE: 20,
  PUMPKIN: 21,
  WHEAT: 22,
  FLOWER: 23,
  EMBER: 24,
  LANTERN: 25,
  GLASS_LIT: 26,
  SAIL_CLOTH: 27,
  TENT_CANVAS: 28,
  LILY_PAD: 29,
  SETTLER: 30,
};

export function isEmissiveMat(m) {
  return m === MAT.EMBER || m === MAT.LANTERN || m === MAT.GLASS_LIT || m === MAT.ORE_CRYSTAL;
}

export function isOpaqueOccluder(m) {
  return m !== MAT.AIR && m !== MAT.WATER;
}

export function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

export function jitterHex(hex, amt, x, y, z) {
  const n = (hash3(x, y, z) - 0.5) * 2 * amt;
  const r = Math.max(0, Math.min(255, ((hex >> 16) & 255) + Math.round(n * 255)));
  const g = Math.max(0, Math.min(255, ((hex >> 8) & 255) + Math.round(n * 255)));
  const b = Math.max(0, Math.min(255, (hex & 255) + Math.round(n * 255)));
  return (r << 16) | (g << 8) | b;
}

export const PALETTE = {
  [MAT.GRASS]: 0x6ab04c,
  [MAT.DIRT]: 0x7f5539,
  [MAT.STONE]: 0x8d99ae,
  [MAT.DARK_STONE]: 0x4a5568,
  [MAT.SAND]: 0xe6ccb2,
  [MAT.WATER]: 0x2ec4b6,
  [MAT.FOAM]: 0xdff9fb,
  [MAT.WOOD_LOG]: 0x6f4518,
  [MAT.PLANK]: 0xc68b59,
  [MAT.WOOD_DARK]: 0x432818,
  [MAT.LEAF_OAK]: 0x4f9d4a,
  [MAT.LEAF_PINE]: 0x2d6a4f,
  [MAT.LEAF_SAKURA]: 0xffb3c6,
  [MAT.ROOF_RED]: 0xc84b31,
  [MAT.ROOF_THATCH]: 0xe0a96d,
  [MAT.WALL_CREAM]: 0xf4ede2,
  [MAT.COBBLE]: 0x9c958d,
  [MAT.ORE_GOLD]: 0xf9c74f,
  [MAT.ORE_CRYSTAL]: 0x48cae4,
  [MAT.APPLE]: 0xe63946,
  [MAT.PUMPKIN]: 0xf77f00,
  [MAT.WHEAT]: 0xe9c46a,
  [MAT.FLOWER]: 0xffd166,
  [MAT.EMBER]: 0xff6b35,
  [MAT.LANTERN]: 0xffd166,
  [MAT.GLASS_LIT]: 0xffbe5c,
  [MAT.SAIL_CLOTH]: 0xf8f4ec,
  [MAT.TENT_CANVAS]: 0xe07a5f,
  [MAT.LILY_PAD]: 0x52b788,
  [MAT.SETTLER]: 0xf4a261,
};

export class VoxelGrid {
  constructor(sx = GRID_X, sy = GRID_Y, sz = GRID_Z) {
    this.sx = sx;
    this.sy = sy;
    this.sz = sz;
    const len = sx * sy * sz;
    this.mat = new Uint8Array(len);
    this.col = new Uint32Array(len);
    this.light = new Uint8Array(len * 3);
  }

  idx(x, y, z) {
    return x + this.sx * (z + this.sz * y);
  }

  inBounds(x, y, z) {
    return x >= 0 && x < this.sx && y >= 0 && y < this.sy && z >= 0 && z < this.sz;
  }

  get(x, y, z) {
    if (!this.inBounds(x, y, z)) return MAT.AIR;
    return this.mat[this.idx(x, y, z)];
  }

  getCol(x, y, z) {
    if (!this.inBounds(x, y, z)) return 0xffffff;
    return this.col[this.idx(x, y, z)];
  }

  set(x, y, z, m, customHex = null, jitter = 0.04) {
    x = Math.round(x);
    y = Math.round(y);
    z = Math.round(z);
    if (!this.inBounds(x, y, z)) return;
    const i = this.idx(x, y, z);
    this.mat[i] = m;
    if (m === MAT.AIR) {
      this.col[i] = 0;
      return;
    }
    const base = customHex !== null ? customHex : (PALETTE[m] ?? 0xffffff);
    this.col[i] = jitter > 0 ? jitterHex(base, jitter, x, y, z) : base;
  }

  fillBox(x0, y0, z0, x1, y1, z1, m, customHex = null, jitter = 0.035) {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          this.set(x, y, z, m, customHex, jitter);
        }
      }
    }
  }

  countSolid() {
    let c = 0;
    for (let i = 0; i < this.mat.length; i++) {
      if (this.mat[i] !== MAT.AIR) c++;
    }
    return c;
  }
}

// ---------- Scene Helper Builders ----------

export function plantOakTree(grid, tx, ty, tz, scale = 1.0, withApples = false) {
  const trunkH = Math.max(3, Math.round(4 * scale));
  for (let y = 0; y < trunkH; y++) {
    grid.set(tx, ty + y, tz, MAT.WOOD_LOG, 0x6f4518, 0.04);
  }
  if (scale >= 1.15) {
    // subtle roots
    grid.set(tx + 1, ty, tz, MAT.WOOD_LOG, 0x5c3712, 0.03);
    grid.set(tx - 1, ty, tz, MAT.WOOD_LOG, 0x5c3712, 0.03);
  }
  const cy = ty + trunkH + 1;
  const r = Math.max(2, Math.round(2.4 * scale));
  for (let dy = -r + 1; dy <= r; dy++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dy * dy * 1.25 + dz * dz;
        const maxR = r * r + 0.6;
        if (d2 <= maxR) {
          if (dy === r && Math.abs(dx) === r) continue;
          const n = hash3(tx + dx, cy + dy, tz + dz);
          if (d2 > maxR - 1.2 && n < 0.28) continue;
          const isTop = dy > 0;
          const leafHex = isTop ? 0x6ab04c : 0x458b3c;
          if (withApples && dy <= 0 && d2 > maxR - 2.3 && n > 0.87) {
            grid.set(tx + dx, cy + dy, tz + dz, MAT.APPLE, 0xe63946, 0.03);
          } else {
            grid.set(tx + dx, cy + dy, tz + dz, MAT.LEAF_OAK, leafHex, 0.055);
          }
        }
      }
    }
  }
}

export function plantPineTree(grid, tx, ty, tz, height = 9) {
  for (let y = 0; y < height - 2; y++) {
    grid.set(tx, ty + y, tz, MAT.WOOD_LOG, 0x543310, 0.03);
  }
  const startY = ty + 2;
  const tiers = height - 2;
  for (let i = 0; i < tiers; i++) {
    const y = startY + i;
    const rad = Math.max(0, Math.round(((tiers - i) / tiers) * 2.8));
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) + Math.abs(dz) <= rad + (i % 2 === 0 ? 1 : 0)) {
          if (Math.abs(dx) === rad && Math.abs(dz) === rad && rad > 1) continue;
          const hex = i >= tiers - 2 ? 0x40916c : 0x2d6a4f;
          grid.set(tx + dx, y, tz + dz, MAT.LEAF_PINE, hex, 0.045);
        }
      }
    }
  }
  grid.set(tx, startY + tiers, tz, MAT.LEAF_PINE, 0x52b788, 0.03);
}

export function plantSakuraTree(grid, tx, ty, tz) {
  for (let y = 0; y < 4; y++) {
    grid.set(tx, ty + y, tz, MAT.WOOD_DARK, 0x4e342e, 0.03);
  }
  grid.set(tx + 1, ty + 3, tz, MAT.WOOD_DARK, 0x4e342e, 0.03);
  grid.set(tx - 1, ty + 4, tz + 1, MAT.WOOD_DARK, 0x4e342e, 0.03);

  const blobs = [
    [0, 6, 0, 2.7],
    [2, 5, 0, 2.1],
    [-2, 5, 1, 2.1],
    [0, 5, -2, 1.9],
  ];
  for (const [bx, by, bz, r] of blobs) {
    const ir = Math.ceil(r);
    for (let dy = -ir; dy <= ir; dy++) {
      for (let dz = -ir; dz <= ir; dz++) {
        for (let dx = -ir; dx <= ir; dx++) {
          const d2 = dx * dx + dy * dy * 1.4 + dz * dz;
          if (d2 <= r * r) {
            const n = hash3(tx + bx + dx, ty + by + dy, tz + bz + dz);
            if (d2 > r * r - 1.0 && n < 0.25) continue;
            const hex = n > 0.55 ? 0xffccd5 : n > 0.2 ? 0xffb3c6 : 0xff8fab;
            grid.set(tx + bx + dx, ty + by + dy, tz + bz + dz, MAT.LEAF_SAKURA, hex, 0.03);
          }
        }
      }
    }
  }
}

export function plantSapling(grid, x, y, z) {
  grid.set(x, y, z, MAT.WOOD_LOG, 0x6f4518, 0.03);
  grid.set(x, y + 1, z, MAT.LEAF_OAK, 0x80ed99, 0.05);
  grid.set(x + 1, y + 1, z, MAT.LEAF_OAK, 0x6ab04c, 0.05);
  grid.set(x, y + 2, z, MAT.LEAF_OAK, 0x80ed99, 0.05);
}

function buildTent(grid, x0, y0, z0) {
  // 5x4x6 striped explorer tent
  for (let z = 0; z < 6; z++) {
    for (let y = 0; y < 4; y++) {
      const halfW = 2 - Math.floor(y / 1.4);
      for (let dx = -halfW; dx <= halfW; dx++) {
        const isEdge = Math.abs(dx) === halfW || y === 3;
        if (!isEdge && z > 0 && z < 5) continue; // hollow inside
        if (z === 0 && Math.abs(dx) === 0 && y < 2) continue; // doorway
        const stripe = (z % 2 === 0) ? 0xe07a5f : 0xf4f1de;
        grid.set(x0 + dx, y0 + y, z0 + z, MAT.TENT_CANVAS, stripe, 0.025);
      }
    }
  }
  // Wooden ridge pole
  for (let z = -1; z <= 6; z++) {
    grid.set(x0, y0 + 4, z0 + z, MAT.WOOD_DARK, 0x5c3712, 0.02);
  }
}

function buildCampfire(grid, cx, cy, cz) {
  grid.set(cx, cy, cz, MAT.EMBER, 0xff5400, 0.05);
  grid.set(cx, cy + 1, cz, MAT.EMBER, 0xffbd00, 0.05);
  grid.set(cx - 1, cy, cz, MAT.DARK_STONE);
  grid.set(cx + 1, cy, cz, MAT.DARK_STONE);
  grid.set(cx, cy, cz - 1, MAT.DARK_STONE);
  grid.set(cx, cy, cz + 1, MAT.DARK_STONE);
  // sitting logs
  grid.fillBox(cx - 2, cy, cz + 2, cx, cy, cz + 2, MAT.WOOD_LOG);
  grid.fillBox(cx + 2, cy, cz - 1, cx + 2, cy, cz + 1, MAT.WOOD_LOG);
}

function buildCabin(grid, x0, y0, z0, upgraded = false) {
  const w = upgraded ? 10 : 8;
  const d = upgraded ? 9 : 7;
  const wallH = upgraded ? 6 : 4;

  // Stone foundation
  grid.fillBox(x0, y0, z0, x0 + w - 1, y0, z0 + d - 1, MAT.COBBLE, 0x7d8597, 0.04);

  // Walls
  for (let y = 1; y <= wallH; y++) {
    for (let z = 0; z < d; z++) {
      for (let x = 0; x < w; x++) {
        const isWall = x === 0 || x === w - 1 || z === 0 || z === d - 1;
        if (!isWall) continue;
        const isCorner = (x === 0 || x === w - 1) && (z === 0 || z === d - 1);
        const isBeam = upgraded && y === 4;
        if (isCorner || isBeam) {
          grid.set(x0 + x, y0 + y, z0 + z, MAT.WOOD_DARK);
        } else if (upgraded && y <= 3) {
          grid.set(x0 + x, y0 + y, z0 + z, MAT.STONE, 0x9aa5b1, 0.04);
        } else {
          grid.set(x0 + x, y0 + y, z0 + z, MAT.WALL_CREAM);
        }
      }
    }
  }

  // Front doorway facing +Z (south-east toward plaza/bridge)
  const doorX = x0 + Math.floor(w / 2);
  grid.set(doorX, y0 + 1, z0 + d - 1, MAT.WOOD_DARK, 0x3a2010, 0.02);
  grid.set(doorX, y0 + 2, z0 + d - 1, MAT.WOOD_DARK, 0x3a2010, 0.02);
  grid.set(doorX - 1, y0 + 1, z0 + d - 1, MAT.WOOD_DARK, 0x3a2010, 0.02);
  grid.set(doorX - 1, y0 + 2, z0 + d - 1, MAT.WOOD_DARK, 0x3a2010, 0.02);
  // Porch step
  grid.fillBox(doorX - 2, y0, z0 + d, doorX + 1, y0, z0 + d + 1, MAT.PLANK);
  if (upgraded) {
    // Porch awning & lantern
    grid.fillBox(doorX - 2, y0 + 3, z0 + d, doorX + 1, y0 + 3, z0 + d, MAT.ROOF_RED);
    grid.set(doorX - 2, y0 + 2, z0 + d, MAT.LANTERN);
    grid.set(doorX + 1, y0 + 2, z0 + d, MAT.LANTERN);
  }

  // Glowing Warm Windows
  grid.set(x0 + 1, y0 + 2, z0 + d - 1, MAT.GLASS_LIT);
  grid.set(x0 + w - 2, y0 + 2, z0 + d - 1, MAT.GLASS_LIT);
  grid.set(x0, y0 + 2, z0 + Math.floor(d / 2), MAT.GLASS_LIT);
  grid.set(x0 + w - 1, y0 + 2, z0 + Math.floor(d / 2), MAT.GLASS_LIT);
  if (upgraded) {
    grid.fillBox(x0 + 2, y0 + 5, z0 + d - 1, x0 + 3, y0 + 5, z0 + d - 1, MAT.GLASS_LIT);
    grid.fillBox(x0 + w - 4, y0 + 5, z0 + d - 1, x0 + w - 3, y0 + 5, z0 + d - 1, MAT.GLASS_LIT);
    // Flower planter under upper windows
    grid.set(x0 + 2, y0 + 4, z0 + d, MAT.FLOWER, 0xff595e, 0.04);
    grid.set(x0 + w - 3, y0 + 4, z0 + d, MAT.FLOWER, 0xffca3a, 0.04);
  }

  // Pitched Gabled Roof (overhangs by 1)
  const roofMat = upgraded ? MAT.ROOF_RED : MAT.ROOF_THATCH;
  const roofSteps = Math.ceil(d / 2) + 1;
  for (let step = 0; step < roofSteps; step++) {
    const ry = y0 + wallH + 1 + step;
    const zA = z0 - 1 + step;
    const zB = z0 + d - step;
    if (zA > zB) break;
    for (let x = x0 - 1; x <= x0 + w; x++) {
      grid.set(x, ry, zA, roofMat);
      grid.set(x, ry, zB, roofMat);
    }
    // Fill gable wall triangles
    if (zA + 1 <= zB - 1) {
      for (let gz = zA + 1; gz <= zB - 1; gz++) {
        grid.set(x0, ry, gz, MAT.WALL_CREAM);
        grid.set(x0 + w - 1, ry, gz, MAT.WALL_CREAM);
      }
    }
  }

  // Stone Chimney on left/back corner
  const chX = x0 + 1;
  const chZ = z0 + 1;
  grid.fillBox(chX, y0 + 1, chZ, chX + 1, y0 + wallH + roofSteps + 1, chZ + 1, MAT.DARK_STONE, 0x5c6470, 0.04);
}

function buildWindmill(grid, cx, cy, cz) {
  // Stone circular/chamfered base + tapering timber tower
  for (let y = 0; y < 13; y++) {
    const r = y < 4 ? 3 : y < 9 ? 2.4 : 2.0;
    const ir = Math.ceil(r);
    for (let dz = -ir; dz <= ir; dz++) {
      for (let dx = -ir; dx <= ir; dx++) {
        const d = Math.hypot(dx, dz);
        if (d <= r + 0.15) {
          const isOuter = d >= r - 1.05;
          if (!isOuter && y > 0 && y < 11) continue;
          let m = y < 4 ? MAT.STONE : (y % 4 === 0 ? MAT.WOOD_DARK : MAT.WALL_CREAM);
          if (y < 4 && (Math.abs(dx) === 3 || Math.abs(dz) === 3)) m = MAT.DARK_STONE;
          grid.set(cx + dx, cy + y, cz + dz, m);
        }
      }
    }
  }
  // Door facing +Z
  grid.set(cx, cy + 1, cz + 3, MAT.WOOD_DARK);
  grid.set(cx, cy + 2, cz + 3, MAT.WOOD_DARK);
  grid.set(cx, cy + 6, cz + 2, MAT.GLASS_LIT);
  grid.set(cx, cy + 10, cz + 2, MAT.GLASS_LIT);

  // Conical red shingled cap
  for (let step = 0; step < 4; step++) {
    const r = 3 - step * 0.8;
    const ir = Math.ceil(r);
    for (let dz = -ir; dz <= ir; dz++) {
      for (let dx = -ir; dx <= ir; dx++) {
        if (Math.hypot(dx, dz) <= r + 0.1) {
          grid.set(cx + dx, cy + 12 + step, cz + dz, MAT.ROOF_RED);
        }
      }
    }
  }
  grid.set(cx, cy + 16, cz, MAT.WOOD_DARK);
  // Hub protruding on +Z side at y = cy + 10
  grid.fillBox(cx, cy + 10, cz + 2, cx, cy + 10, cz + 4, MAT.WOOD_DARK);
}

export function buildWindmillSailGrid() {
  // Local 15x15x3 grid centered at (7, 7, 1)
  const g = new VoxelGrid(15, 15, 3);
  const c = 7;
  g.fillBox(c, c, 0, c, c, 2, MAT.WOOD_DARK);
  // 4 arms extending up, down, left, right
  for (let i = 1; i <= 6; i++) {
    // Up arm + sail to the right
    g.set(c, c + i, 1, MAT.PLANK);
    if (i >= 2) {
      g.set(c + 1, c + i, 1, MAT.SAIL_CLOTH);
      g.set(c + 2, c + i, 1, MAT.SAIL_CLOTH);
    }
    // Down arm + sail to the left
    g.set(c, c - i, 1, MAT.PLANK);
    if (i >= 2) {
      g.set(c - 1, c - i, 1, MAT.SAIL_CLOTH);
      g.set(c - 2, c - i, 1, MAT.SAIL_CLOTH);
    }
    // Right arm + sail down
    g.set(c + i, c, 1, MAT.PLANK);
    if (i >= 2) {
      g.set(c + i, c - 1, 1, MAT.SAIL_CLOTH);
      g.set(c + i, c - 2, 1, MAT.SAIL_CLOTH);
    }
    // Left arm + sail up
    g.set(c - i, c, 1, MAT.PLANK);
    if (i >= 2) {
      g.set(c - i, c + 1, 1, MAT.SAIL_CLOTH);
      g.set(c - i, c + 2, 1, MAT.SAIL_CLOTH);
    }
  }
  return g;
}

export function buildBoatGrid() {
  const g = new VoxelGrid(5, 3, 7);
  // Hull
  for (let z = 1; z <= 5; z++) {
    g.fillBox(1, 0, z, 3, 0, z, MAT.WOOD_DARK);
    g.set(1, 1, z, MAT.PLANK);
    g.set(3, 1, z, MAT.PLANK);
  }
  g.set(2, 1, 0, MAT.PLANK);
  g.set(2, 1, 6, MAT.PLANK);
  g.set(2, 1, 3, MAT.WOOD_LOG); // seat
  return g;
}

function buildSettler(grid, x, y, z, tunicHex, hatHex = 0xe9c46a) {
  grid.set(x, y, z, MAT.SETTLER, 0x3d405b, 0.02); // legs
  grid.set(x, y + 1, z, MAT.SETTLER, tunicHex, 0.03); // torso
  grid.set(x, y + 2, z, MAT.SETTLER, 0xffcdb2, 0.02); // head
  if (hatHex !== null) {
    grid.set(x, y + 3, z, MAT.SETTLER, hatHex, 0.03);
  }
}

function buildStreetLantern(grid, x, y, z) {
  grid.set(x, y, z, MAT.DARK_STONE);
  grid.set(x, y + 1, z, MAT.WOOD_DARK);
  grid.set(x, y + 2, z, MAT.WOOD_DARK);
  grid.set(x, y + 3, z, MAT.LANTERN);
}

// ---------- Main Valley Generator ----------

export function buildValleyScene(stage = 3) {
  const grid = new VoxelGrid(GRID_X, GRID_Y, GRID_Z);

  // River centerline control points from NW spring -> center valley -> SE island edge waterfall
  const riverPts = [
    [22, 8], [22, 12], [23, 17], [25, 22], [28, 27], [31, 32], [35, 38], [38, 44], [41, 50]
  ];

  function riverSample(x, z) {
    let minD = 999;
    let bestT = 0;
    const segs = riverPts.length - 1;
    for (let s = 0; s < segs; s++) {
      const [ax, az] = riverPts[s];
      const [bx, bz] = riverPts[s + 1];
      const abx = bx - ax, abz = bz - az;
      const apx = x - ax, apz = z - az;
      const len2 = abx * abx + abz * abz;
      const u = Math.max(0, Math.min(1, (apx * abx + apz * abz) / len2));
      const px = ax + abx * u, pz = az + abz * u;
      const d = Math.hypot(x - px, z - pz);
      if (d < minD) {
        minD = d;
        bestT = (s + u) / segs;
      }
    }
    return { dist: minD, t: bestT };
  }

  const heightMap = new Int16Array(GRID_X * GRID_Z);
  const waterMap = new Int16Array(GRID_X * GRID_Z);
  const isCliff = new Uint8Array(GRID_X * GRID_Z);

  const cx = 27.5, cz = 27.5;

  for (let z = 0; z < GRID_Z; z++) {
    for (let x = 0; x < GRID_X; x++) {
      const dx = x - cx, dz = z - cz;
      const dist = Math.hypot(dx, dz);
      const ang = Math.atan2(dz, dx);
      const edgeR = 23.6 + 1.6 * Math.sin(ang * 3 + 0.4) + 0.9 * Math.cos(ang * 5 - 1.1);
      const idx2 = x + GRID_X * z;

      if (dist > edgeR) {
        heightMap[idx2] = -1;
        continue;
      }

      // Base island height
      let h = 10 + 1.0 * Math.sin(x * 0.18) * Math.cos(z * 0.16);

      // NW Highland Plateau
      const dHigh = Math.hypot((x - 14) * 0.95, (z - 15) * 0.9);
      if (dHigh < 13) {
        const t = Math.max(0, 1 - dHigh / 13);
        const smooth = t * t * (3 - 2 * t);
        h += smooth * 4.6;
      }

      // SW Quarry Cliff Ridge
      const dQuarryHill = Math.hypot((x - 8) * 1.1, (z - 31) * 0.9);
      if (dQuarryHill < 8) {
        h += (1 - dQuarryHill / 8) * 5.2;
      }

      // Flatten Windmill terrace (14, 15)
      if (Math.hypot(x - 14, z - 15) < 5.5) {
        h = 14;
      }
      // Flatten Quarry floor (12, 31)
      if (x >= 10 && x <= 16 && z >= 28 && z <= 35) {
        h = 11;
      }
      // Flatten Main Settlement Meadow
      if (x >= 30 && x <= 46 && z >= 13 && z <= 27) {
        h = 10;
      }
      // Flatten Farm Terrace
      if (x >= 37 && x <= 46 && z >= 28 && z <= 36) {
        h = 9;
      }

      // River & Pond carving
      const riv = riverSample(x, z);
      const pondDist = Math.hypot(x - 35, z - 39);
      const headPondDist = Math.hypot(x - 22, z - 10);
      const rivWidth = riv.t > 0.55 ? 2.5 : 1.9;
      const inRiver = riv.dist < rivWidth || pondDist < 4.5 || headPondDist < 3.0;
      const wy = riv.t < 0.24 ? 12 : 8;

      if (inRiver) {
        h = wy - 2;
        if (pondDist < 3.0) h = wy - 3;
        waterMap[idx2] = wy;
      } else if (riv.dist < rivWidth + 1.4 || pondDist < 5.7) {
        h = Math.min(h, wy);
      }

      const hi = Math.round(h);
      heightMap[idx2] = hi;
      if (hi >= 13 && Math.hypot(x - 14, z - 15) > 5.0) {
        isCliff[idx2] = 1;
      }

      const baseY = Math.max(1, Math.round(2 + (dist / edgeR) * 2.5));
      for (let y = baseY; y <= hi; y++) {
        let m = MAT.STONE;
        if (y <= baseY + 1) {
          m = MAT.DARK_STONE;
        } else if (y === hi) {
          if (inRiver) {
            m = (x + z) % 3 === 0 ? MAT.STONE : MAT.SAND;
          } else if (riv.dist < rivWidth + 1.1 || pondDist < 5.4) {
            m = MAT.SAND;
          } else if (x >= 10 && x <= 15 && z >= 28 && z <= 34) {
            m = MAT.STONE; // quarry floor
          } else {
            m = MAT.GRASS;
          }
        } else if (y >= hi - 2 && !inRiver) {
          m = MAT.DIRT;
        }
        grid.set(x, y, z, m);
      }

      // Fill river/pond water + cutaway edge waterfall
      if (waterMap[idx2] > 0) {
        for (let y = hi + 1; y <= wy; y++) {
          const isWaterfall = (riv.t >= 0.21 && riv.t <= 0.28) || dist > edgeR - 1.8;
          if (isWaterfall && hash3(x, y, z) > 0.55) {
            grid.set(x, y, z, MAT.FOAM);
          } else {
            grid.set(x, y, z, MAT.WATER);
          }
        }
      }
    }
  }

  // Cascade waterfall drop off SE island cliff edge
  for (let y = 2; y <= 8; y++) {
    grid.set(39, y, 47, y === 2 ? MAT.FOAM : MAT.WATER);
    grid.set(40, y, 47, (y % 2 === 0) ? MAT.FOAM : MAT.WATER);
    grid.set(39, 2, 48, MAT.FOAM);
    grid.set(40, 2, 48, MAT.FOAM);
  }
  // Upper waterfall splash foam
  grid.set(24, 9, 19, MAT.FOAM);
  grid.set(25, 9, 20, MAT.FOAM);
  grid.set(24, 10, 19, MAT.FOAM);

  // Quarry rock cliff & glowing ore veins (Stage >= 2)
  if (stage >= 2) {
    for (let z = 28; z <= 35; z++) {
      for (let y = 12; y <= 15; y++) {
        grid.set(9, y, z, MAT.DARK_STONE);
        grid.set(8, y, z, MAT.STONE);
      }
    }
    grid.set(9, 13, 30, MAT.ORE_GOLD);
    grid.set(9, 12, 31, MAT.ORE_GOLD);
    grid.set(10, 12, 33, MAT.ORE_CRYSTAL);
    grid.set(10, 13, 33, MAT.ORE_CRYSTAL);
    // Wooden quarry crane
    grid.fillBox(14, 12, 32, 14, 15, 32, MAT.WOOD_DARK);
    grid.fillBox(11, 15, 32, 14, 15, 32, MAT.PLANK);
    grid.set(11, 14, 32, MAT.WOOD_LOG);
    grid.fillBox(12, 12, 30, 13, 12, 31, MAT.STONE);
  }

  // Natural foliage & flowers
  const flowerSpots = [
    [30, 18], [32, 20], [27, 16], [19, 20], [16, 22], [21, 31],
    [35, 13], [44, 15], [45, 25], [29, 34], [25, 39], [17, 13],
  ];
  const fColors = [MAT.FLOWER, MAT.APPLE, MAT.ORE_CRYSTAL];
  for (let i = 0; i < flowerSpots.length; i++) {
    const [fx, fz] = flowerSpots[i];
    const fh = heightMap[fx + GRID_X * fz];
    if (fh > 0 && waterMap[fx + GRID_X * fz] === 0) {
      const fHex = i % 3 === 0 ? 0xffd166 : i % 3 === 1 ? 0xff6b8b : 0x8ecae6;
      grid.set(fx, fh + 1, fz, MAT.FLOWER, fHex, 0.04);
    }
  }

  // Pond lily pads & reeds
  const lilySpots = [[33, 36], [38, 37], [32, 41]];
  for (const [lx, lz] of lilySpots) {
    if (grid.get(lx, 8, lz) === MAT.WATER) {
      grid.set(lx, 9, lz, MAT.LILY_PAD);
      if (lx === 38) grid.set(lx, 10, lz, MAT.LEAF_SAKURA, 0xff8fab, 0.02);
    }
  }
  // Reeds along river shore
  const reedSpots = [[26, 23], [29, 34], [32, 36], [39, 38]];
  for (const [rx, rz] of reedSpots) {
    const rh = heightMap[rx + GRID_X * rz];
    if (rh > 0) {
      grid.set(rx, rh + 1, rz, MAT.LEAF_PINE, 0x52b788, 0.03);
      grid.set(rx, rh + 2, rz, MAT.LEAF_PINE, 0x74c69d, 0.03);
    }
  }

  // Pine trees on NW highland ridge
  const pineSpots = [[11, 10, 9], [16, 9, 10], [8, 17, 8], [10, 23, 9], [18, 22, 8]];
  for (const [px, pz, ph] of pineSpots) {
    const y = heightMap[px + GRID_X * pz];
    if (y > 0) {
      if (stage === 1) plantSapling(grid, px, y + 1, pz);
      else plantPineTree(grid, px, y + 1, pz, stage === 2 ? ph - 2 : ph);
    }
  }

  // Blossom Sakura tree overlooking upper waterfall
  const sy = heightMap[26 + GRID_X * 11];
  if (sy > 0) {
    if (stage === 1) plantSapling(grid, 26, sy + 1, 11);
    else plantSakuraTree(grid, 26, sy + 1, 11);
  }

  // Oak / Apple trees in meadow & south hills
  const oakSpots = [
    [46, 15, 1.1, true],
    [47, 26, 1.0, false],
    [22, 37, 1.1, true],
    [16, 38, 0.95, false],
    [29, 12, 1.0, true],
  ];
  for (const [ox, oz, sc, apples] of oakSpots) {
    const oy = heightMap[ox + GRID_X * oz];
    if (oy > 0) {
      if (stage === 1) plantSapling(grid, ox, oy + 1, oz);
      else plantOakTree(grid, ox, oy + 1, oz, stage === 2 ? sc * 0.8 : sc, stage === 3 && apples);
    }
  }

  const placeLanternAtGround = (lx, lz) => {
    const ly = heightMap[lx + GRID_X * lz];
    if (ly > 0) buildStreetLantern(grid, lx, ly + 1, lz);
  };

  // ---------- Stage-Specific Settlement Buildings ----------

  if (stage === 1) {
    // Stage 1: Explorer's Camp
    buildTent(grid, 35, 11, 17);
    buildCampfire(grid, 32, 11, 25);
    // Log stack & chopping block
    grid.fillBox(38, 11, 24, 40, 11, 25, MAT.WOOD_LOG);
    grid.set(39, 12, 24, MAT.WOOD_LOG);
    grid.set(37, 11, 22, MAT.WOOD_DARK);
    // Stepping stones across river at (28, 27)
    grid.set(26, 9, 27, MAT.STONE);
    grid.set(28, 9, 27, MAT.STONE);
    grid.set(30, 9, 27, MAT.STONE);
    buildSettler(grid, 33, 11, 26, 0xe76f51, 0x264653);
  }

  if (stage >= 2) {
    // Arched Wooden Bridge over river at z=26..28, x=23..31
    for (let x = 23; x <= 31; x++) {
      const arch = (x >= 25 && x <= 29) ? 10 : 9;
      for (let z = 26; z <= 28; z++) {
        grid.set(x, arch, z, MAT.PLANK);
      }
      grid.set(x, arch + 1, 26, MAT.WOOD_DARK);
      grid.set(x, arch + 1, 28, MAT.WOOD_DARK);
    }
    // Bridge posts & lanterns
    placeLanternAtGround(22, 25);
    placeLanternAtGround(32, 25);
    if (stage === 3) {
      placeLanternAtGround(22, 29);
      placeLanternAtGround(32, 29);
    }

    // Wooden Fishing Dock at southern pond
    grid.fillBox(30, 9, 38, 33, 9, 40, MAT.PLANK);
    grid.set(33, 8, 38, MAT.WOOD_DARK);
    grid.set(33, 8, 40, MAT.WOOD_DARK);
    grid.set(33, 10, 38, MAT.LANTERN);

    // Fenced Farm Plots at (38..45, 9, 29..35)
    for (let x = 38; x <= 45; x++) {
      grid.set(x, 10, 29, MAT.WOOD_DARK);
      grid.set(x, 10, 35, MAT.WOOD_DARK);
    }
    for (let z = 29; z <= 35; z++) {
      grid.set(38, 10, z, MAT.WOOD_DARK);
      grid.set(45, 10, z, MAT.WOOD_DARK);
    }
    grid.set(41, 10, 29, MAT.AIR); // gate opening
    for (let z = 30; z <= 34; z++) {
      for (let x = 39; x <= 44; x++) {
        grid.set(x, 9, z, MAT.DIRT, 0x5c3d2e, 0.03);
        if (x % 2 === 1) {
          grid.set(x, 10, z, MAT.WHEAT);
          if (stage === 3) grid.set(x, 11, z, MAT.WHEAT, 0xf4d35e, 0.04);
        } else if (z % 2 === 0) {
          grid.set(x, 10, z, MAT.PUMPKIN);
        }
      }
    }

    // Main House (Cabin in Stage 2 -> Town Manor in Stage 3)
    buildCabin(grid, 33, 10, 14, stage === 3);

    if (stage === 2) {
      buildCampfire(grid, 32, 11, 24);
      buildSettler(grid, 33, 11, 25, 0x457b9d);
      buildSettler(grid, 32, 10, 39, 0x2a9d8f);
    }
  }

  if (stage === 3) {
    // Windmill on NW Plateau (14, 14, 15)
    buildWindmill(grid, 14, 14, 15);

    // Cobblestone road network connecting bridge -> manor -> farm -> windmill stairs
    const roadPts = [
      [32, 27], [33, 27], [34, 27], [35, 27], [36, 27], [37, 27],
      [37, 26], [37, 25], [37, 24], [38, 24],
      [38, 28], [39, 28], [40, 28], [41, 28],
      [22, 27], [21, 27], [20, 26], [19, 25], [18, 24], [17, 23], [16, 22], [15, 21], [14, 20],
    ];
    for (const [rx, rz] of roadPts) {
      const ry = heightMap[rx + GRID_X * rz];
      if (ry > 0 && waterMap[rx + GRID_X * rz] === 0) {
        grid.set(rx, ry, rz, MAT.COBBLE);
        grid.set(rx + 1, ry, rz, MAT.COBBLE);
      }
    }

    // Lumber Workshop & Warehouse at (44, 10, 20) — clear of Manor overhang
    grid.fillBox(44, 10, 19, 47, 10, 23, MAT.COBBLE);
    grid.set(44, 11, 19, MAT.WOOD_DARK);
    grid.set(47, 11, 19, MAT.WOOD_DARK);
    grid.set(44, 11, 23, MAT.WOOD_DARK);
    grid.set(47, 11, 23, MAT.WOOD_DARK);
    grid.set(44, 12, 19, MAT.WOOD_DARK);
    grid.set(47, 12, 19, MAT.WOOD_DARK);
    grid.set(44, 12, 23, MAT.WOOD_DARK);
    grid.set(47, 12, 23, MAT.WOOD_DARK);
    grid.fillBox(43, 13, 18, 48, 13, 24, MAT.ROOF_THATCH);
    grid.fillBox(44, 14, 19, 47, 14, 23, MAT.ROOF_THATCH);
    grid.fillBox(45, 11, 20, 46, 12, 21, MAT.PLANK); // stacked lumber
    grid.set(44, 11, 22, MAT.WOOD_LOG);

    // Market Stall with striped awning at (30..32, 11, 20..22)
    grid.fillBox(29, 11, 21, 31, 11, 21, MAT.PLANK); // counter
    grid.set(29, 12, 21, MAT.APPLE);
    grid.set(31, 12, 21, MAT.PUMPKIN);
    grid.set(29, 12, 22, MAT.WOOD_DARK);
    grid.set(31, 12, 22, MAT.WOOD_DARK);
    grid.set(29, 13, 21, MAT.WOOD_DARK);
    grid.set(31, 13, 21, MAT.WOOD_DARK);
    for (let x = 29; x <= 31; x++) {
      for (let z = 20; z <= 22; z++) {
        grid.set(x, 14, z, MAT.TENT_CANVAS, x % 2 === 0 ? 0xe63946 : 0xf8f9fa, 0.02);
      }
    }

    // Extra Town Lanterns
    placeLanternAtGround(35, 25);
    placeLanternAtGround(41, 27);
    placeLanternAtGround(17, 19);

    // Settlers bringing town to life
    buildSettler(grid, 30, 11, 23, 0xe63946, 0xf4a261); // trader
    buildSettler(grid, 41, 10, 31, 0x2a9d8f, 0xe9c46a); // farmer
    buildSettler(grid, 32, 10, 39, 0x457b9d, 0x8d99ae); // fisher
    buildSettler(grid, 27, 11, 27, 0xf4a261, 0x264653); // walker on bridge!
  }

  return grid;
}

// ---------- Lighting: 3D Grid Sun Raycast + Emissive BFS ----------

export function computePointLights(grid) {
  grid.light.fill(0);
  const { sx, sy, sz, mat, light } = grid;
  const qx = [];
  const qy = [];
  const qz = [];
  const qr = [];
  const qg = [];
  const qb = [];

  for (let y = 0; y < sy; y++) {
    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        const m = grid.get(x, y, z);
        if (isEmissiveMat(m)) {
          let r = 255, g = 180, b = 85;
          if (m === MAT.EMBER) { r = 255; g = 130; b = 45; }
          else if (m === MAT.ORE_CRYSTAL) { r = 60; g = 220; b = 255; }
          else if (m === MAT.GLASS_LIT) { r = 255; g = 190; b = 95; }
          const idx = grid.idx(x, y, z) * 3;
          light[idx] = r;
          light[idx + 1] = g;
          light[idx + 2] = b;
          qx.push(x); qy.push(y); qz.push(z);
          qr.push(r); qg.push(g); qb.push(b);
        }
      }
    }
  }

  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  let head = 0;
  while (head < qx.length) {
    const x = qx[head], y = qy[head], z = qz[head];
    const r = qr[head], g = qg[head], b = qb[head];
    head++;

    const nr = Math.floor(r * 0.78 - 10);
    const ng = Math.floor(g * 0.78 - 10);
    const nb = Math.floor(b * 0.78 - 10);
    if (nr <= 8 && ng <= 8 && nb <= 8) continue;

    for (const [dx, dy, dz] of dirs) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (!grid.inBounds(nx, ny, nz)) continue;
      const nm = grid.get(nx, ny, nz);
      if (nm !== MAT.AIR && nm !== MAT.WATER && nm !== MAT.LEAF_OAK && nm !== MAT.LEAF_SAKURA) continue;
      const atten = (nm === MAT.LEAF_OAK || nm === MAT.LEAF_SAKURA) ? 0.65 : 1.0;
      const cr = Math.max(0, Math.floor(nr * atten));
      const cg = Math.max(0, Math.floor(ng * atten));
      const cb = Math.max(0, Math.floor(nb * atten));
      const li = grid.idx(nx, ny, nz) * 3;
      if (cr > light[li] || cg > light[li + 1] || cb > light[li + 2]) {
        light[li] = Math.max(light[li], cr);
        light[li + 1] = Math.max(light[li + 1], cg);
        light[li + 2] = Math.max(light[li + 2], cb);
        qx.push(nx); qy.push(ny); qz.push(nz);
        qr.push(cr); qg.push(cg); qb.push(cb);
      }
    }
  }
}

const SUN_JITTER = [
  [0, 0, 0],
  [0.06, 0.03, -0.05],
  [-0.06, 0.03, 0.05],
  [0.04, -0.04, 0.06],
  [-0.04, -0.04, -0.06],
];

function computeSunVisibility(grid, fx, fy, fz, sunDir) {
  let lit = 0;
  for (let k = 0; k < SUN_JITTER.length; k++) {
    const j = SUN_JITTER[k];
    let dx = sunDir[0] + j[0];
    let dy = sunDir[1] + j[1];
    let dz = sunDir[2] + j[2];
    const inv = 1 / Math.hypot(dx, dy, dz);
    dx *= inv; dy *= inv; dz *= inv;

    let px = fx + 0.5 + dx * 0.55;
    let py = fy + 0.5 + dy * 0.55;
    let pz = fz + 0.5 + dz * 0.55;

    let blocked = false;
    for (let step = 0; step < 48; step++) {
      const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
      if (ix < 0 || ix >= grid.sx || iy >= grid.sy || iz < 0 || iz >= grid.sz) break;
      if (iy >= 0) {
        const m = grid.get(ix, iy, iz);
        if (m !== MAT.AIR && m !== MAT.WATER && !isEmissiveMat(m)) {
          blocked = true;
          break;
        }
      }
      px += dx * 0.85;
      py += dy * 0.85;
      pz += dz * 0.85;
    }
    if (!blocked) lit += 1;
  }
  return lit / SUN_JITTER.length;
}

// ---------- Mesher with Smooth Voxel AO + Face Winding + Splitting ----------

const FACES = [
  { // +X
    n: [1, 0, 0], t1: [0, 1, 0], t2: [0, 0, 1],
    corners: [[1,0,1], [1,0,0], [1,1,0], [1,1,1]],
    uv: [[0,0], [1,0], [1,1], [0,1]],
  },
  { // -X
    n: [-1, 0, 0], t1: [0, 1, 0], t2: [0, 0, 1],
    corners: [[0,0,0], [0,0,1], [0,1,1], [0,1,0]],
    uv: [[0,0], [1,0], [1,1], [0,1]],
  },
  { // +Y
    n: [0, 1, 0], t1: [1, 0, 0], t2: [0, 0, 1],
    corners: [[0,1,1], [1,1,1], [1,1,0], [0,1,0]],
    uv: [[0,0], [1,0], [1,1], [0,1]],
  },
  { // -Y
    n: [0, -1, 0], t1: [1, 0, 0], t2: [0, 0, 1],
    corners: [[0,0,0], [1,0,0], [1,0,1], [0,0,1]],
    uv: [[0,0], [1,0], [1,1], [0,1]],
  },
  { // +Z
    n: [0, 0, 1], t1: [1, 0, 0], t2: [0, 1, 0],
    corners: [[0,0,1], [1,0,1], [1,1,1], [0,1,1]],
    uv: [[0,0], [1,0], [1,1], [0,1]],
  },
  { // -Z
    n: [0, 0, -1], t1: [1, 0, 0], t2: [0, 1, 0],
    corners: [[1,0,0], [0,0,0], [0,1,0], [1,1,0]],
    uv: [[0,0], [1,0], [1,1], [0,1]],
  },
];

const AO_CURVE = [0.46, 0.67, 0.84, 1.0];

function vertexAO(grid, x, y, z, face, corner) {
  const [nx, ny, nz] = face.n;
  const fx = x + nx, fy = y + ny, fz = z + nz;
  const [t1x, t1y, t1z] = face.t1;
  const [t2x, t2y, t2z] = face.t2;

  const c1 = corner[0] * t1x + corner[1] * t1y + corner[2] * t1z;
  const c2 = corner[0] * t2x + corner[1] * t2y + corner[2] * t2z;
  const s1 = c1 === 1 ? 1 : -1;
  const s2 = c2 === 1 ? 1 : -1;

  const side1 = isOpaqueOccluder(grid.get(fx + s1 * t1x, fy + s1 * t1y, fz + s1 * t1z)) ? 1 : 0;
  const side2 = isOpaqueOccluder(grid.get(fx + s2 * t2x, fy + s2 * t2y, fz + s2 * t2z)) ? 1 : 0;
  if (side1 && side2) return AO_CURVE[0];
  const diag = isOpaqueOccluder(
    grid.get(fx + s1 * t1x + s2 * t2x, fy + s1 * t1y + s2 * t2y, fz + s1 * t1z + s2 * t2z)
  ) ? 1 : 0;
  return AO_CURVE[3 - (side1 + side2 + diag)];
}

export function buildVoxelMesh(grid, sunDir = [0.55, 0.72, 0.42], options = {}) {
  const { skipShadows = false, skipPointLights = false, centerOrigin = false } = options;
  if (!skipPointLights) computePointLights(grid);

  const ox = centerOrigin ? -grid.sx * 0.5 : 0;
  const oy = centerOrigin ? -grid.sy * 0.5 : 0;
  const oz = centerOrigin ? -grid.sz * 0.5 : 0;

  const makeBuf = () => ({
    pos: [],
    norm: [],
    col: [],
    uv: [],
    ao: [],
    sun: [],
    ptLight: [],
    emissive: [],
    idx: [],
  });

  const opaque = makeBuf();
  const water = makeBuf();

  for (let y = 0; y < grid.sy; y++) {
    for (let z = 0; z < grid.sz; z++) {
      for (let x = 0; x < grid.sx; x++) {
        const m = grid.get(x, y, z);
        if (m === MAT.AIR) continue;
        const isWater = m === MAT.WATER;
        const buf = isWater ? water : opaque;
        const hex = grid.getCol(x, y, z);
        const r = ((hex >> 16) & 255) / 255;
        const g = ((hex >> 8) & 255) / 255;
        const b = (hex & 255) / 255;
        const em = isEmissiveMat(m) ? 1.0 : 0.0;

        for (let fi = 0; fi < 6; fi++) {
          const f = FACES[fi];
          const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
          const nb = grid.get(nx, ny, nz);

          if (isWater) {
            if (nb === MAT.WATER || isOpaqueOccluder(nb)) continue;
          } else {
            if (isOpaqueOccluder(nb)) continue;
          }

          const sunVis = skipShadows ? 1.0 : computeSunVisibility(grid, x, y, z, sunDir);
          let lr = 0, lg = 0, lb = 0;
          if (!skipPointLights && grid.inBounds(nx, ny, nz)) {
            const li = grid.idx(nx, ny, nz) * 3;
            lr = grid.light[li] / 255;
            lg = grid.light[li + 1] / 255;
            lb = grid.light[li + 2] / 255;
          }

          const baseV = buf.pos.length / 3;
          const aos = [0, 0, 0, 0];
          for (let ci = 0; ci < 4; ci++) {
            const c = f.corners[ci];
            const ao = isWater ? 1.0 : vertexAO(grid, x, y, z, f, c);
            aos[ci] = ao;
            buf.pos.push(x + c[0] + ox, y + c[1] + oy, z + c[2] + oz);
            buf.norm.push(f.n[0], f.n[1], f.n[2]);
            buf.col.push(r, g, b);
            buf.uv.push(f.uv[ci][0], f.uv[ci][1]);
            buf.ao.push(ao);
            buf.sun.push(sunVis);
            buf.ptLight.push(lr, lg, lb);
            buf.emissive.push(em);
          }

          // Anisotropy-free quad split
          if (aos[0] + aos[2] > aos[1] + aos[3]) {
            buf.idx.push(baseV, baseV + 1, baseV + 2, baseV, baseV + 2, baseV + 3);
          } else {
            buf.idx.push(baseV + 1, baseV + 2, baseV + 3, baseV + 1, baseV + 3, baseV);
          }
        }
      }
    }
  }

  return { opaque, water };
}

// ---------- Standalone Modular Asset Generators (for game kits) ----------

export function buildSingleAssetGrid(name) {
  if (name === 'tree_oak') {
    const g = new VoxelGrid(11, 14, 11);
    plantOakTree(g, 5, 0, 5, 1.15, true);
    return g;
  }
  if (name === 'tree_pine') {
    const g = new VoxelGrid(9, 13, 9);
    plantPineTree(g, 4, 0, 4, 10);
    return g;
  }
  if (name === 'tree_sakura') {
    const g = new VoxelGrid(11, 12, 11);
    plantSakuraTree(g, 5, 0, 5);
    return g;
  }
  if (name === 'cabin') {
    const g = new VoxelGrid(14, 14, 14);
    buildCabin(g, 2, 0, 3, false);
    return g;
  }
  if (name === 'manor') {
    const g = new VoxelGrid(16, 17, 16);
    buildCabin(g, 2, 0, 3, true);
    return g;
  }
  if (name === 'windmill') {
    const g = new VoxelGrid(17, 20, 17);
    buildWindmill(g, 8, 0, 8);
    const sails = buildWindmillSailGrid();
    for (let y = 0; y < sails.sy; y++) {
      for (let z = 0; z < sails.sz; z++) {
        for (let x = 0; x < sails.sx; x++) {
          const m = sails.get(x, y, z);
          if (m !== MAT.AIR) g.set(1 + x, 3 + y, 12 + z, m, sails.getCol(x, y, z), 0);
        }
      }
    }
    return g;
  }
  return buildValleyScene(3);
}

export function mergeGrid(target, src, ox, oy, oz) {
  for (let y = 0; y < src.sy; y++) {
    for (let z = 0; z < src.sz; z++) {
      for (let x = 0; x < src.sx; x++) {
        const m = src.get(x, y, z);
        if (m !== MAT.AIR) {
          target.set(ox + x, oy + y, oz + z, m, src.getCol(x, y, z), 0);
        }
      }
    }
  }
}

export function buildExportableValley(stage = 3) {
  const grid = buildValleyScene(stage);
  if (stage >= 2) {
    mergeGrid(grid, buildBoatGrid(), 34, 8, 36);
  }
  if (stage === 3) {
    mergeGrid(grid, buildWindmillSailGrid(), 7, 17, 18);
  }
  return grid;
}

// ---------- Binary glTF 2.0 (.GLB) Exporter ----------

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function exportGridToGLB(grid, scale = 0.5) {
  const { opaque, water } = buildVoxelMesh(grid, [0.55, 0.72, 0.42], { skipPointLights: false });
  const cx = grid.sx * 0.5;
  const cz = grid.sz * 0.5;

  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  const primitives = [];
  const materials = [];
  let byteOffset = 0;

  function appendTyped(arr) {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    chunks.push(bytes);
    const viewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: bytes.byteLength,
    });
    byteOffset += bytes.byteLength;
    const pad = (4 - (byteOffset % 4)) % 4;
    if (pad > 0) {
      chunks.push(new Uint8Array(pad));
      byteOffset += pad;
    }
    return viewIndex;
  }

  function addPrimitive(buf, matIndex) {
    if (buf.pos.length === 0) return;
    const vCount = buf.pos.length / 3;
    const posArr = new Float32Array(buf.pos.length);
    const normArr = new Float32Array(buf.norm);
    const colArr = new Float32Array(buf.col.length);
    const idxArr = new Uint32Array(buf.idx);

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    for (let i = 0; i < vCount; i++) {
      const px = (buf.pos[i * 3] - cx) * scale;
      const py = buf.pos[i * 3 + 1] * scale;
      const pz = (buf.pos[i * 3 + 2] - cz) * scale;
      posArr[i * 3] = px;
      posArr[i * 3 + 1] = py;
      posArr[i * 3 + 2] = pz;
      if (px < min[0]) min[0] = px;
      if (py < min[1]) min[1] = py;
      if (pz < min[2]) min[2] = pz;
      if (px > max[0]) max[0] = px;
      if (py > max[1]) max[1] = py;
      if (pz > max[2]) max[2] = pz;

      // Bake gentle voxel AO into exported vertex color (linear RGB for glTF 2.0 spec)
      const ao = 0.55 + 0.45 * buf.ao[i];
      colArr[i * 3] = srgbToLinear(Math.min(1, buf.col[i * 3] * ao));
      colArr[i * 3 + 1] = srgbToLinear(Math.min(1, buf.col[i * 3 + 1] * ao));
      colArr[i * 3 + 2] = srgbToLinear(Math.min(1, buf.col[i * 3 + 2] * ao));
    }

    const posView = appendTyped(posArr);
    const normView = appendTyped(normArr);
    const colView = appendTyped(colArr);
    const idxView = appendTyped(idxArr);

    const posAcc = accessors.length;
    accessors.push({ bufferView: posView, componentType: 5126, count: vCount, type: 'VEC3', min, max });
    const normAcc = accessors.length;
    accessors.push({ bufferView: normView, componentType: 5126, count: vCount, type: 'VEC3' });
    const colAcc = accessors.length;
    accessors.push({ bufferView: colView, componentType: 5126, count: vCount, type: 'VEC3' });
    const idxAcc = accessors.length;
    accessors.push({ bufferView: idxView, componentType: 5125, count: idxArr.length, type: 'SCALAR' });

    primitives.push({
      attributes: { POSITION: posAcc, NORMAL: normAcc, COLOR_0: colAcc },
      indices: idxAcc,
      material: matIndex,
    });
  }

  materials.push({
    name: 'VoxelOpaque',
    pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0.04, roughnessFactor: 0.88 },
  });
  addPrimitive(opaque, 0);

  if (water.pos.length > 0) {
    materials.push({
      name: 'VoxelWater',
      alphaMode: 'BLEND',
      pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 0.78], metallicFactor: 0.1, roughnessFactor: 0.2 },
    });
    addPrimitive(water, 1);
  }

  const gltf = {
    asset: { version: '2.0', generator: 'Whisperwood Voxel Engine' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'VoxelDiorama' }],
    meshes: [{ name: 'VoxelMesh', primitives }],
    materials,
    bufferViews,
    accessors,
    buffers: [{ byteLength: byteOffset }],
  };

  const jsonStr = JSON.stringify(gltf);
  const encoder = new TextEncoder();
  const jsonBytesRaw = encoder.encode(jsonStr);
  const jsonPad = (4 - (jsonBytesRaw.length % 4)) % 4;
  const jsonLen = jsonBytesRaw.length + jsonPad;

  const totalLen = 12 + 8 + jsonLen + 8 + byteOffset;
  const out = new Uint8Array(totalLen);
  const dv = new DataView(out.buffer);

  // Header
  dv.setUint32(0, 0x46546C67, true); // 'glTF'
  dv.setUint32(4, 2, true);
  dv.setUint32(8, totalLen, true);

  // JSON Chunk
  dv.setUint32(12, jsonLen, true);
  dv.setUint32(16, 0x4E4F534A, true); // 'JSON'
  out.set(jsonBytesRaw, 20);
  for (let i = 0; i < jsonPad; i++) out[20 + jsonBytesRaw.length + i] = 0x20;

  // BIN Chunk
  const binOff = 20 + jsonLen;
  dv.setUint32(binOff, byteOffset, true);
  dv.setUint32(binOff + 4, 0x004E4942, true); // 'BIN\0'
  let p = binOff + 8;
  for (const c of chunks) {
    out.set(c, p);
    p += c.byteLength;
  }

  return out;
}
