import React, { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from '../styles/Cad.module.css';

const CADViewer = dynamic(() => import('../components/CADViewer'), { ssr: false });

const PART_CATALOG = [
  { id: 'mecanum-drivetrain', label: 'Mecanum Drivetrain', category: 'Assemblies', icon: '◈' },
  { id: 'channel-480', label: 'goBILDA Channel 480mm', category: 'Structural', icon: '▬' },
  { id: 'channel-320', label: 'goBILDA Channel 320mm', category: 'Structural', icon: '▬' },
  { id: 'channel-240', label: 'goBILDA Channel 240mm', category: 'Structural', icon: '▬' },
  { id: 'mecanum-wheel', label: 'Mecanum Wheel 100mm', category: 'Drive', icon: '○' },
  { id: 'omni-wheel', label: 'Omni Wheel 90mm', category: 'Drive', icon: '○' },
  { id: 'hd-hex-motor', label: 'REV HD Hex Motor', category: 'Actuators', icon: '⚙' },
  { id: 'motor-mount', label: 'Motor Mount Bracket', category: 'Structural', icon: '▣' },
  { id: 'servo', label: 'Servo (Standard)', category: 'Actuators', icon: '⚙' },
  { id: 'servo-bracket', label: 'Servo Bracket', category: 'Structural', icon: '▣' },
  { id: 'bearing-block', label: 'Bearing Block', category: 'Mechanical', icon: '◎' },
  { id: 'chain-sprocket', label: 'Chain Sprocket #25', category: 'Mechanical', icon: '◎' },
  { id: 'linear-slide', label: 'Linear Slide 2-Stage', category: 'Motion', icon: '⟺' },
  { id: 'control-hub', label: 'REV Control Hub', category: 'Electronics', icon: '▦' },
  { id: 'axle-120', label: 'Hex Axle 120mm', category: 'Mechanical', icon: '|' },
  { id: 'standoff-30', label: 'Standoff 30mm', category: 'Mechanical', icon: '|' },
];

const EXAMPLES = [
  'Mecanum drivetrain with 4 motors and wheels',
  'REV HD Hex motor mount bracket with M3 holes',
  'Linear slide 2-stage 300mm extension',
  'Dual servo claw mechanism',
  'Odometry pod with bearing and encoder mount',
];

const TOOLBAR = [
  { id: 'select', label: 'Select', icon: '↖', group: 'tool' },
  { id: 'sep1', group: 'sep' },
  { id: 'front', label: 'Front', icon: 'F', group: 'view' },
  { id: 'top', label: 'Top', icon: 'T', group: 'view' },
  { id: 'right', label: 'Right', icon: 'R', group: 'view' },
  { id: 'iso', label: 'Isometric', icon: '⬡', group: 'view' },
  { id: 'fit', label: 'Fit All', icon: '⊞', group: 'view' },
  { id: 'sep2', group: 'sep' },
  { id: 'ortho', label: 'Ortho / Persp', icon: '⊡', group: 'proj' },
  { id: 'sep3', group: 'sep' },
  { id: 'stl', label: 'Export STL', icon: '↓', group: 'export' },
];

export default function Cad() {
  const cadRef = useRef(null);
  const [geometry, setGeometry] = useState(null);
  const [assemblyId, setAssemblyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [activeTab, setSideTab] = useState('parts');
  const [partsList, setPartsList] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [modelName, setModelName] = useState('');
  const [isOrtho, setIsOrtho] = useState(false);
  const [activeTool, setActiveTool] = useState('select');

  const handleGenerate = useCallback(async (e) => {
    e?.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    setGeometry(null);
    setAssemblyId(null);
    setPartsList([]);
    setModelName('Generating…');
    try {
      const res = await fetch('/api/cad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Generation failed');
        setModelName('');
      } else if (data.useLibrary) {
        setAssemblyId(data.assemblyId);
        setModelName(data.assemblyId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      } else {
        setGeometry(data.geometry);
        setModelName(data.geometry?.name || 'Generated Part');
      }
    } catch {
      setError('Network error. Please try again.');
      setModelName('');
    } finally {
      setLoading(false);
    }
  }, [description]);

  const handleLoadPart = useCallback((partId) => {
    setGeometry(null);
    setAssemblyId(partId);
    setModelName(PART_CATALOG.find(p => p.id === partId)?.label || partId);
    setPartsList([]);
    setSideTab('parts');
    setError('');
  }, []);

  const handleToolbar = useCallback((toolId) => {
    if (toolId === 'select') { setActiveTool('select'); return; }
    if (!cadRef.current) return;
    switch (toolId) {
      case 'front': cadRef.current.setView('front'); break;
      case 'top':   cadRef.current.setView('top');   break;
      case 'right': cadRef.current.setView('right'); break;
      case 'iso':   cadRef.current.setView('iso');   break;
      case 'fit':   cadRef.current.fitAll();          break;
      case 'ortho': setIsOrtho(cadRef.current.toggleOrtho()); break;
      case 'stl': {
        const stl = cadRef.current.exportSTL?.();
        if (stl) {
          const blob = new Blob([stl], { type: 'application/sla' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${(modelName || 'part').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.stl`;
          a.click();
          URL.revokeObjectURL(url);
        }
        break;
      }
      default: break;
    }
  }, [modelName]);

  const catalogByCategory = PART_CATALOG.reduce((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  return (
    <div className={styles.workspace}>

      {/* ── Menu Bar ─────────────────────────────────────────────── */}
      <div className={styles.menuBar}>
        <Link href="/" className={styles.menuLogo}>
          <span className={styles.menuLogoIcon}>◈</span>
          <span className={styles.menuLogoText}>Orbx FTC CAD</span>
        </Link>
        <div className={styles.menuSep} />
        {['File', 'Edit', 'View', 'Sketch', 'Features', 'Tools'].map(m => (
          <button key={m} className={styles.menuItem}>{m}</button>
        ))}
        <div className={styles.menuFlex} />
        <Link href="/chat" className={styles.menuNav}>Chat</Link>
        <Link href="/forum" className={styles.menuNav}>Forum</Link>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        {TOOLBAR.map(t =>
          t.group === 'sep'
            ? <div key={t.id} className={styles.toolSep} />
            : (
              <button
                key={t.id}
                title={t.label}
                onClick={() => handleToolbar(t.id)}
                className={`${styles.toolBtn} ${
                  (t.id === 'ortho' && isOrtho) || (t.group === 'tool' && activeTool === t.id)
                    ? styles.toolBtnActive : ''
                }`}
              >
                {t.icon}
              </button>
            )
        )}
      </div>

      {/* ── Work area ────────────────────────────────────────────── */}
      <div className={styles.workArea}>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTabs}>
            {[
              { id: 'parts', label: 'Parts' },
              { id: 'library', label: 'Library' },
              { id: 'ai', label: 'AI' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setSideTab(t.id)}
                className={`${styles.sideTab} ${activeTab === t.id ? styles.sideTabActive : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className={styles.sidebarBody}>

            {/* Parts tree */}
            {activeTab === 'parts' && (
              <div className={styles.featureTree}>
                <div className={styles.treeRoot}>
                  <span className={styles.treeIcon}>▼</span>
                  <span className={styles.treeName}>{modelName || 'No model loaded'}</span>
                </div>
                {partsList.length > 0 ? (
                  <div className={styles.treeChildren}>
                    {partsList.map((name, i) => (
                      <div
                        key={i}
                        className={`${styles.treePart} ${selectedPart === name ? styles.treePartSelected : ''}`}
                        onClick={() => setSelectedPart(name)}
                      >
                        <span className={styles.treePartIcon}>■</span>
                        <span className={styles.treePartName}>{name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.treeEmpty}>
                    {modelName ? 'Loading parts…' : 'Load or generate a model'}
                  </div>
                )}
              </div>
            )}

            {/* Library */}
            {activeTab === 'library' && (
              <div className={styles.libraryList}>
                {Object.entries(catalogByCategory).map(([cat, parts]) => (
                  <div key={cat}>
                    <div className={styles.libCategory}>{cat}</div>
                    {parts.map(p => (
                      <button
                        key={p.id}
                        className={`${styles.libPart} ${assemblyId === p.id ? styles.libPartActive : ''}`}
                        onClick={() => handleLoadPart(p.id)}
                      >
                        <span className={styles.libPartIcon}>{p.icon}</span>
                        <span className={styles.libPartLabel}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* AI Generator */}
            {activeTab === 'ai' && (
              <div className={styles.aiPanel}>
                <p className={styles.aiTitle}>AI Part Generator</p>
                <p className={styles.aiSub}>Describe any FTC part or assembly</p>
                <form onSubmit={handleGenerate}>
                  <textarea
                    className={styles.aiTextarea}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g., A mecanum drivetrain with 4 motors…"
                    rows={5}
                    maxLength={2000}
                    disabled={loading}
                  />
                  <div className={styles.aiCharCount}>{description.length}/2000</div>
                  <button
                    type="submit"
                    className={styles.aiGenerateBtn}
                    disabled={loading || !description.trim()}
                  >
                    {loading ? '⏳ Generating…' : '▶ Generate'}
                  </button>
                </form>
                <div className={styles.aiExamples}>
                  <p className={styles.aiExamplesTitle}>Examples:</p>
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      className={styles.aiExampleBtn}
                      onClick={() => setDescription(ex)}
                      disabled={loading}
                    >
                      {ex.slice(0, 52)}{ex.length > 52 ? '…' : ''}
                    </button>
                  ))}
                </div>
                {error && <div className={styles.aiError}>{error}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Viewport */}
        <div className={styles.viewport}>
          {(geometry || assemblyId) ? (
            <CADViewer
              ref={cadRef}
              geometry={geometry}
              assemblyId={assemblyId}
              showHoles
              onPartsChange={setPartsList}
              onSelect={setSelectedPart}
            />
          ) : (
            <div className={styles.viewportEmpty}>
              <div className={styles.viewportEmptyInner}>
                <div className={styles.viewportEmptyIcon}>◈</div>
                <p>No model loaded</p>
                <p className={styles.viewportEmptySub}>
                  Use the <strong>Library</strong> tab to load an FTC part,
                  or the <strong>AI</strong> tab to generate one.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────── */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomTabs}>
          <button className={`${styles.bottomTab} ${styles.bottomTabActive}`}>Part Studio 1</button>
          <button className={styles.bottomTab}>Assembly 1</button>
          <button className={styles.bottomTabAdd}>+</button>
        </div>
        <div className={styles.bottomStatus}>
          {selectedPart && <span className={styles.statusPart}>● {selectedPart}</span>}
          <span className={styles.statusSep} />
          <span className={styles.statusUnit}>mm</span>
        </div>
      </div>
    </div>
  );
}
