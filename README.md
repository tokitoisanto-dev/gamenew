# Thung lũng Khởi Nguyên — Voxel 3D Kit (`gamenew`)

Bộ khởi đầu mô hình 3D phong cách **Voxel** cho game xây dựng, trồng trọt, thu thập tài nguyên và phát triển khu vực.

## Cấu trúc dự án

- `index.html` — Trình xem 3D WebGL chạy độc lập (không cần server, có thể mở trực tiếp trên trình duyệt), hỗ trợ chuyển 3 giai đoạn phát triển khu vực, 4 mốc thời gian ánh sáng, trồng cây/đặt đèn trực tiếp lên đảo và xuất file `.glb`.
- `src/voxel-engine.js` — Engine sinh thế giới Voxel, thuật toán Ambient Occlusion mượt, bóng đổ mặt trời mềm (5-tap raycast), ánh sáng điểm lan truyền 3D (BFS) và bộ xuất nhị phân glTF 2.0 (`.glb`).
- `scripts/export-glb.mjs` — Script Node.js xuất hàng loạt file `.glb` vào `assets/`.
- `assets/` — Các file mô hình `.glb` đã xuất sẵn (`valley_stage1_camp.glb`, `valley_stage2_settlement.glb`, `valley_stage3_town.glb`, `prop_tree_oak.glb`, `prop_tree_pine.glb`, `prop_tree_sakura.glb`, `prop_cabin.glb`, `prop_manor.glb`, `prop_windmill.glb`) dùng trực tiếp cho Three.js, Godot, Unity, Blender hoặc Roblox.

## Cách đưa về thư mục `D:\gamewwebb` trên máy Windows

1. Mở PowerShell hoặc Command Prompt và clone repo này vào `D:\gamewwebb`:
   ```powershell
   git clone https://github.com/tokitoisanto-dev/gamenew.git D:\gamewwebb
   ```
   *(Nếu `D:\gamewwebb` đã tồn tại, chạy `git pull` bên trong thư mục đó sau khi đã remote tới repo.)*
2. Mở trực tiếp `D:\gamewwebb\index.html` bằng trình duyệt (Chrome / Edge) để xem cảnh 3D Voxel ngay lập tức.
3. Để xuất lại các file `.glb` sau khi chỉnh sửa `src/voxel-engine.js`:
   ```powershell
   npm run export-glb
   ```