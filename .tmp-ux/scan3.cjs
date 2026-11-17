const fs=require('fs');
const s=fs.readFileSync('web/src/pages/Cockpit.jsx','utf8').split('\n');
console.log(s.slice(600,780).map((l,i)=>(i+601)+': '+l).join('\n'));
