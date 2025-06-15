<script lang="ts">
	import { useMachine } from '@xstate/svelte';
	import { gameStateMachine, type Card } from '$lib/gameStateMachine.ts';

	// ゲーム状態マシンの使用
	const { snapshot, send } = useMachine(gameStateMachine);

	// 状態マシンから状態を取得
	$: players = $snapshot.context.players;
	$: currentPlayer = $snapshot.context.currentPlayer;
	$: selectedCard = $snapshot.context.selectedCard;
	$: selectedCell = $snapshot.context.selectedCell;

	// カードの種類に応じた背景色を取得
	function getCardBackgroundColor(card: Card): string {
		return card.type === 'monster' ? 'bg-blue-100' : 'bg-purple-100';
	}

	// カードの選択状態をリセット
	function resetSelection() {
		send({ type: 'RESET_SELECTION' });
	}

	// ターンエンド処理
	function endTurn() {
		send({ type: 'END_TURN' });
	}

	// カードを選択する関数
	function selectCard(card: Card) {
		if (card.type === 'monster' && players[currentPlayer].mana >= 1) {
			send({ type: 'SELECT_CARD', card });
		}
	}

	// マスを選択する関数
	function selectCell(row: number, col: number) {
		if (selectedCard && selectedCard.type === 'monster') {
			send({ type: 'PLACE_CARD', card: selectedCard, row, col });
		} else {
			send({ type: 'SELECT_CELL', row, col });
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-gray-100 py-8">
	<div class="mx-auto w-full max-w-4xl px-4">
		<h1 class="mb-8 text-center text-3xl font-bold text-gray-800">カードゲーム</h1>

		<!-- 現在のターン表示 -->
		<div class="mb-4 text-center">
			<p class="text-xl font-bold">
				現在のターン: {players[currentPlayer].name}
			</p>
		</div>

		<!-- プレイヤーステータス（2人分） -->
		<div class="mb-8 grid grid-cols-2 gap-4">
			{#each players as player, i}
				<div
					class="rounded-lg bg-white p-4 shadow {currentPlayer === i
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
		{#if currentPlayer === 0}
			<div class="mb-8 text-center">
				<button
					onclick={endTurn}
					onkeydown={(e) => e.key === 'Enter' && endTurn()}
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
				{#each players[1].fieldGrid as row, rowIndex}
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
				{#each players[0].fieldGrid as row, rowIndex}
					{#each row as cell, colIndex}
						<div
							class="flex h-20 w-20 cursor-pointer items-center justify-center rounded border bg-gray-50 hover:bg-gray-100 {selectedCell?.row ===
								rowIndex && selectedCell?.col === colIndex
								? 'ring-2 ring-blue-500'
								: ''}"
							onclick={() => selectCell(rowIndex, colIndex)}
							onkeydown={(e) => e.key === 'Enter' && selectCell(rowIndex, colIndex)}
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
				{#each players[0].hand as card}
					<div
						class="h-64 w-48 flex-shrink-0 {getCardBackgroundColor(
							card
						)} cursor-pointer rounded-lg p-4 shadow-lg transition-transform hover:scale-105 {selectedCard?.id ===
						card.id
							? 'ring-4 ring-blue-500'
							: ''}"
						onclick={() => selectCard(card)}
						onkeydown={(e) => e.key === 'Enter' && selectCard(card)}
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
			onclick={resetSelection}
			onkeydown={(e) => e.key === 'Enter' && resetSelection()}
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
