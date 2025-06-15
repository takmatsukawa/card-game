import { assign, createActor, setup } from 'xstate';

// カードの型定義（既存の型と同様）
export interface MonsterCommand {
	manaCost: number;
	damage: number;
	description: string;
}

export interface MonsterCard {
	id: number;
	type: 'monster';
	name: string;
	hp: number;
	commands: MonsterCommand[];
}

export interface MagicCard {
	id: number;
	type: 'magic';
	name: string;
	manaCost: number;
	description: string;
}

export type Card = MonsterCard | MagicCard;

export interface FieldCell {
	card: MonsterCard | null;
	isWaiting: boolean;
}

export type FieldGrid = FieldCell[][];

export interface Player {
	id: number;
	name: string;
	hp: number;
	mana: number;
	deck: Card[];
	hand: Card[];
	field: MonsterCard[];
	fieldGrid: FieldGrid;
}

// ゲーム状態のコンテキスト
export interface GameContext {
	players: Player[];
	currentPlayer: number;
	selectedCard: Card | null;
	selectedCell: { row: number; col: number } | null;
	winner: number | null;
}

// イベントの型定義
export type GameEvent =
	| { type: 'SELECT_CARD'; card: Card }
	| { type: 'SELECT_CELL'; row: number; col: number }
	| { type: 'END_TURN' }
	| { type: 'CPU_ACTION_COMPLETE' }
	| { type: 'RESET_SELECTION' }
	| { type: 'PLACE_CARD'; card: Card; row: number; col: number }
	| { type: 'ATTACK'; attackerId: string; targetId: string }
	| { type: 'GAME_OVER'; winner: number };

// 空の2x2盤面を作成する関数
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

// サンプルカードの作成
function createSampleCards(): Card[] {
	return [
		{
			id: 1,
			type: 'monster',
			name: 'スライム',
			hp: 5,
			commands: [
				{ manaCost: 1, damage: 2, description: '通常攻撃' },
				{ manaCost: 2, damage: 4, description: '強力な攻撃' }
			]
		},
		{
			id: 2,
			type: 'magic',
			name: 'ファイアボール',
			manaCost: 3,
			description: '相手に3ダメージを与える'
		},
		{
			id: 3,
			type: 'monster',
			name: 'ゴブリン',
			hp: 3,
			commands: [
				{ manaCost: 1, damage: 1, description: '素早い攻撃' },
				{ manaCost: 3, damage: 3, description: '連続攻撃' }
			]
		},
		{
			id: 4,
			type: 'magic',
			name: 'ヒール',
			manaCost: 2,
			description: '自分に2回復する'
		}
	];
}

// 初期状態の作成
function createInitialContext(): GameContext {
	const cards = createSampleCards();
	return {
		players: [
			{
				id: 1,
				name: 'プレイヤー1',
				hp: 20,
				mana: 10,
				deck: [...cards],
				hand: [...cards],
				field: [],
				fieldGrid: createEmptyFieldGrid()
			},
			{
				id: 2,
				name: 'プレイヤー2',
				hp: 20,
				mana: 10,
				deck: [...cards],
				hand: [...cards],
				field: [],
				fieldGrid: createEmptyFieldGrid()
			}
		],
		currentPlayer: 0,
		selectedCard: null,
		selectedCell: null,
		winner: null
	};
}

// ゲーム状態マシンの定義
export const gameStateMachine = setup({
	types: {
		context: {} as GameContext,
		events: {} as GameEvent
	},
	actions: {
		selectCard: assign({
			selectedCard: ({ event }) => {
				if (event.type === 'SELECT_CARD') {
					return event.card;
				}
				return null;
			}
		}),
		selectCell: assign({
			selectedCell: ({ event }) => {
				if (event.type === 'SELECT_CELL') {
					return { row: event.row, col: event.col };
				}
				return null;
			}
		}),
		resetSelection: assign({
			selectedCard: null,
			selectedCell: null
		}),
		placeCard: assign({
			players: ({ context, event }) => {
				if (event.type === 'PLACE_CARD') {
					const newPlayers = [...context.players];
					const currentPlayerObj = newPlayers[context.currentPlayer];
					const cell = currentPlayerObj.fieldGrid[event.row][event.col];

					if (!cell.card && event.card.type === 'monster' && currentPlayerObj.mana >= 1) {
						// マナを消費してモンスターを配置
						currentPlayerObj.mana -= 1;
						cell.card = event.card as MonsterCard;
						cell.isWaiting = true;

						// 手札からカードを削除
						currentPlayerObj.hand = currentPlayerObj.hand.filter((c) => c.id !== event.card.id);
					}
					return newPlayers;
				}
				return context.players;
			},
			selectedCard: null,
			selectedCell: null
		}),
		switchTurn: assign({
			currentPlayer: ({ context }) => (context.currentPlayer + 1) % 2,
			selectedCard: null,
			selectedCell: null
		}),
		switchTurnAndUpdateWaiting: assign({
			currentPlayer: ({ context }) => (context.currentPlayer + 1) % 2,
			players: ({ context }) => {
				const newCurrentPlayer = (context.currentPlayer + 1) % 2;

				return context.players.map((player, index) => {
					if (index === newCurrentPlayer) {
						return {
							...player,
							fieldGrid: player.fieldGrid.map((row) =>
								row.map((cell) => ({
									...cell,
									isWaiting: cell.card ? false : cell.isWaiting
								}))
							)
						};
					}

					return player;
				});
			},
			selectedCard: null,
			selectedCell: null
		}),
		updateWaitingStatus: assign({
			players: ({ context }) => {
				return context.players.map((player, index) => {
					if (index === context.currentPlayer) {
						return {
							...player,
							fieldGrid: player.fieldGrid.map(row => 
								row.map(cell => ({
									...cell,
									isWaiting: cell.card ? false : cell.isWaiting
								}))
							)
						};
					}

					return player;
				});
			}
		}),
		cpuAction: assign({
			players: ({ context }) => {
				const newPlayers = [...context.players];
				const cpu = newPlayers[1];
				const player = newPlayers[0];

				// CPUの行動ロジック
				const emptyCells = findEmptyCells(cpu.fieldGrid);
				const playableCards = cpu.hand.filter(card => 
					card.type === 'monster' && cpu.mana >= 1
				);

				// カード配置
				while (emptyCells.length > 0 && playableCards.length > 0 && cpu.mana >= 1) {
					const bestCard = selectBestCard(playableCards);
					const bestPosition = findBestPosition(emptyCells);
					
					// カードを配置
					const cell = cpu.fieldGrid[bestPosition.row][bestPosition.col];
					if (!cell.card) {
						cpu.mana -= 1;
						cell.card = bestCard as MonsterCard;
						cell.isWaiting = true;
						cpu.hand = cpu.hand.filter((c) => c.id !== bestCard.id);
					}

					emptyCells.splice(emptyCells.indexOf(bestPosition), 1);
					playableCards.splice(playableCards.indexOf(bestCard), 1);
				}

				// 攻撃処理
				executeAttacks(cpu, player);

				return newPlayers;
			}
		})
	},
	guards: {
		canPlaceCard: ({ context, event }) => {
			if (event.type === 'PLACE_CARD') {
				const currentPlayerObj = context.players[context.currentPlayer];
				const cell = currentPlayerObj.fieldGrid[event.row][event.col];
				return !cell.card && event.card.type === 'monster' && currentPlayerObj.mana >= 1;
			}
			return false;
		},
		isPlayerTurn: ({ context }) => context.currentPlayer === 0,
		isCpuTurn: ({ context }) => context.currentPlayer === 1
	}
}).createMachine({
	id: 'cardGame',
	initial: 'playerTurn',
	context: createInitialContext(),
	states: {
		playerTurn: {
			on: {
				SELECT_CARD: {
					actions: 'selectCard'
				},
				SELECT_CELL: {
					actions: 'selectCell'
				},
				PLACE_CARD: {
					guard: 'canPlaceCard',
					actions: 'placeCard'
				},
				RESET_SELECTION: {
					actions: 'resetSelection'
				},
				END_TURN: {
					target: 'cpuTurn',
					actions: 'switchTurnAndUpdateWaiting'
				}
			}
		},
		cpuTurn: {
			entry: 'cpuAction',
			after: {
				2000: {
					target: 'playerTurn',
					actions: 'switchTurnAndUpdateWaiting'
				}
			}
		},
		gameOver: {
			type: 'final'
		}
	}
});

// ヘルパー関数
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

function selectBestCard(cards: Card[]): Card {
	const monsterCards = cards.filter(card => card.type === 'monster') as MonsterCard[];
	
	return monsterCards.reduce((best, current) => {
		const currentValue = current.hp + current.commands.reduce((sum, cmd) => sum + cmd.damage, 0);
		const bestValue = (best as MonsterCard).hp + (best as MonsterCard).commands.reduce((sum, cmd) => sum + cmd.damage, 0);
		return currentValue > bestValue ? current : best;
	});
}

function findBestPosition(emptyCells: { row: number; col: number }[]): { row: number; col: number } {
	return emptyCells[0];
}

function executeAttacks(cpu: Player, player: Player) {
	// 攻撃可能なモンスターを探す
	const attackers: { row: number; col: number; card: MonsterCard }[] = [];
	for (let row = 0; row < cpu.fieldGrid.length; row++) {
		for (let col = 0; col < cpu.fieldGrid[row].length; col++) {
			const cell = cpu.fieldGrid[row][col];
			if (cell.card && !cell.isWaiting) {
				attackers.push({ row, col, card: cell.card });
			}
		}
	}

	// 攻撃対象を探す
	const targets: { row: number; col: number }[] = [];
	for (let row = 0; row < player.fieldGrid.length; row++) {
		for (let col = 0; col < player.fieldGrid[row].length; col++) {
			if (player.fieldGrid[row][col].card) {
				targets.push({ row, col });
			}
		}
	}

	// 攻撃実行
	attackers.forEach(attacker => {
		if (targets.length > 0) {
			const target = targets.reduce((weakest, current) => {
				const currentHP = player.fieldGrid[current.row][current.col].card?.hp || 0;
				const weakestHP = player.fieldGrid[weakest.row][weakest.col].card?.hp || 0;
				return currentHP < weakestHP ? current : weakest;
			});

			const targetCard = player.fieldGrid[target.row][target.col].card;
			if (targetCard) {
				const bestCommand = attacker.card.commands.reduce((best, current) => 
					current.damage > best.damage ? current : best
				);

				targetCard.hp -= bestCommand.damage;

				if (targetCard.hp <= 0) {
					player.fieldGrid[target.row][target.col].card = null;
				}
			}
		}
	});
}

// アクターの作成関数
export function createGameActor() {
	return createActor(gameStateMachine);
}