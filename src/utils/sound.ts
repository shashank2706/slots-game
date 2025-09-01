import { Howl, Howler, HowlOptions } from 'howler';

type SoundMap = Record<string, Howl>;

class SoundPlayer {
  private sounds: SoundMap = {};

  add(alias: string, src: string, opts: Partial<HowlOptions> = {}): void {  
    console.log(`Sound added: ${alias} from ${src}`);
    try {
      // replace existing (useful during HMR)
      this.sounds[alias]?.unload();
      this.sounds[alias] = new Howl({
        src: [src],          // you can pass multiple formats: [webm, mp3]
        preload: true,
        volume: 1.0,
        html5: false,        // set true for long streams; false is fine for sfx
        ...opts,
      });
    } catch (e) {
      console.error(`[sound] add failed for "${alias}"`, e);
    }
  }

  play(alias: string, opts: { volume?: number; loop?: boolean; rate?: number; sprite?: string } = {}): void {
    console.log(`Playing sound: ${alias}`);
    const h = this.sounds[alias];
    if (!h) return console.warn(`[sound] play: "${alias}" not found`);
    try {
      if (opts.volume !== undefined) h.volume(opts.volume);
      if (opts.loop !== undefined) h.loop(opts.loop);
      if (opts.rate !== undefined) h.rate(opts.rate);
      opts.sprite ? h.play(opts.sprite) : h.play();
    } catch (e) {
      console.error(`[sound] play failed for "${alias}"`, e);
    }
  }

  stop(alias: string): void { this.sounds[alias]?.stop(); }
  pause(alias: string): void { this.sounds[alias]?.pause(); }
  isPlaying(alias: string): boolean { return !!this.sounds[alias]?.playing(); }

  setMasterVolume(v: number): void { Howler.volume(Math.max(0, Math.min(1, v))); }
  muteAll(muted: boolean): void { Howler.mute(muted); }

  unload(alias: string): void { this.sounds[alias]?.unload(); delete this.sounds[alias]; }
  unloadAll(): void { Object.keys(this.sounds).forEach(a => this.unload(a)); }
}

export const sound = new SoundPlayer();
