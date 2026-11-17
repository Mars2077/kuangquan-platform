const fs=require('fs');
const s=fs.readFileSync('web/src/pages/Cockpit.jsx','utf8').split('\n');
console.log(s.slice(489,600).map((l,i)=>(i+490)+': '+l).join('\n'));
