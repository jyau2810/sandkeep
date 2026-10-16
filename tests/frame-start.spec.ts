import {test, expect} from '@playwright/test';
test('fresh visits open an editable frame without an automatic bottle transition', async ({page}) => {
  await page.goto('./');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'loose');
  await expect(page.getByTestId('loose-sand')).toBeVisible();
  await expect(page.getByRole('button', {name:'装进瓶子', exact:true})).toBeEnabled();
  await expect(page.getByRole('button', {name:'复原', exact:true})).toBeVisible();
  await expect(page.getByRole('button', {name:'拨沙', exact:true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('拖动旋转 · 双击回正', {exact:true})).toBeHidden();
});
