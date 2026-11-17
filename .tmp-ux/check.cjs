const fs=require('fs');
const doc=fs.readFileSync('docs/10-交互规范-v3.md','utf8');
const con=fs.readFileSync('docs/11-组件契约-v3.md','utf8');
const css=['tokens','components','pages','widgets'].map(f=>{try{return fs.readFileSync('web/src/styles/'+f+'.css','utf8')}catch(e){return ''}}).join('\n');
const tok=s=>new Set((s.match(/\.[a-zA-Z][\w-]*/g)||[]).map(x=>x));
const D=tok(doc), C=tok(con), S=tok(css);
const notInContract=[...D].filter(x=>!C.has(x)).sort();
console.log('doc class tokens not in contract:', notInContract.join(' '));
console.log('--- of those, present in current CSS:', notInContract.filter(x=>S.has(x)).join(' '));
console.log('--- doc tokens also in contract:', [...D].filter(x=>C.has(x)).length);
// headings
console.log('\n--- headings ---');
doc.split('\n').forEach(l=>{ if(/^#{1,3}\s/.test(l)) console.log(l); });
console.log('\nlines', doc.split('\n').length, 'chars', doc.length);
