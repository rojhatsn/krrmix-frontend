"use client";

import React, { useState, useEffect, useRef } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const COLORS = [
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#ef4444", // Red
  "#14b8a6"  // Teal
];

export default function Home() {
  const [allPops, setAllPops] = useState([]);
  const [searchSrc, setSearchSrc] = useState("");
  const [searchTarget, setSearchTarget] = useState("");
  
  const [selectedSources, setSelectedSources] = useState([
    "Iran_Zoroastrian.HO",
    "Armenia_Beniamin_Ancient.SG",
    "Irula.DG",
    "Italy_Imperial_oAnatoliaCaucasus.SG",
    "Kazakhstan_TurkicPossible_EIA.AG"
  ]);
  
  const [targetMode, setTargetMode] = useState("aadr"); // "aadr" or "upload"
  const [selectedTarget, setSelectedTarget] = useState("Kurdish");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState("");
  
  const [status, setStatus] = useState("idle");
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [expandedPop, setExpandedPop] = useState(null);

  const fileInputRef = useRef(null);
  const srcDropdownRef = useRef(null);
  const targetDropdownRef = useRef(null);

  // Fetch available populations on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/populations`)
      .then(res => res.json())
      .then(data => setAllPops(data.populations || []))
      .catch(err => console.error("Could not fetch populations", err));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (srcDropdownRef.current && !srcDropdownRef.current.contains(e.target)) setSearchSrc("");
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(e.target)) setSearchTarget("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addSource = (popName) => {
    if (!selectedSources.includes(popName)) {
      setSelectedSources([...selectedSources, popName]);
    }
    setSearchSrc("");
  };

  const removeSource = (popName) => {
    setSelectedSources(selectedSources.filter(p => p !== popName));
  };

  const handleRunModel = async () => {
    if (selectedSources.length < 2) {
      setErrorMsg("Please select at least 2 source populations.");
      return;
    }
    setErrorMsg("");
    setResults(null);
    setStatus("running");

    try {
      let runTarget = selectedTarget;
      let isCustom = false;

      if (targetMode === "upload") {
        if (!uploadFile) {
          setErrorMsg("Please select a file to upload.");
          setStatus("idle");
          return;
        }
        setStatus("uploading");
        const formData = new FormData();
        formData.append("file", uploadFile);
        const customName = uploadName.trim() || uploadFile.name.replace(/[^a-zA-Z0-9]/g, "");
        formData.append("name", customName);

        const uploadRes = await fetch(`${BACKEND_URL}/upload`, {
          method: "POST",
          body: formData
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.detail || "Upload failed");
        }
        
        const uploadData = await uploadRes.json();
        runTarget = uploadData.target_id;
        isCustom = true;
        setStatus("running");
      }

      const res = await fetch(`${BACKEND_URL}/run-model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: selectedSources,
          target: runTarget,
          is_custom: isCustom
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Modeling failed");
      }

      const data = await res.json();
      setResults(data.data);
      setStatus("success");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  // Filter populations — allPops is now [{name, count, samples}, ...]
  const srcOptions = allPops
    .filter(p => p.name.toLowerCase().includes(searchSrc.toLowerCase()) && !selectedSources.includes(p.name))
    .slice(0, 80);
  const targetOptions = allPops
    .filter(p => p.name.toLowerCase().includes(searchTarget.toLowerCase()))
    .slice(0, 80);

  // Get info for a selected source
  const getPopInfo = (name) => allPops.find(p => p.name === name);

  return (
    <main className="main-container">
      <div className="header">
        <h1>KRRMix</h1>
        <p>Advanced Kernel Ridge Regression Admixture Modeling</p>
        {allPops.length > 0 && (
          <div style={{marginTop: "12px", color: "var(--accent-1)", fontSize: "0.9rem", fontWeight: 500}}>
            {allPops.length.toLocaleString()} populations loaded · {allPops.reduce((s,p) => s + p.count, 0).toLocaleString()} individuals
          </div>
        )}
      </div>

      {errorMsg && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", padding: "16px", borderRadius: "12px", marginBottom: "24px" }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <div className="dashboard-grid">
        {/* TARGET SELECTOR PANEL */}
        <div className="glass-panel">
          <h2 style={{marginTop: 0}}>Target Individual</h2>
          
          <div style={{display: "flex", gap: "10px", marginBottom: "20px"}}>
            <button className={targetMode === "aadr" ? "button-primary" : "button-secondary"} style={{flex: 1}} onClick={() => setTargetMode("aadr")}>From Dataset</button>
            <button className={targetMode === "upload" ? "button-primary" : "button-secondary"} style={{flex: 1}} onClick={() => setTargetMode("upload")}>Upload Sample</button>
          </div>

          {targetMode === "aadr" && (
            <div style={{position: "relative"}} ref={targetDropdownRef}>
              <input 
                type="text" 
                className="input-base" 
                placeholder="Search target population..." 
                value={searchTarget}
                onChange={e => setSearchTarget(e.target.value)}
              />
              
              {selectedTarget && (
                <div className="selected-target-card">
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                    <span style={{fontWeight: 700, color: "var(--accent-1)"}}>{selectedTarget}</span>
                    {(() => { const info = getPopInfo(selectedTarget); return info ? <span style={{color: "var(--text-secondary)", fontSize: "0.85rem"}}>{info.count} sample{info.count !== 1 ? 's' : ''}</span> : null; })()}
                  </div>
                  {(() => {
                    const info = getPopInfo(selectedTarget);
                    if (!info) return null;
                    return (
                      <div style={{marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px"}}>
                        {info.samples.slice(0, 8).map(s => (
                          <span key={s} style={{fontSize: "0.75rem", background: "rgba(99, 102, 241, 0.1)", padding: "2px 8px", borderRadius: "6px", color: "var(--text-secondary)"}}>{s}</span>
                        ))}
                        {info.count > 8 && <span style={{fontSize: "0.75rem", color: "var(--text-secondary)"}}>+{info.count - 8} more</span>}
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {searchTarget && targetOptions.length > 0 && (
                <div className="search-results">
                  {targetOptions.map(p => (
                    <div key={p.name} className="search-item" onClick={() => { setSelectedTarget(p.name); setSearchTarget(""); }}>
                      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                        <span>{p.name}</span>
                        <span style={{color: "var(--text-secondary)", fontSize: "0.8rem"}}>{p.count} ind.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {targetMode === "upload" && (
            <div>
              <input 
                type="text" 
                className="input-base" 
                placeholder="Sample name (e.g. Kurdish, Bilal)" 
                value={uploadName}
                onChange={e => setUploadName(e.target.value)}
                style={{marginBottom: "12px"}}
              />
              <div className="file-dropzone" onClick={() => fileInputRef.current.click()}>
                <div style={{fontSize: "2rem", marginBottom: "10px"}}>🧬</div>
                {uploadFile ? (
                  <div style={{fontWeight: "bold", color: "var(--text-primary)"}}>{uploadFile.name}</div>
                ) : (
                  <div style={{color: "var(--text-secondary)"}}>Click to select 23andMe / FTDNA / Ancestry raw data file<br/><span style={{fontSize:"0.8rem"}}>(.txt, .csv, .csv.gz)</span></div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{display: "none"}} 
                  onChange={e => e.target.files && setUploadFile(e.target.files[0])}
                />
              </div>
            </div>
          )}
        </div>

        {/* SOURCES SELECTOR PANEL */}
        <div className="glass-panel">
          <h2 style={{marginTop: 0}}>Admixture Proxies <span style={{color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 400}}>({selectedSources.length} selected)</span></h2>
          <div style={{position: "relative"}} ref={srcDropdownRef}>
            <input 
              type="text" 
              className="input-base" 
              placeholder="Search populations to add as source proxies..." 
              value={searchSrc}
              onChange={e => setSearchSrc(e.target.value)}
            />
            {searchSrc && srcOptions.length > 0 && (
              <div className="search-results">
                {srcOptions.map(p => (
                  <div key={p.name} className="search-item" onClick={() => addSource(p.name)}>
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                      <span>+ {p.name}</span>
                      <span style={{color: "var(--text-secondary)", fontSize: "0.8rem"}}>{p.count} ind.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tags-container" style={{marginTop: "16px"}}>
            {selectedSources.map(name => {
              const info = getPopInfo(name);
              return (
                <div key={name} className="tag" onClick={() => setExpandedPop(expandedPop === name ? null : name)}>
                  <span>{name}</span>
                  {info && <span style={{opacity: 0.6, fontSize: "0.75rem"}}>({info.count})</span>}
                  <span className="tag-close" onClick={(e) => { e.stopPropagation(); removeSource(name); }}>×</span>
                </div>
              );
            })}
            {selectedSources.length === 0 && <span style={{color: "var(--text-secondary)"}}>No sources selected. Search above to add.</span>}
          </div>

          {expandedPop && (() => {
            const info = getPopInfo(expandedPop);
            if (!info) return null;
            return (
              <div style={{marginTop: "16px", background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "14px"}}>
                <div style={{fontWeight: 600, marginBottom: "8px", color: "var(--accent-2)"}}>{expandedPop} — {info.count} individual{info.count !== 1 ? 's' : ''}</div>
                <div style={{display: "flex", flexWrap: "wrap", gap: "4px"}}>
                  {info.samples.map(s => (
                    <span key={s} style={{fontSize: "0.75rem", background: "rgba(139, 92, 246, 0.12)", padding: "3px 8px", borderRadius: "6px", color: "#c4b5fd"}}>{s}</span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{textAlign: "center", marginTop: "40px"}}>
        <button 
          className="button-primary" 
          style={{fontSize: "1.2rem", padding: "16px 40px"}}
          onClick={handleRunModel}
          disabled={status === "running" || status === "uploading"}
        >
          {status === "uploading" ? "Uploading & Merging Genome..." : status === "running" ? "Running KRRMix Engine..." : "Run Admixture Engine →"}
        </button>
      </div>

      {/* LOADING */}
      {(status === "running" || status === "uploading") && (
        <div className="results-card glass-panel loader-container">
          <div className="spinner"></div>
          <h3 style={{margin: 0}}>Processing Genomic Matrices</h3>
          <p style={{color: "var(--text-secondary)", marginTop: "10px"}}>Subsetting PLINK files, imputing missing genotypes, and estimating kernel parameters...</p>
        </div>
      )}

      {/* ERROR */}
      {status === "error" && (
        <div className="results-card glass-panel" style={{borderColor: "var(--danger)"}}>
          <h2 style={{marginTop: 0, color: "var(--danger)"}}>Analysis Failed</h2>
          <p style={{color: "var(--text-secondary)"}}>{errorMsg}</p>
          <button className="button-secondary" onClick={() => setStatus("idle")}>Dismiss</button>
        </div>
      )}

      {/* RESULTS */}
      {status === "success" && results && (
        <div className="results-card glass-panel">
          <h2 style={{marginTop: 0, display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <span>Admixture Composition — <span style={{color: "var(--accent-1)"}}>{selectedTarget}</span></span>
            <span style={{color: "var(--success)", fontSize: "0.9rem", fontWeight: 600}}>✓ VALID</span>
          </h2>
          
          <div className="stacked-bar-container">
            {results.filter(r => r.mean > 0).sort((a,b) => b.mean - a.mean).map((r, idx) => (
              <div 
                key={r.source} 
                className="stacked-segment" 
                style={{ width: `${r.mean * 100}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                data-label={`${r.source}: ${(r.mean * 100).toFixed(2)}%`}
              >
                {r.mean > 0.06 ? `${(r.mean * 100).toFixed(1)}%` : ""}
              </div>
            ))}
          </div>

          <div style={{marginTop: "30px"}}>
            {results.sort((a,b) => b.mean - a.mean).map((r, idx) => (
              <div key={r.source} className="stat-row">
                <div className="stat-label">
                  <div className="stat-color-dot" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                  <span>{r.source}</span>
                </div>
                <div className="stat-value">
                  {(r.mean * 100).toFixed(2)}% <span style={{color: "var(--text-secondary)", fontSize: "0.85em", fontWeight: "normal"}}>±{(r.se * 100).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
