const fs=require('fs');const p='docs/10-交互规范-v3.md';let s=fs.readFileSync(p,'utf8');
let miss=[];
function rep(a,b){ if(!s.includes(a)){miss.push(a);return;} s=s.split(a).join(b); }
rep('.title  确认删除？\n.body   净矿出让 · 川自然资矿出〔2024〕12 号\n        删除后该记录与关联流程节点不可恢复。\n        影响：1 条台账记录、2 条流程节点。\n.foot   [取消]            [确认删除]  ← .btn-danger',
    '标题   确认删除？\n正文   净矿出让 · 川自然资矿出〔2024〕12 号\n       删除后该记录与关联流程节点不可恢复。\n       影响：1 条台账记录、2 条流程节点。\n底部   [取消]            [确认删除]  ← .btn-danger');
rep('button` 账号信息（跳 `/system?tab=profile`）','button` 账号信息（打开账号详情抽屉）');
fs.writeFileSync(p,s,'utf8');
console.log('missed:',JSON.stringify(miss));
console.log('PART left:', s.includes('PART2')||s.includes('PART3'));
console.log('lines', s.split('\n').length);
