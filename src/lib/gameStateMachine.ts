import { assign, createActor, setup } from 'xstate';
import { CARD_MASTER } from './cardMaster.ts';

// ゲーム定数
export const MONSTER_PLACEMENT_COST = 1;
export const FIELD_GRID_SIZE = 2;
export const INITIAL_PLAYER_HP = 2;
export const INITIAL_PLAYER_STONE = 5;
export const CPU_ACTION_DELAY = 2000;
export const PLAYER_1_ID = 1;
export const PLAYER_2_ID = 2;
export const PLAYER_TURN_INDEX = 0;
export const CPU_TURN_INDEX = 1;
export const TOTAL_PLAYERS = 2;

// カードの型定義
export interface MonsterCommand {
	stoneCost: number;
	damage: number;
	description: string;
	attackRange: number;
}

// カードマスター（テンプレート）の型定義
export interface MonsterCardMaster {
	id: number;
	type: 'monster';
	name: string;
	hp: number;
	commands: MonsterCommand[];
	image: string;
}

export interface MagicCardMaster {
	id: number;
	type: 'magic';
	name: string;
	stoneCost: number;
	description: string;
	image: string;
}

export type CardMaster = MonsterCardMaster | MagicCardMaster;

// カードインスタンス（実際のゲーム内での使用）の型定義
export interface MonsterCard extends MonsterCardMaster {
	instanceId: string;
}

export interface MagicCard extends MagicCardMaster {
	instanceId: string;
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
	stone: number;
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
	selectedMonster: MonsterCard | null;
	winner: number | null;
	customDeck?: Card[];
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
	const grid: FieldGrid = [];
	for (let row = 0; row < FIELD_GRID_SIZE; row++) {
		grid[row] = [];
		for (let col = 0; col < FIELD_GRID_SIZE; col++) {
			grid[row][col] = { card: null, isWaiting: false };
		}
	}
	return grid;
}

// カードマスターからインスタンスを作成するヘルパー関数
function createCardInstance(master: CardMaster): Card {
	return {
		...master,
		instanceId: crypto.randomUUID()
	};
}

// サンプルカードの作成
function createSampleCards(): Card[] {
	const cards: Card[] = [];

	// 固定のカードセットを使用してhydrationエラーを防ぐ
	cards.push(createCardInstance(CARD_MASTER[0])); // マナトット
	cards.push(createCardInstance(CARD_MASTER[1])); // ビヨンド
	cards.push(createCardInstance(CARD_MASTER[0])); // マナトット
	cards.push(createCardInstance(CARD_MASTER[1])); // ビヨンド

	return cards;
}

// 初期状態の作成
function createInitialContext(customDeck?: Card[]): GameContext {
	const cards = customDeck || createSampleCards();
	return {
		players: [
			{
				id: PLAYER_1_ID,
				name: 'プレイヤー1',
				hp: INITIAL_PLAYER_HP,
				stone: INITIAL_PLAYER_STONE,
				deck: [...cards],
				hand: [...cards],
				field: [],
				fieldGrid: createEmptyFieldGrid()
			},
			{
				id: PLAYER_2_ID,
				name: 'プレイヤー2',
				hp: INITIAL_PLAYER_HP,
				stone: INITIAL_PLAYER_STONE,
				deck: [...cards],
				hand: [...cards],
				field: [],
				fieldGrid: createEmptyFieldGrid()
			}
		],
		currentPlayer: PLAYER_TURN_INDEX,
		selectedCard: null,
		selectedCell: null,
		selectedMonster: null,
		winner: null,
		customDeck
	};
}

// ゲーム状態マシンの定義
interface GameStateMachineOptions {
	customDeck?: Card[];
}

// カードインスタンス作成を外部からも利用可能にする
export { createCardInstance };

export const gameStateMachine = (options?: GameStateMachineOptions) =>
	setup({
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
			selectCardAndPlaceIfCellSelected: assign(({ context, event }) => {
				if (event.type === 'SELECT_CARD' && context.selectedCell) {
					const currentPlayerObj = context.players[context.currentPlayer];
					const { row, col } = context.selectedCell;
					const cell = currentPlayerObj.fieldGrid[row][col];

					// カード配置が可能な場合
					if (
						!cell.card &&
						event.card.type === 'monster' &&
						currentPlayerObj.stone >= MONSTER_PLACEMENT_COST
					) {
						const newPlayers = [...context.players];
						const newCurrentPlayerObj = newPlayers[context.currentPlayer];
						const newCell = newCurrentPlayerObj.fieldGrid[row][col];

						// ストーンを消費してモンスターを配置
						newCurrentPlayerObj.stone -= MONSTER_PLACEMENT_COST;
						newCell.card = event.card as MonsterCard;
						newCell.isWaiting = true;

						// 手札からカードを削除
						newCurrentPlayerObj.hand = newCurrentPlayerObj.hand.filter(
							(c) => c.instanceId !== event.card.instanceId
						);

						// 配置成功時は選択状態をクリア
						return {
							players: newPlayers,
							selectedCard: null,
							selectedCell: null,
							selectedMonster: null
						};
					}
				}

				// カード配置しない場合は通常のカード選択
				if (event.type === 'SELECT_CARD') {
					return {
						selectedCard: event.card
					};
				}

				return {};
			}),
			placeCardOnCell: assign(({ context, event }) => {
				if (event.type === 'SELECT_CELL' && context.selectedCard) {
					const newPlayers = [...context.players];
					const newCurrentPlayerObj = newPlayers[context.currentPlayer];
					const newCell = newCurrentPlayerObj.fieldGrid[event.row][event.col];

					// ストーンを消費してモンスターを配置
					newCurrentPlayerObj.stone -= MONSTER_PLACEMENT_COST;
					newCell.card = context.selectedCard as MonsterCard;
					newCell.isWaiting = true;

					// 手札からカードを削除
					newCurrentPlayerObj.hand = newCurrentPlayerObj.hand.filter(
						(c) => c.instanceId !== context.selectedCard!.instanceId
					);

					return {
						players: newPlayers,
						selectedCard: null,
						selectedCell: null,
						selectedMonster: null
					};
				}
				return {};
			}),
			selectMonsterOnCell: assign(({ context, event }) => {
				if (event.type === 'SELECT_CELL') {
					const currentPlayerObj = context.players[context.currentPlayer];
					const cell = currentPlayerObj.fieldGrid[event.row][event.col];
					return {
						selectedCell: { row: event.row, col: event.col },
						selectedMonster: cell.card
					};
				}
				return {};
			}),
			selectEmptyCell: assign(({ event }) => {
				if (event.type === 'SELECT_CELL') {
					return {
						selectedCell: { row: event.row, col: event.col },
						selectedMonster: null
					};
				}
				return {};
			}),
			resetSelection: assign({
				selectedCard: null,
				selectedCell: null,
				selectedMonster: null
			}),
			placeCard: assign({
				players: ({ context, event }) => {
					if (event.type === 'PLACE_CARD') {
						const newPlayers = [...context.players];
						const currentPlayerObj = newPlayers[context.currentPlayer];
						const cell = currentPlayerObj.fieldGrid[event.row][event.col];

						if (
							!cell.card &&
							event.card.type === 'monster' &&
							currentPlayerObj.stone >= MONSTER_PLACEMENT_COST
						) {
							// ストーンを消費してモンスターを配置
							currentPlayerObj.stone -= MONSTER_PLACEMENT_COST;
							cell.card = event.card as MonsterCard;
							cell.isWaiting = true;

							// 手札からカードを削除
							currentPlayerObj.hand = currentPlayerObj.hand.filter(
								(c) => c.instanceId !== event.card.instanceId
							);
						}
						return newPlayers;
					}
					return context.players;
				},
				selectedCard: null,
				selectedCell: null,
				selectedMonster: null
			}),
			switchTurn: assign({
				currentPlayer: ({ context }) => (context.currentPlayer + 1) % TOTAL_PLAYERS,
				selectedCard: null,
				selectedCell: null,
				selectedMonster: null
			}),
			updateWaitingStatus: assign({
				players: ({ context }) => {
					return context.players.map((player, index) => {
						if (index === context.currentPlayer) {
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
				}
			}),
			moveBackRowMonsters: assign({
				players: ({ context }) => {
					return context.players.map((player, index) => {
						if (index === context.currentPlayer) {
							const newFieldGrid = player.fieldGrid.map((row) => row.map((cell) => ({ ...cell })));

							// 後衛（1行目）のモンスターをチェック
							for (let col = 0; col < FIELD_GRID_SIZE; col++) {
								const backRowCell = newFieldGrid[1][col];
								const frontRowCell = newFieldGrid[0][col];

								// 後衛にモンスターがいて、前衛が空いている場合
								if (backRowCell.card && !frontRowCell.card) {
									// モンスターを前進
									frontRowCell.card = backRowCell.card;
									frontRowCell.isWaiting = backRowCell.isWaiting;

									// 後衛をクリア
									backRowCell.card = null;
									backRowCell.isWaiting = false;
								}
							}

							return {
								...player,
								fieldGrid: newFieldGrid
							};
						}
						return player;
					});
				}
			}),
			cpuAction: assign({
				players: ({ context }) => {
					const newPlayers = [...context.players];
					const cpu = newPlayers[CPU_TURN_INDEX];

					// CPUの行動ロジック
					const emptyCells = findEmptyCells(cpu.fieldGrid);
					const playableCards = cpu.hand.filter(
						(card) => card.type === 'monster' && cpu.stone >= MONSTER_PLACEMENT_COST
					);

					// カード配置
					while (
						emptyCells.length > 0 &&
						playableCards.length > 0 &&
						cpu.stone >= MONSTER_PLACEMENT_COST
					) {
						const bestCard = selectBestCard(playableCards);
						const bestPosition = findBestPosition(emptyCells);

						// カードを配置
						const cell = cpu.fieldGrid[bestPosition.row][bestPosition.col];
						if (!cell.card) {
							cpu.stone -= MONSTER_PLACEMENT_COST;
							cell.card = bestCard as MonsterCard;
							cell.isWaiting = true;
							cpu.hand = cpu.hand.filter((c) => c.instanceId !== bestCard.instanceId);
						}

						emptyCells.splice(emptyCells.indexOf(bestPosition), 1);
						playableCards.splice(playableCards.indexOf(bestCard), 1);
					}

					return newPlayers;
				}
			}),
			executeAttack: assign({
				players: ({ context, event }) => {
					if (event.type === 'ATTACK') {
						const newPlayers = [...context.players];
						const attacker = findMonsterById(newPlayers, event.attackerId);
						const target = findMonsterById(newPlayers, event.targetId);

						if (attacker && target) {
							// 攻撃実行
							const damage = attacker.commands[0].damage; // 最初のコマンドのダメージを使用
							target.hp -= damage;

							// HPが0以下になったモンスターを削除
							if (target.hp <= 0) {
								removeMonsterFromField(newPlayers, event.targetId);
							}
						}

						return newPlayers;
					}
					return context.players;
				}
			})
		},
		guards: {
			canPlaceCard: ({ context, event }) => {
				if (event.type === 'PLACE_CARD') {
					const currentPlayerObj = context.players[context.currentPlayer];
					const cell = currentPlayerObj.fieldGrid[event.row][event.col];
					return (
						!cell.card &&
						event.card.type === 'monster' &&
						currentPlayerObj.stone >= MONSTER_PLACEMENT_COST
					);
				}
				return false;
			},
			canPlaceCardOnSelectedCell: ({ context, event }) => {
				if (event.type === 'SELECT_CELL' && context.selectedCard) {
					const currentPlayerObj = context.players[context.currentPlayer];
					const cell = currentPlayerObj.fieldGrid[event.row][event.col];
					return (
						!cell.card &&
						context.selectedCard.type === 'monster' &&
						currentPlayerObj.stone >= MONSTER_PLACEMENT_COST
					);
				}
				return false;
			},
			hasMonsterOnCell: ({ context, event }) => {
				if (event.type === 'SELECT_CELL') {
					const currentPlayerObj = context.players[context.currentPlayer];
					const cell = currentPlayerObj.fieldGrid[event.row][event.col];
					return cell.card !== null && context.currentPlayer === 0;
				}
				return false;
			},
			isEmptyCell: ({ context, event }) => {
				if (event.type === 'SELECT_CELL') {
					const currentPlayerObj = context.players[context.currentPlayer];
					const cell = currentPlayerObj.fieldGrid[event.row][event.col];
					return cell.card === null;
				}
				return false;
			},
			canAttack: ({ context, event }) => {
				if (event.type === 'ATTACK') {
					const attacker = findMonsterById(context.players, event.attackerId);
					const target = findMonsterById(context.players, event.targetId);

					if (!attacker || !target) return false;

					const attackerPosition = findMonsterPosition(context.players, event.attackerId);
					const targetPosition = findMonsterPosition(context.players, event.targetId);

					if (!attackerPosition || !targetPosition) return false;

					const attackRange = attacker.commands[0].attackRange;
					return isInAttackRange(attackerPosition, targetPosition, attackRange);
				}
				return false;
			},
			isPlayerTurn: ({ context }) => context.currentPlayer === PLAYER_TURN_INDEX,
			isCpuTurn: ({ context }) => context.currentPlayer === CPU_TURN_INDEX
		}
	}).createMachine({
		id: 'cardGame',
		initial: 'playerTurn',
		context: createInitialContext(options?.customDeck),
		states: {
			playerTurn: {
				entry: 'moveBackRowMonsters',
				on: {
					SELECT_CARD: {
						actions: 'selectCardAndPlaceIfCellSelected'
					},
					SELECT_CELL: [
						{
							guard: 'canPlaceCardOnSelectedCell',
							actions: 'placeCardOnCell'
						},
						{
							guard: 'hasMonsterOnCell',
							actions: 'selectMonsterOnCell'
						},
						{
							guard: 'isEmptyCell',
							actions: 'selectEmptyCell'
						}
					],
					PLACE_CARD: {
						guard: 'canPlaceCard',
						actions: 'placeCard'
					},
					ATTACK: {
						guard: 'canAttack',
						actions: 'executeAttack'
					},
					RESET_SELECTION: {
						actions: 'resetSelection'
					},
					END_TURN: {
						target: 'cpuTurn',
						actions: ['switchTurn', 'updateWaitingStatus']
					}
				}
			},
			cpuTurn: {
				entry: ['moveBackRowMonsters', 'cpuAction'],
				after: {
					[CPU_ACTION_DELAY]: {
						target: 'playerTurn',
						actions: ['switchTurn', 'updateWaitingStatus']
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
	const monsterCards = cards.filter((card) => card.type === 'monster') as MonsterCard[];

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
	return emptyCells[0];
}

function findMonsterById(players: Player[], monsterId: string): MonsterCard | null {
	for (const player of players) {
		for (let row = 0; row < player.fieldGrid.length; row++) {
			for (let col = 0; col < player.fieldGrid[row].length; col++) {
				const card = player.fieldGrid[row][col].card;
				if (card && card.instanceId === monsterId) {
					return card;
				}
			}
		}
	}
	return null;
}

function findMonsterPosition(
	players: Player[],
	monsterId: string
): { playerId: number; row: number; col: number } | null {
	for (let playerId = 0; playerId < players.length; playerId++) {
		const player = players[playerId];
		for (let row = 0; row < player.fieldGrid.length; row++) {
			for (let col = 0; col < player.fieldGrid[row].length; col++) {
				const card = player.fieldGrid[row][col].card;
				if (card && card.instanceId === monsterId) {
					return { playerId, row, col };
				}
			}
		}
	}
	return null;
}

function removeMonsterFromField(players: Player[], monsterId: string): void {
	for (const player of players) {
		for (let row = 0; row < player.fieldGrid.length; row++) {
			for (let col = 0; col < player.fieldGrid[row].length; col++) {
				const cell = player.fieldGrid[row][col];
				if (cell.card && cell.card.instanceId === monsterId) {
					cell.card = null;
					cell.isWaiting = false;
					return;
				}
			}
		}
	}
}

function isInAttackRange(
	attackerPos: { playerId: number; row: number; col: number },
	targetPos: { playerId: number; row: number; col: number },
	attackRange: number
): boolean {
	// 同じプレイヤーのモンスター同士は攻撃できない
	if (attackerPos.playerId === targetPos.playerId) {
		return false;
	}

	// プレイヤー1（上側）とプレイヤー2（下側）の配置を考慮
	// 攻撃可能範囲の計算
	const colDistance = Math.abs(attackerPos.col - targetPos.col);

	// 攻撃範囲1: 目の前の敵のみ（同じ列の相手プレイヤーの前衛）
	if (attackRange === 1) {
		return colDistance === 0 && attackerPos.row === 0 && targetPos.row === 1;
	}

	// 攻撃範囲2: 目の前以外の敵（同じ列以外、または後衛）
	if (attackRange === 2) {
		// 同じ列の目の前にいる場合は攻撃不可
		if (colDistance === 0 && attackerPos.row === 0 && targetPos.row === 1) {
			return false;
		}
		// その他の敵プレイヤーのモンスターは攻撃可能
		return true;
	}

	return false;
}

// アクターの作成関数
export function createGameActor(options?: GameStateMachineOptions) {
	return createActor(gameStateMachine(options));
}
