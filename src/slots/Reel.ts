import * as PIXI from 'pixi.js';
import { AssetLoader } from '../utils/AssetLoader';

const SYMBOL_TEXTURES = [
  'symbol1.png',
  'symbol2.png',
  'symbol3.png',
  'symbol4.png',
  'symbol5.png',
];

const SPIN_SPEED = 50; // Pixels per frame
const SLOWDOWN_RATE = 0.95; // Rate at which the reel slows down
const MIN_INJECTION_SPEED = 30; // keep enough speed to wrap during injection

type ReelState = 'idle' | 'spinning' | 'slowingDown' | 'settling';

export class Reel {
  public container: PIXI.Container;

  // layout
  private symbols: PIXI.Sprite[] = [];
  private readonly symbolSize: number;
  private readonly symbolCount: number;      // visible symbols
  private readonly bufferCount: number = 1;  // one hidden buffer (far right)

  // motion
  private speed = 0;
  private isSpinning = false;
  private reelState: ReelState = 'idle';

  // stop plan
  private reelStops: number[] = [];          // visible stop IDs (L->R)
  private reelStopsFinal: number[] = [];     // visible + 1 hidden ID

  // hidden only injection
  private pendingStopIds: number[] = []; // queue to inject when a sprite wraps to hidden
  private isInjectingStopSymbols = false;
  private injectedCount = 0;                 // injected sprites count

  // reel settle tween
  private tweenElapsedMs = 0;
  private tweenDurationMs = 0;
  private settleStartLeftX = 0;       // starting x of the sprite that must be leftmost
  private settleTargetLeftX = 0;      // target x for that sprite (0.5 * symbolSize)
  private leftTargetSym: PIXI.Sprite | null = null; // sprite that will become leftmost

  constructor(symbolCount: number, symbolSize: number) {
    this.container = new PIXI.Container();
    this.symbolCount = symbolCount;
    this.symbolSize = symbolSize;
    this.createInitialSymbols();
  }

  // ---------------- Init ----------------

  /** create initial random symbols (visible + hidden), positioned on grid. */
  private createInitialSymbols(): void {
    const totalSymbols = this.symbolCount + this.bufferCount;
    for (let i = 0; i < totalSymbols; i++) {
      const sym = new PIXI.Sprite();
      sym.width = this.symbolSize;
      sym.height = this.symbolSize;
      sym.anchor.set(0.5);
      sym.x = (i + 0.5) * this.symbolSize;
      sym.y = this.symbolSize * 0.5;

      this.setSymbolId(sym, this.getRandomId());
      this.container.addChild(sym);
      this.symbols.push(sym);
    }
  }

  /** get symbols texture with given id,  */
  private getSymbolTexture(id: number): PIXI.Texture {
    const key = SYMBOL_TEXTURES[id];
    let tex = AssetLoader.getTexture(key);
    if (!tex) {
      console.warn(`Texture "${key}" not found in AssetLoader cache, using PIXI.Texture.from`);
      tex = PIXI.Texture.from(`assets/images/${key}`);
    }
    return tex;
  }

  /** add id to symbol and set its texture accordingly. */
  private setSymbolId(sym: PIXI.Sprite, id: number): void {
    sym.texture = this.getSymbolTexture(id);
    (sym as any).symbolId = id;
  }

  /** get the symbol id */
  private getSymbolId(sym: PIXI.Sprite): number | undefined {
    return (sym as any).symbolId;
  }

  /** random id helper */
  private getRandomId(): number {
    return (Math.random() * SYMBOL_TEXTURES.length) | 0;
  }

  // ---------------- Update loop ----------------

  /**
   * @param delta ≈1 at 60fps, >1 on slow frames
   */
  public update(delta: number): void {
    // settle tween only
    if (this.reelState === 'settling') {
      this.handleSettleTween(delta);
      return;
    }

    // idle
    if (!this.isSpinning && this.speed === 0 && this.reelState !== 'slowingDown') return;

    // move all symbols, track rightmost center
    const dx = this.speed * delta;
    let rightmostX = -Infinity;

    for (const sym of this.symbols) {
      sym.x -= dx;
      if (sym.x > rightmostX) rightmostX = sym.x;
    }

    // wrap left->right; inject stops only on wrapped (hidden) symbols
    const leftBound = -this.symbolSize;
    for (const sym of this.symbols) {
      if (this.leftEdge(sym) < leftBound) {
        // wrap to the far right
        sym.x = rightmostX + this.symbolSize;
        rightmostX = sym.x;

        if (this.isInjectingStopSymbols && this.pendingStopIds.length > 0) {
            const nextId = this.pendingStopIds.shift()!;
            this.setSymbolId(sym, nextId);
            this.injectedCount++;

            // if all (visible + hidden) injected → settle now
            if (this.injectedCount >= this.symbolCount + this.bufferCount) {
              this.speed = 0;
              this.startSettle();
              return; // stop further processing this frame
            }
        } else if (this.isSpinning) {
          // add random symbol during reel spin
          this.setSymbolId(sym, this.getRandomId());
        }
      }
    }

    // slow down
    if (!this.isSpinning && this.reelState === 'slowingDown') {
        if (this.isInjectingStopSymbols && this.pendingStopIds.length > 0) {
            // keep moving fast enough to produce wraps until all stop symbols injected
            if (this.speed < MIN_INJECTION_SPEED) this.speed = MIN_INJECTION_SPEED;
        } else {
            if (this.speed > 0) {
                this.speed *= SLOWDOWN_RATE;
                if (this.speed < 10) this.speed = 0;
            }
        }
    }
  }

  // ---------------- Settle ----------------

  /** prepare a global shift so the LEFTMOST of the desired-ID sprites lands at the left-center. */
  private startSettle(): void {
    const leftId = this.reelStopsFinal[0];

    // pick the leftmost symbol that already has leftId
    let leftMostSym: PIXI.Sprite | null = null;
    let minX = Infinity;
    for (const sym of this.symbols) {
      if (this.getSymbolId(sym) === leftId && sym.x < minX) {
        minX = sym.x;
        leftMostSym = sym;
      }
    }

    if (!leftMostSym) {
      console.warn('startSettleAnimation: left-target sprite not found; fallback to snapToGrid.');
      this.snapToGrid();
      this.reelState = 'idle';
      this.isInjectingStopSymbols = false;
      this.pendingStopIds.length = 0;
      return;
    }

    this.leftTargetSym = leftMostSym;
    this.settleStartLeftX = this.leftTargetSym.x;
    this.settleTargetLeftX = 0.5 * this.symbolSize; // leftmost center

    this.tweenElapsedMs = 0;
    this.tweenDurationMs = 260; // 220–320ms feels nice
    this.reelState = 'settling';
    this.isInjectingStopSymbols = false; // stop injections now
  }

  /** single tween: shift the whole strip so desired left symbol lands exactly at leftmost center. */
  private handleSettleTween(delta: number): void {
    this.tweenElapsedMs += delta * 16.6667; // ~ms at 60fps
    const progress = Math.min(1, this.tweenElapsedMs / this.tweenDurationMs);
    const eased = this.easeOutCubic(progress);

    if (!this.leftTargetSym) {
      // fallback safety
      this.snapToGrid();
      this.reelState = 'idle';
      return;
    }

    // where should the left-target symbol be right now?
    const nowLeftX = this.settleStartLeftX + (this.settleTargetLeftX - this.settleStartLeftX) * eased;

    // shift all symbols by the same offset; no wrapping during settle
    const shift = nowLeftX - this.leftTargetSym.x;
    if (shift !== 0) {
      for (const sym of this.symbols) sym.x += shift;
    }

    if (progress >= 1) {
      this.snapToGrid(); // exact grid placement
      this.reelState = 'idle';
      this.pendingStopIds.length = 0;
      this.leftTargetSym = null;
    }
  }

  // ---------------- Utils ----------------

  /** left edge of a symbol, given anchor.x = 0.5. */
  private leftEdge(sym: PIXI.Sprite): number {
    return sym.x - this.symbolSize * 0.5;
  }

  /** ease-out cubic: fast start, smooth end. */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  /** snap all symbols to exact grid positions */
  private snapToGrid(): void {
    if (this.symbols.length === 0) return;
    const sorted = [...this.symbols].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].x = Math.round((i + 0.5) * this.symbolSize);
    }
  }

  // ---------------- Public functions ----------------

  /** start spinning at constant speed. */
  public startSpin(): void {
    this.isSpinning = true;
    this.speed = SPIN_SPEED;
    this.reelState = 'spinning';

    // clear any pending stop plan/state
    this.pendingStopIds = [];
    this.isInjectingStopSymbols = false;
    this.injectedCount = 0;
    this.leftTargetSym = null;
  }

  /**
   * start slowing down
   * @param reelStops ids into SYMBOL_TEXTURES, in LEFT -> RIGHT visible order
   *                  (must have length equal to symbolCount)
   */
  public stopSpin(reelStops: number[]): void {
    if (reelStops.length !== this.symbolCount) {
      console.error(
        `stopSpin: reelStops length (${reelStops.length}) must equal symbolCount (${this.symbolCount}).`
      );
      return;
    }

    this.isSpinning = false;
    this.reelState = 'slowingDown';

    this.reelStops = reelStops.slice();
    const hiddenSymId = this.getRandomId();
    this.reelStopsFinal = [...this.reelStops, hiddenSymId];

    this.pendingStopIds = [...this.reelStopsFinal]; // inject all, including hidden
    this.isInjectingStopSymbols = true;
    this.injectedCount = 0;

    console.log('Stop plan (L->R + hidden):', this.reelStopsFinal);
  }
}
