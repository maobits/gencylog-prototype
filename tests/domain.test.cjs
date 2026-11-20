const test=require('node:test');
const assert=require('node:assert/strict');
const seed=require('../seed.js');
const d=require('../domain.js');
const fresh=()=>seed.create();
const receipt={resourceId:'agua',warehouseId:'pereira',quantity:30,donor:'Organización ficticia',note:'Ingreso seguro para prueba'};
const transfer={lotId:'LOT-001',origin:'pereira',destination:'santarosa',quantity:35,reason:'Reubicación autorizada por necesidad'};
function shouldFail(fn,message){assert.throws(fn,message?new RegExp(message,'i'):undefined)}
test('01. dataset inicial es consistente y sintético',()=>{const s=fresh();assert.equal(s.meta.demo,true);assert.equal(d.validate(s).ok,true)});
test('02. métricas iniciales derivan del ledger',()=>{assert.deepEqual(d.metrics(fresh()),{stock:1605,inTransit:25,deliveries:3,activeNeeds:5,receipts:6,movements:15})});
test('03. recepción crea lote, movimiento y auditoría',()=>{const s=fresh(),n=d.receive(s,receipt);assert.equal(n.lots.length,s.lots.length+1);const id=n.lots.at(-1).id;assert.equal(d.stock(n,id,'pereira'),30);assert.equal(n.audit.length,s.audit.length+1);assert.equal(d.validate(n).ok,true)});
test('04. datos originales no se mutan',()=>{const s=fresh(),dump=JSON.stringify(s);d.receive(s,receipt);assert.equal(JSON.stringify(s),dump)});
test('05. recepción rechaza cantidad negativa, decimal, cero y texto',()=>{for(const q of [-2,0,0.5,'x','',1000001])shouldFail(()=>d.receive(fresh(),{...receipt,quantity:q}))});
test('06. ingreso rechaza recurso o centro desconocido',()=>{shouldFail(()=>d.receive(fresh(),{...receipt,resourceId:'no'}));shouldFail(()=>d.receive(fresh(),{...receipt,warehouseId:'no'}))});
test('07. traslado balanceado entre centros',()=>{const s=fresh(),before=d.stock(s,'LOT-001','pereira'),n=d.transfer(s,transfer);assert.equal(d.stock(n,'LOT-001','pereira'),before-35);assert.equal(d.stock(n,'LOT-001','santarosa'),35);assert.equal(d.metrics(n).stock,d.metrics(s).stock);assert.equal(d.validate(n).ok,true)});
test('08. traslado no permite sobregiro ni origen=destino',()=>{shouldFail(()=>d.transfer(fresh(),{...transfer,quantity:99999}),'insuficientes');shouldFail(()=>d.transfer(fresh(),{...transfer,destination:'pereira'}),'diferentes')});
test('09. ajuste positivo y negativo deja libro verificable',()=>{const s=fresh(),a=d.adjust(s,{lotId:'LOT-001',warehouseId:'pereira',direction:'increase',quantity:10,reason:'Corrección documentada'}),b=d.adjust(a,{lotId:'LOT-001',warehouseId:'pereira',direction:'decrease',quantity:5,reason:'Diferencia física corregida'});assert.equal(d.stock(b,'LOT-001','pereira'),d.stock(s,'LOT-001','pereira')+5);assert.equal(d.validate(b).ok,true)});
test('10. ajuste negativo jamás permite cantidad superior a saldo',()=>shouldFail(()=>d.adjust(fresh(),{lotId:'LOT-001',warehouseId:'pereira',direction:'decrease',quantity:99999,reason:'Revisión anual de inventario'}),'negativas'));
test('11. necesidad nueva con 0 cumplimiento',()=>{const n=d.newNeed(fresh(),{resourceId:'agua',warehouseId:'dosquebradas',quantity:20,priority:'Alta',note:'Solicitud simulada de agua potable'});assert.equal(n.needs.at(-1).fulfilled,0);assert.equal(d.validate(n).ok,true)});
test('12. crear despacho descuenta stock y mantiene tránsito',()=>{const s=fresh(),before=d.stock(s,'LOT-001','pereira'),n=d.createDispatch(s,{lotId:'LOT-001',origin:'pereira',destination:'dosquebradas',quantity:20,needId:null,note:'Salida con guía simulada'});assert.equal(d.stock(n,'LOT-001','pereira'),before-20);assert.equal(d.transit(n),d.transit(s)+20);assert.equal(d.validate(n).ok,true)});
test('13. el vínculo exige recurso y destino de necesidad compatibles',()=>{
 const s=fresh();
 shouldFail(()=>d.createDispatch(s,{lotId:'LOT-001',origin:'pereira',destination:'santarosa',quantity:20,needId:'NEC-001',note:'Prueba'}),'coincidir');
 shouldFail(()=>d.createDispatch(s,{lotId:'LOT-002',origin:'pereira',destination:'dosquebradas',quantity:20,needId:'NEC-001',note:'Prueba'}),'coincidir');
});
test('14. entrega confirmada mueve al destino y actualiza necesidad',()=>{
 let s=fresh();const available=d.stock(s,'LOT-002','pereira');
 s=d.createDispatch(s,{lotId:'LOT-002',origin:'pereira',destination:'dosquebradas',quantity:15,needId:'NEC-002',note:'Envío para familias'});
 const id=s.dispatches.at(-1).id,oldDest=d.stock(s,'LOT-002','dosquebradas');
 s=d.deliver(s,{dispatchId:id,receiver:'Operador ficticio',evidence:'ACTA-DEMO-015'});
 assert.equal(d.stock(s,'LOT-002','dosquebradas'),oldDest+15);
 assert.equal(d.stock(s,'LOT-002','pereira'),available-15);
 assert.equal(s.needs.find(n=>n.id==='NEC-002').fulfilled,55);
 assert.equal(d.validate(s).ok,true);
});
test('15. una entrega no puede confirmarse dos veces',()=>shouldFail(()=>d.deliver(fresh(),{dispatchId:'DES-001',receiver:'Test responsable',evidence:'ACTA-015'}),'finalizado'));
test('16. despachos vinculados no exceden saldo restante',()=>shouldFail(()=>d.createDispatch(fresh(),{lotId:'LOT-002',origin:'pereira',destination:'dosquebradas',quantity:81,needId:'NEC-002',note:'Prueba'}),'pendientes'));
test('17. una devolución restaura origen sin borrar movimiento',()=>{
 const s=fresh(),before=d.stock(s,'LOT-002','pereira'),n=d.cancelDispatch(s,{dispatchId:'DES-003',reason:'Ruta suspendida por ejercicio académico'});
 assert.equal(d.stock(n,'LOT-002','pereira'),before+25);assert.equal(d.transit(n),0);assert.equal(d.validate(n).ok,true);
});
test('18. un despacho entregado no se puede devolver',()=>shouldFail(()=>d.cancelDispatch(fresh(),{dispatchId:'DES-002',reason:'Motivo de prueba extensa'}),'tránsito'));
test('19. no se puede cerrar necesidad con entrega pendiente',()=>{
 const s=fresh(),a=d.createDispatch(s,{lotId:'LOT-002',origin:'pereira',destination:'dosquebradas',quantity:5,needId:'NEC-002',note:'Tránsito'});
 shouldFail(()=>d.setNeedStatus(a,'NEC-002','closed'),'pendientes');
});
test('20. cierre y reapertura auditados',()=>{let s=fresh();s=d.setNeedStatus(s,'NEC-001','closed');assert.equal(s.needs.find(n=>n.id==='NEC-001').status,'closed');s=d.setNeedStatus(s,'NEC-001','open');assert.equal(s.needs.find(n=>n.id==='NEC-001').status,'open')});
test('21. integridad rechaza inventario negativo',()=>{const s=fresh();s.movements.push({...s.movements[0],id:'BAD',kind:'dispatch',ref:'BAD',delta:-99999,createdAt:new Date().toISOString()});shouldFail(()=>d.validate(s),'negativo')});
test('22. integridad rechaza una entrega sin ledger',()=>{const s=fresh();s.movements=s.movements.filter(m=>m.id!=='MOV-ENT-1');shouldFail(()=>d.validate(s),'Entrega')});
test('23. integridad rechaza necesidad sobrecumplida',()=>{const s=fresh();s.needs[0].fulfilled=9999;shouldFail(()=>d.validate(s))});
test('24. integridad rechaza IDs duplicados',()=>{const s=fresh();s.lots.push({...s.lots[0]});shouldFail(()=>d.validate(s),'duplicado')});
test('25. integridad rechaza versión ajena',()=>{const s=fresh();s.schemaVersion=3;shouldFail(()=>d.validate(s),'incompatible')});
test('26. CSV evita fórmulas ejecutables en hoja de cálculo',()=>{const value=d.csv([{x:'=HYPERLINK("x")'},{x:'@SUM(2,2)'}],['x']);assert.match(value,/"'=HYPERLINK/);assert.match(value,/"'@SUM/) });
test('27. secuencia completa cumple consistencia y métricas',()=>{
 let s=fresh();s=d.receive(s,receipt);const id=s.lots.at(-1).id;
 s=d.transfer(s,{lotId:id,origin:'pereira',destination:'dosquebradas',quantity:10,reason:'Traslado preventivo documentado'});
 s=d.newNeed(s,{resourceId:'agua',warehouseId:'santarosa',quantity:8,priority:'Alta',note:'Agua para punto de prueba'});const needId=s.needs.at(-1).id;
 s=d.createDispatch(s,{lotId:id,origin:'dosquebradas',destination:'santarosa',quantity:8,needId,note:'Ruta simulada de ayuda'});const dispatchId=s.dispatches.at(-1).id;
 s=d.deliver(s,{dispatchId,receiver:'Persona responsable ficticia',evidence:'REC-ACADEMICO-123'});
 assert.equal(d.stock(s,id,'santarosa'),8);assert.equal(s.needs.at(-1).fulfilled,8);assert.equal(d.validate(s).ok,true);
});
