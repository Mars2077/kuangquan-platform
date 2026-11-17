const fs=require('fs');
const s=fs.readFileSync('web/src/pages/Cockpit.jsx','utf8').split('\n');
console.log(s.slice(795,930).map((l,i)=>(i+796)+': '+l).join('\n'));
