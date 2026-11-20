/* GencyLog · Datos académicos 100% sintéticos. Ninguna persona ni donación es real. */
const GencySeed = (() => {
  const version = 2;
  const resources = [
    {id:'agua',name:'Agua potable',unit:'litros',category:'Hidratación'},
    {id:'alimentos',name:'Kit alimentario familiar',unit:'kits',category:'Alimentación'},
    {id:'higiene',name:'Kit de higiene',unit:'kits',category:'Higiene'},
    {id:'mantas',name:'Manta térmica',unit:'unidades',category:'Abrigo'},
    {id:'botiquin',name:'Botiquín básico',unit:'unidades',category:'Salud'},
    {id:'colchonetas',name:'Colchoneta',unit:'unidades',category:'Refugio'}
  ];
  const warehouses = [
    {id:'pereira',name:'Centro de acopio Pereira',short:'Pereira',zone:'Pereira',type:'Principal'},
    {id:'dosquebradas',name:'Punto humanitario Dosquebradas',short:'Dosquebradas',zone:'Dosquebradas',type:'Distribución'},
    {id:'santarosa',name:'Punto de apoyo Santa Rosa',short:'Santa Rosa',zone:'Santa Rosa de Cabal',type:'Distribución'}
  ];
  function create() {
    const base = Date.now(); const date = (hoursAgo) => new Date(base - hoursAgo*3600000).toISOString();
    const lots = [
      ['LOT-001','agua','pereira',1200,'Donación simulada · Red solidaria',36],
      ['LOT-002','alimentos','pereira',150,'Aporte simulado · Fundación comunitaria',33],
      ['LOT-003','higiene','dosquebradas',85,'Donación simulada · Voluntariado',30],
      ['LOT-004','mantas','pereira',100,'Reserva simulada · Acopio regional',25],
      ['LOT-005','botiquin','santarosa',35,'Donación simulada · Brigada aliada',22],
      ['LOT-006','colchonetas','pereira',60,'Donación simulada · Proveedores',20]
    ].map(([id,resourceId,warehouseId,qty,donor,hours])=>({id,resourceId,warehouseId,received:Number(qty),donor,createdAt:date(Number(hours)),note:'Ingreso de demostración'}));
    const movements = lots.map(l=>({id:`MOV-${l.id}`,kind:'receipt',lotId:l.id,warehouseId:l.warehouseId,delta:l.received,createdAt:l.createdAt,ref:l.id,actor:'Operador demo',note:'Recepción inicial de datos sintéticos'}));
    movements.push(
      {id:'MOV-TRA-1-OUT',kind:'transfer_out',lotId:'LOT-001',warehouseId:'pereira',delta:-250,createdAt:date(17),ref:'TRA-001',actor:'Operador demo',note:'Traslado entre centros'},
      {id:'MOV-TRA-1-IN',kind:'transfer_in',lotId:'LOT-001',warehouseId:'dosquebradas',delta:250,createdAt:date(17),ref:'TRA-001',actor:'Operador demo',note:'Traslado entre centros'},
      {id:'MOV-DES-1',kind:'dispatch',lotId:'LOT-001',warehouseId:'dosquebradas',delta:-100,createdAt:date(13),ref:'DES-001',actor:'Operador demo',note:'Salida a destino Pereira'},
      {id:'MOV-ENT-1',kind:'delivery',lotId:'LOT-001',warehouseId:'pereira',delta:100,createdAt:date(12),ref:'DES-001',actor:'Operador demo',note:'Entrega confirmada'},
      {id:'MOV-DES-2',kind:'dispatch',lotId:'LOT-002',warehouseId:'pereira',delta:-40,createdAt:date(11),ref:'DES-002',actor:'Operador demo',note:'Salida a punto Dosquebradas'},
      {id:'MOV-ENT-2',kind:'delivery',lotId:'LOT-002',warehouseId:'dosquebradas',delta:40,createdAt:date(10),ref:'DES-002',actor:'Operador demo',note:'Entrega confirmada'},
      {id:'MOV-DES-3',kind:'dispatch',lotId:'LOT-002',warehouseId:'pereira',delta:-25,createdAt:date(3),ref:'DES-003',actor:'Operador demo',note:'En tránsito a punto Santa Rosa'},
      {id:'MOV-DES-4',kind:'dispatch',lotId:'LOT-004',warehouseId:'pereira',delta:-20,createdAt:date(8),ref:'DES-004',actor:'Operador demo',note:'Salida a punto Santa Rosa'},
      {id:'MOV-ENT-4',kind:'delivery',lotId:'LOT-004',warehouseId:'santarosa',delta:20,createdAt:date(6),ref:'DES-004',actor:'Operador demo',note:'Entrega confirmada'}
    );
    const needs = [
      {id:'NEC-001',resourceId:'agua',zone:'Pereira',requested:520,fulfilled:100,priority:'Alta',note:'Abastecimiento para punto central',createdAt:date(32),status:'open'},
      {id:'NEC-002',resourceId:'alimentos',zone:'Dosquebradas',requested:120,fulfilled:40,priority:'Alta',note:'Apoyo a familias en escenario académico',createdAt:date(30),status:'open'},
      {id:'NEC-003',resourceId:'higiene',zone:'Santa Rosa de Cabal',requested:90,fulfilled:0,priority:'Media',note:'Higiene preventiva comunitaria',createdAt:date(21),status:'open'},
      {id:'NEC-004',resourceId:'mantas',zone:'Santa Rosa de Cabal',requested:70,fulfilled:20,priority:'Media',note:'Apoyo simulado para refugio temporal',createdAt:date(19),status:'open'},
      {id:'NEC-005',resourceId:'botiquin',zone:'Pereira',requested:40,fulfilled:0,priority:'Alta',note:'Puesto de salud simulado',createdAt:date(17),status:'open'}
    ];
    const dispatches = [
      {id:'DES-001',lotId:'LOT-001',origin:'dosquebradas',destination:'pereira',qty:100,needId:'NEC-001',status:'delivered',createdAt:date(13),deliveredAt:date(12),receiver:'Responsable demo · Pereira',evidence:'Acta sintética REC-001',note:'Entrega simulada'},
      {id:'DES-002',lotId:'LOT-002',origin:'pereira',destination:'dosquebradas',qty:40,needId:'NEC-002',status:'delivered',createdAt:date(11),deliveredAt:date(10),receiver:'Responsable demo · Dosquebradas',evidence:'Acta sintética REC-002',note:'Entrega simulada'},
      {id:'DES-003',lotId:'LOT-002',origin:'pereira',destination:'santarosa',qty:25,needId:null,status:'in_transit',createdAt:date(3),deliveredAt:null,receiver:null,evidence:null,note:'Pendiente de confirmación'},
      {id:'DES-004',lotId:'LOT-004',origin:'pereira',destination:'santarosa',qty:20,needId:'NEC-004',status:'delivered',createdAt:date(8),deliveredAt:date(6),receiver:'Responsable demo · Santa Rosa',evidence:'Acta sintética REC-004',note:'Entrega simulada'}
    ];
    const audit = [{id:'AUD-001',action:'dataset_initialized',at:date(36),actor:'Sistema de demostración',summary:'Escenario simulado Pereira–Dosquebradas cargado',ref:'DEMO'}];
    return {schemaVersion:version,meta:{title:'Simulación académica Pereira–Dosquebradas',dataset:'GencyLog Fase 4 · 2026.11',createdAt:date(36),updatedAt:date(1),revision:0,demo:true},resources,warehouses,lots,movements,dispatches,needs,audit};
  }
  return {version,create};
})();
if (typeof module !== 'undefined') module.exports=GencySeed;
