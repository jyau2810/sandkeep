import {test,expect} from '@playwright/test';
test('sprinkle density changes deposited sand without changing brush size or existing marks',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');await expect(page.locator('#app')).toHaveAttribute('data-phase','sealed',{timeout:20000});
  const density=page.getByRole('slider',{name:'撒沙密度'});await expect(density).toBeHidden();
  await page.getByRole('button',{name:'倒出成画',exact:true}).click();await expect(density).toBeHidden();await page.getByRole('button',{name:'撒沙',exact:true}).click();await expect(density).toHaveValue('100');
  const canvas=page.getByTestId('loose-sand');const sum=()=>canvas.evaluate(c=>{const a=(c as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,720,432).data;let s=0;for(let i=1;i<a.length;i+=4)s+=a[i];return s;});
  const before=await sum();await density.press('Home');await canvas.click({position:{x:120,y:100}});await page.waitForTimeout(80);const low=await sum();expect(low).toBeLessThan(before);
  await density.press('End');expect(await sum()).toBe(low);await page.getByRole('button',{name:'复原',exact:true}).click();await canvas.click({position:{x:120,y:100}});await page.waitForTimeout(80);expect(before-await sum()).toBeGreaterThan((before-low)*3);
  await expect(page.getByRole('slider',{name:'作用范围'})).toHaveValue('28');await page.getByRole('button',{name:'拨沙',exact:true}).click();await expect(density).toBeHidden();await page.getByRole('button',{name:'撒沙',exact:true}).click();await expect(density).toHaveValue('200');
});
