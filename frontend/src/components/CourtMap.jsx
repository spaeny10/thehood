import { useState, useEffect } from 'react';
import { X, Save, Search, ArrowLeft } from 'lucide-react';
import { lotsApi } from '../services/api';

const CourtMap = ({ onNavigate }) => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLot, setEditingLot] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadLots(); }, []);

  const loadLots = async () => {
    try {
      setLoading(true);
      const res = await lotsApi.getAll();
      setLots(res.data);
    } catch (err) { console.error('Error loading lots:', err); }
    finally { setLoading(false); }
  };

  const getLot = (num) => lots.find(l => l.lot_number === num);

  const openEdit = (lot) => {
    setEditForm({ owner_name: lot.owner_name, owner_name2: lot.owner_name2, status: lot.status, notes: lot.notes });
    setEditingLot(lot);
  };

  const handleSave = async () => {
    if (!editingLot) return;
    try {
      setSaving(true);
      const res = await lotsApi.update(editingLot.id, editForm);
      setLots(prev => prev.map(l => l.id === editingLot.id ? res.data : l));
      setEditingLot(null);
    } catch (err) { console.error('Error saving lot:', err); }
    finally { setSaving(false); }
  };

  const matchesSearch = (lot) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return lot.owner_name.toLowerCase().includes(q) || lot.owner_name2.toLowerCase().includes(q) ||
      String(lot.lot_number).includes(q) || lot.street.toLowerCase().includes(q);
  };

  /* ─── Lot cell ─── */
  const Lot = ({ num, flip = false, style = {} }) => {
    const lot = getLot(num);
    if (!lot) return <div className="lot-cell" style={style} />;
    const highlight = matchesSearch(lot);
    const isSale = lot.status === 'for_sale';
    const isVacant = lot.status === 'vacant';
    return (
      <button
        onClick={() => openEdit(lot)}
        className="lot-cell"
        style={{
          opacity: highlight ? 1 : 0.3,
          background: isSale ? 'rgba(245,158,11,0.08)' : isVacant ? 'rgba(100,116,139,0.06)' : 'transparent',
          ...style,
        }}
      >
        {flip ? (
          <>
            <span className="lot-owner">{lot.owner_name || '—'}</span>
            {lot.owner_name2 && <span className="lot-owner2">{lot.owner_name2}</span>}
            <span className="lot-num">{num}</span>
          </>
        ) : (
          <>
            <span className="lot-num">{num}</span>
            <span className="lot-owner">{lot.owner_name || '—'}</span>
            {lot.owner_name2 && <span className="lot-owner2">{lot.owner_name2}</span>}
          </>
        )}
        {isSale && <span className="lot-sale">FOR SALE</span>}
      </button>
    );
  };

  /* ─── Vertical street label ─── */
  const VLabel = ({ children }) => (
    <div className="vlabel"><span>{children}</span></div>
  );

  if (loading) {
    return <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-amber-400 animate-pulse text-sm">Loading court map…</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="border-b border-dark-border/50 bg-dark-bg sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-[1100px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => onNavigate('dashboard')} className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Court Map</h1>
                <p className="text-xs text-slate-500">Kanopolanes Park at Lake Kanopolis, Kansas</p>
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search owner or lot…"
                className="pl-9 pr-3 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 w-56" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-6">
        <div className="court-map">
          {/* ═══════ TITLE ═══════ */}
          <div className="map-title">
            <h2>COURT MAP</h2>
            <p>Kanopolanes Park at Lake Kanopolis, Kansas</p>
          </div>

          {/* ═══════ TOP ROW — Keystone Court north lots + dumpster/compass ═══════ */}
          <div className="top-section">
            <div className="top-info-left" />
            <div className="top-row-lots">
              <Lot num={63} flip />
              <Lot num={62} flip />
              <Lot num={61} flip />
              <Lot num={60} flip />
              <Lot num={59} flip />
            </div>
            <div className="top-info-right">
              <span className="compass">→ N</span>
              <div className="speed-box">Vehicle Speed Limit<br /><strong>5 mph</strong></div>
            </div>
          </div>

          {/* Lot numbers row */}
          <div className="top-section" style={{ marginTop: 0 }}>
            <div className="top-info-left">
              <span className="dumpster-tag">D</span>
            </div>
            <div className="num-row">
              <span>63</span><span>62</span><span>61</span><span>60</span><span>59</span>
            </div>
            <div className="top-info-right" />
          </div>

          {/* ═══════ KEYSTONE COURT label ═══════ */}
          <div className="street-label-h">KEYSTONE COURT</div>

          {/* ═══════ NORTH GRID — Coors Court / Center / Budweiser Blvd ═══════ */}
          <div className="north-grid">
            {/* Left info column — Emergency numbers */}
            <div className="north-info-left">
              <div className="emergency-box">
                <h4>EMERGENCY NUMBERS</h4>
                <p className="e911">911</p>
                <p>Law Enforcement<br />Ambulance<br />Fire</p>
                <p className="esmall">(785) 472-4416<br />Ellsworth County Sheriff<br />(non-emergency)</p>
                <p className="esmall">(866) 357-4212<br />Ark Valley Electric</p>
                <p className="esmall">(785) 546-2294<br />Corps of Engineers – Kanopolis</p>
                <p className="esmall">(785) 546-2345<br />KDWP – Kanopolis State Park</p>
              </div>
              <p className="dumpster-key"><span className="dumpster-tag">D</span> Dumpster locations</p>
              <p className="updated-text">Updated: 11/26/2025</p>
            </div>

            {/* Coors Court west column */}
            <VLabel>COORS COURT</VLabel>
            <div className="lot-col">
              {[46, 45, 44, 43, 42, 41].map(n => <Lot key={n} num={n} />)}
            </div>

            {/* Center lots */}
            <div className="lot-col">
              {[52, 51, 50, 49, 48, 47].map(n => <Lot key={n} num={n} />)}
            </div>

            {/* Budweiser Blvd */}
            <VLabel>BUDWEISER BLVD</VLabel>
            <div className="lot-col">
              {[58, 57, 56, 55, 54, 53].map(n => <Lot key={n} num={n} />)}
            </div>

            {/* Right dumpster marker */}
            <div className="north-info-right">
              <span className="dumpster-tag">D</span>
            </div>
          </div>

          {/* ═══════ RAILROAD AVENUE ═══════ */}
          <div className="street-label-h railroad">RAILROAD AVENUE</div>

          {/* ═══════ SOUTH GRID ═══════ */}
          <div className="south-grid">
            <VLabel>SCOTCH STREET</VLabel>
            <div className="south-lots-area">
              {[
                [36, 37, 38, 39, 40],
                [31, 32, 33, 34, 35],
                [26, 27, 28, 29, 30],
                [21, 22, 23, 24, 25],
                [16, 17, 18, 19, 20],
                [11, 12, 13, 14, 15],
                [6, 7, 8, 9, 10],
                [1, 2, 3, 4, 5],
              ].map((row, i) => (
                <div key={i} className="south-row">
                  <Lot num={row[0]} />
                  <Lot num={row[1]} />
                  <div className="row-gap" />
                  <Lot num={row[2]} />
                  <Lot num={row[3]} />
                  <div className="row-gap" />
                  <Lot num={row[4]} />
                </div>
              ))}
              {/* Dumpster markers at bottom */}
              <div className="south-row dumpster-row">
                <span className="dumpster-tag" style={{ gridColumn: '1' }}>D</span>
                <span className="dumpster-tag" style={{ gridColumn: '7' }}>D</span>
              </div>
            </div>
            <VLabel>VODKA STREET</VLabel>
            <div style={{ width: '8px' }} />
            <VLabel>BOURBON STREET</VLabel>
          </div>

          {/* ═══════ 29TH ROAD ═══════ */}
          <div className="street-label-h">29TH ROAD</div>

          {/* ═══════ FOOTER NOTE ═══════ */}
          <div className="map-footer-note">
            <p><strong>FIREWORKS ARE NOT ALLOWED IN THE PARK DUE TO ALL THE PROPANE TANKS.</strong></p>
            <p><em>Please take time to read the rules for the court.</em></p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 py-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-slate-500" />
            <span className="text-[10px] text-slate-500">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-amber-500/60 bg-amber-500/10" />
            <span className="text-[10px] text-slate-500">For Sale</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-slate-600/40 bg-slate-800/30" />
            <span className="text-[10px] text-slate-500">Vacant</span>
          </div>
          <span className="text-[10px] text-slate-600 italic">Click any lot to edit</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border/30 mt-8">
        <div className="max-w-[1100px] mx-auto px-6 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <nav className="flex items-center gap-6">
              <span className="text-sm font-semibold text-white">Kanopolanes</span>
              <button onClick={() => onNavigate('dashboard')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">Dashboard</button>
              <button className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">Court Map</button>
              <button onClick={() => onNavigate('admin')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">Settings</button>
            </nav>
            <p className="text-xs text-slate-600">Ambient Weather • USGS Water Data • Open-Meteo Forecast</p>
          </div>
        </div>
      </footer>

      {/* ═══ EDIT MODAL ═══ */}
      {editingLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingLot(null)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-dark-border/50">
              <div>
                <h3 className="text-base font-bold text-white">Lot {editingLot.lot_number}</h3>
                <p className="text-xs text-slate-500">{editingLot.street}</p>
              </div>
              <button onClick={() => setEditingLot(null)} className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Owner Name</label>
                <input type="text" value={editForm.owner_name} onChange={e => setEditForm({ ...editForm, owner_name: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" placeholder="Last name" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Owner Name (continued)</label>
                <input type="text" value={editForm.owner_name2} onChange={e => setEditForm({ ...editForm, owner_name2: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" placeholder="First name(s)" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50">
                  <option value="occupied">Occupied</option>
                  <option value="for_sale">For Sale</option>
                  <option value="vacant">Vacant</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Notes</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none" rows={3} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-dark-border/50">
              <button onClick={() => setEditingLot(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-amber-400 text-sm font-medium transition-all">
                <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SCOPED STYLES ═══ */}
      <style>{`
        .court-map {
          background: #15151f;
          border: 2px solid #2a2a3a;
          border-radius: 12px;
          padding: 24px;
          font-family: 'Inter', system-ui, sans-serif;
          max-width: 900px;
          margin: 0 auto;
        }

        /* ── Title ── */
        .map-title {
          text-align: center;
          margin-bottom: 18px;
        }
        .map-title h2 {
          font-size: 16px;
          font-weight: 800;
          color: #fff;
          letter-spacing: 0.12em;
          margin: 0;
        }
        .map-title p {
          font-size: 11px;
          color: #94a3b8;
          margin: 2px 0 0;
        }

        /* ── Lot cell ── */
        .lot-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid #444466;
          background: #1c1c2e;
          padding: 5px 6px;
          min-height: 56px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
          width: 100%;
          border-radius: 3px;
        }
        .lot-cell:hover {
          border-color: #f59e0b;
          background: rgba(245,158,11,0.06) !important;
        }
        .lot-num {
          font-size: 13px;
          font-weight: 800;
          color: #f59e0b;
          line-height: 1;
        }
        .lot-owner {
          font-size: 11px;
          font-weight: 600;
          color: #e2e8f0;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .lot-owner2 {
          font-size: 10px;
          color: #94a3b8;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .lot-sale {
          font-size: 8px;
          font-weight: 700;
          color: #f59e0b;
          letter-spacing: 0.05em;
          margin-top: 1px;
        }

        /* ── Top section (lots 63-59) ── */
        .top-section {
          display: grid;
          grid-template-columns: 160px 1fr 140px;
          gap: 8px;
          align-items: end;
          margin-bottom: 2px;
        }
        .top-row-lots {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
        }
        .top-row-lots .lot-cell {
          border-bottom: 2px solid #3a3a4a;
        }
        .top-info-left {
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 4px;
        }
        .top-info-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          padding: 4px;
        }
        .compass {
          font-size: 14px;
          font-weight: 700;
          color: #e2e8f0;
        }
        .speed-box {
          font-size: 9px;
          color: #94a3b8;
          border: 1px solid #3a3a4a;
          padding: 4px 8px;
          text-align: center;
          line-height: 1.3;
        }
        .speed-box strong {
          font-size: 14px;
          color: #fff;
        }
        .num-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          padding: 2px 0;
          border-bottom: 2px solid #f59e0b44;
        }

        /* ── Street label (horizontal) ── */
        .street-label-h {
          text-align: center;
          font-size: 11px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.2em;
          padding: 8px 0;
          border-top: 1px solid #2a2a3a;
          border-bottom: 1px solid #2a2a3a;
          margin: 4px 0;
        }
        .street-label-h.railroad {
          background: rgba(245,158,11,0.06);
          border-color: #f59e0b33;
          color: #f59e0b;
        }

        /* ── Vertical label ── */
        .vlabel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 2px;
        }
        .vlabel span {
          writing-mode: vertical-lr;
          transform: rotate(180deg);
          font-size: 9px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.15em;
          white-space: nowrap;
        }

        /* ── North grid (Coors / Center / Budweiser) ── */
        .north-grid {
          display: grid;
          grid-template-columns: 160px auto 1fr 1fr auto 1fr auto;
          gap: 0;
          align-items: start;
        }
        .north-info-left {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .north-info-right {
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
        }

        /* ── Emergency box ── */
        .emergency-box {
          border: 1px solid #3a3a4a;
          padding: 10px;
          font-size: 9px;
          color: #94a3b8;
          line-height: 1.4;
        }
        .emergency-box h4 {
          font-size: 9px;
          font-weight: 800;
          color: #e2e8f0;
          margin: 0 0 4px;
          letter-spacing: 0.05em;
        }
        .emergency-box .e911 {
          font-size: 22px;
          font-weight: 900;
          color: #ef4444;
          margin: 2px 0;
        }
        .emergency-box .esmall {
          margin-top: 4px;
          font-size: 8px;
          color: #64748b;
        }
        .dumpster-key {
          font-size: 9px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .updated-text {
          font-size: 8px;
          color: #475569;
          font-style: italic;
        }

        /* ── Lot column ── */
        .lot-col {
          display: flex;
          flex-direction: column;
        }

        /* ── Dumpster tag ── */
        .dumpster-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border: 1px solid #3a3a4a;
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          background: #1a1a28;
        }

        /* ── South grid ── */
        .south-grid {
          margin-top: 4px;
          display: grid;
          grid-template-columns: auto 1fr auto 8px auto;
          gap: 0;
          align-items: stretch;
        }
        .south-lots-area {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .south-row {
          display: grid;
          grid-template-columns: 1fr 1fr 14px 1fr 1fr 14px 1fr;
          gap: 2px;
        }
        .row-gap {
          background: transparent;
          width: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .row-gap::after {
          content: '';
          width: 2px;
          height: 100%;
          background: #2a2a3a;
        }
        .dumpster-row {
          display: grid;
          grid-template-columns: 1fr 1fr 14px 1fr 1fr 14px 1fr;
          padding: 6px 0;
          align-items: center;
        }

        /* ── Map footer note ── */
        .map-footer-note {
          text-align: center;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #2a2a3a;
        }
        .map-footer-note p {
          font-size: 10px;
          color: #94a3b8;
          margin: 2px 0;
        }
        .map-footer-note strong {
          color: #ef4444;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
};

export default CourtMap;
