import {test,expect,type Page} from '@playwright/test';
async function record(page:Page,fill=false){return page.evaluate(async(fill)=>{
 const db=await new Promise<IDBDatabase>((res,rej)=>{const r=indexedDB.open('sandkeep',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 const draft:any=await new Promise(res=>{const r=db.transaction('bottles').objectStore('bottles').get('latest');r.onsuccess=()=>res(r.result)});
 if(fill){const bytes=new Uint8Array(150000*28);bytes.set(draft.sandState);const v=new DataView(bytes.buffer);for(let i=draft.sandState.length/28;i<150000;i++){v.setFloat64(i*28,35,true);v.setFloat64(i*28+8,35,true);v.setFloat64(i*28+16,1.5,true);v.setUint32(i*28+24,0xff224973,true)}draft.sandState=bytes;await new Promise<void>(res=>{const tx=db.transaction('bottles','readwrite');tx.objectStore('bottles').put(draft,'latest');tx.oncomplete=()=>res()});}
 let mass=0;const v=new DataView(draft.sandState.buffer);for(let i=16;i<v.byteLength;i+=28)mass+=v.getFloat64(i,true);db.close();return{mass,count:draft.sandState.length/28};
 },fill)}
test('reaching the particle budget preserves sand mass and subsequent sprinkle strength',async({page})=>{
 test.setTimeout(90000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');await expect(page.locator('#app')).toHaveAttribute('data-phase','sealed',{timeout:20000});
 const pour=()=>page.getByRole('button',{name:'倒出成画',exact:true}).click();const bottle=async()=>{await page.getByRole('button',{name:'装进瓶子',exact:true}).click();await expect(page.getByTestId('app-status')).toBeHidden()};
 await pour();await page.getByRole('button',{name:'撒沙',exact:true}).click();const c=page.getByTestId('loose-sand');
 const darkness=()=>c.evaluate(c=>{const a=(c as HTMLCanvasElement).getContext('2d')!.getImageData(490,190,100,100).data;let s=0;for(let i=1;i<a.length;i+=4)s+=a[i];return s});
 const click=async()=>{const b=await c.boundingBox();if(!b)throw Error();await page.mouse.click(b.x+b.width*.75,b.y+b.height*.55);await page.waitForTimeout(80)};
 const original=await darkness();await click();const first=original-await darkness();await page.getByRole('button',{name:'复原',exact:true}).click();
 await c.click({position:{x:20,y:20}});await page.waitForTimeout(80);await bottle();const loaded=await record(page,true);expect(loaded.count).toBe(150000);
 await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-phase','sealed');await pour();await page.getByRole('button',{name:'撒沙',exact:true}).click();const before=await darkness();await click();const after=before-await darkness();expect(after/first).toBeGreaterThan(.75);expect(after/first).toBeLessThan(1.25);
 await bottle();const saved=await record(page);expect(saved.count).toBeLessThan(150000);expect(saved.mass-loaded.mass).toBeGreaterThan(700);expect(saved.mass-loaded.mass).toBeLessThan(950);
 await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-phase','sealed');expect((await record(page)).mass).toBe(saved.mass);
});
