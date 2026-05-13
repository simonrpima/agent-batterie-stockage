'use client';
import { useState, useEffect } from "react";

const API_URL ="/api/claude";

const REGIONS = [
  "Île-de-France", "Auvergne-Rhône-Alpes", "Nouvelle-Aquitaine",
  "Occitanie", "Provence-Alpes-Côte d'Azur", "Bretagne",
  "Pays de la Loire", "Grand Est", "Hauts-de-France", "Normandie"
];

const STEPS = [
  { id: "config", label: "1. Configuration", icon: "⚙️" },
  { id: "leads", label: "2. Leads", icon: "👥" },
  { id: "emails", label: "3. Emails IA", icon: "✉️" },
  { id: "export", label: "4. Export Brevo", icon: "🚀" },
];

const statusColors = { "Chaud": "#FF4D4D", "Tiède": "#FF9F43", "Froid": "#74B9FF" };

function Tag({ label, color }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: color + "22", color, border: `1px solid ${color}44`
    }}>{label}</span>
  );
}

function ProgressBar({ value }) {
  return (
    <div style={{ width: "100%", height: 4, background: "#1a1a2e", borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        width: `${value}%`, height: "100%",
        background: "linear-gradient(90deg, #6C63FF, #FF6584)",
        borderRadius: 2, transition: "width 0.8s ease"
      }} />
    </div>
  );
}

export default function AgentComplet() {
  const [step, setStep] = useState("config");
  const [region, setRegion] = useState("Occitanie");
  const [targetType, setTargetType] = useState("les deux");
  const [count, setCount] = useState(5);
  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [emails, setEmails] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [exported, setExported] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState(null);

  const generateLeads = async () => {
    setLoading(true);
    setProgress(0);

    const messages = [
      { msg: "🔍 Analyse du marché...", p: 20 },
      { msg: "📡 Identification des prospects...", p: 50 },
      { msg: "🧠 Scoring IA...", p: 80 },
      { msg: "✅ Enrichissement terminé !", p: 100 },
    ];

    for (const m of messages) {
      setLoadingMsg(m.msg); setProgress(m.p);
      await new Promise(r => setTimeout(r, 600));
    }

    const prompt = `Tu es un agent de génération de leads pour batterie-stockage.fr, spécialiste en batteries de stockage d'énergie solaire.

Génère ${count} leads fictifs mais très réalistes en région ${region}. Mix installateurs RGE et particuliers avec panneaux solaires.

Pour chaque lead :
- nom : nom complet réaliste
- email : email réaliste
- tel : numéro français réaliste (format 0X XX XX XX XX)
- region : "${region}"
- type : "Installateur RGE" ou "Particulier"
- score : 0-100
- statut : "Chaud" (>70), "Tiède" (40-70), "Froid" (<40)
- besoin : 1 phrase décrivant son besoin précis en stockage
- puissance_kw : puissance installation en kW (nombre)

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte ni backticks.`;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "[]";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setLeads(parsed);
      setSelectedLeads(parsed.map((_, i) => i));
      setStep("leads");
    } catch (e) {
      setLoadingMsg(`❌ Erreur: ${e.message}`);
    }
    setLoading(false);
    setLoadingMsg("");
    setProgress(0);
  };

  const generateEmails = async () => {
    setLoading(true);
    setEmails({});
    const selected = leads.filter((_, i) => selectedLeads.includes(i));

    for (let i = 0; i < selected.length; i++) {
      const lead = selected[i];
      setLoadingMsg(`✉️ Rédaction email ${i + 1}/${selected.length} — ${lead.nom}...`);
      setProgress(Math.round(((i + 1) / selected.length) * 100));

      const toneMap = {
        "Chaud": "commercial et direct, avec une offre concrète et un appel à l'action fort",
        "Tiède": "éducatif et bienveillant, avec des arguments techniques et un cas client",
        "Froid": "de sensibilisation douce, sans pression, axé sur les économies long terme"
      };

      const prompt = `Tu es un expert en vente de batteries de stockage pour batterie-stockage.fr.

Rédige un email de prospection personnalisé pour ce lead :
- Nom : ${lead.nom}
- Type : ${lead.type}
- Région : ${lead.region}
- Besoin : ${lead.besoin}
- Installation : ${lead.puissance_kw} kW
- Statut : ${lead.statut}

Ton email doit être ${toneMap[lead.statut]}.
L'email doit mentionner batterie-stockage.fr et être signé par "L'équipe batterie-stockage.fr".

Réponds avec un JSON : {"sujet": "...", "corps": "..."}
Sans texte ni backticks autour.`;

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || "{}";
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        setEmails(prev => ({ ...prev, [lead.email]: parsed }));
      } catch (e) {
        setEmails(prev => ({ ...prev, [lead.email]: { sujet: "Erreur", corps: e.message } }));
      }
    }

    setLoading(false);
    setLoadingMsg("");
    setProgress(0);
    setStep("emails");
  };

  const exportCSV = () => {
    const selected = leads.filter((_, i) => selectedLeads.includes(i));
    const rows = [
      "EMAIL,PRENOM,NOM,REGION,TYPE,SCORE,STATUT,BESOIN,SUJET_EMAIL,CORPS_EMAIL",
      ...selected.map(l => {
        const parts = l.nom.split(" ");
        const prenom = parts[0] || "";
        const nom = parts.slice(1).join(" ") || l.nom;
        const email = emails[l.email] || {};
        const sujet = (email.sujet || "").replace(/"/g, "'");
        const corps = (email.corps || "").replace(/"/g, "'").replace(/\n/g, " ");
        return `${l.email},${prenom},${nom},${l.region},${l.type},${l.score},${l.statut},"${l.besoin}","${sujet}","${corps}"`;
      })
    ].join("\n");

    const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campagne_batterie_stockage_${region.replace(/\s/g, "_")}.csv`;
    a.click();
    setExported(true);
    setStep("export");
  };

  const toggleLead = (i) => {
    setSelectedLeads(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  };

  const stepIndex = STEPS.findIndex(s => s.id === step);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07070F",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      color: "#E8E8F0",
      padding: "32px 28px",
      maxWidth: 900,
      margin: "0 auto"
    }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#6C63FF", boxShadow: "0 0 10px #6C63FF",
            animation: "blink 2s infinite"
          }} />
          <span style={{ fontSize: 10, color: "#6C63FF", letterSpacing: 4, textTransform: "uppercase" }}>
            Système actif · batterie-stockage.fr
          </span>
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: -1,
          background: "linear-gradient(135deg, #fff 30%, #6C63FF 70%, #FF6584)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>
          Agent Prospection IA
        </h1>
        <p style={{ color: "#444", fontSize: 12, margin: "6px 0 0" }}>
          Génération de leads · Emails personnalisés · Export Brevo
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 0, marginBottom: 36, position: "relative" }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: i <= stepIndex ? "linear-gradient(135deg, #6C63FF, #FF6584)" : "#111",
              border: i === stepIndex ? "2px solid #6C63FF" : "2px solid #222",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, marginBottom: 8,
              boxShadow: i === stepIndex ? "0 0 20px #6C63FF55" : "none",
              transition: "all 0.4s"
            }}>
              {i < stepIndex ? "✓" : s.icon}
            </div>
            <span style={{
              fontSize: 10, color: i <= stepIndex ? "#E8E8F0" : "#333",
              textAlign: "center", letterSpacing: 0.5
            }}>{s.label}</span>
            {i < STEPS.length - 1 && (
              <div style={{
                position: "absolute",
                left: `${(i + 1) * 25}%`, top: 17,
                width: "25%", height: 2,
                background: i < stepIndex ? "#6C63FF" : "#1a1a2e",
                transform: "translateX(-50%)",
                transition: "background 0.4s"
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{
          background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.2)",
          borderRadius: 12, padding: 20, marginBottom: 24
        }}>
          <div style={{ fontSize: 13, color: "#6C63FF", marginBottom: 12 }}>{loadingMsg}</div>
          <ProgressBar value={progress} />
          <div style={{ fontSize: 11, color: "#444", marginTop: 8, textAlign: "right" }}>{progress}%</div>
        </div>
      )}

      {/* STEP 1 — Config */}
      {step === "config" && !loading && (
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e",
          borderRadius: 16, padding: 28
        }}>
          <h2 style={{ fontSize: 14, color: "#666", letterSpacing: 3, textTransform: "uppercase", marginBottom: 24 }}>
            Configuration
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, color: "#444", letterSpacing: 2, display: "block", marginBottom: 8 }}>
                RÉGION CIBLE
              </label>
              <select value={region} onChange={e => setRegion(e.target.value)} style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1px solid #1a1a2e", background: "#0d0d1a",
                color: "#fff", fontSize: 13, fontFamily: "inherit"
              }}>
                {REGIONS.map(r => <option key={r} value={r} style={{ background: "#0d0d1a" }}>{r}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: "#444", letterSpacing: 2, display: "block", marginBottom: 8 }}>
                NOMBRE DE LEADS · <span style={{ color: "#6C63FF" }}>{count}</span>
              </label>
              <input type="range" min={3} max={15} value={count}
                onChange={e => setCount(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#6C63FF", marginTop: 8 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#333", marginTop: 4 }}>
                <span>3</span><span>15</span>
              </div>
            </div>
          </div>

          <div style={{
            background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)",
            borderRadius: 10, padding: 16, marginBottom: 24, fontSize: 12, color: "#777"
          }}>
            💡 L'agent va générer des leads <strong style={{ color: "#aaa" }}>installateurs RGE</strong> et <strong style={{ color: "#aaa" }}>particuliers solaires</strong> puis rédiger un email personnalisé pour chacun selon son profil.
          </div>

          <button onClick={generateLeads} style={{
            width: "100%", padding: "14px", borderRadius: 10,
            background: "linear-gradient(135deg, #6C63FF, #FF6584)",
            border: "none", color: "#fff", fontWeight: 800,
            fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            letterSpacing: 1, boxShadow: "0 4px 20px rgba(108,99,255,0.3)"
          }}>
            ▶ Lancer la génération
          </button>
        </div>
      )}

      {/* STEP 2 — Leads */}
      {step === "leads" && !loading && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 14, color: "#666", letterSpacing: 3, textTransform: "uppercase", margin: 0 }}>
                Leads générés
              </h2>
              <p style={{ fontSize: 12, color: "#444", margin: "4px 0 0" }}>
                {selectedLeads.length}/{leads.length} sélectionnés
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("config")} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid #222",
                background: "transparent", color: "#555", fontSize: 12,
                cursor: "pointer", fontFamily: "inherit"
              }}>← Retour</button>
              <button onClick={generateEmails} disabled={selectedLeads.length === 0} style={{
                padding: "8px 20px", borderRadius: 8, border: "none",
                background: selectedLeads.length > 0 ? "linear-gradient(135deg, #6C63FF, #FF6584)" : "#222",
                color: selectedLeads.length > 0 ? "#fff" : "#444",
                fontSize: 12, cursor: selectedLeads.length > 0 ? "pointer" : "not-allowed",
                fontFamily: "inherit", fontWeight: 700
              }}>
                Générer les emails →
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {leads.map((lead, i) => (
              <div key={i} onClick={() => toggleLead(i)} style={{
                background: selectedLeads.includes(i) ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${selectedLeads.includes(i) ? "rgba(108,99,255,0.3)" : "#1a1a2e"}`,
                borderRadius: 10, padding: "14px 18px",
                display: "grid", gridTemplateColumns: "24px 1fr 1fr auto",
                alignItems: "center", gap: 14, cursor: "pointer",
                transition: "all 0.2s"
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: `2px solid ${selectedLeads.includes(i) ? "#6C63FF" : "#333"}`,
                  background: selectedLeads.includes(i) ? "#6C63FF" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "#fff", flexShrink: 0
                }}>
                  {selectedLeads.includes(i) ? "✓" : ""}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{lead.nom}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{lead.type} · {lead.puissance_kw} kW</div>
                </div>
                <div style={{ fontSize: 11, color: "#555" }}>
                  <div>{lead.email}</div>
                  <div style={{ marginTop: 2 }}>{lead.tel}</div>
                </div>
                <Tag label={lead.statut} color={statusColors[lead.statut]} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3 — Emails */}
      {step === "emails" && !loading && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 14, color: "#666", letterSpacing: 3, textTransform: "uppercase", margin: 0 }}>
                Emails personnalisés
              </h2>
              <p style={{ fontSize: 12, color: "#444", margin: "4px 0 0" }}>
                {Object.keys(emails).length} emails rédigés par l'IA
              </p>
            </div>
            <button onClick={exportCSV} style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #00C896, #00A878)",
              color: "#fff", fontSize: 13, cursor: "pointer",
              fontFamily: "inherit", fontWeight: 800, letterSpacing: 1
            }}>
              ⬇ Exporter CSV Brevo
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leads.filter((_, i) => selectedLeads.includes(i)).map((lead, i) => {
              const email = emails[lead.email];
              const isOpen = expandedEmail === lead.email;
              return (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e",
                  borderRadius: 10, overflow: "hidden"
                }}>
                  <div onClick={() => setExpandedEmail(isOpen ? null : lead.email)} style={{
                    padding: "14px 18px", display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center", gap: 14, cursor: "pointer"
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{lead.nom}</div>
                      {email && <div style={{ fontSize: 11, color: "#6C63FF", marginTop: 2 }}>
                        📧 {email.sujet}
                      </div>}
                      {!email && <div style={{ fontSize: 11, color: "#444" }}>⏳ En cours...</div>}
                    </div>
                    <Tag label={lead.statut} color={statusColors[lead.statut]} />
                    <span style={{ color: "#444", fontSize: 16 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>

                  {isOpen && email && (
                    <div style={{
                      padding: "0 18px 18px",
                      borderTop: "1px solid #1a1a2e"
                    }}>
                      <div style={{
                        background: "#0d0d1a", borderRadius: 8, padding: 16, marginTop: 14
                      }}>
                        <div style={{ fontSize: 11, color: "#444", marginBottom: 8 }}>
                          De : contact@batterie-stockage.fr<br />
                          À : {lead.email}<br />
                          Objet : <span style={{ color: "#6C63FF" }}>{email.sujet}</span>
                        </div>
                        <div style={{
                          fontSize: 12, color: "#aaa", lineHeight: 1.8,
                          whiteSpace: "pre-wrap", borderTop: "1px solid #1a1a2e", paddingTop: 12
                        }}>
                          {email.corps}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4 — Export */}
      {step === "export" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>Campagne prête !</h2>
            <p style={{ color: "#555", fontSize: 12 }}>{selectedLeads.length} leads · emails personnalisés inclus</p>
          </div>

          <div style={{
            background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)",
            borderRadius: 10, padding: 16, fontSize: 12, color: "#666", lineHeight: 2, marginBottom: 20
          }}>
            <strong style={{ color: "#aaa", display: "block", marginBottom: 6 }}>Comment importer dans Brevo :</strong>
            1. Copie tout le contenu CSV ci-dessous (bouton Copier)<br />
            2. Ouvre Notepad ou TextEdit, colle, sauvegarde en .csv<br />
            3. app.brevo.com → Contacts → Importer → upload le fichier<br />
            4. Mappe EMAIL, PRENOM, NOM, STATUT<br />
            5. Lance ta campagne par segment 🚀
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "#444", letterSpacing: 2 }}>CONTENU CSV</span>
              <button onClick={() => {
                navigator.clipboard.writeText(csvContent).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }} style={{
                padding: "6px 16px", borderRadius: 6,
                background: copied ? "rgba(0,200,150,0.15)" : "rgba(108,99,255,0.15)",
                border: "1px solid " + (copied ? "#00C896" : "#6C63FF"),
                color: copied ? "#00C896" : "#6C63FF",
                fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700
              }}>
                {copied ? "✓ Copié !" : "📋 Copier"}
              </button>
            </div>
            <textarea readOnly value={csvContent} style={{
              width: "100%", height: 200, background: "#0d0d1a",
              border: "1px solid #1a1a2e", borderRadius: 8, padding: 14,
              color: "#555", fontSize: 10, fontFamily: "inherit",
              lineHeight: 1.6, resize: "vertical", boxSizing: "border-box"
            }} />
          </div>

          <button onClick={() => { setStep("config"); setLeads([]); setEmails({}); setExported(false); setCsvContent(""); }} style={{
            padding: "10px 24px", borderRadius: 8, border: "1px solid #222",
            background: "transparent", color: "#555", fontSize: 12,
            cursor: "pointer", fontFamily: "inherit"
          }}>
            ↺ Nouvelle campagne
          </button>
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
        }
        select, input { outline: none; }
      `}</style>
    </div>
  );
}

