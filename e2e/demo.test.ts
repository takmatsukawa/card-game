import { expect, test } from '@playwright/test';

test('手札のカードを選択して場に出せること', async ({ page }) => {
	await page.goto('/');

	// ゲームが読み込まれるまで待つ
	await expect(page.locator('h1')).toContainText('カードゲーム');

	// プレイヤーのターンであることを確認
	await expect(page.getByTestId('current-turn')).toContainText('現在のターン: プレイヤー1');

	// 手札エリアの最初のカードを選択
	const firstCard = page.getByTestId('hand-card-0');
	await expect(firstCard).toBeVisible();
	await firstCard.click();

	// カードが選択されていることを確認（選択状態のリングが表示される）
	await expect(firstCard).toHaveClass(/ring-4 ring-blue-500/);

	// 選択状態の表示が出ることを確認
	await expect(page.getByText('選択中のカード:')).toBeVisible();

	// 場の空いているマスを選択（プレイヤーのフィールドの左上）
	const firstEmptyCell = page.getByTestId('field-cell-0-0');
	await firstEmptyCell.click();

	// カードが場に配置されたことを確認
	await expect(firstEmptyCell.getByText('HP:')).toBeVisible();

	// 選択状態がリセットされることを確認
	await expect(page.getByText('選択中のカード:')).not.toBeVisible();
});

test('ターンエンドすると相手のターンが始まること', async ({ page }) => {
	await page.goto('/');

	// ゲームが読み込まれるまで待つ
	await expect(page.locator('h1')).toContainText('カードゲーム');

	// プレイヤーのターンであることを確認
	await expect(page.getByTestId('current-turn')).toContainText('現在のターン: プレイヤー1');

	// ターンエンドボタンが表示されていることを確認
	const turnEndButton = page.getByTestId('turn-end-button');
	await expect(turnEndButton).toBeVisible();
	await expect(turnEndButton).toBeEnabled();

	// ターンエンドボタンをクリック
	await turnEndButton.click();

	// CPUのターンになることを確認
	await expect(page.getByTestId('current-turn')).toContainText('現在のターン: プレイヤー2');

	// ターンエンドボタンが無効化されることを確認
	await expect(turnEndButton).toBeDisabled();

	// CPUのターンが自動で進んでプレイヤーのターンに戻るのを待つ（最大10秒）
	await expect(page.getByTestId('current-turn')).toContainText('現在のターン: プレイヤー1', {
		timeout: 10000
	});
});
