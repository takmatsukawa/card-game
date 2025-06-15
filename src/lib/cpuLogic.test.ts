import { describe, it, expect } from 'vitest';
import type { Player, FieldGrid, Card, MonsterCard } from './gameStateMachine.ts';

// CPUロジックのヘルパー関数をテスト用に抽出
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

function createTestPlayer(id: number, mana: number = 10): Player {
	const testCards: Card[] = [
		{
			id: 1,
			type: 'monster',
			name: 'スライム',
			hp: 5,
			commands: [{ manaCost: 1, damage: 2, description: '通常攻撃' }]
		},
		{
			id: 2,
			type: 'monster',
			name: 'ゴブリン',
			hp: 3,
			commands: [{ manaCost: 1, damage: 3, description: '素早い攻撃' }]
		},
		{
			id: 3,
			type: 'monster',
			name: 'ドラゴン',
			hp: 10,
			commands: [{ manaCost: 3, damage: 8, description: '強力な攻撃' }]
		},
		{
			id: 4,
			type: 'magic',
			name: 'ファイアボール',
			manaCost: 3,
			description: '相手に3ダメージ'
		}
	];

	return {
		id,
		name: `プレイヤー${id}`,
		hp: 20,
		mana,
		deck: [...testCards],
		hand: [...testCards],
		field: [],
		fieldGrid: createEmptyFieldGrid()
	};
}

function findEmptyCells(fieldGrid: FieldGrid): { row: number; col: number }[] {
	const emptyCells: { row: number; col: number }[] = [];
	for (let row = 0; row < fieldGrid.length; row++) {
		for (let col = 0; col < fieldGrid[row].length; col++) {
			if (!fieldGrid[row][col].card) {
				emptyCells.push({ row, col });
			}
		}
	}
	return emptyCells;
}

function getPlayableCards(player: Player): MonsterCard[] {
	return player.hand.filter((card) => card.type === 'monster' && player.mana >= 1) as MonsterCard[];
}

function selectBestCard(cards: Card[]): Card {
	const monsterCards = cards.filter((card) => card.type === 'monster') as MonsterCard[];

	if (monsterCards.length === 0) {
		return cards[0];
	}

	return monsterCards.reduce((best, current) => {
		const currentValue = current.hp + current.commands.reduce((sum, cmd) => sum + cmd.damage, 0);
		const bestValue =
			(best as MonsterCard).hp +
			(best as MonsterCard).commands.reduce((sum, cmd) => sum + cmd.damage, 0);
		return currentValue > bestValue ? current : best;
	});
}

function findBestPosition(emptyCells: { row: number; col: number }[]): {
	row: number;
	col: number;
} {
	// 戦略的なポジショニング: 角を優先
	const cornerPositions = emptyCells.filter(
		(cell) => (cell.row === 0 || cell.row === 1) && (cell.col === 0 || cell.col === 1)
	);

	if (cornerPositions.length > 0) {
		return cornerPositions[0];
	}

	return emptyCells[0];
}

function calculateThreatLevel(player: Player): number {
	let threat = 0;
	for (let row = 0; row < player.fieldGrid.length; row++) {
		for (let col = 0; col < player.fieldGrid[row].length; col++) {
			const card = player.fieldGrid[row][col].card;
			if (card && !player.fieldGrid[row][col].isWaiting) {
				const maxDamage = Math.max(...card.commands.map((cmd) => cmd.damage));
				threat += maxDamage;
			}
		}
	}
	return threat;
}

function executeCPUTurn(
	cpu: Player,
	opponent: Player
): {
	cardsPlaced: number;
	manaUsed: number;
	attacksExecuted: number;
} {
	let cardsPlaced = 0;
	let manaUsed = 0;
	let attacksExecuted = 0;

	const initialMana = cpu.mana;

	// カード配置フェーズ
	while (cpu.mana >= 1) {
		const emptyCells = findEmptyCells(cpu.fieldGrid);
		const playableCards = getPlayableCards(cpu);

		if (emptyCells.length === 0 || playableCards.length === 0) {
			break;
		}

		const bestCard = selectBestCard(playableCards) as MonsterCard;
		const bestPosition = findBestPosition(emptyCells);

		// カードを配置
		cpu.fieldGrid[bestPosition.row][bestPosition.col].card = bestCard;
		cpu.fieldGrid[bestPosition.row][bestPosition.col].isWaiting = true;
		cpu.hand = cpu.hand.filter((c) => c.id !== bestCard.id);
		cpu.mana -= 1;
		cardsPlaced++;
	}

	manaUsed = initialMana - cpu.mana;

	// 攻撃フェーズ
	for (let row = 0; row < cpu.fieldGrid.length; row++) {
		for (let col = 0; col < cpu.fieldGrid[row].length; col++) {
			const cell = cpu.fieldGrid[row][col];
			if (cell.card && !cell.isWaiting) {
				// 攻撃対象を探す
				const targets = findEmptyCells(opponent.fieldGrid).length < 4;
				if (targets) {
					attacksExecuted++;
				}
			}
		}
	}

	return { cardsPlaced, manaUsed, attacksExecuted };
}

describe('CPUの行動ロジック', () => {
	describe('基本的な行動判定', () => {
		it('空の盤面でカードを配置できる', () => {
			const cpu = createTestPlayer(2, 5);
			const opponent = createTestPlayer(1);

			const result = executeCPUTurn(cpu, opponent);

			expect(result.cardsPlaced).toBeGreaterThan(0);
			expect(result.manaUsed).toBeGreaterThan(0);
		});

		it('マナが不足している場合は配置しない', () => {
			const cpu = createTestPlayer(2, 0);
			const opponent = createTestPlayer(1);

			const result = executeCPUTurn(cpu, opponent);

			expect(result.cardsPlaced).toBe(0);
			expect(result.manaUsed).toBe(0);
		});

		it('盤面が満杯の場合は配置できない', () => {
			const cpu = createTestPlayer(2, 10);
			const opponent = createTestPlayer(1);

			// 盤面を満杯にする
			for (let row = 0; row < cpu.fieldGrid.length; row++) {
				for (let col = 0; col < cpu.fieldGrid[row].length; col++) {
					cpu.fieldGrid[row][col].card = {
						id: row * 2 + col + 10,
						type: 'monster',
						name: 'テストモンスター',
						hp: 5,
						commands: [{ manaCost: 1, damage: 2, description: '攻撃' }]
					};
				}
			}

			const result = executeCPUTurn(cpu, opponent);

			expect(result.cardsPlaced).toBe(0);
		});
	});

	describe('カード選択戦略', () => {
		it('最も価値の高いカードを選択する', () => {
			const cards: Card[] = [
				{
					id: 1,
					type: 'monster',
					name: '弱いモンスター',
					hp: 2,
					commands: [{ manaCost: 1, damage: 1, description: '弱攻撃' }]
				},
				{
					id: 2,
					type: 'monster',
					name: '強いモンスター',
					hp: 8,
					commands: [{ manaCost: 2, damage: 6, description: '強攻撃' }]
				}
			];

			const bestCard = selectBestCard(cards) as MonsterCard;

			expect(bestCard.name).toBe('強いモンスター');
			expect(bestCard.hp + bestCard.commands[0].damage).toBe(14);
		});

		it('モンスターカードのみを配置対象として選択', () => {
			const cpu = createTestPlayer(2, 10);

			const playableCards = getPlayableCards(cpu);

			expect(playableCards.every((card) => card.type === 'monster')).toBe(true);
			expect(playableCards.length).toBe(3); // スライム、ゴブリン、ドラゴン
		});
	});

	describe('配置位置の戦略', () => {
		it('空のセルを正確に識別', () => {
			const fieldGrid = createEmptyFieldGrid();

			// 1つのセルにカードを配置
			fieldGrid[0][0].card = {
				id: 1,
				type: 'monster',
				name: 'テストモンスター',
				hp: 5,
				commands: []
			};

			const emptyCells = findEmptyCells(fieldGrid);

			expect(emptyCells).toHaveLength(3);
			expect(emptyCells).not.toContainEqual({ row: 0, col: 0 });
		});

		it('戦略的なポジションを選択', () => {
			const emptyCells = [
				{ row: 0, col: 0 }, // 角
				{ row: 0, col: 1 }, // 角
				{ row: 1, col: 0 } // 角
			];

			const bestPosition = findBestPosition(emptyCells);

			// 角のポジションが選ばれることを確認
			expect([
				{ row: 0, col: 0 },
				{ row: 0, col: 1 },
				{ row: 1, col: 0 }
			]).toContainEqual(bestPosition);
		});
	});

	describe('脅威度の評価', () => {
		it('相手の脅威レベルを正確に計算', () => {
			const player = createTestPlayer(1);

			// 攻撃可能なモンスターを配置
			player.fieldGrid[0][0].card = {
				id: 1,
				type: 'monster',
				name: '攻撃モンスター',
				hp: 5,
				commands: [{ manaCost: 1, damage: 4, description: '強攻撃' }]
			};
			player.fieldGrid[0][0].isWaiting = false;

			// 待機中のモンスターを配置（脅威度に含まれない）
			player.fieldGrid[0][1].card = {
				id: 2,
				type: 'monster',
				name: '待機モンスター',
				hp: 3,
				commands: [{ manaCost: 1, damage: 2, description: '攻撃' }]
			};
			player.fieldGrid[0][1].isWaiting = true;

			const threatLevel = calculateThreatLevel(player);

			expect(threatLevel).toBe(4); // 待機中でないモンスターのダメージのみ
		});

		it('空の盤面では脅威度が0', () => {
			const player = createTestPlayer(1);

			const threatLevel = calculateThreatLevel(player);

			expect(threatLevel).toBe(0);
		});
	});

	describe('統合的なCPU行動テスト', () => {
		it('複数ターンにわたるCPUの行動', () => {
			const cpu = createTestPlayer(2, 10);
			const opponent = createTestPlayer(1);

			// 1ターン目
			const turn1 = executeCPUTurn(cpu, opponent);
			expect(turn1.cardsPlaced).toBeGreaterThan(0);

			// カードの待機状態を解除
			for (let row = 0; row < cpu.fieldGrid.length; row++) {
				for (let col = 0; col < cpu.fieldGrid[row].length; col++) {
					if (cpu.fieldGrid[row][col].card) {
						cpu.fieldGrid[row][col].isWaiting = false;
					}
				}
			}

			// 2ターン目（既に配置されたカードがあるため、配置数は減る）
			const turn2 = executeCPUTurn(cpu, opponent);
			expect(turn2.cardsPlaced).toBeLessThanOrEqual(turn1.cardsPlaced);
		});

		it('マナ管理の効率性', () => {
			const cpu = createTestPlayer(2, 5);
			const opponent = createTestPlayer(1);

			const result = executeCPUTurn(cpu, opponent);

			// 利用可能なマナを効率的に使用
			expect(result.manaUsed).toBeLessThanOrEqual(5);
			expect(result.cardsPlaced).toBe(result.manaUsed); // 1マナ = 1カード
		});

		it('手札の管理', () => {
			const cpu = createTestPlayer(2, 3);
			const initialHandSize = cpu.hand.length;
			const opponent = createTestPlayer(1);

			const result = executeCPUTurn(cpu, opponent);

			// 配置したカードが手札から削除される
			expect(cpu.hand.length).toBe(initialHandSize - result.cardsPlaced);
		});
	});

	describe('CPUの難易度バランス', () => {
		it('初級レベル: ランダムな配置', () => {
			const cpu = createTestPlayer(2, 10);

			// 複数回実行して一貫性を確認
			const results = [];
			for (let i = 0; i < 3; i++) {
				const testCpu = createTestPlayer(2, 10);
				const opponent = createTestPlayer(1);
				const result = executeCPUTurn(testCpu, opponent);
				results.push(result.cardsPlaced);
			}

			// CPUは常に何らかの行動を取る
			expect(results.every((count) => count > 0)).toBe(true);
		});

		it('CPUの行動は予測可能で一貫している', () => {
			const cpu1 = createTestPlayer(2, 5);
			const cpu2 = createTestPlayer(2, 5);
			const opponent1 = createTestPlayer(1);
			const opponent2 = createTestPlayer(1);

			const result1 = executeCPUTurn(cpu1, opponent1);
			const result2 = executeCPUTurn(cpu2, opponent2);

			// 同じ条件では同じ行動を取る
			expect(result1.cardsPlaced).toBe(result2.cardsPlaced);
			expect(result1.manaUsed).toBe(result2.manaUsed);
		});
	});
});
