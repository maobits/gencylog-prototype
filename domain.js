/* Dominio puro y validaciones. Sin red, sin backend, sin dependencias. */
const GencyDomain = (() => {
  const clone = x => JSON.parse(JSON.stringify(x));
  const fail = (message) => { throw new Error(message); };
  const clean = (s,field,min=1,max=200) => {const v=String(s??'').trim().replace(/\s+/g,' '); if(v.length<min || v.length>max)fail(`${field}: escribe entre ${min} y ${max} caracteres.`);return v;};
  const qty = (v,field='Cantidad') => {if (v==='' || v===null || v===undefined || !Number.isSafeInteger(Number(v)) || Number(v)<1 || Number(v)>1000000) fail(`${field}: introduce un número entero de 1 a 1.000.000.`);return Number(v);};
  const exists = (arr,id,label) => arr.find(x=>x.id===id) || fail(`${label}: selecciona una opción válida.`);
  const stamp = () => new Date().toISOString();
  const uid = (prefix) => `${prefix}-${typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,10)}`;
  const stock = (s,lotId,warehouseId) => s.movements.reduce((sum,m)=>sum+(m.lotId===lotId&&m.warehouseId===warehouseId?m.delta:0),0);
  const allStocks = s => s.lots.flatMap(l=>s.warehouses.map(w=>({lot:l,warehouse:w,available:stock(s,l.id,w.id)}))).filter(x=>x.available!==0);
  const transit = s => s.dispatches.filter(d=>d.status==='in_transit').reduce((a,d)=>a+d.qty,0);
  const remaining = (s,needId) => {const n=exists(s.needs,needId,'Necesidad');const reserved=s.dispatches.filter(d=>d.needId===needId && d.status==='in_transit').reduce((a,d)=>a+d.qty,0);return n.requested-n.fulfilled-reserved;};
  const action = (s,type,summary,ref) => s.audit.push({id:uid('AUD'),action:type,at:stamp(),actor:'Operador académico (simulado)',summary,ref});
  const movement = (s,kind,lotId,warehouseId,delta,ref,note) => s.movements.push({id:uid('MOV'),kind,lotId,warehouseId,delta,createdAt:stamp(),ref,actor:'Operador académico (simulado)',note});
  const change = (original,fn) => {const s=clone(original);fn(s);s.meta.updatedAt=stamp();s.meta.revision=(Number(original.meta.revision)||0)+1;validate(s);return s;};
  function receive(original,form){return change(original,s=>{
    const resource=exists(s.resources,form.resourceId,'Recurso'),place=exists(s.warehouses,form.warehouseId,'Centro de acopio'),value=qty(form.quantity),donor=clean(form.donor,'Origen o donante',3,120),note=clean(form.note||'Recepción verificada','Observaciones',3,250);
    const id=uid('LOT');s.lots.push({id,resourceId:resource.id,warehouseId:place.id,received:value,donor,createdAt:stamp(),note});movement(s,'receipt',id,place.id,value,id,note);
    action(s,'receipt',`${value} ${resource.unit} de ${resource.name} recibidos en ${place.short}`,id);
  });}
  function transfer(original,form){return change(original,s=>{
    const lot=exists(s.lots,form.lotId,'Lote'),from=exists(s.warehouses,form.origin,'Origen'),to=exists(s.warehouses,form.destination,'Destino');
    if(from.id===to.id)fail('El origen y el destino deben ser diferentes.');
    const value=qty(form.quantity),reason=clean(form.reason,'Motivo del traslado',8,250),available=stock(s,lot.id,from.id);
    if(value>available)fail(`Existencias insuficientes: hay ${available} disponibles en ${from.short}.`);
    const ref=uid('TRA');movement(s,'transfer_out',lot.id,from.id,-value,ref,reason);movement(s,'transfer_in',lot.id,to.id,value,ref,reason);
    action(s,'transfer',`${value} unidades del lote ${lot.id}: ${from.short} → ${to.short}`,ref);
  });}
  function adjust(original,form){return change(original,s=>{
    const lot=exists(s.lots,form.lotId,'Lote'),center=exists(s.warehouses,form.warehouseId,'Centro'),value=qty(form.quantity),reason=clean(form.reason,'Justificación de ajuste',10,250);
    if(!['increase','decrease'].includes(form.direction)) fail('Selecciona el tipo de ajuste.');
    if(form.direction==='decrease'&&value>stock(s,lot.id,center.id))fail('El ajuste no puede dejar existencias negativas.');
    const ref=uid('AJU'),sign=form.direction==='increase'?1:-1;
    movement(s,sign===1?'adjustment_in':'adjustment_out',lot.id,center.id,sign*value,ref,reason);
    action(s,'adjustment',`Ajuste ${sign===1?'positivo':'negativo'} de ${value} en ${center.short}; ${reason}`,ref);
  });}
  function newNeed(original,form){return change(original,s=>{
    const resource=exists(s.resources,form.resourceId,'Recurso'),center=exists(s.warehouses,form.warehouseId,'Zona');
    const amount=qty(form.quantity),priority=String(form.priority),note=clean(form.note,'Descripción de la necesidad',8,250);
    if(!['Alta','Media','Baja'].includes(priority))fail('Prioridad no válida.');
    const id=uid('NEC');s.needs.push({id,resourceId:resource.id,zone:center.zone,requested:amount,fulfilled:0,priority,note,createdAt:stamp(),status:'open'});
    action(s,'need_created',`Necesidad de ${amount} ${resource.unit} en ${center.zone}`,id);
  });}
  function setNeedStatus(original,needId,status){return change(original,s=>{const n=exists(s.needs,needId,'Necesidad');if(!['open','closed'].includes(status))fail('Estado no válido.');if(n.status===status)fail('La necesidad ya está en ese estado.');if(status==='closed'&&s.dispatches.some(d=>d.needId===needId&&d.status==='in_transit'))fail('No puedes cerrar una necesidad con despachos pendientes.');n.status=status;action(s,'need_status',`Necesidad ${status==='closed'?'cerrada':'reabierta'}: ${n.id}`,n.id);});}
  function createDispatch(original,form){return change(original,s=>{
    const lot=exists(s.lots,form.lotId,'Lote'),from=exists(s.warehouses,form.origin,'Origen'),to=exists(s.warehouses,form.destination,'Destino');
    const value=qty(form.quantity),note=clean(form.note||'Despacho humanitario','Observaciones',3,250);
    if(from.id===to.id)fail('El centro de destino debe ser diferente del origen.');
    const available=stock(s,lot.id,from.id);if(value>available)fail(`Existencias insuficientes en ${from.short}: ${available} disponibles.`);
    const needId=form.needId||null;
    if(needId){const need=exists(s.needs,needId,'Necesidad');if(need.status!=='open')fail('La necesidad se encuentra cerrada.');if(need.resourceId!==lot.resourceId||need.zone!==to.zone)fail('La necesidad debe coincidir con el recurso y la zona de destino.');if(value>remaining(s,need.id))fail(`La necesidad tiene ${remaining(s,need.id)} unidades pendientes sin comprometer.`);}
    const id=uid('DES');s.dispatches.push({id,lotId:lot.id,origin:from.id,destination:to.id,qty:value,needId,status:'in_transit',createdAt:stamp(),deliveredAt:null,receiver:null,evidence:null,note});
    movement(s,'dispatch',lot.id,from.id,-value,id,note);action(s,'dispatch_created',`${value} del lote ${lot.id}: ${from.short} → ${to.short}`,id);
  });}
  function deliver(original,form){return change(original,s=>{
    const d=exists(s.dispatches,form.dispatchId,'Despacho');if(d.status!=='in_transit')fail('Este despacho ya fue finalizado. No se puede registrar dos veces.');
    const receiver=clean(form.receiver,'Responsable de recepción',3,120),evidence=clean(form.evidence,'Referencia de evidencia',4,160);
    movement(s,'delivery',d.lotId,d.destination,d.qty,d.id,`Confirmado por ${receiver}. ${evidence}`);d.status='delivered';d.deliveredAt=stamp();d.receiver=receiver;d.evidence=evidence;
    if(d.needId){const n=exists(s.needs,d.needId,'Necesidad');n.fulfilled+=d.qty;if(n.fulfilled>n.requested)fail('La entrega supera la cantidad solicitada.');}
    action(s,'delivery_confirmed',`Entrega de ${d.qty} del despacho ${d.id}. Evidencia: ${evidence}`,d.id);
  });}
  function cancelDispatch(original,form){return change(original,s=>{
    const d=exists(s.dispatches,form.dispatchId,'Despacho');if(d.status!=='in_transit')fail('Solo se pueden devolver despachos en tránsito.');
    const reason=clean(form.reason,'Motivo de devolución',8,200);movement(s,'return',d.lotId,d.origin,d.qty,d.id,reason);
    d.status='cancelled';action(s,'dispatch_returned',`Despacho ${d.id} devuelto al origen: ${reason}`,d.id);
  });}
  function validate(s){
    if(!s||typeof s!=='object'||s.schemaVersion!==2)fail('Formato de datos incompatible con GencyLog Fase 4.');
    for(const key of ['resources','warehouses','lots','movements','dispatches','needs','audit'])if(!Array.isArray(s[key]))fail(`Estructura incompleta: ${key}.`);
    if(!s.meta||s.meta.demo!==true)fail('Solo se admite un dataset de simulación académica.');
    if(!Number.isSafeInteger(Number(s.meta.revision||0))||Number(s.meta.revision||0)<0)fail('Revisión del dataset inválida.');
    const unique=(items,label)=>{const ids=new Set();for(const x of items){if(!x||typeof x.id!=='string'||!x.id||ids.has(x.id))fail(`ID inválido o duplicado en ${label}.`);ids.add(x.id);}};
    for(const key of ['resources','warehouses','lots','movements','dispatches','needs','audit'])unique(s[key],key);
    for(const r of s.resources){clean(r.name,'Nombre de recurso');clean(r.unit,'Unidad');}
    for(const w of s.warehouses){clean(w.name,'Centro');clean(w.zone,'Zona');}
    for(const l of s.lots){exists(s.resources,l.resourceId,'Recurso de lote');exists(s.warehouses,l.warehouseId,'Centro de lote');qty(l.received,'Recepción');clean(l.donor,'Origen de lote',3);}
    const kinds=new Set(['receipt','transfer_in','transfer_out','dispatch','delivery','return','adjustment_in','adjustment_out']);
    const balances=new Map();
    const timeline=[...s.movements].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
    for(const m of timeline){
      exists(s.lots,m.lotId,'Lote de movimiento');exists(s.warehouses,m.warehouseId,'Centro de movimiento');
      if(!kinds.has(m.kind)||!Number.isSafeInteger(m.delta)||m.delta===0||Math.abs(m.delta)>1000000)fail('Movimiento inválido en el libro de inventario.');
      const shouldBePlus=['receipt','transfer_in','delivery','return','adjustment_in'].includes(m.kind);
      if((m.delta>0)!==shouldBePlus)fail('El signo del movimiento es incorrecto.');
      const k=`${m.lotId}@${m.warehouseId}`,n=(balances.get(k)||0)+m.delta;
      if(n<0)fail(`Inventario negativo detectado en el lote ${m.lotId}, centro ${m.warehouseId}.`);
      balances.set(k,n);
      if(!m.ref||!Number.isFinite(Date.parse(m.createdAt)))fail('Movimiento sin referencia o fecha válida.');
    }
    for(const l of s.lots){const incomes=s.movements.filter(m=>m.lotId===l.id&&m.kind==='receipt');if(incomes.length!==1||incomes[0].delta!==l.received||incomes[0].warehouseId!==l.warehouseId)fail(`Recepción del lote ${l.id} inconsistente.`);}
    const transfers=new Map();for(const m of s.movements.filter(m=>m.kind.startsWith('transfer_'))){const ms=transfers.get(m.ref)||[];ms.push(m);transfers.set(m.ref,ms);}for(const [id,m] of transfers){if(m.length!==2||m[0].delta+m[1].delta!==0||m[0].lotId!==m[1].lotId||m[0].warehouseId===m[1].warehouseId||new Set(m.map(x=>x.kind)).size!==2)fail(`Traslado inconsistente ${id}.`);}
    for(const d of s.dispatches){
      exists(s.lots,d.lotId,'Lote de despacho');exists(s.warehouses,d.origin,'Origen de despacho');const to=exists(s.warehouses,d.destination,'Destino de despacho');qty(d.qty,'Cantidad despachada');
      if(d.origin===d.destination||!['in_transit','delivered','cancelled'].includes(d.status))fail('Despacho con estado o ruta inválidos.');
      const outgoing=s.movements.filter(m=>m.ref===d.id&&m.kind==='dispatch');if(outgoing.length!==1||outgoing[0].lotId!==d.lotId||outgoing[0].warehouseId!==d.origin||outgoing[0].delta!==-d.qty)fail('Salida de despacho inconsistente.');
      const delivered=s.movements.filter(m=>m.ref===d.id&&m.kind==='delivery'),returned=s.movements.filter(m=>m.ref===d.id&&m.kind==='return');
      if(d.status==='delivered'){if(delivered.length!==1||delivered[0].delta!==d.qty||delivered[0].warehouseId!==d.destination||delivered[0].lotId!==d.lotId||returned.length||!d.receiver||!d.evidence||!d.deliveredAt)fail('Entrega sin evidencia o inventario destino.');}
      else if(d.status==='cancelled'){if(returned.length!==1||returned[0].delta!==d.qty||returned[0].warehouseId!==d.origin||returned[0].lotId!==d.lotId||delivered.length)fail('Devolución incompleta.');}
      else if(delivered.length||returned.length)fail('Despacho en tránsito con cierre inconsistente.');
      if(d.needId){const n=exists(s.needs,d.needId,'Necesidad asociada');if(n.resourceId!==exists(s.lots,d.lotId,'Lote').resourceId||n.zone!==to.zone)fail('Despacho vinculado a una necesidad incompatible.');}
    }
    for(const n of s.needs){exists(s.resources,n.resourceId,'Recurso de necesidad');if(!s.warehouses.some(w=>w.zone===n.zone))fail('Zona de necesidad no reconocida.');qty(n.requested,'Solicitado');if(!Number.isSafeInteger(n.fulfilled)||n.fulfilled<0||n.fulfilled>n.requested)fail('Cumplimiento de necesidad inválido.');if(!['Alta','Media','Baja'].includes(n.priority)||!['open','closed'].includes(n.status))fail('Estado o prioridad de necesidad inválidos.');const total=s.dispatches.filter(d=>d.needId===n.id&&d.status==='delivered').reduce((a,d)=>a+d.qty,0);if(n.fulfilled!==total)fail(`Necesidad ${n.id}: los cumplimientos no coinciden con las entregas.`);if(remaining(s,n.id)<0)fail(`Necesidad ${n.id}: compromisos superiores al saldo requerido.`);}
    return {ok:true,movements:s.movements.length,lots:s.lots.length,dispatches:s.dispatches.length,needs:s.needs.length,centers:s.warehouses.length};
  }
  function metrics(s){let balance=0;for(const item of allStocks(s)) balance+=item.available;return {stock:balance,inTransit:transit(s),deliveries:s.dispatches.filter(d=>d.status==='delivered').length,activeNeeds:s.needs.filter(n=>n.status==='open'&&n.fulfilled<n.requested).length,receipts:s.lots.length,movements:s.movements.length};}
  function csv(rows,headers){const safe=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return [headers.map(safe).join(','),...rows.map(row=>headers.map(k=>safe(row[k])).join(','))].join('\r\n');}
  return {receive,transfer,adjust,newNeed,setNeedStatus,createDispatch,deliver,cancelDispatch,validate,metrics,stock,allStocks,remaining,transit,csv,clean,qty,clone};
})();
if (typeof module !== 'undefined') module.exports=GencyDomain;
