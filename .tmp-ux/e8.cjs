const fs=require('fs');
const s=fs.readFileSync('docs/08-UI评审-响应式适配.md','utf8').split('\n');
let on=false;
s.forEach((l,i)=>{
  if(/^## 1\. /.test(l)) on=true;
  if(/^## 4\. /.test(l)) on=false;
  if(on) console.log(l);
});
