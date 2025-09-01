import * as PIXI from 'pixi.js';
import 'pixi-spine';
import { Reel } from './Reel';
import { sound } from '../utils/sound';
import { AssetLoader } from '../utils/AssetLoader';
import {Spine} from "pixi-spine";

const REEL_COUNT = 4;
const SYMBOLS_PER_REEL = 6;
const SYMBOLS_COUNT = 5;
const SYMBOL_SIZE = 150;
const REEL_HEIGHT = SYMBOL_SIZE;
const REEL_SPACING = 10;

export class SlotMachine {
    public container: PIXI.Container;
    private reelsContainer: PIXI.Container;
    private reels: Reel[];
    private app: PIXI.Application;
    private isSpinning: boolean = false;
    private spinButton: PIXI.Sprite | null = null;
    private frameSpine: Spine | null = null;
    private winAnimation: Spine | null = null;
    private reelGrid: number[][] = [];

    constructor(app: PIXI.Application) {
        this.app = app;
        this.container = new PIXI.Container();
        this.reelsContainer = new PIXI.Container();
        this.reels = [];

        // Center the slot machine
        this.container.x = this.app.screen.width / 2 - ((SYMBOL_SIZE * SYMBOLS_PER_REEL) / 2);
        this.container.y = this.app.screen.height / 2 - ((REEL_HEIGHT * REEL_COUNT + REEL_SPACING * (REEL_COUNT - 1)) / 2);

        this.createBackground();

        this.createReels();
        this.createReelsMask();

        this.initSpineAnimations();
    }

    private createBackground(): void {
        try {
            const background = new PIXI.Graphics();
            background.beginFill(0x000000, 0.5);
            background.drawRect(
                -20,
                -20,
                SYMBOL_SIZE * SYMBOLS_PER_REEL + 40, // Width now based on symbols per reel
                REEL_HEIGHT * REEL_COUNT + REEL_SPACING * (REEL_COUNT - 1) + 40 // Height based on reel count
            );
            background.endFill();
            this.container.addChild(background);
        } catch (error) {
            console.error('Error creating background:', error);
        }
    }

    private createReels(): void {
        // Create each reel
        for (let i = 0; i < REEL_COUNT; i++) {
            const reel = new Reel(SYMBOLS_PER_REEL, SYMBOL_SIZE);
            reel.container.y = i * (REEL_HEIGHT + REEL_SPACING);
            this.reelsContainer.addChild(reel.container);
            this.reels.push(reel);
        }
        this.container.addChild(this.reelsContainer);
    }

    private createReelsMask(): void {
        // Visible window dimensions for all reels together
        const maskWidth = SYMBOL_SIZE * SYMBOLS_PER_REEL;
        const maskHeight = REEL_COUNT * REEL_HEIGHT + REEL_SPACING * (REEL_COUNT - 1);

        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff, 1);
        mask.drawRoundedRect(0, 0, maskWidth, maskHeight, 16); // radius=16; use 0 for sharp corners
        mask.endFill();

        // Mask sits in the same local space as reelsContainer children
        mask.x = 0;
        mask.y = 0;

        // Don’t intercept events
        (mask as any).eventMode = 'none';
        (mask as any).interactive = false;

        // Attach and assign mask (only to reelsContainer)
        this.reelsContainer.addChild(mask);
        this.reelsContainer.mask = mask;
    }

    private getReelStopGrid(): number[][] {
        this.reelGrid = [];
        for (let i = 0; i < REEL_COUNT; i++) {
            let reel: number[] = [];
            for (let j = 0; j < SYMBOLS_PER_REEL; j++) {
                let sym: number = Math.random() * SYMBOLS_COUNT | 0;
                reel.push(sym);
            }
            this.reelGrid.push(reel);
        }
        return this.reelGrid
    }

    public update(delta: number): void {
        // Update each reel
        for (const reel of this.reels) {
            reel.update(delta);
        }
    }

    public spin(): void {
        if (this.isSpinning) return;

        this.isSpinning = true;

        // Play spin sound
        sound.play('Reel_spin', { loop: true, volume: 1 });

        // Disable spin button
        if (this.spinButton) {
            this.spinButton.texture = AssetLoader.getTexture('button_spin_disabled.png');
            this.spinButton.interactive = false;
        }

        for (let i = 0; i < this.reels.length; i++) {
            setTimeout(() => {
                this.reels[i].startSpin();
            }, i * 200);
        }

        // Stop all reels after a delay
        setTimeout(() => {
            this.stopSpin();
        }, 500 + (this.reels.length - 1) * 200);

    }

    private stopSpin(): void {
        const reelGrid: number[][] = this.getReelStopGrid();

        for (let i = 0; i < this.reels.length; i++) {
            setTimeout(() => {
                this.reels[i].stopSpin(reelGrid[i]);

                // If this is the last reel, check for wins and enable spin button
                if (i === this.reels.length - 1) {
                    setTimeout(() => {
                        sound.stop('Reel_spin');
                        this.checkWin();
                        this.isSpinning = false;

                        if (this.spinButton) {
                            this.spinButton.texture = AssetLoader.getTexture('button_spin.png');
                            this.spinButton.interactive = true;
                        }
                    }, 500);
                }
            }, i * 400);
        }
    }

    private checkWin(): void {
        // Simple win check - just for demonstration
        const randomWin = Math.random() < 0.3; // 30% chance of winning

        if (randomWin) {
            sound.play('win');
            console.log('Winner!');

            if (this.winAnimation) {
                // Play the win animation
                this.winAnimation.visible = true;
                if (this.winAnimation.state.hasAnimation('start')) {
                    this.winAnimation.state.setAnimation(0, 'start', false);
                }

                this.winAnimation.state.addListener({
                    complete: () => {
                        this.winAnimation!.visible = false;
                    }
                });
            }
        }
    }

    public setSpinButton(button: PIXI.Sprite): void {
        this.spinButton = button;
    }

    private initSpineAnimations(): void {
        try {
            const frameSpineData = AssetLoader.getSpine('base-feature-frame.json');
            if (frameSpineData) {
                this.frameSpine = new Spine(frameSpineData.spineData);

                this.frameSpine.y = (REEL_HEIGHT * REEL_COUNT + REEL_SPACING * (REEL_COUNT - 1)) / 2;
                this.frameSpine.x = (SYMBOL_SIZE * SYMBOLS_PER_REEL) / 2;

                if (this.frameSpine.state.hasAnimation('idle')) {
                    this.frameSpine.state.setAnimation(0, 'idle', true);
                }

                this.container.addChild(this.frameSpine);
            }

            const winSpineData = AssetLoader.getSpine('big-boom-h.json');
            if (winSpineData) {
                this.winAnimation = new Spine(winSpineData.spineData);

                this.winAnimation.x = (SYMBOL_SIZE * SYMBOLS_PER_REEL) / 2;
                this.winAnimation.y = (REEL_HEIGHT * REEL_COUNT + REEL_SPACING * (REEL_COUNT - 1)) / 2;

                this.winAnimation.visible = false;

                this.container.addChild(this.winAnimation);
            }
        } catch (error) {
            console.error('Error initializing spine animations:', error);
        }
    }
}
