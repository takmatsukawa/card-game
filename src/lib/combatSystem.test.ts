import { describe, it, expect } from 'vitest';
import type { MonsterCard, MonsterCommand, Player, FieldGrid } from './gameStateMachine.ts';

// 戦闘システムのヘルパー関数をテスト用に抽出
function createMonsterCard(
	id: number,
	name: string,
	hp: number,
	commands: MonsterCommand[]
): MonsterCard {
	return {
		id,
		type: 'monster',
		name,
		hp,
		commands
	};
}

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

function findAttackableMonsters(
	fieldGrid: FieldGrid
): { row: number; col: number; card: MonsterCard }[] {
	const attackers: { row: number; col: number; card: MonsterCard }[] = [];
	for (let row = 0; row < fieldGrid.length; row++) {
		for (let col = 0; col < fieldGrid[row].length; col++) {
			const cell = fieldGrid[row][col];
			if (cell.card && !cell.isWaiting) {
				attackers.push({ row, col, card: cell.card });
			}
		}
	}
	return attackers;
}

function findTargets(fieldGrid: FieldGrid): { row: number; col: number }[] {
	const targets: { row: number; col: number }[] = [];
	for (let row = 0; row < fieldGrid.length; row++) {
		for (let col = 0; col < fieldGrid[row].length; col++) {
			if (fieldGrid[row][col].card) {
				targets.push({ row, col });
			}
		}
	}
	return targets;
}

function executeAttack(
	attacker: MonsterCard,
	target: MonsterCard,
	commandIndex: number = 0
): { damage: number; targetDestroyed: boolean; newTargetHp: number } {
	const command = attacker.commands[commandIndex];
	const damage = command.damage;
	const newHp = target.hp - damage;

	return {
		damage,
		targetDestroyed: newHp <= 0,
		newTargetHp: Math.max(0, newHp)
	};
}

function selectBestCommand(monster: MonsterCard): MonsterCommand {
	return monster.commands.reduce((best, current) =>
		current.damage > best.damage ? current : best
	);
}

function selectWeakestTarget(
	targets: { row: number; col: number }[],
	fieldGrid: FieldGrid
): { row: number; col: number } {
	return targets.reduce((weakest, current) => {
		const currentHP = fieldGrid[current.row][current.col].card?.hp || 0;
		const weakestHP = fieldGrid[weakest.row][weakest.col].card?.hp || 0;
		return currentHP < weakestHP ? current : weakest;
	});
}

describe('戦闘システム', () => {
	describe('攻撃の基本機能', () => {
		it('モンスターが相手にダメージを与える', () => {
			const attacker = createMonsterCard(1, 'スライム', 5, [
				{ manaCost: 1, damage: 2, description: '通常攻撃' }
			]);
			const target = createMonsterCard(2, 'ゴブリン', 3, [
				{ manaCost: 1, damage: 1, description: '素早い攻撃' }
			]);

			const result = executeAttack(attacker, target);

			expect(result.damage).toBe(2);
			expect(result.newTargetHp).toBe(1);
			expect(result.targetDestroyed).toBe(false);
		});

		it('攻撃でモンスターが破壊される', () => {
			const attacker = createMonsterCard(1, 'ドラゴン', 10, [
				{ manaCost: 3, damage: 5, description: '強力な攻撃' }
			]);
			const target = createMonsterCard(2, 'ゴブリン', 3, [
				{ manaCost: 1, damage: 1, description: '素早い攻撃' }
			]);

			const result = executeAttack(attacker, target);

			expect(result.damage).toBe(5);
			expect(result.newTargetHp).toBe(0);
			expect(result.targetDestroyed).toBe(true);
		});

		it('複数のコマンドから最適なものを選択', () => {
			const monster = createMonsterCard(1, 'ウォーリア', 8, [
				{ manaCost: 1, damage: 2, description: '通常攻撃' },
				{ manaCost: 2, damage: 4, description: '強力な攻撃' },
				{ manaCost: 3, damage: 6, description: '必殺技' }
			]);

			const bestCommand = selectBestCommand(monster);

			expect(bestCommand.damage).toBe(6);
			expect(bestCommand.description).toBe('必殺技');
		});
	});

	describe('攻撃可能なモンスターの検索', () => {
		it('待機中でないモンスターを攻撃者として識別', () => {
			const fieldGrid = createEmptyFieldGrid();
			const activeMonster = createMonsterCard(1, 'アクティブ', 5, [
				{ manaCost: 1, damage: 2, description: '攻撃' }
			]);
			const waitingMonster = createMonsterCard(2, '待機中', 5, [
				{ manaCost: 1, damage: 2, description: '攻撃' }
			]);

			fieldGrid[0][0].card = activeMonster;
			fieldGrid[0][0].isWaiting = false;
			fieldGrid[0][1].card = waitingMonster;
			fieldGrid[0][1].isWaiting = true;

			const attackers = findAttackableMonsters(fieldGrid);

			expect(attackers).toHaveLength(1);
			expect(attackers[0].card).toBe(activeMonster);
			expect(attackers[0].row).toBe(0);
			expect(attackers[0].col).toBe(0);
		});

		it('空の盤面では攻撃者がいない', () => {
			const fieldGrid = createEmptyFieldGrid();
			const attackers = findAttackableMonsters(fieldGrid);

			expect(attackers).toHaveLength(0);
		});
	});

	describe('攻撃対象の選択', () => {
		it('敵の盤面からターゲットを見つける', () => {
			const fieldGrid = createEmptyFieldGrid();
			const monster1 = createMonsterCard(1, 'モンスター1', 5, []);
			const monster2 = createMonsterCard(2, 'モンスター2', 3, []);

			fieldGrid[0][0].card = monster1;
			fieldGrid[1][1].card = monster2;

			const targets = findTargets(fieldGrid);

			expect(targets).toHaveLength(2);
			expect(targets).toContainEqual({ row: 0, col: 0 });
			expect(targets).toContainEqual({ row: 1, col: 1 });
		});

		it('最も弱い敵を優先的に攻撃', () => {
			const fieldGrid = createEmptyFieldGrid();
			const strongMonster = createMonsterCard(1, '強いモンスター', 8, []);
			const weakMonster = createMonsterCard(2, '弱いモンスター', 2, []);

			fieldGrid[0][0].card = strongMonster;
			fieldGrid[0][1].card = weakMonster;

			const targets = findTargets(fieldGrid);
			const weakestTarget = selectWeakestTarget(targets, fieldGrid);

			expect(weakestTarget).toEqual({ row: 0, col: 1 });
		});
	});

	describe('戦闘の統合テスト', () => {
		it('完全な戦闘シナリオ', () => {
			// 攻撃側の盤面
			const attackerField = createEmptyFieldGrid();
			const attacker = createMonsterCard(1, 'アタッカー', 5, [
				{ manaCost: 1, damage: 3, description: '攻撃' }
			]);
			attackerField[0][0].card = attacker;
			attackerField[0][0].isWaiting = false;

			// 防御側の盤面
			const defenderField = createEmptyFieldGrid();
			const defender = createMonsterCard(2, 'ディフェンダー', 4, [
				{ manaCost: 1, damage: 2, description: '反撃' }
			]);
			defenderField[1][1].card = defender;

			// 攻撃実行
			const attackers = findAttackableMonsters(attackerField);
			const targets = findTargets(defenderField);

			expect(attackers).toHaveLength(1);
			expect(targets).toHaveLength(1);

			const result = executeAttack(attackers[0].card, defender);

			expect(result.damage).toBe(3);
			expect(result.newTargetHp).toBe(1);
			expect(result.targetDestroyed).toBe(false);
		});

		it('一撃で敵を破壊するシナリオ', () => {
			const attackerField = createEmptyFieldGrid();
			const strongAttacker = createMonsterCard(1, '強力なアタッカー', 8, [
				{ manaCost: 3, damage: 10, description: '必殺技' }
			]);
			attackerField[0][0].card = strongAttacker;
			attackerField[0][0].isWaiting = false;

			const defenderField = createEmptyFieldGrid();
			const weakDefender = createMonsterCard(2, '弱いディフェンダー', 2, [
				{ manaCost: 1, damage: 1, description: '弱攻撃' }
			]);
			defenderField[0][0].card = weakDefender;

			const attackers = findAttackableMonsters(attackerField);
			const result = executeAttack(attackers[0].card, weakDefender);

			expect(result.targetDestroyed).toBe(true);
			expect(result.newTargetHp).toBe(0);
		});
	});

	describe('戦闘バランス', () => {
		it('HP と攻撃力のバランス計算', () => {
			const monsters = [
				createMonsterCard(1, 'バランス型', 5, [
					{ manaCost: 1, damage: 2, description: '通常攻撃' }
				]),
				createMonsterCard(2, '攻撃型', 3, [{ manaCost: 1, damage: 4, description: '強攻撃' }]),
				createMonsterCard(3, '防御型', 8, [{ manaCost: 1, damage: 1, description: '弱攻撃' }])
			];

			// 各モンスターの戦闘力を計算（HP + 最大ダメージ）
			const combatPowers = monsters.map((monster) => {
				const maxDamage = Math.max(...monster.commands.map((cmd) => cmd.damage));
				return monster.hp + maxDamage;
			});

			expect(combatPowers[0]).toBe(7); // バランス型: 5 + 2
			expect(combatPowers[1]).toBe(7); // 攻撃型: 3 + 4
			expect(combatPowers[2]).toBe(9); // 防御型: 8 + 1
		});

		it('マナコストと威力のバランス', () => {
			const monster = createMonsterCard(1, 'テストモンスター', 5, [
				{ manaCost: 1, damage: 2, description: 'コスト1攻撃' },
				{ manaCost: 2, damage: 3, description: 'コスト2攻撃' },
				{ manaCost: 3, damage: 5, description: 'コスト3攻撃' }
			]);

			// 効率性の計算（ダメージ/マナコスト）
			const efficiencies = monster.commands.map((cmd) => cmd.damage / cmd.manaCost);

			expect(efficiencies[0]).toBe(2.0); // 2/1
			expect(efficiencies[1]).toBe(1.5); // 3/2
			expect(efficiencies[2]).toBeCloseTo(1.67, 2); // 5/3
		});
	});
});
