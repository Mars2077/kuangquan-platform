const fs=require('fs');
const s=fs.readFileSync('web/src/pages/Cockpit.jsx','utf8').split('\n');
console.log(s.slice(317,430).map((l,i)=>(i+318)+': '+l).join('\n'));
