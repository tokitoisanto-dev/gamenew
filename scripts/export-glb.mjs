import fs from 'node:fs';
import path from 'node:path';
import {
  buildExportableValley,
  buildSingleAssetGrid,
  buildVoxelMesh,
  exportGridToGLB,
} from '../src/voxel-engine.js';

const outDir = path.resolve('assets');
fs.mkdirSync(outDir, { recursive: true });

function verifyGLB(bytes, label) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = dv.getUint32(0, true);
  const version = dv.getUint32(4, true);
  const totalLength = dv.getUint32(8, true);
  if (magic !== 0x46546C67 || version !== 2 || totalLength !== bytes.byteLength) {
    throw new Error(`Invalid GLB header in ${label}`);
  }
  const jsonLen = dv.getUint32(12, true);
  const jsonType = dv.getUint32(16, true);
  if (jsonType !== 0x4E4F534A) throw new Error(`Invalid JSON chunk in ${label}`);
  const jsonText = new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen)).trim();
  const gltf = JSON.parse(jsonText);
  const binOff = 20 + jsonLen;
  const binLen = dv.getUint32(binOff, true);
  const binType = dv.getUint32(binOff + 4, true);
  if (binType !== 0x004E4942) throw new Error(`Invalid BIN chunk in ${label}`);
  if (binOff + 8 + binLen !== totalLength) throw new Error(`BIN length mismatch in ${label}`);
  return {
    primitives: gltf.meshes[0].primitives.length,
    accessors: gltf.accessors.length,
    bytes: bytes.byteLength,
  };
}

const exportsList = [
  { name: 'valley_stage1_camp.glb', grid: buildExportableValley(1) },
  { name: 'valley_stage2_settlement.glb', grid: buildExportableValley(2) },
  { name: 'valley_stage3_town.glb', grid: buildExportableValley(3) },
  { name: 'prop_tree_oak.glb', grid: buildSingleAssetGrid('tree_oak') },
  { name: 'prop_tree_pine.glb', grid: buildSingleAssetGrid('tree_pine') },
  { name: 'prop_tree_sakura.glb', grid: buildSingleAssetGrid('tree_sakura') },
  { name: 'prop_cabin.glb', grid: buildSingleAssetGrid('cabin') },
  { name: 'prop_manor.glb', grid: buildSingleAssetGrid('manor') },
  { name: 'prop_windmill.glb', grid: buildSingleAssetGrid('windmill') },
];

for (const item of exportsList) {
  const t0 = performance.now();
  const glb = exportGridToGLB(item.grid, 0.5);
  const info = verifyGLB(glb, item.name);
  const mesh = buildVoxelMesh(item.grid, [0.55, 0.72, 0.42], { skipShadows: true });
  const tris = (mesh.opaque.idx.length + mesh.water.idx.length) / 3;
  const outPath = path.join(outDir, item.name);
  fs.writeFileSync(outPath, glb);
  const dt = (performance.now() - t0).toFixed(1);
  console.log(
    `[OK] ${item.name.padEnd(30)} | voxels=${String(item.grid.countSolid()).padStart(5)} | tris=${String(tris).padStart(6)} | size=${(info.bytes / 1024).toFixed(1)} KB | ${dt} ms`
  );
}
