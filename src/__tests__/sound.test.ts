// __tests__/sound.test.ts
import { jest } from '@jest/globals';

// Mock howler with a tiny fake
jest.mock('howler', () => {
  class FakeHowl {
    private _playing = false;
    constructor(public opts: any) {}
    play() { this._playing = true; }
    stop() { this._playing = false; }
    pause() { this._playing = false; }
    volume(v?: number) { if (v !== undefined) this.opts._vol = v; return this.opts._vol ?? 1; }
    loop(v?: boolean) { if (v !== undefined) this.opts._loop = v; return !!this.opts._loop; }
    playing() { return this._playing; }
    unload() { this._playing = false; }
  }
  return { Howl: FakeHowl };
});

import { sound } from '../../src/utils/sound';

describe('sound player', () => {
  test('add and play', () => {
    sound.add('Spin_button', 'assets/sounds/Spin_button.webm');
    expect(sound.isPlaying('Spin_button')).toBe(false);
    sound.play('Spin_button');
    expect(sound.isPlaying('Spin_button')).toBe(true);
  });

  test('loop/volume/stop', () => {
    sound.add('Reel_spin', 'assets/sounds/Reel_spin.webm');
    sound.setLoop('Reel_spin', true);
    sound.setVolume('Reel_spin', 0.5);
    sound.play('Reel_spin');
    expect(sound.isPlaying('Reel_spin')).toBe(true);
    sound.stop('Reel_spin');
    expect(sound.isPlaying('Reel_spin')).toBe(false);
  });
});
