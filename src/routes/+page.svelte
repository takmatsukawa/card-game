<script lang="ts">
	import { onMount } from 'svelte';

	// カードの種類を定義
	type CardType = 'monster' | 'magic';

	// モンスターカードのコマンド型
	interface MonsterCommand {
		manaCost: number;
		damage: number;
		description: string;
	}

	// モンスターカードの型
	interface MonsterCard {
		id: number;
		type: 'monster';
		name: string;
		hp: number;
		commands: MonsterCommand[];
	}

	// マジックカードの型
	interface MagicCard {
		id: number;
		type: 'magic';
		name: string;
		manaCost: number;
		description: string;
	}

	// カードの型（モンスターとマジックのユニオン型）
	type Card = MonsterCard | MagicCard;

	// 盤面の1マス
	interface FieldCell {
		card: MonsterCard | null;
		isWaiting: boolean; // 召喚酔い状態
	}

	// 2x2の盤面
	// [行][列] でアクセス（例: fieldGrid[0][1]）
	type FieldGrid = FieldCell[][];

	// プレイヤーの型
	interface Player {
		id: number;
		name: string;
		hp: number;
		mana: number;
		deck: Card[];
		hand: Card[];
		field: MonsterCard[];
		fieldGrid: FieldGrid;
	}

	// ゲームの状態
	let gameState = {
		currentPlayer: 0,
		players: [
			{
				id: 1,
				name: 'プレイヤー1',
				hp: 20,
				mana: 10,
				deck: [],
				hand: [],
				field: [],
				fieldGrid: createEmptyFieldGrid()
			},
			{
				id: 2,
				name: 'プレイヤー2',
				hp: 20,
				mana: 10,
				deck: [],
				hand: [],
				field: [],
				fieldGrid: createEmptyFieldGrid()
			}
		] as Player[]
	};

	// 選択中のカードとマスの状態
	let selectedCard: Card | null = null;
	let selectedCell: { row: number; col: number } | null = null;

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

	onMount(() => {
		// サンプルカードをデッキに追加
		const newPlayers = gameState.players.map((player) => {
			const cards = createSampleCards();
			const newPlayer = {
				...player,
				deck: cards,
				hand: [...cards],
				fieldGrid: createEmptyFieldGrid()
			};
			return newPlayer;
		});
		gameState = {
			...gameState,
			players: newPlayers
		};
	});

	// カードの種類に応じた背景色を取得
	function getCardBackgroundColor(card: Card): string {
		return card.type === 'monster' ? 'bg-blue-100' : 'bg-purple-100';
	}

	// カードの選択状態をリセット
	function resetSelection() {
		selectedCard = null;
		selectedCell = null;
	}

	// CPUの行動を制御する関数
	function cpuAction() {
		const cpu = gameState.players[1];
		const player = gameState.players[0];
		
		// 1. 場の状況分析
		const emptyCells = findEmptyCells(cpu.fieldGrid);
		const playableCards = cpu.hand.filter(card => 
			card.type === 'monster' && cpu.mana >= 1
		);
		
		// 2. カード配置ロジック
		if (emptyCells.length > 0 && playableCards.length > 0) {
			// 最も強いカードを選択
			const bestCard = selectBestCard(playableCards);
			// 最適な位置に配置
			const bestPosition = findBestPosition(emptyCells);
			placeCard(bestCard, bestPosition);
		}
		
		// 3. 攻撃判断
		if (canAttack()) {
			const attackTargets = findAttackTargets();
			executeBestAttack(attackTargets);
		}
	}

	// 空いているマスを探す
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

	// 最適なカードを選択
	function selectBestCard(cards: Card[]): Card {
		// モンスターカードのみを対象とする
		const monsterCards = cards.filter(card => card.type === 'monster') as MonsterCard[];
		
		// HPと攻撃力の合計で評価
		return monsterCards.reduce((best, current) => {
			const currentValue = current.hp + current.commands.reduce((sum, cmd) => sum + cmd.damage, 0);
			const bestValue = (best as MonsterCard).hp + (best as MonsterCard).commands.reduce((sum, cmd) => sum + cmd.damage, 0);
			return currentValue > bestValue ? current : best;
		});
	}

	// 最適な配置位置を選択
	function findBestPosition(emptyCells: { row: number; col: number }[]): { row: number; col: number } {
		// 現在は単純に最初の空きマスを選択
		return emptyCells[0];
	}

	// カードを配置
	function placeCard(card: Card, position: { row: number; col: number }) {
		const cpu = gameState.players[1];
		const cell = cpu.fieldGrid[position.row][position.col];
		
		if (!cell.card) {
			cpu.mana -= 1;
			cell.card = card as MonsterCard;
			cell.isWaiting = true;
			
			// 手札からカードを削除
			const cardId = card.id;
			cpu.hand = cpu.hand.filter((c) => c.id !== cardId);
			
			// gameStateを更新
			gameState = {
				...gameState,
				players: [...gameState.players]
			};
		}
	}

	// 攻撃可能かどうかを判定
	function canAttack(): boolean {
		const cpu = gameState.players[1];
		return cpu.fieldGrid.some(row => 
			row.some(cell => cell.card && !cell.isWaiting)
		);
	}

	// 攻撃対象を探す
	function findAttackTargets(): { row: number; col: number }[] {
		const player = gameState.players[0];
		const targets: { row: number; col: number }[] = [];
		
		for (let row = 0; row < player.fieldGrid.length; row++) {
			for (let col = 0; col < player.fieldGrid[row].length; col++) {
				if (player.fieldGrid[row][col].card) {
					targets.push({ row, col });
				}
			}
		}
		
		return targets;
	}

	// 最適な攻撃を実行
	function executeBestAttack(targets: { row: number; col: number }[]) {
		const cpu = gameState.players[1];
		const player = gameState.players[0];
		
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
		
		// 各攻撃者について最適な攻撃を実行
		attackers.forEach(attacker => {
			if (targets.length > 0) {
				// 最も弱いモンスターを攻撃
				const target = targets.reduce((weakest, current) => {
					const currentHP = player.fieldGrid[current.row][current.col].card?.hp || 0;
					const weakestHP = player.fieldGrid[weakest.row][weakest.col].card?.hp || 0;
					return currentHP < weakestHP ? current : weakest;
				});
				
				// 攻撃を実行
				const targetCard = player.fieldGrid[target.row][target.col].card;
				if (targetCard) {
					// 最も強い攻撃コマンドを使用
					const bestCommand = attacker.card.commands.reduce((best, current) => 
						current.damage > best.damage ? current : best
					);
					
					targetCard.hp -= bestCommand.damage;
					
					// HPが0以下になったらカードを削除
					if (targetCard.hp <= 0) {
						player.fieldGrid[target.row][target.col].card = null;
					}
				}
			}
		});
		
		// gameStateを更新
		gameState = {
			...gameState,
			players: [...gameState.players]
		};
	}

	// ターンエンド処理を更新
	function endTurn() {
		// 現在のプレイヤーのインデックスを取得
		const currentPlayerIndex = gameState.currentPlayer;

		// 次のプレイヤーのインデックスを計算
		const nextPlayerIndex = (currentPlayerIndex + 1) % 2;

		// ターンを次のプレイヤーに移す
		gameState = {
			...gameState,
			currentPlayer: nextPlayerIndex
		};

		// 相手プレイヤーのターンの場合、CPUの行動を実行
		if (nextPlayerIndex === 1) {
			setTimeout(() => {
				cpuAction();
				// CPUの行動後に自動的にターンエンド
				setTimeout(() => {
					endTurn();
				}, 1000);
			}, 1000);
		}
	}

	// カードを選択する関数
	function selectCard(card: Card) {
		if (card.type === 'monster' && gameState.players[gameState.currentPlayer].mana >= 1) {
			selectedCard = card;
		}
	}

	// マスを選択する関数
	function selectCell(row: number, col: number) {
		if (selectedCard && selectedCard.type === 'monster') {
			const currentPlayer = gameState.players[gameState.currentPlayer];
			const cell = currentPlayer.fieldGrid[row][col];

			if (!cell.card) {
				// マナを消費してモンスターを配置
				currentPlayer.mana -= 1;
				cell.card = selectedCard as MonsterCard;
				cell.isWaiting = true;

				// 手札からカードを削除
				const cardId = selectedCard.id;
				currentPlayer.hand = currentPlayer.hand.filter((c) => c.id !== cardId);

				// 選択状態をリセット
				selectedCard = null;
				selectedCell = null;

				// gameStateを更新してリアクティビティをトリガー
				gameState = {
					...gameState,
					players: [...gameState.players]
				};
			}
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-gray-100 py-8">
	<div class="mx-auto w-full max-w-4xl px-4">
		<h1 class="mb-8 text-center text-3xl font-bold text-gray-800">カードゲーム</h1>

		<!-- 現在のターン表示 -->
		<div class="mb-4 text-center">
			<p class="text-xl font-bold">
				現在のターン: {gameState.players[gameState.currentPlayer].name}
			</p>
		</div>

		<!-- プレイヤーステータス（2人分） -->
		<div class="mb-8 grid grid-cols-2 gap-4">
			{#each gameState.players as player, i}
				<div
					class="rounded-lg bg-white p-4 shadow {gameState.currentPlayer === i
						? 'ring-2 ring-blue-500'
						: ''}"
				>
					<h2 class="mb-2 text-xl font-bold">{player.name}</h2>
					<p>HP: {player.hp}</p>
					<p>マナ: {player.mana}</p>
					<p>手札: {player.hand.length}枚</p>
					<p>場のモンスター: {player.field.length}体</p>
				</div>
			{/each}
		</div>

		<!-- ターンエンドボタン -->
		{#if gameState.currentPlayer === 0}
			<div class="mb-8 text-center">
				<button
					on:click={endTurn}
					on:keydown={(e) => e.key === 'Enter' && endTurn()}
					class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
				>
					ターンエンド
				</button>
			</div>
		{/if}
	</div>

	<!-- フィールド（盤面＋プレイヤーイメージ） -->
	<div class="my-8 flex flex-col items-center justify-center">
		<!-- 相手プレイヤー側 -->
		<div class="mb-8 flex flex-col items-center">
			<!-- 2x2マス -->
			<div class="mb-2 grid grid-cols-2 gap-4">
				{#each gameState.players[1].fieldGrid as row, rowIndex}
					{#each row as cell, colIndex}
						<div class="flex h-20 w-20 items-center justify-center rounded border bg-gray-50">
							{#if cell.card}
								<div class="text-center">
									<div class="text-xs font-bold">{cell.card.name}</div>
									<div class="text-xs">HP: {cell.card.hp}</div>
									{#if cell.isWaiting}
										<div class="text-xs text-yellow-600">待機中</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				{/each}
			</div>
			<!-- プレイヤーイメージ（相手） -->
			<svg width="40" height="50" viewBox="0 0 40 50">
				<circle cx="20" cy="15" r="10" fill="#bbb" />
				<rect x="10" y="25" width="20" height="20" rx="8" fill="#bbb" />
			</svg>
		</div>

		<!-- 自分プレイヤー側 -->
		<div class="mt-8 flex flex-col items-center">
			<!-- プレイヤーイメージ（自分） -->
			<svg width="40" height="50" viewBox="0 0 40 50">
				<circle cx="20" cy="15" r="10" fill="#4b9cff" />
				<rect x="10" y="25" width="20" height="20" rx="8" fill="#4b9cff" />
			</svg>
			<!-- 2x2マス -->
			<div class="mt-2 grid grid-cols-2 gap-4">
				{#each gameState.players[0].fieldGrid as row, rowIndex}
					{#each row as cell, colIndex}
						<div
							class="flex h-20 w-20 cursor-pointer items-center justify-center rounded border bg-gray-50 hover:bg-gray-100 {selectedCell?.row ===
								rowIndex && selectedCell?.col === colIndex
								? 'ring-2 ring-blue-500'
								: ''}"
							on:click={() => selectCell(rowIndex, colIndex)}
							on:keydown={(e) => e.key === 'Enter' && selectCell(rowIndex, colIndex)}
							role="button"
							tabindex="0"
						>
							{#if cell.card}
								<div class="text-center">
									<div class="text-xs font-bold">{cell.card.name}</div>
									<div class="text-xs">HP: {cell.card.hp}</div>
									{#if cell.isWaiting}
										<div class="text-xs text-yellow-600">待機中</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				{/each}
			</div>
		</div>
	</div>

	<!-- 手札表示エリア -->
	<div class="mt-auto bg-gray-200 py-4">
		<div class="mx-auto max-w-4xl px-4">
			<h2 class="mb-4 text-xl font-bold">手札</h2>
			<div class="flex gap-4 overflow-x-auto p-4">
				{#each gameState.players[0].hand as card}
					<div
						class="h-64 w-48 flex-shrink-0 {getCardBackgroundColor(
							card
						)} cursor-pointer rounded-lg p-4 shadow-lg transition-transform hover:scale-105 {selectedCard?.id ===
						card.id
							? 'ring-4 ring-blue-500'
							: ''}"
						on:click={() => selectCard(card)}
						on:keydown={(e) => e.key === 'Enter' && selectCard(card)}
						role="button"
						tabindex="0"
					>
						<h3 class="mb-2 text-lg font-bold">{card.name}</h3>
						{#if card.type === 'monster'}
							<p class="mb-2">HP: {card.hp}</p>
							<div class="space-y-2">
								{#each card.commands as command}
									<div class="bg-opacity-50 rounded bg-white p-2">
										<p class="text-sm">マナ: {command.manaCost}</p>
										<p class="text-sm">ダメージ: {command.damage}</p>
										<p class="text-xs">{command.description}</p>
									</div>
								{/each}
							</div>
						{:else}
							<p class="mb-2 text-sm">マナ: {card.manaCost}</p>
							<p class="text-sm">{card.description}</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<!-- 選択中のカードの情報表示 -->
{#if selectedCard}
	<div class="fixed right-4 bottom-4 rounded-lg bg-white p-4 shadow-lg">
		<p class="font-bold">選択中のカード: {selectedCard?.name}</p>
		<p class="text-sm">マスを選択して配置してください</p>
		<button
			class="mt-2 rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
			on:click={resetSelection}
			on:keydown={(e) => e.key === 'Enter' && resetSelection()}
		>
			キャンセル
		</button>
	</div>
{/if}

<style>
	/* スクロールバーのカスタマイズ */
	.overflow-x-auto::-webkit-scrollbar {
		height: 8px;
	}

	.overflow-x-auto::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: 4px;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb {
		background: #888;
		border-radius: 4px;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb:hover {
		background: #555;
	}
</style>
