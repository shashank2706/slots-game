/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

/* ---------- PIXI mocks ---------- */
jest.mock('pixi.js', () => {
  class Texture {}
  class Container {
    children: any[] = [];
    addChild = jest.fn((c: any) => { this.children.push(c); });
    scale = { set: jest.fn() };
    position = { set: jest.fn() };
    pivot = { set: jest.fn() };
  }
  class Sprite {
    x = 0; y = 0; width = 0; height = 0;
    texture: any = new Texture();
    anchor = { set: (_x = 0, _y?: number) => {} };
    constructor(tex?: any) { if (tex) this.texture = tex; }
  }
  return { Container, Sprite, Texture };
});

/* ---------- AssetLoader mock ---------- */
const getTextureMock = jest.fn((name) => ({ /* dummy texture */ }));
jest.mock('../../src/utils/AssetLoader', () => {
  return {
    AssetLoader: class {
      // real file has static methods; mirror that shape
      static getTexture(name: string) { return getTextureMock(name); }
      static getSpine(_name: string) { return undefined; }
    },
  };
});

/* Import after mocks */
import { Reel } from '../../src/slots/Reel';

describe('Reel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with visible+hidden symbols placed on grid centers', () => {
    const visible = 3;
    const size = 100;
    const reel = new Reel(visible, size);

    const symbols = (reel as any)['symbols'] as any[];
    expect(symbols.length).toBe(visible + 1);

    const xs = symbols.map(s => s.x);
    expect(xs).toEqual([50, 150, 250, 350]); // (i+0.5)*100
  });

  test('spin → stop injects target ids and settles to exact stop window (L→R + hidden)', () => {
    const visible = 3;
    const size = 100;
    const reel = new Reel(visible, size);

    // Make hidden symbol deterministic
    (reel as any)['getRandomId'] = jest.fn(() => 4);

    reel.startSpin();
    const stops = [1, 2, 3];
    reel.stopSpin(stops);

    // Drive enough frames to inject and settle
    for (let i = 0; i < 80; i++) {
      reel.update(1);
    }

    const symbols = (reel as any)['symbols'] as any[];
    const sorted = [...symbols].sort((a, b) => a.x - b.x);

    const ids = sorted.map(s => (s as any).symbolId);
    expect(ids).toEqual([1, 2, 3, 4]);

    const xs = sorted.map(s => s.x);
    expect(xs).toEqual([50, 150, 250, 350]);
  });

  test('update() moves symbols left when spinning', () => {
    const reel = new Reel(2, 100);
    reel.startSpin();

    const firstBefore = (reel as any)['symbols'][0].x;
    reel.update(1);
    const firstAfter = (reel as any)['symbols'][0].x;

    expect(firstAfter).toBeLessThan(firstBefore);
  });
});
