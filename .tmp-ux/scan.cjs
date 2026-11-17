const fs=require('fs');
const s=fs.readFileSync('web/src/pages/Cockpit.jsx','utf8');
// find SCENE configs
const lines=s.split('\n');
lines.forEach((l,i)=>{ if(/SCENE|const .*=\s*\[|title:|name:|label:|sceneKey|useParams|scene==|kind:/.test(l) && l.length<220) console.log((i+1)+': '+l.trim()); });
