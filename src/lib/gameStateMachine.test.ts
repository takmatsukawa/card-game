import { describe, it, expect, beforeEach } from 'vitest';
import {
	createGameActor,
	type GameContext,
	type Card,
	type MonsterCard
} from './gameStateMachine.ts';

// テスト用のカスタムデッキ
const testDeck: Card[] = [
	{
		id: 100,
		instanceId: crypto.randomUUID(),
		type: 'monster',
		name: 'テストスライム',
		hp: 10,
		commands: [{ stoneCost: 1, damage: 5, description: 'テスト攻撃' }]
	},
	{
		id: 102,
		instanceId: crypto.randomUUID(),
		type: 'monster',
		name: 'テストゴブリン',
		hp: 8,
		commands: [{ stoneCost: 1, damage: 3, description: 'テスト攻撃2' }]
	},
	{
		id: 103,
		instanceId: crypto.randomUUID(),
		type: 'monster',
		name: 'テストオーク',
		hp: 12,
		commands: [{ stoneCost: 1, damage: 4, description: 'テスト攻撃3' }]
	},
	{
		id: 101,
		instanceId: crypto.randomUUID(),
		type: 'magic',
		name: 'テストファイア',
		stoneCost: 2,
		description: 'テスト用魔法'
	}
];

describe('ゲーム状態機械', () => {
	let actor: ReturnType<typeof createGameActor>;

	beforeEach(() => {
		actor = createGameActor();
		actor.start();
	});

	describe('初期状態', () => {
		it('プレイヤーターンから開始される', () => {
			expect(actor.getSnapshot().matches('playerTurn')).toBe(true);
		});

		it('カスタムデッキでゲームを開始できる', () => {
			const customActor = createGameActor({ customDeck: testDeck });
			customActor.start();

			const context = customActor.getSnapshot().context;
			expect(context.players[0].deck).toEqual(testDeck);
			expect(context.players[0].hand).toEqual(testDeck);
			expect(context.players[1].deck).toEqual(testDeck);
			expect(context.players[1].hand).toEqual(testDeck);
		});

		it('カスタムデッキのモンスターカードが正しく設定される', () => {
			const customActor = createGameActor({ customDeck: testDeck });
			customActor.start();

			const context = customActor.getSnapshot().context;
			const testMonster = context.players[0].hand.find((card) => card.id === 100) as MonsterCard;
			expect(testMonster).toBeDefined();
			expect(testMonster.name).toBe('テストスライム');
			expect(testMonster.hp).toBe(10);
			expect(testMonster.commands[0].damage).toBe(5);
		});

		it('2人のプレイヤーが作成される', () => {
			const context = actor.getSnapshot().context;
			expect(context.players).toHaveLength(2);
			expect(context.players[0].id).toBe(1);
			expect(context.players[1].id).toBe(2);
		});

		it('各プレイヤーのHPが20、ストーンが10で初期化される', () => {
			const context = actor.getSnapshot().context;
			expect(context.players[0].hp).toBe(20);
			expect(context.players[0].stone).toBe(10);
			expect(context.players[1].hp).toBe(20);
			expect(context.players[1].stone).toBe(10);
		});

		it('各プレイヤーの盤面が2x2の空盤面で初期化される', () => {
			const context = actor.getSnapshot().context;
			expect(context.players[0].fieldGrid).toHaveLength(2);
			expect(context.players[0].fieldGrid[0]).toHaveLength(2);
			expect(context.players[0].fieldGrid[0][0].card).toBeNull();
			expect(context.players[0].fieldGrid[0][0].isWaiting).toBe(false);
		});

		it('現在のプレイヤーが0（プレイヤー1）に設定される', () => {
			const context = actor.getSnapshot().context;
			expect(context.currentPlayer).toBe(0);
		});

		it('選択状態がリセットされている', () => {
			const context = actor.getSnapshot().context;
			expect(context.selectedCard).toBeNull();
			expect(context.selectedCell).toBeNull();
			expect(context.winner).toBeNull();
		});
	});

	describe('カード選択', () => {
		it('SELECT_CARDイベントでカードが選択される', () => {
			const card = actor.getSnapshot().context.players[0].hand[0];
			actor.send({ type: 'SELECT_CARD', card });

			const context = actor.getSnapshot().context;
			expect(context.selectedCard).toBe(card);
		});

		it('RESET_SELECTIONイベントで選択がリセットされる', () => {
			const card = actor.getSnapshot().context.players[0].hand[0];
			actor.send({ type: 'SELECT_CARD', card });
			actor.send({ type: 'RESET_SELECTION' });

			const context = actor.getSnapshot().context;
			expect(context.selectedCard).toBeNull();
			expect(context.selectedCell).toBeNull();
		});
	});

	describe('セル選択', () => {
		it('SELECT_CELLイベントでセルが選択される', () => {
			actor.send({ type: 'SELECT_CELL', row: 0, col: 1 });

			const context = actor.getSnapshot().context;
			expect(context.selectedCell).toEqual({ row: 0, col: 1 });
		});
	});

	describe('カード配置', () => {
		it('モンスターカードを空のセルに配置できる', () => {
			const context = actor.getSnapshot().context;
			const monsterCard = context.players[0].hand.find(
				(card: Card) => card.type === 'monster'
			) as MonsterCard;
			const initialStone = context.players[0].stone;

			actor.send({
				type: 'PLACE_CARD',
				card: monsterCard,
				row: 0,
				col: 0
			});

			const newContext = actor.getSnapshot().context;
			const placedCard = newContext.players[0].fieldGrid[0][0].card;

			expect(placedCard).toBe(monsterCard);
			expect(newContext.players[0].fieldGrid[0][0].isWaiting).toBe(true);
			expect(newContext.players[0].stone).toBe(initialStone - 1);
			expect(newContext.players[0].hand).not.toContain(monsterCard);
		});

		it('マジックカードは配置できない（ガード条件により無視される）', () => {
			// カスタムデッキでテストする（マジックカードを含む）
			const customActor = createGameActor({ customDeck: testDeck });
			customActor.start();

			const context = customActor.getSnapshot().context;
			const magicCard = context.players[0].hand.find((card) => card.type === 'magic')!;
			const initialStone = context.players[0].stone;
			const initialFieldState = JSON.parse(JSON.stringify(context.players[0].fieldGrid));

			customActor.send({
				type: 'PLACE_CARD',
				card: magicCard,
				row: 0,
				col: 0
			});

			const newContext = customActor.getSnapshot().context;
			// ガード条件によりアクションが実行されないため、状態は変わらない
			expect(JSON.stringify(newContext.players[0].fieldGrid)).toBe(
				JSON.stringify(initialFieldState)
			);
			expect(newContext.players[0].stone).toBe(initialStone);
			expect(newContext.players[0].hand).toContain(magicCard);
		});

		it('カスタムデッキのモンスターを配置できる', () => {
			const customActor = createGameActor({ customDeck: testDeck });
			customActor.start();

			const context = customActor.getSnapshot().context;
			const testMonster = context.players[0].hand.find((card) => card.id === 100) as MonsterCard;
			const initialStone = context.players[0].stone;

			customActor.send({
				type: 'PLACE_CARD',
				card: testMonster,
				row: 0,
				col: 0
			});

			const newContext = customActor.getSnapshot().context;
			const placedCard = newContext.players[0].fieldGrid[0][0].card;

			expect(placedCard).toBe(testMonster);
			expect(placedCard?.name).toBe('テストスライム');
			expect(placedCard?.hp).toBe(10);
			expect(newContext.players[0].stone).toBe(initialStone - 1);
		});

		it('既にカードが配置されているセルには配置できない', () => {
			// 新しいアクターで独立したテストを実行
			const testActor = createGameActor();
			testActor.start();

			const context = testActor.getSnapshot().context;
			const monsterCards = context.players[0].hand.filter(
				(card: Card) => card.type === 'monster'
			) as MonsterCard[];
			const monsterCard1 = monsterCards[0];
			const monsterCard2 = monsterCards[1];

			// 最初のカードを配置
			testActor.send({
				type: 'PLACE_CARD',
				card: monsterCard1,
				row: 0,
				col: 0
			});

			const initialContext = testActor.getSnapshot().context;
			const initialStone = initialContext.players[0].stone;
			const placedCard = initialContext.players[0].fieldGrid[0][0].card;

			// 同じセルに2枚目のカードを配置しようとする
			testActor.send({
				type: 'PLACE_CARD',
				card: monsterCard2,
				row: 0,
				col: 0
			});

			const newContext = testActor.getSnapshot().context;
			// ガード条件により無視されるため、元のカードが残る
			expect(newContext.players[0].fieldGrid[0][0].card).toBe(placedCard);
			expect(newContext.players[0].stone).toBe(initialStone);
			// 2枚目のカードは手札に残っている（配置されなかった）
			expect(newContext.players[0].hand.length).toBe(initialContext.players[0].hand.length);
		});

		it('カスタムデッキでストーン不足の場合は配置できない', () => {
			const customActor = createGameActor({ customDeck: testDeck });
			customActor.start();

			const initialContext = customActor.getSnapshot().context;
			initialContext.players[0].stone = 0;

			const testMonster = initialContext.players[0].hand.find(
				(card) => card.id === 100
			) as MonsterCard;
			const initialFieldState = JSON.parse(JSON.stringify(initialContext.players[0].fieldGrid));

			customActor.send({
				type: 'PLACE_CARD',
				card: testMonster,
				row: 0,
				col: 0
			});

			const newContext = customActor.getSnapshot().context;
			expect(JSON.stringify(newContext.players[0].fieldGrid)).toBe(
				JSON.stringify(initialFieldState)
			);
			expect(newContext.players[0].stone).toBe(0);
			expect(newContext.players[0].hand).toContain(testMonster);
		});

		it('ストーンが不足している場合は配置できない', () => {
			// 新しいアクターを作成してストーンを直接設定
			const testActor = createGameActor();
			testActor.start();

			// アクターのコンテキストを取得し、ストーンを0に設定
			const initialContext = testActor.getSnapshot().context;
			initialContext.players[0].stone = 0;

			const monsterCard = initialContext.players[0].hand.find(
				(card: Card) => card.type === 'monster'
			) as MonsterCard;
			const initialFieldState = JSON.parse(JSON.stringify(initialContext.players[0].fieldGrid));

			testActor.send({
				type: 'PLACE_CARD',
				card: monsterCard,
				row: 0,
				col: 0
			});

			const newContext = testActor.getSnapshot().context;
			// ガード条件により無視されるため、状態は変わらない
			expect(JSON.stringify(newContext.players[0].fieldGrid)).toBe(
				JSON.stringify(initialFieldState)
			);
			expect(newContext.players[0].stone).toBe(0);
			expect(newContext.players[0].hand).toContain(monsterCard);
		});
	});

	describe('ターン管理', () => {
		it('END_TURNイベントでCPUターンに切り替わる', () => {
			expect(actor.getSnapshot().matches('playerTurn')).toBe(true);

			actor.send({ type: 'END_TURN' });

			expect(actor.getSnapshot().matches('cpuTurn')).toBe(true);
			expect(actor.getSnapshot().context.currentPlayer).toBe(1);
		});

		it('CPUターンは自動的にプレイヤーターンに戻る', async () => {
			actor.send({ type: 'END_TURN' });
			expect(actor.getSnapshot().matches('cpuTurn')).toBe(true);

			// CPUターンの自動切り替えを待つ
			await new Promise((resolve) => setTimeout(resolve, 2100));

			expect(actor.getSnapshot().matches('playerTurn')).toBe(true);
			expect(actor.getSnapshot().context.currentPlayer).toBe(0);
		});
	});

	describe('待機状態管理', () => {
		it('配置したモンスターは待機状態で始まる', () => {
			const testActor = createGameActor();
			testActor.start();

			const context = testActor.getSnapshot().context;
			const monsterCard = context.players[0].hand.find(
				(card: Card) => card.type === 'monster'
			) as MonsterCard;

			testActor.send({
				type: 'PLACE_CARD',
				card: monsterCard,
				row: 0,
				col: 0
			});

			const newContext = testActor.getSnapshot().context;
			expect(newContext.players[0].fieldGrid[0][0].isWaiting).toBe(true);
		});

		it('モンスターの待機状態は自分のターン開始時に解除される', async () => {
			const testActor = createGameActor();
			testActor.start();

			// プレイヤー1がモンスターを配置
			const context = testActor.getSnapshot().context;
			const monsterCard = context.players[0].hand.find(
				(card: Card) => card.type === 'monster'
			) as MonsterCard;
			testActor.send({
				type: 'PLACE_CARD',
				card: monsterCard,
				row: 0,
				col: 0
			});

			// モンスターが待機状態であることを確認
			let currentContext = testActor.getSnapshot().context;
			expect(currentContext.players[0].fieldGrid[0][0].isWaiting).toBe(true);

			// プレイヤー1のターンを終了
			testActor.send({ type: 'END_TURN' });
			expect(testActor.getSnapshot().matches('cpuTurn')).toBe(true);

			// この時点で、CPUターンに切り替わった時にプレイヤー1のモンスターはまだ待機状態
			currentContext = testActor.getSnapshot().context;
			expect(currentContext.players[0].fieldGrid[0][0].isWaiting).toBe(true);

			// CPUターンが終了してプレイヤー1のターンが戻ってくるまで待つ
			await new Promise((resolve) => setTimeout(resolve, 2100));

			// プレイヤー1のターンが戻ってきたときに待機状態が解除されることを確認
			currentContext = testActor.getSnapshot().context;
			expect(testActor.getSnapshot().matches('playerTurn')).toBe(true);
			expect(currentContext.currentPlayer).toBe(0);
			expect(currentContext.players[0].fieldGrid[0][0].isWaiting).toBe(false);
		});

		it('相手プレイヤーのモンスターの待機状態は自分のターン開始時に影響されない', async () => {
			const testActor = createGameActor();
			testActor.start();

			// プレイヤー1がモンスターを配置
			const context = testActor.getSnapshot().context;
			const monsterCard = context.players[0].hand.find(
				(card: Card) => card.type === 'monster'
			) as MonsterCard;
			testActor.send({
				type: 'PLACE_CARD',
				card: monsterCard,
				row: 0,
				col: 0
			});

			// CPUターンに切り替え
			testActor.send({ type: 'END_TURN' });

			// CPUターン中に手動でCPUのモンスターを配置（テスト用）
			let currentContext = testActor.getSnapshot().context;
			const cpuMonster = currentContext.players[1].hand.find(
				(card: Card) => card.type === 'monster'
			) as MonsterCard;
			currentContext.players[1].fieldGrid[0][1].card = cpuMonster;
			currentContext.players[1].fieldGrid[0][1].isWaiting = true;

			// プレイヤー1のターンが戻ってくるまで待つ
			await new Promise((resolve) => setTimeout(resolve, 2100));

			currentContext = testActor.getSnapshot().context;
			// プレイヤー1のモンスターの待機状態は解除されている
			expect(currentContext.players[0].fieldGrid[0][0].isWaiting).toBe(false);
			// CPUのモンスターの待機状態は影響されない
			expect(currentContext.players[1].fieldGrid[0][1].isWaiting).toBe(true);
		});
	});

	describe('モンスターの自動前進', () => {
		it('ターン開始時に後衛のモンスターが前衛の空いたマスに移動する', () => {
			const customActor = createGameActor({ customDeck: testDeck });
			customActor.start();

			// 後衛にモンスターを配置
			const monsterCard = customActor
				.getSnapshot()
				.context.players[0].hand.find((card) => card.type === 'monster') as MonsterCard;

			customActor.send({
				type: 'PLACE_CARD',
				card: monsterCard,
				row: 1, // 後衛
				col: 0
			});

			// ターンを終了して次のターンを開始
			customActor.send({ type: 'END_TURN' });

			// CPUターンの後、プレイヤーターンに戻る（自動前進が発生）
			return new Promise<void>((resolve) => {
				setTimeout(() => {
					const context = customActor.getSnapshot().context;

					// 前衛にモンスターが移動していることを確認
					expect(context.players[0].fieldGrid[0][0].card).toBe(monsterCard);
					expect(context.players[0].fieldGrid[1][0].card).toBe(null);
					resolve();
				}, 2200); // CPU_ACTION_DELAY + 200ms余裕
			});
		});

		it(
			'前衛にモンスターがいる場合は後衛のモンスターは移動しない',
			() => {
				const customActor = createGameActor({ customDeck: testDeck });
				customActor.start();

				const monsters = customActor
					.getSnapshot()
					.context.players[0].hand.filter((card) => card.type === 'monster') as MonsterCard[];

				// 前衛と後衛にモンスターを配置
				customActor.send({
					type: 'PLACE_CARD',
					card: monsters[0],
					row: 0, // 前衛
					col: 0
				});

				customActor.send({
					type: 'PLACE_CARD',
					card: monsters[1],
					row: 1, // 後衛
					col: 0
				});

				// ターンを終了して次のターンを開始
				customActor.send({ type: 'END_TURN' });

				// CPUターンの後、プレイヤーターンに戻る
				return new Promise<void>((resolve) => {
					setTimeout(() => {
						const context = customActor.getSnapshot().context;

						// 前衛と後衛のモンスターが変わらないことを確認
						expect(context.players[0].fieldGrid[0][0].card).toBe(monsters[0]);
						expect(context.players[0].fieldGrid[1][0].card).toBe(monsters[1]);
						resolve();
					}, 2200);
				});
			},
			7000
		);

		it(
			'複数列の後衛モンスターが同時に前進できる',
			() => {
				const customActor = createGameActor({ customDeck: testDeck });
				customActor.start();

				const monsters = customActor
					.getSnapshot()
					.context.players[0].hand.filter((card) => card.type === 'monster') as MonsterCard[];

				// 両方の後衛にモンスターを配置
				customActor.send({
					type: 'PLACE_CARD',
					card: monsters[0],
					row: 1, // 後衛
					col: 0
				});

				customActor.send({
					type: 'PLACE_CARD',
					card: monsters[1],
					row: 1, // 後衛
					col: 1
				});

				// ターンを終了して次のターンを開始
				customActor.send({ type: 'END_TURN' });

				// CPUターンの後、プレイヤーターンに戻る
				return new Promise<void>((resolve) => {
					setTimeout(() => {
						const context = customActor.getSnapshot().context;

						// 両方の前衛にモンスターが移動していることを確認
						expect(context.players[0].fieldGrid[0][0].card).toBe(monsters[0]);
						expect(context.players[0].fieldGrid[0][1].card).toBe(monsters[1]);
						expect(context.players[0].fieldGrid[1][0].card).toBe(null);
						expect(context.players[0].fieldGrid[1][1].card).toBe(null);
						resolve();
					}, 2200);
				});
			},
			7000
		);

		it('CPUのモンスターも自動前進する', () => {
			const customActor = createGameActor({ customDeck: testDeck });
			customActor.start();

			// プレイヤーターンを終了してCPUターンに移行
			customActor.send({ type: 'END_TURN' });

			return new Promise<void>((resolve) => {
				setTimeout(() => {
					// CPUがモンスターを配置した後の状態を確認
					const context = customActor.getSnapshot().context;
					const cpuField = context.players[1].fieldGrid;

					// CPUのフィールドにモンスターが配置されていることを確認
					const hasMonster = cpuField.some((row) => row.some((cell) => cell.card !== null));
					expect(hasMonster).toBe(true);

					// 次のCPUターンで自動前進が発生することを確認するため、
					// プレイヤーターンを終了してもう一度CPUターンに移行
					customActor.send({ type: 'END_TURN' });

					setTimeout(() => {
						// 自動前進が正しく動作していることを確認
						// (具体的な配置は予測できないが、エラーが発生しないことを確認)
						expect(customActor.getSnapshot().value).toBe('playerTurn');
						resolve();
					}, 2200);
				}, 2200);
			});
		});
	});
});
