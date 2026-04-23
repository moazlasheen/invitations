/**
 * QR Code generator using a lightweight canvas approach.
 * Encodes text into a QR code and returns a data URL.
 *
 * We use the built-in QR encoding from the html5-qrcode library's
 * underlying zxing, but since that's scanner-only, we implement a
 * minimal QR encoder here using the QR code algorithm.
 *
 * For simplicity and reliability, we generate QR codes via a trusted
 * public API endpoint that returns SVG, then convert to data URL.
 *
 * UPDATE: To avoid external dependencies, we generate QR codes using
 * a minimal inline implementation.
 */

// ---- Minimal QR Code Generator (Mode: Byte, ECC: L) ----
// Based on the QR code specification for version 1-10

const EC_CODEWORDS_TABLE: Record<number, number[]> = {
  // [total, ec_per_block, blocks_group1, data_per_block_g1, blocks_group2, data_per_block_g2]
  1: [26, 7, 1, 19, 0, 0],
  2: [44, 10, 1, 34, 0, 0],
  3: [70, 15, 1, 55, 0, 0],
  4: [100, 20, 1, 80, 0, 0],
  5: [134, 26, 1, 108, 0, 0],
  6: [172, 18, 2, 68, 0, 0],
  7: [196, 20, 2, 78, 0, 0],
  8: [242, 24, 2, 97, 0, 0],
  9: [292, 30, 2, 116, 0, 0],
  10: [346, 18, 2, 68, 2, 69],
};

function getVersion(dataLength: number): number {
  const capacities = [17, 32, 53, 78, 106, 134, 154, 192, 230, 271];
  for (let v = 0; v < capacities.length; v++) {
    if (dataLength <= capacities[v]) return v + 1;
  }
  return 10; // max we support
}

function getModuleCount(version: number): number {
  return 17 + version * 4;
}

// GF(256) math for Reed-Solomon
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x << 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGenPoly(nsym: number): Uint8Array {
  let g = new Uint8Array([1]);
  for (let i = 0; i < nsym; i++) {
    const ng = new Uint8Array(g.length + 1);
    for (let j = 0; j < g.length; j++) {
      ng[j] ^= g[j];
      ng[j + 1] ^= gfMul(g[j], GF_EXP[i]);
    }
    g = ng;
  }
  return g;
}

function rsEncode(data: Uint8Array, nsym: number): Uint8Array {
  const gen = rsGenPoly(nsym);
  const res = new Uint8Array(data.length + nsym);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

function encodeData(text: string, version: number): Uint8Array {
  const info = EC_CODEWORDS_TABLE[version];
  const totalCodewords = info[0];
  const ecPerBlock = info[1];
  const blocksG1 = info[2];
  const dataPerBlockG1 = info[3];
  const blocksG2 = info[4];
  const dataPerBlockG2 = info[5];
  const totalDataCodewords = blocksG1 * dataPerBlockG1 + blocksG2 * dataPerBlockG2;

  // Byte mode indicator (0100) + character count
  const bytes = new TextEncoder().encode(text);
  const bits: number[] = [];

  // Mode: byte = 0100
  bits.push(0, 1, 0, 0);

  // Character count (8 bits for v1-9, 16 bits for v10+)
  const ccBits = version <= 9 ? 8 : 16;
  for (let i = ccBits - 1; i >= 0; i--) {
    bits.push((bytes.length >> i) & 1);
  }

  // Data
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((b >> i) & 1);
    }
  }

  // Terminator
  const maxBits = totalDataCodewords * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) {
    bits.push(0);
  }

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    for (let i = 7; i >= 0; i--) {
      bits.push((padBytes[padIdx] >> i) & 1);
    }
    padIdx = (padIdx + 1) % 2;
  }

  // Convert to bytes
  const dataBytes = new Uint8Array(totalDataCodewords);
  for (let i = 0; i < totalDataCodewords; i++) {
    let val = 0;
    for (let j = 0; j < 8; j++) {
      val = (val << 1) | (bits[i * 8 + j] || 0);
    }
    dataBytes[i] = val;
  }

  // Split into blocks
  const blocks: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < blocksG1; i++) {
    blocks.push(dataBytes.slice(offset, offset + dataPerBlockG1));
    offset += dataPerBlockG1;
  }
  for (let i = 0; i < blocksG2; i++) {
    blocks.push(dataBytes.slice(offset, offset + dataPerBlockG2));
    offset += dataPerBlockG2;
  }

  // Generate EC for each block
  const ecBlocks: Uint8Array[] = [];
  for (const block of blocks) {
    ecBlocks.push(rsEncode(block, ecPerBlock));
  }

  // Interleave data
  const result: number[] = [];
  const maxDataLen = Math.max(dataPerBlockG1, dataPerBlockG2);
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]);
    }
  }

  // Interleave EC
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) result.push(ec[i]);
    }
  }

  return new Uint8Array(result);
}

// Alignment pattern positions
const ALIGNMENT_POSITIONS: Record<number, number[]> = {
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

function createMatrix(version: number): { matrix: number[][]; reserved: boolean[][] } {
  const size = getModuleCount(version);
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder patterns
  function placeFinderPattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr < 0 || mr >= size || mc < 0 || mc >= size) continue;
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[mr][mc] = 1;
        } else {
          matrix[mr][mc] = 0;
        }
        reserved[mr][mc] = true;
      }
    }
  }

  placeFinderPattern(0, 0);
  placeFinderPattern(0, size - 7);
  placeFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    reserved[6][i] = true;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
    reserved[i][6] = true;
  }

  // Alignment patterns
  if (version >= 2) {
    const positions = ALIGNMENT_POSITIONS[version];
    for (const r of positions) {
      for (const c of positions) {
        // Skip if overlapping with finder patterns
        if (r <= 8 && c <= 8) continue;
        if (r <= 8 && c >= size - 8) continue;
        if (r >= size - 8 && c <= 8) continue;

        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const mr = r + dr;
            const mc = c + dc;
            if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
              if (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)) {
                matrix[mr][mc] = 1;
              } else {
                matrix[mr][mc] = 0;
              }
              reserved[mr][mc] = true;
            }
          }
        }
      }
    }
  }

  // Dark module
  matrix[size - 8][8] = 1;
  reserved[size - 8][8] = true;

  // Reserve format info areas
  for (let i = 0; i < 8; i++) {
    reserved[8][i] = true;
    reserved[8][size - 1 - i] = true;
    reserved[i][8] = true;
    reserved[size - 1 - i][8] = true;
  }
  reserved[8][8] = true;

  // Reserve version info areas (v7+)
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        reserved[i][size - 11 + j] = true;
        reserved[size - 11 + j][i] = true;
      }
    }
  }

  return { matrix, reserved };
}

function placeData(matrix: number[][], reserved: boolean[][], data: Uint8Array) {
  const size = matrix.length;
  let bitIndex = 0;
  const totalBits = data.length * 8;

  let col = size - 1;
  let goingUp = true;

  while (col >= 0) {
    if (col === 6) col--; // Skip timing column

    const rowRange = goingUp
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rowRange) {
      for (let c = 0; c < 2; c++) {
        const curCol = col - c;
        if (curCol < 0) continue;
        if (reserved[row][curCol]) continue;

        if (bitIndex < totalBits) {
          const byteIdx = Math.floor(bitIndex / 8);
          const bitIdx = 7 - (bitIndex % 8);
          matrix[row][curCol] = (data[byteIdx] >> bitIdx) & 1;
          bitIndex++;
        }
      }
    }

    col -= 2;
    goingUp = !goingUp;
  }
}

// Mask patterns
const MASK_FUNCTIONS = [
  (r: number, c: number) => (r + c) % 2 === 0,
  (r: number, _c: number) => r % 2 === 0,
  (_r: number, c: number) => c % 3 === 0,
  (r: number, c: number) => (r + c) % 3 === 0,
  (r: number, c: number) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r: number, c: number) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r: number, c: number) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r: number, c: number) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(matrix: number[][], reserved: boolean[][], maskIndex: number): number[][] {
  const size = matrix.length;
  const result = matrix.map((row) => [...row]);
  const fn = MASK_FUNCTIONS[maskIndex];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && fn(r, c)) {
        result[r][c] ^= 1;
      }
    }
  }

  return result;
}

// Format info (ECC Level L = 01, mask 0-7)
const FORMAT_INFO_STRINGS: string[] = [
  '111011111000100',
  '111001011110011',
  '111110110101010',
  '111100010011101',
  '110011000101111',
  '110001100011000',
  '110110001000001',
  '110100101110110',
];

function placeFormatInfo(matrix: number[][], maskIndex: number) {
  const size = matrix.length;
  const formatBits = FORMAT_INFO_STRINGS[maskIndex];

  // Around top-left finder
  const positions1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];

  for (let i = 0; i < 15; i++) {
    matrix[positions1[i][0]][positions1[i][1]] = parseInt(formatBits[i]);
  }

  // Around other finders
  const positions2 = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
    [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5],
    [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
  ];

  for (let i = 0; i < 15; i++) {
    matrix[positions2[i][0]][positions2[i][1]] = parseInt(formatBits[i]);
  }
}

function penaltyScore(matrix: number[][]): number {
  const size = matrix.length;
  let score = 0;

  // Rule 1: consecutive same-color modules in row/col
  for (let r = 0; r < size; r++) {
    let count = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) {
        count++;
        if (count === 5) score += 3;
        else if (count > 5) score += 1;
      } else {
        count = 1;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let count = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) {
        count++;
        if (count === 5) score += 3;
        else if (count > 5) score += 1;
      } else {
        count = 1;
      }
    }
  }

  // Rule 4: proportion of dark modules
  let dark = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) dark++;
    }
  }
  const total = size * size;
  const pct = (dark / total) * 100;
  const prev5 = Math.floor(pct / 5) * 5;
  const next5 = prev5 + 5;
  score += Math.min(Math.abs(prev5 - 50) / 5, Math.abs(next5 - 50) / 5) * 10;

  return score;
}

function generateQRMatrix(text: string): number[][] {
  const version = getVersion(new TextEncoder().encode(text).length);
  const data = encodeData(text, version);
  const { matrix, reserved } = createMatrix(version);

  placeData(matrix, reserved, data);

  // Try all masks, pick best
  let bestMask = 0;
  let bestScore = Infinity;

  for (let m = 0; m < 8; m++) {
    const masked = applyMask(matrix, reserved, m);
    placeFormatInfo(masked, m);
    const score = penaltyScore(masked);
    if (score < bestScore) {
      bestScore = score;
      bestMask = m;
    }
  }

  const finalMatrix = applyMask(matrix, reserved, bestMask);
  placeFormatInfo(finalMatrix, bestMask);

  return finalMatrix;
}

export async function generateQRDataUrl(text: string): Promise<string> {
  const matrix = generateQRMatrix(text);
  const moduleCount = matrix.length;
  const margin = 4;
  const moduleSize = 8;
  const totalSize = (moduleCount + margin * 2) * moduleSize;

  const canvas = document.createElement('canvas');
  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalSize, totalSize);

  // Draw modules
  ctx.fillStyle = '#222222';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c] === 1) {
        ctx.fillRect(
          (c + margin) * moduleSize,
          (r + margin) * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }

  return canvas.toDataURL('image/png');
}
