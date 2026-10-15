import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage();
  const image = await page.evaluate(() => {
    const W=720,H=432;
    const source=document.createElement('canvas');source.width=W;source.height=H;
    const sc=source.getContext('2d');
    if(!sc) throw new Error('Canvas unavailable.');
    let seed=412;
    function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function ellipse(x,y,rx,ry,color){sc.fillStyle=color;sc.beginPath();sc.ellipse(x,y,rx,ry,0,0,Math.PI*2);sc.fill();}
  function polygon(points,color){sc.fillStyle=color;sc.beginPath();points.forEach((p,i)=>i?sc.lineTo(...p):sc.moveTo(...p));sc.closePath();sc.fill();}
  function sample(){
    const g=sc.createLinearGradient(0,0,W,H);g.addColorStop(0,'#b9c8bd');g.addColorStop(1,'#46695d');sc.fillStyle=g;sc.fillRect(0,0,W,H);
    ellipse(100,125,90,180,'#6c9180');ellipse(660,60,115,190,'#a1b798');
    polygon([[0,318],[720,300],[720,432],[0,432]],'#cc9c7d');
    ellipse(376,399,205,17,'#8d6151');
    ellipse(495,329,94,80,'#a65e3b');ellipse(502,329,49,47,'#cc9c7d');
    ellipse(360,319,140,113,'#ca8352');ellipse(353,330,88,95,'#ead1a8');
    ellipse(289,396,47,23,'#ead1a8');ellipse(410,396,47,23,'#ead1a8');
    polygon([[234,179],[228,45],[328,104]],'#be7448');
    polygon([[401,100],[499,39],[486,191]],'#b56d42');
    polygon([[249,135],[245,70],[297,110]],'#d99f88');
    polygon([[431,111],[480,65],[469,145]],'#d99f88');
    ellipse(360,190,144,121,'#d99159');
    ellipse(284,183,53,80,'#edbb7d');ellipse(429,182,50,79,'#edbb7d');
    polygon([[319,78],[336,144],[348,79]],'#8b512f');
    polygon([[357,70],[363,138],[386,75]],'#8b512f');
    polygon([[395,84],[389,146],[417,95]],'#8b512f');
    polygon([[220,169],[264,184],[221,189]],'#9a5731');polygon([[221,199],[267,207],[227,218]],'#9a5731');
    polygon([[496,169],[455,184],[497,192]],'#9a5731');polygon([[496,202],[453,209],[486,222]],'#9a5731');
    ellipse(302,183,28,18,'#543c2a');ellipse(419,183,28,18,'#543c2a');
    ellipse(302,181,23,15,'#b6be74');ellipse(419,181,23,15,'#b6be74');
    ellipse(304,181,6,15,'#302f25');ellipse(417,181,6,15,'#302f25');
    ellipse(298,175,4,4,'#f8efce');ellipse(412,175,4,4,'#f8efce');
    ellipse(328,236,43,34,'#f1dbb3');ellipse(391,236,43,34,'#f1dbb3');
    polygon([[345,222],[376,222],[361,239]],'#9f5c52');
    sc.strokeStyle='#774d35';sc.lineWidth=2;
    sc.beginPath();sc.moveTo(361,238);sc.lineTo(361,251);sc.quadraticCurveTo(345,265,332,252);sc.moveTo(361,251);sc.quadraticCurveTo(379,265,390,251);sc.stroke();
    sc.strokeStyle='#efddba';sc.lineWidth=2;
    [[312,236,218,219],[310,244,208,247],[411,236,503,216],[413,244,514,251]].forEach(l=>{sc.beginPath();sc.moveTo(l[0],l[1]);sc.lineTo(l[2],l[3]);sc.stroke();});
    for(let i=0;i<55000;i++){const x=rand()*W,y=rand()*H;sc.fillStyle=rand()>.5?'rgba(255,240,207,.045)':'rgba(55,34,25,.045)';sc.fillRect(x,y,1+rand()*2,1);}
  }

    sample();
    return source.toDataURL('image/png');
  });
  await writeFile(new URL('../src/assets/cat.png',import.meta.url), Buffer.from(image.split(',')[1],'base64'));
} finally {await browser.close();}
