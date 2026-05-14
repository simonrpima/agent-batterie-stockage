'use client';
import { useState } from 'react';

export default function Prospection() {
  const [dept, setDept] = useState('59');
  const [nb, setNb] = useState('50');
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  function calcFiche(naf, tranche, dept) {
    const nafClean = (naf || '').replace('.', '').substring(0, 4);
    const elevageNafs = ['0141', '0142', '0143', '0144', '0145', '0146', '0147', '0149'];
    const isElevage = elevageNafs.some(function(e) { return nafClean.startsWith(e); });
    let surface = 800;
    if (tranche === '00') { surface = isElevage ? 800 : 600; }
    else if (tranche === '01') { surface = isElevage ? 1200 : 800; }
    else if (tranche === '02') { surface = isElevage ? 1500 : 1000; }
    else if (tranche === '03') { surface = isElevage ? 2000 : 1200; }
    else if (tranche === '11') { surface = isElevage ? 2500 : 1500; }
    else if (tranche === '12') { surface = isElevage ? 3000 : 2000; }
    const irradiation = { '59': 950, '62': 950, '80': 1000, '33': 1250, '31': 1350, '34': 1450, '13': 1550 };
    const irr = irradiation[dept] || 1100;
    const puissance = Math.floor(surface * 0.165);
    const production = Math.floor(puissance * irr);
    const revenusAn = Math.floor(production * 0.10);
    const revenus20ans = revenusAn * 20;
    const cout = Math.floor(puissance * 650);
    const roi = Math.ceil(cout / revenusAn);
    return { surface, puissance, production, revenusAn, revenus20ans, cout, roi, irr };
  }

  async function rechercher() {
    setLoading(true);
    setError('');
    setSites([]);
    try {
      const res = await fetch('/api/insee?dept=' + dept.padStart(2, '0') + '&nb=' + nb);
      const data = await res.json();
      if (!data.etablissements) { throw new Error(data.header?.message || 'Aucun résultat'); }
      const mapped = data.etablissements.map(function(etab, i) {
        const ul = etab.uniteLegale || {};
        const adr = etab.adresseEtablissement || {};
        const nom = ul.denominationUniteLegale || ((ul.prenomUsuelUniteLegale || '') + ' ' + (ul.nomUniteLegale || '')).trim();
        const fiche = calcFiche(ul.activitePrincipaleUniteLegale, ul.trancheEffectifsUniteLegale, dept);
        return {
          id: i, siret: etab.siret, nom: nom || 'Exploitation',
          naf: ul.activitePrincipaleUniteLegale || '',
          adresse: [adr.numeroVoieEtablissement, adr.typeVoieEtablissement, adr.libelleVoieEtablissement].filter(Boolean).join(' '),
          commune: adr.libelleCommuneEtablissement || '',
          cp: adr.codePostalEtablissement || '',
          contact: ((ul.prenomUsuelUniteLegale || '') + ' ' + (ul.nomUniteLegale || '')).trim(),
          ...fiche
        };
      }).sort(function(a, b) { return a.roi - b.roi; });
      setSites(mapped);
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  function exportCSV() {
    const h = 'Nom;SIRET;Commune;CP;Contact;Surface;Puissance kWc;Revenus an;ROI\n';
    const rows = sites.map(function(s) {
      return s.nom + ';' + s.siret + ';' + s.commune + ';' + s.cp + ';' + s.contact + ';' + s.surface + ';' + s.puissance + ';' + s.revenusAn + ';' + s.roi;
    }).join('\n');
    const blob = new Blob([h + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'prospection-' + dept + '.csv';
    a.click();
  }

  const s1 = { background: '#0a0e0a', minHeight: '100vh', color: '#e2f0e2', fontFamily: 'monospace', padding: '32px 20px' };
  const sCard = { background: '#111811', border: '1px solid #1e2e1e', borderRadius: '4px', padding: '24px', marginBottom: '24px' };
  const sInput = { background: '#0a0e0a', border: '1px solid #1e2e1e', borderRadius: '2px', padding: '10px 12px', color: '#e2f0e2', fontFamily: 'monospace' };
  const sBtn = { padding: '10px 24px', background: '#4ade80', color: '#000', border: 'none', borderRadius: '2px', fontWeight: '700', cursor: 'pointer' };

  return (
    <div style={s1}>
      <h1 style={{ color: '#4ade80', fontSize: '2rem', marginBottom: '8px' }}>AAC.PRO</h1>
      <p style={{ color: '#5a7a5a', marginBottom: '32px', fontSize: '0.8rem' }}>Prospection agricole — Hubwatt — Données INSEE Sirene</p>

      <div style={sCard}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#5a7a5a', marginBottom: '6px' }}>DEPARTEMENT</div>
            <input value={dept} onChange={function(e) { setDept(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter') rechercher(); }}
              style={{ ...sInput, width: '80px' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#5a7a5a', marginBottom: '6px' }}>RESULTATS</div>
            <select value={nb} onChange={function(e) { setNb(e.target.value); }} style={sInput}>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <button onClick={rechercher} disabled={loading} style={sBtn}>
            {loading ? 'Chargement...' : 'RECHERCHER'}
          </button>
          {sites.length > 0 && (
            <button onClick={exportCSV} style={{ ...sBtn, background: 'none', border: '1px solid #1e2e1e', color: '#5a7a5a' }}>
              Exporter CSV
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ color: '#f87171', marginBottom: '16px', padding: '12px', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '4px' }}>{error}</div>}
      {sites.length > 0 && <p style={{ color: '#5a7a5a', fontSize: '0.8rem', marginBottom: '16px' }}>{sites.length} exploitations — Dept. {dept}</p>}

      {sites.map(function(s) {
        const isOpen = openId === s.id;
        return (
          <div key={s.id} onClick={function() { setOpenId(isOpen ? null : s.id); }}
            style={{ background: '#111811', border: '1px solid ' + (isOpen ? '#4ade80' : '#1e2e1e'), borderRadius: '4px', marginBottom: '8px', cursor: 'pointer' }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.roi <= 8 ? '#4ade80' : s.roi <= 12 ? '#fb923c' : '#5a7a5a' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nom}</div>
                <div style={{ fontSize: '0.7rem', color: '#5a7a5a' }}>{s.commune} ({s.cp})</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '3px 8px', fontSize: '0.65rem', border: '1px solid rgba(74,222,128,0.2)' }}>{s.puissance} kWc</span>
                <span style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', padding: '3px 8px', fontSize: '0.65rem', border: '1px solid rgba(251,146,60,0.2)' }}>ROI {s.roi}a</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid #1e2e1e' }} onClick={function(e) { e.stopPropagation(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div style={{ background: '#0a0e0a', padding: '14px', border: '1px solid #1e2e1e' }}>
                    <div style={{ fontSize: '0.65rem', color: '#5a7a5a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Identification</div>
                    {[['SIRET', s.siret], ['Contact', s.contact || 'N/A'], ['Adresse', s.adresse || 'N/A'], ['Commune', s.commune + ' ' + s.cp], ['NAF', s.naf]].map(function(item) {
                      return (
                        <div key={item[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem', borderBottom: '1px solid #1e2e1e' }}>
                          <span style={{ color: '#5a7a5a' }}>{item[0]}</span>
                          <span>{item[1]}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ background: '#0a0e0a', padding: '14px', border: '1px solid #1e2e1e' }}>
                    <div style={{ fontSize: '0.65rem', color: '#5a7a5a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Potentiel AAC</div>
                    {[['Surface', s.surface + ' m2'], ['Puissance', s.puissance + ' kWc'], ['Production/an', s.production.toLocaleString() + ' kWh'], ['Revenus/an', s.revenusAn.toLoc
