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

  // プレイヤーの型
  interface Player {
    id: number;
    name: string;
    hp: number;
    mana: number;
    deck: Card[];
    hand: Card[];
    field: MonsterCard[];
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
        field: []
      },
      {
        id: 2,
        name: 'プレイヤー2',
        hp: 20,
        mana: 10,
        deck: [],
        hand: [],
        field: []
      }
    ] as Player[]
  };

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

  onMount(() => {
    // サンプルカードをデッキに追加
    const newPlayers = gameState.players.map(player => {
      const cards = createSampleCards();
      const newPlayer = {
        ...player,
        deck: cards,
        hand: [...cards]
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
</script>

<div class="min-h-screen bg-gray-100 py-8 flex flex-col">
  <div class="max-w-4xl mx-auto px-4 w-full">
    <h1 class="text-3xl font-bold text-center text-gray-800 mb-8">カードゲーム</h1>
    
    <!-- ゲームの状態表示 -->
    <div class="grid grid-cols-2 gap-4 mb-8">
      {#each gameState.players as player, i}
        <div class="bg-white p-4 rounded-lg shadow">
          <h2 class="text-xl font-bold mb-2">{player.name}</h2>
          <p>HP: {player.hp}</p>
          <p>マナ: {player.mana}</p>
          <p>手札: {player.hand.length}枚</p>
          <p>場のモンスター: {player.field.length}体</p>
        </div>
      {/each}
    </div>
  </div>

  <!-- 手札表示エリア -->
  <div class="mt-auto bg-gray-200 py-4">
    <div class="max-w-4xl mx-auto px-4">
      <h2 class="text-xl font-bold mb-4">手札</h2>
      <div class="flex gap-4 overflow-x-auto pb-4">
        {#each gameState.players[0].hand as card}
          <div class="flex-shrink-0 w-48 h-64 {getCardBackgroundColor(card)} rounded-lg shadow-lg p-4">
            <h3 class="font-bold text-lg mb-2">{card.name}</h3>
            {#if card.type === 'monster'}
              <p class="mb-2">HP: {card.hp}</p>
              <div class="space-y-2">
                {#each card.commands as command}
                  <div class="bg-white bg-opacity-50 p-2 rounded">
                    <p class="text-sm">マナ: {command.manaCost}</p>
                    <p class="text-sm">ダメージ: {command.damage}</p>
                    <p class="text-xs">{command.description}</p>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-sm mb-2">マナ: {card.manaCost}</p>
              <p class="text-sm">{card.description}</p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

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
