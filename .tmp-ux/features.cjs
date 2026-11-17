import('../server/src/features.js').then(m=>{
  for (const mod of m.MODULES) {
    console.log('\n## '+mod.key+' '+mod.name);
    for (const f of mod.features) {
      const flags=['special','score','qr','archive','readonly','workflow'].filter(k=>f[k]).map(k=>k+(typeof f[k]==='object'?'':'='+String(f[k])));
      console.log(' - '+f.key+' | '+f.name+' | table='+f.table+' | cols='+(f.columns||[]).length+' | filt='+(f.filters||[]).join(',')+' | form='+(f.form||[]).length+' | '+flags.join(' '));
    }
  }
}).catch(e=>console.error(e));
