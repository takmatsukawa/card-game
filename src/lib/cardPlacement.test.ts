import { describe, it, expect } from 'vitest';
import type { FieldGrid, MonsterCard, Player } from './gameStateMachine.ts';

// カード配置のヘルパー関数をテスト用に抽出
function createEmptyFieldGrid(): FieldGrid {
	return [
		[
			{ card: null, isWaiting: false },
			{ card: null, isWaiting: false }
		],
		[
			{ card: null, isWaiting: false },
			{ card: null, isWaiting: false }
		]
	];
}

function createSampleMonsterCard(id: number = 1): MonsterCard {
	return {
		id,
		instanceId: crypto.randomUUID(),
		type: 'monster',
		name: 'テストモンスター',
		hp: 5,
		commands: [{ stoneCost: 1, damage: 2, description: '通常攻撃' }]
	};
}

function canPlaceCard(
	fieldGrid: FieldGrid,
	card: MonsterCard,
	row: number,
	col: number,
	playerStone: number
): boolean {
	if (row < 0 || row >= fieldGrid.length || col < 0 || col >= fieldGrid[0].length) {
		return false;
	}

	const cell = fieldGrid[row][col];
	return !cell.card && card.type === 'monster' && playerStone >= 1;
}

function placeCard(
	fieldGrid: FieldGrid,
	card: MonsterCard,
	row: number,
	col: number,
	player: Player
): { success: boolean; newStone: number } {
	if (!canPlaceCard(fieldGrid, card, row, col, player.stone)) {
		return { success: false, newStone: player.stone };
	}

	const cell = fieldGrid[row][col];
	cell.card = card;
	cell.isWaiting = true;

	return { success: true, newStone: player.stone - 1 };
}

describe('カード配置ロジック', () => {
	describe('配置可能性の判定', () => {
		it('空のセルにモンスターカードを配置できる', () => {
			const fieldGrid = createEmptyFieldGrid();
			const card = createSampleMonsterCard();

			expect(canPlaceCard(fieldGrid, card, 0, 0, 5)).toBe(true);
		});

		it('既にカードがあるセルには配置できない', () => {
			const fieldGrid = createEmptyFieldGrid();
			const card1 = createSampleMonsterCard(1);
			const card2 = createSampleMonsterCard(2);

			fieldGrid[0][0].card = card1;

			expect(canPlaceCard(fieldGrid, card2, 0, 0, 5)).toBe(false);
		});

		it('ストーンが不足している場合は配置できない', () => {
			const fieldGrid = createEmptyFieldGrid();
			const card = createSampleMonsterCard();

			expect(canPlaceCard(fieldGrid, card, 0, 0, 0)).toBe(false);
		});

		it('範囲外の座標には配置できない', () => {
			const fieldGrid = createEmptyFieldGrid();
			const card = createSampleMonsterCard();

			expect(canPlaceCard(fieldGrid, card, -1, 0, 5)).toBe(false);
			expect(canPlaceCard(fieldGrid, card, 0, -1, 5)).toBe(false);
			expect(canPlaceCard(fieldGrid, card, 2, 0, 5)).toBe(false);
			expect(canPlaceCard(fieldGrid, card, 0, 2, 5)).toBe(false);
		});
	});

	describe('カード配置の実行', () => {
		it('正常にカードが配置される', () => {
			const fieldGrid = createEmptyFieldGrid();
			const card = createSampleMonsterCard();
			const player: Player = {
				id: 1,
				name: 'テストプレイヤー',
				hp: 20,
				stone: 5,
				deck: [],
				hand: [card],
				field: [],
				fieldGrid
			};

			const result = placeCard(fieldGrid, card, 0, 0, player);

			expect(result.success).toBe(true);
			expect(result.newStone).toBe(4);
			expect(fieldGrid[0][0].card).toBe(card);
			expect(fieldGrid[0][0].isWaiting).toBe(true);
		});

		it('配置に失敗した場合はストーンが消費されない', () => {
			const fieldGrid = createEmptyFieldGrid();
			const card1 = createSampleMonsterCard(1);
			const card2 = createSampleMonsterCard(2);
			const player: Player = {
				id: 1,
				name: 'テストプレイヤー',
				hp: 20,
				stone: 5,
				deck: [],
				hand: [card1, card2],
				field: [],
				fieldGrid
			};

			// 最初にカードを配置
			fieldGrid[0][0].card = card1;

			// 同じ場所に2枚目を配置しようとする
			const result = placeCard(fieldGrid, card2, 0, 0, player);

			expect(result.success).toBe(false);
			expect(result.newStone).toBe(5);
			expect(fieldGrid[0][0].card).toBe(card1);
		});
	});

	describe('配置戦略', () => {
		it('配置可能なセルの数を正確に計算', () => {
			const fieldGrid = createEmptyFieldGrid();

			// 1つのセルにカードを配置
			fieldGrid[0][0].card = createSampleMonsterCard();

			let availableSlots = 0;
			for (let row = 0; row < fieldGrid.length; row++) {
				for (let col = 0; col < fieldGrid[row].length; col++) {
					if (canPlaceCard(fieldGrid, createSampleMonsterCard(), row, col, 5)) {
						availableSlots++;
					}
				}
			}

			expect(availableSlots).toBe(3);
		});
	});
});
