const fs=require('fs');
for (const p of ['docs/10-交互规范-v3.md','docs/11-组件契约-v3.md']){
  let s=fs.readFileSync(p,'utf8');
  const before=s;
  s=s.split('9 个页面').join('7 套模板（含 6 个业务域落地页）');
  if(s!==before){fs.writeFileSync(p,s,'utf8');console.log('updated',p);} else console.log('no change',p);
}
