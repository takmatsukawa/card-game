<script lang="ts">
	import { useMachine } from '@xstate/svelte';
	import { gameStateMachine, type Card } from '$lib/gameStateMachine.ts';
	import PlayerImage from '$lib/PlayerImage.svelte';

	// ゲーム状態マシンの使用
	const { snapshot, send } = useMachine(gameStateMachine());

	// 状態マシンから状態を取得
	$: players = $snapshot.context.players;
	$: currentPlayer = $snapshot.context.currentPlayer;
	$: selectedCard = $snapshot.context.selectedCard;
	$: selectedCell = $snapshot.context.selectedCell;
	$: selectedMonster = $snapshot.context.selectedMonster;

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
		send({ type: 'SELECT_CARD', card });
	}

	// マスを選択する関数
	function selectCell(row: number, col: number) {
		send({ type: 'SELECT_CELL', row, col });
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
					class="rounded-lg bg-white p-4 shadow {currentPlayer === i ? 'ring-2 ring-blue-500' : ''}"
				>
					<h2 class="mb-2 text-xl font-bold">{player.name}</h2>
					<p>HP: {player.hp}</p>
					<p>ストーン: {player.stone}</p>
					<p>手札: {player.hand.length}枚</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- フィールド（盤面＋プレイヤーイメージ） -->
	<div class="my-8 flex flex-col items-center justify-center">
		<!-- 相手プレイヤー側 -->
		<div class="mb-8 flex flex-col items-center">
			<!-- 2x2マス -->
			<div class="mb-2 grid grid-cols-2 gap-4">
				{#each players[1].fieldGrid.toReversed() as row, rowIndex}
					{#each row.toReversed() as cell, colIndex}
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
			<PlayerImage isOpponent={true} />
		</div>

		<!-- 自分プレイヤー側 -->
		<div class="mt-8 flex flex-col items-center">
			<!-- プレイヤーイメージ（自分） -->
			<PlayerImage isOpponent={false} />
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
			<!-- ターンエンドボタン -->
			<div class="mb-4 text-center {currentPlayer !== 0 ? 'invisible' : ''}">
				<button
					onclick={endTurn}
					onkeydown={(e) => e.key === 'Enter' && endTurn()}
					class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
					disabled={currentPlayer !== 0}
				>
					ターンエンド
				</button>
			</div>
			<h2 class="mb-4 text-xl font-bold">手札</h2>
			<div class="flex gap-4 overflow-x-auto p-4">
				{#each players[0].hand as card}
					<div
						class="h-64 w-48 flex-shrink-0 {getCardBackgroundColor(
							card
						)} cursor-pointer rounded-lg p-4 shadow-lg transition-transform hover:scale-105 {selectedCard?.instanceId ===
						card.instanceId
							? 'ring-4 ring-blue-500'
							: ''}"
						onclick={() => selectCard(card)}
						onkeydown={(e) => e.key === 'Enter' && selectCard(card)}
						role="button"
						tabindex="0"
					>
						<h3 class="mb-2 text-lg font-bold">{card.name}</h3>

						<!-- Card Image -->
						<div class="mb-3 flex justify-center">
							<img
								src="/images/{card.image}"
								alt={card.name}
								class="h-20 w-16 rounded object-cover"
							/>
						</div>

						{#if card.type === 'monster'}
							<p class="mb-2">HP: {card.hp}</p>
							<div class="space-y-2">
								{#each card.commands as command}
									<div class="bg-opacity-50 rounded bg-white p-2">
										<p class="text-sm">{command.description}</p>
										<p class="text-xs">ストーン: {command.stoneCost}</p>
										<p class="text-xs">ダメージ: {command.damage}</p>
									</div>
								{/each}
							</div>
						{:else}
							<p class="mb-2 text-sm">ストーン: {card.stoneCost}</p>
							<p class="text-sm">{card.description}</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<!-- 選択中の状態表示 -->
{#if selectedCard || selectedCell || selectedMonster}
	<div class="fixed right-4 bottom-4 rounded-lg bg-white p-4 shadow-lg">
		{#if selectedCard}
			<p class="font-bold">選択中のカード: {selectedCard.name}</p>
			<p class="text-sm">マスを選択して配置してください</p>
		{:else if selectedMonster}
			<div class="w-64">
				<p class="mb-3 font-bold">選択中のモンスター</p>
				<div class="rounded-lg bg-blue-100 p-4">
					<h3 class="mb-2 text-lg font-bold">{selectedMonster.name}</h3>

					<!-- Monster Image -->
					<div class="mb-3 flex justify-center">
						<img
							src="/images/{selectedMonster.image}"
							alt={selectedMonster.name}
							class="h-20 w-16 rounded object-cover"
						/>
					</div>

					<p class="mb-2">HP: {selectedMonster.hp}</p>
					<div class="space-y-2">
						{#each selectedMonster.commands as command}
							<div class="bg-opacity-50 rounded bg-white p-2">
								<p class="text-sm">{command.description}</p>
								<p class="text-xs">ストーン: {command.stoneCost}</p>
								<p class="text-xs">ダメージ: {command.damage}</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else if selectedCell}
			<p class="font-bold">選択中のマス: 行{selectedCell.row + 1} 列{selectedCell.col + 1}</p>
			<p class="text-sm">カードを選択して配置してください</p>
		{/if}
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
