/* Persistencia IndexedDB: una sola instantánea por transacción, sin servidor. */
const GencyStorage=(()=>{
  const DB='gencylog-fase4-local-v2', STORE='documents', KEY='current';
  function open(){return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window))return reject(new Error('El navegador no admite IndexedDB. Usa Chrome, Edge o Firefox actualizado.'));
    const r=indexedDB.open(DB,1);r.onerror=()=>reject(r.error||new Error('No se pudo abrir el almacenamiento local.'));
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
    r.onsuccess=()=>resolve(r.result);
  });}
  async function read(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(KEY);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error)};});}
  async function write(document,expectedRevision=null){const db=await open();return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite'), store=tx.objectStore(STORE);
    let explanation='No se pudo guardar el cambio local.';
    const r=store.get(KEY);
    r.onsuccess=()=>{
      const saved=r.result;
      if(expectedRevision!==null && Number(saved?.meta?.revision??0)!==Number(expectedRevision)){
        explanation='Hay cambios realizados en otra pestaña. Recarga GencyLog antes de continuar para evitar sobrescribirlos.';
        tx.abort();return;
      }
      store.put(document,KEY);
    };
    r.onerror=()=>{explanation='No se pudo leer la revisión anterior del dataset.';tx.abort();};
    tx.oncomplete=()=>{db.close();resolve(true)};
    tx.onerror=()=>{db.close();reject(new Error(explanation))};
    tx.onabort=()=>{db.close();reject(new Error(explanation))};
  });}
  return {read,write};
})();
