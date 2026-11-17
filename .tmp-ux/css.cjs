const fs=require('fs');
for (const f of ['tokens','components','pages','widgets']) {
  const p='web/src/styles/'+f+'.css';
  if(!fs.existsSync(p)){console.log('## '+f+' MISSING');continue;}
  const s=fs.readFileSync(p,'utf8');
  const set=new Set();
  for(const m of s.matchAll(/^\s*(\.[a-zA-Z][\w-]*)/gm)) set.add(m[1]);
  console.log('## '+f+'.css ('+s.split('\n').length+' lines): '+[...set].sort().join(' '));
}
