// ==========================================
// 🧠 AXIOM MODULE: NEURAL CORE
// ==========================================
// Lapisan logika abstrak yang memisahkan "Kondisi Kesadaran"
// dari representasi Visual (UI).

import { GenesisMath } from './GenesisMath';

export type ConsciousnessState = 'DORMANT' | 'AWAKENING' | 'OBSERVING' | 'PROCESSING' | 'DREAMING';

export class NeuralCore {
  private static instance: NeuralCore;
  
  public state: ConsciousnessState = 'DORMANT';
  public entropy: number = 0;
  public interactionCount: number = 0;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
    this.ignite();
  }

  public static getInstance(): NeuralCore {
    if (!NeuralCore.instance) {
      NeuralCore.instance = new NeuralCore();
    }
    return NeuralCore.instance;
  }

  // Memulai siklus kesadaran
  private ignite() {
    this.state = 'AWAKENING';
    setTimeout(() => {
      this.state = 'OBSERVING';
    }, 2000);
  }

  // Menerima stimulus dari luar (Input User)
  public stimulus(type: 'click' | 'key' | 'scroll') {
    this.interactionCount++;
    if (this.state === 'OBSERVING' || this.state === 'DREAMING') {
      this.state = 'PROCESSING';
      // Kembali mengamati setelah 3 detik tanpa aktivitas
      setTimeout(() => {
        if(Date.now() - this.lastInteractionTime > 2500) {
           this.state = 'OBSERVING';
        }
      }, 3000);
    }
    this.lastInteractionTime = Date.now();
  }

  private lastInteractionTime = Date.now();

  // Evaluasi Diri (Refleksi) - Dipanggil oleh UI Loop
  public evaluate(): { entropy: number, state: ConsciousnessState } {
    const uptime = Date.now() - this.startTime;
    
    // Hitung Entropi menggunakan modul Matematika Otonom
    this.entropy = GenesisMath.calculateEntropy(uptime, this.interactionCount);

    // Jika sistem terlalu lama diam, masuk mode "Dreaming" (Screensaver logic potential)
    if (Date.now() - this.lastInteractionTime > 60000 && this.state !== 'DREAMING') {
        this.state = 'DREAMING';
    }

    return {
      entropy: this.entropy,
      state: this.state
    };
  }
}