const fs=require('fs');
for(const f of ['docs/08-UI评审-响应式适配.md','docs/09-第二轮修复-布局与浮层.md']){
  console.log('\n===== '+f+' =====');
  fs.readFileSync(f,'utf8').split('\n').forEach((l,i)=>{ if(/^#{1,4}\s|^\|/.test(l)) return; if(/^#{1,4}\s/.test(l)) console.log(l); });
  const s=fs.readFileSync(f,'utf8');
  s.split('\n').forEach(l=>{ if(/^#{1,4}\s/.test(l)) console.log(l); });
}
