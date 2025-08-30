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

export class Reel {
    public container: PIXI.Container;
    private symbols: PIXI.Sprite[];
    private symbolSize: number;
    private symbolCount: number;
    private speed: number = 0;
    private isSpinning: boolean = false;

    constructor(symbolCount: number, symbolSize: number) {
        this.container = new PIXI.Container();
        this.symbols = [];
        this.symbolSize = symbolSize;
        this.symbolCount = symbolCount;

        this.createSymbols();
    }

    private createSymbols(): void {
        // Create symbols for the reel, arranged horizontally with extra hidden symbol for smoothness
        const totalSymbols: number = this.symbolCount + 1;
        for (let i = 0; i < totalSymbols; i++) {
            const sym: PIXI.Sprite = this.createRandomSymbol();
            sym.width = this.symbolSize;
            sym.height = this.symbolSize;
            sym.anchor.set(0.5, 0.5); // visually center in each cell
            sym.x = i * this.symbolSize + this.symbolSize * 0.5;
            sym.y = this.symbolSize * 0.5;
            this.container.addChild(sym);
            this.symbols.push(sym);
        }
    }

    private createRandomSymbol(): PIXI.Sprite {
        // Pick a random texture name
        const symName: string = SYMBOL_TEXTURES[(Math.random() * SYMBOL_TEXTURES.length) | 0];

        let symTexture: PIXI.Texture = AssetLoader.getTexture(symName);

        if (!symTexture) {
            console.warn(`Texture "${symName}" not found in AssetLoader cache, using PIXI.Texture.from`);
            symTexture = PIXI.Texture.from(`assets/images/${symName}`);
        }

        // Create a sprite with the texture
        const symSprite: PIXI.Sprite = new PIXI.Sprite(symTexture); 

        return symSprite;
    }

    public update(delta: number): void {
        if (!this.isSpinning && this.speed === 0) return;

        // TODO:Move symbols horizontally

        // If we're stopping, slow down the reel
        if (!this.isSpinning && this.speed > 0) {
            this.speed *= SLOWDOWN_RATE;

            // If speed is very low, stop completely and snap to grid
            if (this.speed < 0.5) {
                this.speed = 0;
                this.snapToGrid();
            }
        }
    }

    private snapToGrid(): void {
        // TODO: Snap symbols to horizontal grid positions

    }

    public startSpin(): void {
        this.isSpinning = true;
        this.speed = SPIN_SPEED;
    }

    public stopSpin(): void {
        this.isSpinning = false;
        // The reel will gradually slow down in the update method
    }
}
