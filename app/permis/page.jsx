'use client';
import { useState } from 'react';

function calcSolaire(s) {
  const surf = s || 500;
  const toiture = Math.floor(surf * 0.4);
  const puissance = Math.floor(toiture * 0.165);
  const production = Math.floor(puissance * 1050);
  const revenusAn = Math.floor(production * 0.10);
  const cout = Math.floor(puissance * 650);
  const roi = revenusAn > 0 ? Math.ceil(cout / revenusAn) : 99;
  return { toiture, puissance, production, revenusAn, revenus20: revenusAn * 20, cout, roi };
}

export default function Permis() {
  const [type, setType] = useState('PC_LOCAUX');
  const [limit, setLimit] = useState('50');
  const [dateMin, setDateMin] = useState('');
  const [surfaceMin, setSurfaceMin] = useState('');
  const [permis, setPermis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  async function rechercher() {
    setLoading(true);
    setError('');
    setPermis([]);
    try {
      const params = new URLSearchParams({ type, limit });
      if (dateMin) params.append('date_min', dateMin);
      if (surfaceMin) params.append('surface_min', surfaceMin);
      const res = await fetch('/api/permis?' + params);
      const data = await res.json();
      if (!data.results) throw new Error(data.message || 'Erreur API');
const mapped = data.results.map(function(p, i) {
        const f = calcSolaire(p.superficie_terrain);
        return {
          id: i,
          ref: p.num_pa || i,
          nom: p.denom_dem || 'Non renseigné',
          commune: p.adr_localite_ter || '',
          cp: '78',
          adresse: p.full_address || '',
          date: p.date_reelle_autorisation || '',
          surface_terrain: p.superficie_terrain || 0,
          surface_construction: p.superficie_terrain || 0,
          statut: p.etat_pa || '',
          ...f,
        };
      });
      setPermis(mapped);
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function exportCSV() {
    const rows = permis.map(p => [p.ref,p.nom,p.commune,p.cp,p.date,p.surface_terrain,p.puissance,p.revenusAn,p.roi].join(';')).join('\n');
    const blob = new Blob(['Ref;Nom;Commune;CP;Date;Surface;Puissance kWc;Revenus/an;ROI\n' + rows], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'permis-78.csv';
    a.click();
  }

  const S = {
    page: {background:'#0a0e0a',minHeight:'100vh',color:'#e2f0e2',fontFamily:'monospace',padding:'32px 20px'},
    box: {background:'#111811',border:'1px solid #1e2e1e',borderRadius:'4px',padding:'24px',marginBottom:'24px'},
    label: {fontSize:'0.7rem',color:'#5a7a5a',marginBottom:'6px'},
    input: {background:'#0a0e0a',border:'1px solid #1e2e1e',padding:'10px 12px',color:'#e2f0e2',fontFamily:'monospace'},
    btn: {padding:'10px 24px',background:'#fb923c',color:'#000',border:'none',fontWeight:'700',cursor:'pointer',fontFamily:'monospace'},
    btnCSV: {padding:'10px 16px',background:'none',border:'1px solid #1e2e1e',color:'#5a7a5a',cursor:'pointer',fontFamily:'monospace'},
    row: {display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'},
  };

  return (
    <div style={S.page}>
      <h1 style={{color:'#fb923c',fontSize:'2rem',marginBottom:'8px'}}>PERMIS.PRO</h1>
      <p style={{color:'#5a7a5a',marginBottom:'32px',fontSize:'0.8rem'}}>Prospection permis de construire — Dept. 78 Yvelines</p>

      <div style={S.box}>
        <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'flex-end'}}>
          <div>
            <div style={S.label}>TYPE</div>
            <select value={type} onChange={e=>setType(e.target.value)} style={S.input}>
              <option value="PC_LOCAUX">Locaux commerciaux</option>
              <option value="PC_INDUSTRIEL">Locaux industriels</option>
            </select>
          </div>
          <div>
            <div style={S.label}>RÉSULTATS</div>
            <select value={limit} onChange={e=>setLimit(e.target.value)} style={S.input}>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
          <div>
            <div style={S.label}>DATE MIN</div>
            <input value={dateMin} onChange={e=>setDateMin(e.target.value)} placeholder="2025-01-01" style={{...S.input,width:'120px'}}/>
          </div>
          <div>
            <div style={S.label}>SURFACE MIN M²</div>
            <input value={surfaceMin} onChange={e=>setSurfaceMin(e.target.value)} placeholder="200" style={{...S.input,width:'80px'}}/>
          </div>
          <button onClick={rechercher} disabled={loading} style={S.btn}>{loading?'Chargement...':'RECHERCHER'}</button>
          {permis.length > 0 && <button onClick={exportCSV} style={S.btnCSV}>Exporter CSV</button>}
        </div>
      </div>

      {error && <div style={{color:'#f87171',marginBottom:'16px',padding:'12px',border:'1px solid rgba(248,113,113,0.2)'}}>{error}</div>}
      {permis.length > 0 && <p style={{color:'#5a7a5a',fontSize:'0.8rem',marginBottom:'16px'}}>{permis.length} permis — Dept. 78</p>}

      {permis.map(p => {
        const isOpen = openId === p.id;
        const dot = p.roi <= 8 ? '#4ade80' : p.roi <= 12 ? '#fb923c' : '#5a7a5a';
        return (
          <div key={p.id} onClick={()=>setOpenId(isOpen?null:p.id)} style={{background:'#111811',border:'1px solid '+(isOpen?'#fb923c':'#1e2e1e'),borderRadius:'4px',marginBottom:'8px',cursor:'pointer'}}>
            <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'8px',height:'8px',borderRadius:'50%',background:dot,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nom}</div>
                <div style={{fontSize:'0.7rem',color:'#5a7a5a'}}>{p.commune} {p.cp} — {p.date}</div>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <span style={{background:'rgba(251,146,60,0.1)',color:'#fb923c',padding:'3px 8px',fontSize:'0.65rem',border:'1px solid rgba(251,146,60,0.2)'}}>{p.puissance} kWc</span>
                <span style={{background:'rgba(74,222,128,0.1)',color:'#4ade80',padding:'3px 8px',fontSize:'0.65rem',border:'1px solid rgba(74,222,128,0.2)'}}>ROI {p.roi}a</span>
              </div>
            </div>
            {isOpen && (
              <div style={{padding:'0 20px 20px',borderTop:'1px solid #1e2e1e'}} onClick={e=>e.stopPropagation()}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginTop:'16px'}}>
                  <div style={{background:'#0a0e0a',padding:'14px',border:'1px solid #1e2e1e'}}>
                    <div style={{fontSize:'0.65rem',color:'#5a7a5a',marginBottom:'8px',textTransform:'uppercase'}}>Permis</div>
                    {[['Réf',p.ref],['Demandeur',p.nom],['Adresse',p.adresse||'N/A'],['Commune',p.commune+' '+p.cp],['Date',p.date],['Statut',p.statut],['Surface terrain',p.surface_terrain+' m²'],['Surface construction',p.surface_construction+' m²']].map(([l,v])=>(
                      <div key={l} style={S.row}><span style={{color:'#5a7a5a'}}>{l}</span><span>{v}</span></div>
                    ))}
                  </div>
                  <div style={{background:'#0a0e0a',padding:'14px',border:'1px solid #1e2e1e'}}>
                    <div style={{fontSize:'0.65rem',color:'#5a7a5a',marginBottom:'8px',textTransform:'uppercase'}}>Potentiel solaire</div>
                    {[['Toiture',p.toiture+' m²'],['Puissance',p.puissance+' kWc'],['Production/an',p.production.toLocaleString()+' kWh'],['Revenus/an',p.revenusAn.toLocaleString()+' EUR'],['Revenus 20ans',p.revenus20.toLocaleString()+' EUR'],['Coût',p.cout.toLocaleString()+' EUR'],['ROI',p.roi+' ans']].map(([l,v])=>(
                      <div key={l} style={S.row}><span style={{color:'#5a7a5a'}}>{l}</span><span style={{color:l==='Puissance'||l==='Revenus/an'||l==='Revenus 20ans'?'#4ade80':l==='ROI'?'#fb923c':'#e2f0e2'}}>{v}</span></div>
                    ))}
                  </div>
                </div>
                <div style={{marginTop:'16px',padding:'14px',background:'rgba(251,146,60,0.03)',border:'1px solid rgba(251,146,60,0.15)',fontSize:'0.8rem',lineHeight:'1.7'}}>
                  <div style={{color:'#fb923c',fontSize:'0.65rem',textTransform:'uppercase',marginBottom:'8px'}}>Pitch commercial</div>
                  Bonjour, je contacte {p.nom} suite à votre permis de construire à {p.commune}. Votre bâtiment est éligible à une installation solaire de {p.puissance} kWc, générant {p.revenusAn.toLocaleString()} EUR/an soit {p.revenus20.toLocaleString()} EUR sur 20 ans. ROI en {p.roi} ans. batterie-stockage.fr
                </div>
                <a href={'https://maps.google.fr/?q='+encodeURIComponent(p.nom+' '+p.commune)} target="_blank" style={{display:'inline-block',marginTop:'12px',padding:'8px 16px',background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.3)',color:'#60a5fa',textDecoration:'none',fontSize:'0.75rem'}}>
                  Voir sur Google Maps
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
