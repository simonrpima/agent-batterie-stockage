'use client';
import { useState } from 'react';

export default function Prospection() {
  const [dept, setDept] = useState('59');
  const [nb, setNb] = useState('50');
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  function getSurface(tranche, isElevage) {
    if (tranche === '00') return isElevage ? 800 : 600;
    if (tranche === '01') return isElevage ? 1200 : 800;
    if (tranche === '02') return isElevage ? 1500 : 1000;
    if (tranche === '03') return isElevage ? 2000 : 1200;
    if (tranche === '11') return isElevage ? 2500 : 1500;
    if (tranche === '12') return isElevage ? 3000 : 2000;
    return isElevage ? 1200 : 800;
  }

  function getIrr(d) {
    const map = {'59':950,'62':950,'80':1000,'02':1050,'33':1250,'31':1350,'34':1450,'13':1550,'83':1550};
    return map[d] || 1100;
  }

  function calcFiche(naf, tranche, d) {
    const n = (naf || '').replace('.', '').substring(0, 4);
    const elev = ['0141','0142','0143','0144','0145','0146','0147','0149'];
    const isE = elev.some(function(e) { return n.startsWith(e); });
    const surface = getSurface(tranche, isE);
    const irr = getIrr(d);
    const puissance = Math.floor(surface * 0.165);
    const production = Math.floor(puissance * irr);
    const revenusAn = Math.floor(production * 0.10);
    const cout = Math.floor(puissance * 650);
    const roi = Math.ceil(cout / revenusAn);
    return { surface, puissance, production, revenusAn, revenus20: revenusAn * 20, cout, roi, irr };
  }

  async function rechercher() {
    setLoading(true);
    setError('');
    setSites([]);
    try {
      const url = '/api/insee?dept=' + dept.padStart(2, '0') + '&nb=' + nb;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.etablissements) {
        throw new Error(data.header ? data.header.message : 'Erreur');
      }
      const mapped = data.etablissements.map(function(etab, i) {
        const ul = etab.uniteLegale || {};
        const adr = etab.adresseEtablissement || {};
        const prenom = ul.prenomUsuelUniteLegale || '';
        const nom = ul.nomUniteLegale || '';
        const denomination = ul.denominationUniteLegale || (prenom + ' ' + nom).trim();
        const fiche = calcFiche(ul.activitePrincipaleUniteLegale, ul.trancheEffectifsUniteLegale, dept);
        const adresseArr = [adr.numeroVoieEtablissement, adr.typeVoieEtablissement, adr.libelleVoieEtablissement];
        return {
          id: i,
          siret: etab.siret,
          nom: denomination || 'Exploitation',
          naf: ul.activitePrincipaleUniteLegale || '',
          adresse: adresseArr.filter(Boolean).join(' '),
          commune: adr.libelleCommuneEtablissement || '',
          cp: adr.codePostalEtablissement || '',
          contact: (prenom + ' ' + nom).trim(),
          surface: fiche.surface,
          puissance: fiche.puissance,
          production: fiche.production,
          revenusAn: fiche.revenusAn,
          revenus20: fiche.revenus20,
          cout: fiche.cout,
          roi: fiche.roi,
          irr: fiche.irr
        };
      });
      mapped.sort(function(a, b) { return a.roi - b.roi; });
      setSites(mapped);
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function exportCSV() {
    const header = 'Nom;SIRET;Commune;CP;Contact;Surface;Puissance kWc;Revenus an EUR;ROI ans\n';
    const rows = sites.map(function(s) {
      return [s.nom, s.siret, s.commune, s.cp, s.contact, s.surface, s.puissance, s.revenusAn, s.roi].join(';');
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'prospection-' + dept + '.csv';
    a.click();
  }

  return (
    <div style={{background:'#0a0e0a',minHeight:'100vh',color:'#e2f0e2',fontFamily:'monospace',padding:'32px 20px'}}>
      <h1 style={{color:'#4ade80',fontSize:'2rem',marginBottom:'8px'}}>AAC.PRO</h1>
      <p style={{color:'#5a7a5a',marginBottom:'32px',fontSize:'0.8rem'}}>Prospection agricole Hubwatt — INSEE Sirene</p>

      <div style={{background:'#111811',border:'1px solid #1e2e1e',borderRadius:'4px',padding:'24px',marginBottom:'24px'}}>
        <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'flex-end'}}>
          <div>
            <div style={{fontSize:'0.7rem',color:'#5a7a5a',marginBottom:'6px'}}>DEPARTEMENT</div>
            <input
              value={dept}
              onChange={function(e){setDept(e.target.value);}}
              onKeyDown={function(e){if(e.key==='Enter')rechercher();}}
              style={{background:'#0a0e0a',border:'1px solid #1e2e1e',padding:'10px 12px',color:'#e2f0e2',fontFamily:'monospace',width:'80px'}}
            />
          </div>
          <div>
            <div style={{fontSize:'0.7rem',color:'#5a7a5a',marginBottom:'6px'}}>RESULTATS</div>
            <select
              value={nb}
              onChange={function(e){setNb(e.target.value);}}
              style={{background:'#0a0e0a',border:'1px solid #1e2e1e',padding:'10px 12px',color:'#e2f0e2',fontFamily:'monospace'}}
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <button
            onClick={rechercher}
            disabled={loading}
            style={{padding:'10px 24px',background:'#4ade80',color:'#000',border:'none',fontWeight:'700',cursor:'pointer'}}
          >
            {loading ? 'Chargement...' : 'RECHERCHER'}
          </button>
          {sites.length > 0 && (
            <button
              onClick={exportCSV}
              style={{padding:'10px 16px',background:'none',border:'1px solid #1e2e1e',color:'#5a7a5a',cursor:'pointer',fontFamily:'monospace'}}
            >
              Exporter CSV
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{color:'#f87171',marginBottom:'16px',padding:'12px',border:'1px solid rgba(248,113,113,0.2)'}}>
          {error}
        </div>
      )}

      {sites.length > 0 && (
        <p style={{color:'#5a7a5a',fontSize:'0.8rem',marginBottom:'16px'}}>
          {sites.length} exploitations — Dept. {dept}
        </p>
      )}

      {sites.map(function(s) {
        const isOpen = openId === s.id;
        const dotColor = s.roi <= 8 ? '#4ade80' : s.roi <= 12 ? '#fb923c' : '#5a7a5a';
        const borderColor = isOpen ? '#4ade80' : '#1e2e1e';
        return (
          <div
            key={s.id}
            onClick={function(){setOpenId(isOpen ? null : s.id);}}
            style={{background:'#111811',border:'1px solid '+borderColor,borderRadius:'4px',marginBottom:'8px',cursor:'pointer'}}
          >
            <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'8px',height:'8px',borderRadius:'50%',background:dotColor,flexShrink:0}} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:'600',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.nom}</div>
                <div style={{fontSize:'0.7rem',color:'#5a7a5a'}}>{s.commune} ({s.cp})</div>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <span style={{background:'rgba(74,222,128,0.1)',color:'#4ade80',padding:'3px 8px',fontSize:'0.65rem',border:'1px solid rgba(74,222,128,0.2)'}}>
                  {s.puissance} kWc
                </span>
                <span style={{background:'rgba(251,146,60,0.1)',color:'#fb923c',padding:'3px 8px',fontSize:'0.65rem',border:'1px solid rgba(251,146,60,0.2)'}}>
                  ROI {s.roi}a
                </span>
              </div>
            </div>
            {isOpen && (
              <div
                style={{padding:'0 20px 20px',borderTop:'1px solid #1e2e1e'}}
                onClick={function(e){e.stopPropagation();}}
              >
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginTop:'16px'}}>
                  <div style={{background:'#0a0e0a',padding:'14px',border:'1px solid #1e2e1e'}}>
                    <div style={{fontSize:'0.65rem',color:'#5a7a5a',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.1em'}}>
                      Identification
                    </div>
                    <div style={{fontSize:'0.8rem'}}>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'}}>
                        <span style={{color:'#5a7a5a'}}>SIRET</span><span>{s.siret}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'}}>
                        <span style={{color:'#5a7a5a'}}>Contact</span><span>{s.contact || 'N/A'}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'}}>
                        <span style={{color:'#5a7a5a'}}>Adresse</span><span>{s.adresse || 'N/A'}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'}}>
                        <span style={{color:'#5a7a5a'}}>Commune</span><span>{s.commune} {s.cp}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
                        <span style={{color:'#5a7a5a'}}>NAF</span><span>{s.naf}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{background:'#0a0e0a',padding:'14px',border:'1px solid #1e2e1e'}}>
                    <div style={{fontSize:'0.65rem',color:'#5a7a5a',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.1em'}}>
                      Potentiel AAC
                    </div>
                    <div style={{fontSize:'0.8rem'}}>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'}}>
                        <span style={{color:'#5a7a5a'}}>Surface</span><span>{s.surface} m2</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'}}>
                        <span style={{color:'#5a7a5a'}}>Puissance</span><span style={{color:'#4ade80'}}>{s.puissance} kWc</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'}}>
                        <span style={{color:'#5a7a5a'}}>Production/an</span><span>{s.production.toLocaleString()} kWh</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'}}>
                        <span style={{color:'#5a7a5a'}}>Revenus/an</span><span style={{color:'#4ade80'}}>{s.revenusAn.toLocaleString()} EUR</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'}}>
                        <span style={{color:'#5a7a5a'}}>Revenus 20 ans</span><span style={{color:'#4ade80'}}>{s.revenus20.toLocaleString()} EUR</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e2e1e'}}>
                        <span style={{color:'#5a7a5a'}}>Cout install.</span><span>{s.cout.toLocaleString()} EUR</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
                        <span style={{color:'#5a7a5a'}}>ROI</span><span style={{color:'#fb923c'}}>{s.roi} ans</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{marginTop:'16px',padding:'14px',background:'rgba(74,222,128,0.03)',border:'1px solid rgba(74,222,128,0.15)',fontSize:'0.8rem',lineHeight:'1.7'}}>
                  <div style={{color:'#4ade80',fontSize:'0.65rem',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'8px'}}>
                    Pitch commercial
                  </div>
                  <span>
                    Bonjour {s.contact ? s.contact.split(' ')[0] : ''}, je represente Batterie-stockage.fr, partenaire Hubwatt.
                    Votre exploitation est eligible a une installation de {s.puissance} kWc.
                    Vous generez {s.revenusAn.toLocaleString()} EUR/an sur 20 ans,
                    soit {s.revenus20.toLocaleString()} EUR garantis. ROI en {s.roi} ans.
                  </span>
                </div>
                <a
                  href={'https://maps.google.fr/?q=' + encodeURIComponent(s.nom + ' ' + s.commune)}
                  target="_blank"
                  style={{display:'inline-block',marginTop:'12px',padding:'8px 16px',background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.3)',color:'#60a5fa',textDecoration:'none',fontSize:'0.75rem'}}
                >
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
