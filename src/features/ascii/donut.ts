// 밝기 순서대로 늘어놓은 글자. 뒤로 갈수록 빛을 많이 받은 면이다.
const RAMP = '.,-~:;=!*#$@';

// 회전하는 도넛 한 장면을 cols×rows 글자판으로 그린다. (Andy Sloane의 donut.c 계산식)
// A, B는 두 축의 회전각(라디안)이다.
export function donutFrame(A: number, B: number, cols: number, rows: number) {
  const out = new Array<string>(cols * rows).fill(' ');
  const depth = new Float32Array(cols * rows);
  const cA = Math.cos(A);
  const sA = Math.sin(A);
  const cB = Math.cos(B);
  const sB = Math.sin(B);
  // 글자 칸은 세로가 가로의 두 배쯤이라 세로 배율을 절반으로 잡아야 둥글게 보인다
  const kx = cols * 0.375;
  const ky = kx * 0.52;

  for (let j = 0; j < 6.28; j += 0.07) {
    const ct = Math.cos(j);
    const st = Math.sin(j);
    for (let i = 0; i < 6.28; i += 0.02) {
      const sp = Math.sin(i);
      const cp = Math.cos(i);
      const h = ct + 2;
      const D = 1 / (sp * h * sA + st * cA + 5);
      const t = sp * h * cA - st * sA;
      const x = Math.floor(cols / 2 + kx * D * (cp * h * cB - t * sB));
      const y = Math.floor(rows / 2 + ky * D * (cp * h * sB + t * cB));
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
      const o = x + cols * y;
      if (D <= depth[o]) continue;
      const light = Math.floor(
        8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB)
      );
      depth[o] = D;
      out[o] = RAMP[light > 0 ? light : 0];
    }
  }

  const lines: string[] = [];
  for (let r = 0; r < rows; r++)
    lines.push(out.slice(r * cols, (r + 1) * cols).join(''));
  return lines.join('\n');
}
