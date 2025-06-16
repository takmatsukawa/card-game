import type { Card } from './gameStateMachine.ts';

// カードマスターデータ
export const CARD_MASTER: Card[] = [
	{
		id: 1,
		type: 'monster',
		name: 'マナトット',
		hp: 4,
		commands: [{ stoneCost: 0, damage: 2, description: 'たいあたり' }]
	}
];
