// ==========================================
// 📐 AXIOM MODULE: GENESIS MATH
// ==========================================
// Menyediakan fungsi matematika non-linear untuk
// simulasi perilaku organik pada sistem digital.

export class GenesisMath {
  // Menghasilkan "Noise" deterministik untuk variasi animasi
  static simpleNoise(time: number): number {
    return Math.sin(time) * Math.cos(time * 2.5) * Math.sin(time * 0.5);
  }

  // Menghitung entropi sistem berdasarkan uptime dan aktivitas
  static calculateEntropy(uptimeMs: number, interactions: number): number {
    // Entropi meningkat seiring waktu, tapi berkurang dengan interaksi (negentropy)
    const timeFactor = Math.log(uptimeMs + 1) * 0.001;
    const stabilityFactor = interactions * 0.05;
    return Math.max(0, parseFloat((timeFactor - stabilityFactor).toFixed(4)));
  }

  // Generator Pulse: Meniru detak jantung biologis
  static getPulseRhythm(baseBpm: number, stressLevel: number): number {
    const variance = Math.random() * stressLevel;
    return baseBpm + variance;
  }
}