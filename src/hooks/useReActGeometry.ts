/**
 * file: useReActGeometry.ts
 * description: P3 ReAct-C 九步环纯几何 · 节点圆周坐标/Step7→Step5 回环曲线
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [hook],[p3],[geometry]
 *
 * brief: 760 viewBox 设计坐标下的九步节点布局与回环路径计算（纯派生，无状态）
 *
 * dependencies: react
 * exports: useReActGeometry, ReactNodePosition
 */

export interface ReactNodePosition {
  x: number;
  y: number;
  angleDeg: number;
}

export function useReActGeometry(count: number) {
  // Center coordinates for 9-step circle（760 viewBox 设计坐标）
  const cx = 380;
  const cy = 380;
  const radius = 260;

  // Calculate coordinates for the 9 nodes
  const nodePositions = Array.from({ length: count }).map((_, i) => {
    const angleDeg = -90 + i * 40; // 360 / 9 = 40 deg
    const rad = angleDeg * (Math.PI / 180);
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
      angleDeg,
    };
  });

  // Calculate Step 7 to Step 5 loopback curved path
  const step7Pos = nodePositions[6]; // index 6 is Step 7
  const step5Pos = nodePositions[4]; // index 4 is Step 5
  // Control point curving toward center
  const loopbackControlX = cx - 40;
  const loopbackControlY = cy + 130;
  const loopbackPath = `M ${step7Pos.x} ${step7Pos.y} Q ${loopbackControlX} ${loopbackControlY} ${step5Pos.x} ${step5Pos.y}`;

  return { cx, cy, radius, nodePositions, step7Pos, step5Pos, loopbackControlX, loopbackControlY, loopbackPath };
}
