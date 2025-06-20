import type { CardMaster } from './gameStateMachine.ts';

// カードマスターデータ
export const CARD_MASTER: CardMaster[] = [
	{
		id: 1,
		type: 'monster',
		name: 'マナトット',
		hp: 4,
		commands: [{ stoneCost: 0, damage: 2, description: 'たいあたり', attackRange: 1 }],
		image: 'card-manatot.svg'
	},
	{
		id: 17,
		type: 'monster',
		name: 'ビヨンド',
		hp: 2,
		commands: [{ stoneCost: 0, damage: 2, description: 'ビヨ～ン', attackRange: 2 }],
		image: 'card-beyond.svg'
	}
];
