import React, { useState, useRef, useEffect, useMemo } from "react";
import { SketchPicker } from "react-color";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function escapeHtml(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

// Simple fix based on Stack Overflow research - just force dir attribute

function renderBlockHtml(b, theme = '#1f6feb') { if (b.type === "h1") return `<h1>${escapeHtml(b.html||" ")}</h1>`; if (b.type === "h2") return `<h2>${escapeHtml(b.html||" ")}</h2>`; if (b.type === "h3") return `<h3>${escapeHtml(b.html||" ")}</h3>`; if (b.type === "p") return `<p>${escapeHtml(b.html||" ")}</p>`; if (b.type === "fact") return `<div class="fact">${escapeHtml(b.html||" ")}</div>`; if (b.type === "stat-grid") { const items = (b.stats||[]).map(s=>`<div class="stat" style="direction:ltr;"><div class="big" style="direction:ltr; text-align:center; unicode-bidi:normal;">${escapeHtml(s.value)}</div><div class="sub" style="direction:ltr; text-align:center; unicode-bidi:normal;">${escapeHtml(s.title)}</div></div>`).join(''); return `<div class="stat-grid">${items}</div>`; } if (b.type === "table") { const cols = b.table?.cols||[]; const rows = b.table?.rows||[]; const colWidths = b.table?.colWidths||{}; const boldCells = Array.isArray(b.table?.boldCells) ? b.table.boldCells : []; const thead = `<thead><tr style="background:${theme}; color:#fff; line-height:1.4;">${cols.map((c,i)=>`<th style="${colWidths[i] ? `width:${colWidths[i]}px; ` : ''}padding:10px 12px; text-align:left; font-weight:700; ${i < cols.length-1 ? 'border-right:1.5px solid #000000;' : ''} font-family:Helvetica,Arial,sans-serif; direction:ltr; unicode-bidi:normal;">${escapeHtml(c)}</th>`).join('')}</tr></thead>`; const tbody = `<tbody>${rows.map((r,ri)=>`<tr style="background:${ri % 2 === 0 ? '#ffffff' : '#f6f6f6'}">${r.map((c,ci)=>`<td style="${colWidths[ci] ? `width:${colWidths[ci]}px; ` : ''}padding:10px 12px; border-top:1.5px solid rgb(0,0,0); ${ci < r.length-1 ? 'border-right:1.5px solid #000;' : ''} font-family:Helvetica,Arial,sans-serif; direction:ltr; text-align:left; unicode-bidi:normal; ${boldCells.includes(`${ri}-${ci}`) ? 'font-weight:bold;' : ''}">${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>`; return `<table style="border-collapse:separate; border-spacing:0; width:100%; margin:10px 0 20px 0; border:1.5px solid #000000; border-radius:8px; overflow:hidden; line-height:1.4; font-family:Helvetica,Arial,sans-serif;">${thead}${tbody}</table>`; } if (b.type === "timeline") { const events = (b.events||[]).map(e=>`<div class="timeline-event"><div class="year">${escapeHtml(e.year)}</div><div class="desc">${escapeHtml(e.desc)}</div></div>`).join(''); return `<div class="timeline">${events}</div>`; } if (b.type === "citation") { return `<div class="citation">${escapeHtml(b.html||" ")}</div>`; } return `<div>${escapeHtml(b.html||" ")}</div>`; }

function A4Editor() {
  const defaultTheme = "#1f6feb"; // default theme
  const [theme, setTheme] = useState(defaultTheme);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [useThemeColor, setUseThemeColor] = useState(false);
  const [blocks, setBlocks] = useState(() => {
    try {
      const raw = localStorage.getItem("a4.blocks.v2");
      return raw ? JSON.parse(raw) : [
        { id: genId(), type: "h1", html: "Document title" },
        { id: genId(), type: "p", html: "Start typing your paragraph..." },
      ];
    } catch (e) {
      return [];
    }
  });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    localStorage.setItem("a4.blocks.v2", JSON.stringify(blocks));
  }, [blocks]);

  // NUCLEAR OPTION: Global mutation observer to force LTR on everything
  useEffect(() => {
    function forceLTR(element) {
      if (element.nodeType === 1) { // Element node
        element.style.setProperty('direction', 'ltr', 'important');
        element.style.setProperty('unicode-bidi', 'normal', 'important');
        element.setAttribute('dir', 'ltr');

        // Special handling for specific elements
        if (element.tagName === 'TD' || element.tagName === 'TH') {
          element.style.setProperty('text-align', 'left', 'important');
        }
        if (element.classList.contains('big') || element.classList.contains('sub')) {
          element.style.setProperty('text-align', 'center', 'important');
        }
      }
    }

    function forceLTROnSubtree(element) {
      forceLTR(element);
      for (let child of element.children) {
        forceLTROnSubtree(child);
      }
    }

    // Initial force on entire document
    forceLTROnSubtree(document.documentElement);

    // Set up mutation observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            forceLTROnSubtree(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['dir', 'style']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const existingStyle = document.getElementById("a4-style");
    if (existingStyle) {
      existingStyle.remove();
    }
    const styleTag = document.createElement("style");
    styleTag.id = "a4-style";
    styleTag.innerHTML = getStyle(theme, useThemeColor);
    document.head.appendChild(styleTag);
    console.log("Style applied:", getStyle(theme, useThemeColor).substring(0, 200) + "...");

    // Force global LTR on body and html elements immediately
    document.documentElement.style.setProperty('direction', 'ltr', 'important');
    document.documentElement.style.setProperty('unicode-bidi', 'normal', 'important');
    document.documentElement.setAttribute('dir', 'ltr');
    document.body.style.setProperty('direction', 'ltr', 'important');
    document.body.style.setProperty('unicode-bidi', 'normal', 'important');
    document.body.setAttribute('dir', 'ltr');

    return () => {
      const style = document.getElementById("a4-style");
      if (style) style.remove();
    };
  }, [theme, useThemeColor]);

  function genId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function addBlock(type) {
    const base = { id: genId(), type, html: "" };
    if (type === "h1") base.html = "Heading 1";
    if (type === "h2") base.html = "Heading 2";
    if (type === "h3") base.html = "Heading 3";
    if (type === "p") base.html = "Start typing your paragraph...";
    if (type === "table") base.table = { cols: ["Header 1", "Header 2", "Header 3"], rows: [["Cell 1", "Cell 2", "Cell 3"], ["Cell 4", "Cell 5", "Cell 6"], ["Cell 7", "Cell 8", "Cell 9"]], colWidths: {}, boldCells: [] };
    if (type === "stat-grid") base.stats = [
      { title: "Metric 1", value: "123" },
      { title: "Metric 2", value: "456" },
      { title: "Metric 3", value: "789" }
    ];
    if (type === "fact") base.html = "Important fact goes here.";
    if (type === "timeline") base.events = [
      { year: "2025", desc: "Event 1 description" },
      { year: "2026", desc: "Event 2 description" },
    ];
    if (type === "citation") base.html = "Author. Title. Publisher. Year.";
    setBlocks(b => [...b, base]);
  }

  function updateBlock(id, patch) {
    setBlocks(b => b.map(x => x.id === id ? { ...x, ...patch } : x));
  }

  function removeBlock(id) {
    setBlocks(b => b.filter(x => x.id !== id));
  }

  function clearAll() {
    if (window.confirm('Are you sure you want to clear all content?')) {
      setBlocks([]);
      setSelected(null);
    }
  }

  function exportHtml() {
    const stylesheet = getStyle(theme, useThemeColor);
    const body = blocks.map(b => renderBlockHtml(b, theme)).join("\n");
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Exported A4</title>
<style>
body { margin:0; padding:18px; background:#f6f7f8; min-height:100vh; }
${stylesheet}
</style>
</head>
<body>
<div class="a4">
${body}
</div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "a4-document.html";
    a.click();
    URL.revokeObjectURL(url);
  }


  function handleOnDragEnd(result) {
    if (!result.destination) return;
    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setBlocks(items);
  }

  return (
    <div
      style={{minHeight:'100vh', padding:18, background:'#f6f7f8'}}
      onClick={(e) => {
        // If clicking on the background (not on any block), deselect
        if (e.target === e.currentTarget) {
          setSelected(null);
        }
      }}
    >
      <div style={{position:'sticky', top:0, zIndex:100, background:'#f6f7f8', padding:'18px 0', marginBottom:12, borderBottom:'1px solid #ddd'}}>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <h3 style={{margin:0}}>A4 Editor</h3>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <label style={{fontSize:13}}>Theme</label>
            <button onClick={() => setShowColorPicker(s => !s)} title="Change Theme Color" style={{width:'40px', height:'40px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}>🎨</button>
            <button onClick={() => setUseThemeColor(s => !s)} title={useThemeColor ? "Use Black Headings" : "Use Theme Color Headings"} style={{width:'40px', height:'40px', border:'2px solid ' + (useThemeColor ? theme : '#ddd'), borderRadius:'50%', background: useThemeColor ? theme : 'white', color: useThemeColor ? 'white' : 'black', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>H</button>
            {showColorPicker && (
              <div style={{ position: 'absolute', zIndex: 2 }}>
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }} onClick={() => setShowColorPicker(false)} />
                <SketchPicker color={theme} onChangeComplete={color => setTheme(color.hex)} />
              </div>
            )}
            <button onClick={()=>addBlock('h1')} title="Add H1" style={{width:'40px', height:'40px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}>📝</button>
            <button onClick={()=>addBlock('h2')} title="Add H2" style={{width:'40px', height:'40px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center'}}>📄</button>
            <button onClick={()=>addBlock('h3')} title="Add H3" style={{width:'40px', height:'40px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center'}}>📃</button>
            <button onClick={()=>addBlock('p')} title="Add Paragraph" style={{width:'40px', height:'40px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}>📄</button>
            <button onClick={()=>addBlock('table')} title="Add Table" style={{width:'40px', height:'40px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}>📊</button>
            <button onClick={()=>addBlock('stat-grid')} title="Add Stat Grid" style={{width:'40px', height:'40px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}>📈</button>
            <button onClick={()=>addBlock('fact')} title="Add Fact Box" style={{width:'40px', height:'40px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}>💡</button>
            <button onClick={()=>addBlock('timeline')} title="Add Timeline" style={{width:'40px', height:'40px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}>⏰</button>
            <button onClick={()=>addBlock('citation')} title="Add Citation" style={{width:'40px', height:'40px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}>📚</button>
            <button onClick={clearAll} title="Clear All Content" style={{width:'40px', height:'40px', border:'1px solid #ff4444', borderRadius:'50%', background:'#ff4444', color:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}>🗑️</button>
            <button onClick={exportHtml}>Export HTML</button>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="blocks">
          {(provided) => (
            <div
              className="a4"
              {...provided.droppableProps}
              ref={provided.innerRef}
              onClick={(e) => {
                // If clicking on empty space within the A4 area, deselect
                if (e.target === e.currentTarget) {
                  setSelected(null);
                }
              }}
              style={{minHeight: '29.7cm'}} // Ensure there's clickable space
            >
              {blocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                      <BlockEditor
                        block={block}
                        onChange={patch => updateBlock(block.id, patch)}
                        onRemove={() => removeBlock(block.id)}
                        onSelect={() => setSelected(block.id)}
                        selected={selected===block.id}
                        theme={theme}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

// --- Block Editor ---
function BlockEditor({ block, onChange, onRemove, onSelect, selected, theme }){
  const ref = useRef();
  const [editingHeader, setEditingHeader] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [boldCells, setBoldCells] = useState(() => {
    const stored = block.table?.boldCells;
    if (Array.isArray(stored)) {
      return new Set(stored);
    } else {
      return new Set();
    }
  });

  // Sync boldCells with block data when block changes
  useEffect(() => {
    const stored = block.table?.boldCells;
    if (Array.isArray(stored)) {
      setBoldCells(new Set(stored));
    }
  }, [block.table?.boldCells]);
  const [selectedCell, setSelectedCell] = useState(null);
  const headerEditRef = useRef();
  const cellRefs = useRef({});

  // Use colWidths from block data or default
  const colWidths = useMemo(() => block.table?.colWidths || {}, [block.table?.colWidths]);

  useEffect(()=>{
    if(selected && ['fact','citation'].includes(block.type) && ref.current){
      ref.current.innerHTML = block.html || '';
      // Force LTR direction with JavaScript
      ref.current.style.direction = 'ltr';
      ref.current.style.textAlign = 'left';
      ref.current.style.unicodeBidi = 'normal';
      ref.current.setAttribute('dir', 'ltr');
    }
  }, [block.id, block.html, block.type, selected]);

  // Close header editing when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (editingHeader !== null) {
        setEditingHeader(null);
      }
    }

    if (editingHeader !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [editingHeader]);

  // Reset editing states when block becomes unselected
  useEffect(() => {
    if (!selected) {
      setEditingHeader(null);
      setResizing(null);
    }
  }, [selected]);

  // Focus header editor when editing starts
  useEffect(() => {
    if (editingHeader !== null && headerEditRef.current) {
      headerEditRef.current.focus();
      // Select all text for easy editing
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(headerEditRef.current);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [editingHeader]);

  // Force LTR direction on all contentEditable elements
  useEffect(() => {
    if (selected) {
      const interval = setInterval(() => {
        // Target table cells
        if (block.type === 'table') {
          const tableCells = document.querySelectorAll('.editing-table td [contenteditable="true"], .editing-table th [contenteditable="true"]');
          tableCells.forEach(el => {
            el.style.setProperty('direction', 'ltr', 'important');
            el.style.setProperty('text-align', 'left', 'important');
            el.style.setProperty('unicode-bidi', 'normal', 'important');
            el.style.setProperty('writing-mode', 'horizontal-tb', 'important');
            el.setAttribute('dir', 'ltr');
          });
        }

        // Target stat boxes
        if (block.type === 'stat-grid') {
          const statElements = document.querySelectorAll('.stat [contenteditable="true"]');
          statElements.forEach(el => {
            el.style.setProperty('direction', 'ltr', 'important');
            el.style.setProperty('text-align', 'center', 'important');
            el.style.setProperty('unicode-bidi', 'normal', 'important');
            el.style.setProperty('writing-mode', 'horizontal-tb', 'important');
            el.setAttribute('dir', 'ltr');
          });
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [selected, block]);

  // Also force LTR on cell refs
  useEffect(() => {
    Object.values(cellRefs.current).forEach(el => {
      if (el) {
        el.style.direction = 'ltr';
        el.style.textAlign = 'left';
        el.style.unicodeBidi = 'normal';
        el.setAttribute('dir', 'ltr');
      }
    });
  });

  function onInput(){
    const html = ref.current?.innerHTML || '';
    // Force LTR on every input for contentEditable elements (fact, citation)
    if (ref.current) {
      ref.current.style.direction = 'ltr';
      ref.current.style.textAlign = 'left';
      ref.current.style.unicodeBidi = 'normal';
      ref.current.setAttribute('dir', 'ltr');
    }
    onChange({ html });
  }

  // Table helpers
  function addRow(){ const rows = [...(block.table.rows||[])]; const cols = block.table.cols||[]; rows.push(cols.map(()=>"")); onChange({ table: {...block.table, rows }});}
  function addCol(){ const cols = [...(block.table.cols||[])]; cols.push(''); const rows = block.table.rows.map(r=>[...r,'']); onChange({ table: {...block.table, cols, rows }});}
  function updateCell(r,c,val){ const rows = block.table.rows.map((row,ri)=> ri===r ? row.map((cell,ci)=> ci===c? val : cell) : row ); onChange({ table: {...block.table, rows }});}
  function updateHeader(i,val){ const cols = block.table.cols.map((h,hi)=> hi===i? val:h); onChange({ table: {...block.table, cols }});}
  function removeRow(i){ const rows = block.table.rows.filter((_,ri)=>ri!==i); onChange({ table: {...block.table, rows }});}
  function removeCol(i){ const cols = block.table.cols.filter((_,ci)=>ci!==i); const rows = block.table.rows.map(r=>r.filter((_,ci)=>ci!==i)); onChange({ table: {...block.table, cols, rows }});}
  function toggleBold(r,c){
    const key = `${r}-${c}`;
    const newBold = new Set(boldCells);
    if(newBold.has(key)) {
      newBold.delete(key);
      console.log('Removing bold from', key);
    } else {
      newBold.add(key);
      console.log('Adding bold to', key);
    }
    setBoldCells(newBold);
    onChange({ table: {...block.table, boldCells: Array.from(newBold) }});
    console.log('Updated boldCells:', Array.from(newBold));
  }

  // Timeline helpers
  function updateEvent(idx, key, val){
    const events = [...block.events]; events[idx][key] = val; onChange({ events });
  }

  // Column resize helpers
  function handleResizeStart(colIndex, e) {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = colWidths[colIndex] || e.target.parentElement.offsetWidth;
    setResizing({ colIndex, startX: e.clientX, startWidth: currentWidth });
  }

  useEffect(() => {
    function handleMouseMove(e) {
      if (resizing) {
        const deltaX = e.clientX - resizing.startX;
        const newWidth = Math.max(80, resizing.startWidth + deltaX);
        const newColWidths = { ...colWidths, [resizing.colIndex]: newWidth };
        onChange({ table: { ...block.table, colWidths: newColWidths } });
      }
    }

    function handleMouseUp() {
      setResizing(null);
    }

    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing, colWidths, block.table, onChange]);

  if (!selected) {
    return (
      <div style={{marginBottom:12, position:'relative'}} onClick={onSelect}>
        <div dangerouslySetInnerHTML={{ __html: renderBlockHtml(block, theme) }} />
      </div>
    );
  }

  return (
    <div style={{marginBottom:12, position:'relative'}}>
      <div style={{position:'absolute', right:6, top:6, display:'flex', gap:6}}>
        <button onClick={e=>{e.stopPropagation(); onRemove();}} title="Delete Block" style={{width:'32px', height:'32px', border:'1px solid #ff4444', borderRadius:'50%', background:'#ff4444', color:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center'}}>🗑️</button>
      </div>

      {block.type==='h1' && <input value={block.html || ''} onChange={e => onChange({html: e.target.value})} style={{fontFamily:'Helvetica', fontSize:'38px', fontWeight:'bold', margin:'0 0 20px 0', lineHeight:'1.3', color: 'inherit', border:'none', background:'transparent', width:'100%', padding:'0', outline:'none', direction:'ltr', textAlign:'left'}} />}
      {block.type==='h2' && <input value={block.html || ''} onChange={e => onChange({html: e.target.value})} style={{fontFamily:'Helvetica', fontSize:'24px', fontWeight:'bold', margin:'0 0 10px 0', color: 'inherit', border:'none', background:'transparent', width:'100%', padding:'0', outline:'none', direction:'ltr', textAlign:'left'}} />}
      {block.type==='h3' && <input value={block.html || ''} onChange={e => onChange({html: e.target.value})} style={{fontFamily:'Helvetica', fontSize:'20px', fontWeight:'bold', margin:'0 0 8px 0', color: 'inherit', border:'none', background:'transparent', width:'100%', padding:'0', outline:'none', direction:'ltr', textAlign:'left'}} />}
      {block.type==='p' && <textarea value={block.html || ''} onChange={e => onChange({html: e.target.value})} style={{fontFamily:'Helvetica', fontSize:'16px', lineHeight:'1.6', margin:'6px 0 12px 0', color: 'inherit', border:'none', background:'transparent', width:'100%', padding:'0', outline:'none', direction:'ltr', textAlign:'left', resize:'none', minHeight:'20px'}} />}
      {block.type==='fact' && <div className="fact" contentEditable ref={ref} onInput={onInput} suppressContentEditableWarning style={{borderLeftColor: theme, direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal'}} dir="ltr"></div>}
      {block.type==='citation' && <div className="citation" contentEditable ref={ref} onInput={onInput} suppressContentEditableWarning style={{direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal'}} dir="ltr"></div>}

      {block.type==='stat-grid' && (
        <div className="stat-grid">
          {(block.stats||[]).map((s,idx)=> (
            <div className="stat" key={idx} style={{direction:'ltr'}}>
              <div className="big" contentEditable suppressContentEditableWarning={true} onInput={e=>{
                // CURSOR FIX for stat box
                const element = e.currentTarget;
                const selection = window.getSelection();
                const cursorPos = selection.anchorOffset;
                let text = element.textContent || '';

                console.log('📊 STAT BOX CURSOR FIX - Text:', JSON.stringify(text), 'Cursor pos:', cursorPos);

                element.setAttribute('dir', 'ltr');
                element.style.direction = 'ltr';

                const stats = [...(block.stats||[])]; stats[idx].value = text; onChange({ stats });

                // Restore cursor to end of text
                requestAnimationFrame(() => {
                  element.setAttribute('dir', 'ltr');
                  element.style.direction = 'ltr';

                  const range = document.createRange();
                  const sel = window.getSelection();

                  if (element.childNodes.length > 0) {
                    range.setStart(element.childNodes[0], element.textContent.length);
                  } else {
                    range.setStart(element, 0);
                  }
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);

                  console.log('📊 Stat box cursor restored to end');
                });
              }} style={{direction:'ltr', textAlign:'center'}} dir="ltr">{s.value}</div>
              <div className="sub" contentEditable suppressContentEditableWarning={true} onInput={e=>{
                // CURSOR FIX for stat box subtitle
                const element = e.currentTarget;
                const selection = window.getSelection();
                const cursorPos = selection.anchorOffset;
                let text = element.textContent || '';

                console.log('📊 STAT BOX SUB CURSOR FIX - Text:', JSON.stringify(text), 'Cursor pos:', cursorPos);

                element.setAttribute('dir', 'ltr');
                element.style.direction = 'ltr';

                const stats = [...(block.stats||[])]; stats[idx].title = text; onChange({ stats });

                // Restore cursor to end of text
                requestAnimationFrame(() => {
                  element.setAttribute('dir', 'ltr');
                  element.style.direction = 'ltr';

                  const range = document.createRange();
                  const sel = window.getSelection();

                  if (element.childNodes.length > 0) {
                    range.setStart(element.childNodes[0], element.textContent.length);
                  } else {
                    range.setStart(element, 0);
                  }
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);

                  console.log('📊 Stat box subtitle cursor restored to end');
                });
              }} style={{direction:'ltr', textAlign:'center'}} dir="ltr">{s.title}</div>
            </div>
          ))}
        </div>
      )}

      {block.type==='table' && (
        <div>
          <div style={{display:'flex', gap:8, marginBottom:8, alignItems:'center'}}>
            <button onClick={e=>{e.stopPropagation(); addRow();}} title="Add Row" style={{width:'32px', height:'32px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center'}}>➕</button>
            <button onClick={e=>{e.stopPropagation(); addCol();}} title="Add Column" style={{width:'32px', height:'32px', border:'1px solid #ddd', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center'}}>➕</button>
            {selectedCell && (
              <button
                className="bold-button"
                onMouseDown={e=>e.preventDefault()} // Prevent blur from happening
                onClick={e=>{e.stopPropagation(); toggleBold(selectedCell.r, selectedCell.c);}}
                title="Toggle Bold (Ctrl+B)"
                style={{
                  width:'32px',
                  height:'32px',
                  border:`2px solid ${boldCells.has(`${selectedCell.r}-${selectedCell.c}`) ? theme : '#ddd'}`,
                  borderRadius:'50%',
                  background: boldCells.has(`${selectedCell.r}-${selectedCell.c}`) ? theme : 'white',
                  color: boldCells.has(`${selectedCell.r}-${selectedCell.c}`) ? 'white' : 'black',
                  cursor:'pointer',
                  fontSize:'14px',
                  fontWeight:'bold',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center'
                }}
              >
                B
              </button>
            )}
          </div>
          <table
            className="editing-table"
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              width: '100%',
              margin: '10px 0 20px 0',
              border: '1.5px solid #000000',
              borderRadius: '8px',
              overflow: 'hidden',
              lineHeight: 1.4,
              fontFamily: 'Helvetica, Arial, sans-serif'
            }}
          >
            <thead>
              <tr style={{
                background: theme,
                color: '#fff',
                lineHeight: 1.4
              }}>
                {(block.table.cols||[]).map((h,hi)=>(
                  <th key={hi} style={{
                    width: colWidths[hi] || 'auto',
                    position: 'relative',
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontWeight: 700,
                    borderRight: hi < (block.table.cols||[]).length - 1 ? '1.5px solid #000000' : 'none',
                    fontFamily: 'Helvetica, Arial, sans-serif'
                  }}>
                    {editingHeader === hi ? (
                      <div
                        ref={headerEditRef}
                        contentEditable
                        suppressContentEditableWarning
                        dir="ltr"
                        onInput={e=>updateHeader(hi,e.target.textContent)}
                        onBlur={() => setEditingHeader(null)}
                        onKeyDown={e => e.key === 'Enter' && setEditingHeader(null)}
                        style={{
                          width: '100%',
                          border: 'none',
                          background: 'transparent',
                          color: 'white',
                          fontWeight: 'bold',
                          padding: 0,
                          fontSize: 'inherit',
                          outline: 'none',
                          fontFamily: 'Helvetica, Arial, sans-serif',
                          minHeight: '20px',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          whiteSpace: 'normal',
                          direction: 'ltr',
                          textAlign: 'left',
                          unicodeBidi: 'normal'
                        }}
                      >
                        {h}
                      </div>
                    ) : (
                      <span
                        onClick={e => {e.stopPropagation(); setEditingHeader(hi);}}
                        style={{
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'block',
                          width: '100%'
                        }}
                      >
                        {h || 'Click to edit'}
                      </span>
                    )}
                    <button onClick={e=>{e.stopPropagation(); removeCol(hi);}} title="Delete Column" style={{position:'absolute', top:'2px', right:'2px', width:'16px', height:'16px', border:'1px solid #ff4444', borderRadius:'50%', background:'#ff4444', color:'white', cursor:'pointer', fontSize:'8px', display:'flex', alignItems:'center', justifyContent:'center'}}>×</button>
                    {hi < (block.table.cols||[]).length - 1 && (
                      <div
                        onMouseDown={e => handleResizeStart(hi, e)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: -2,
                          bottom: 0,
                          width: 4,
                          cursor: 'col-resize',
                          background: resizing?.colIndex === hi ? '#007bff' : 'rgba(255,255,255,0.2)',
                          zIndex: 10,
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={e => e.target.style.background = '#007bff66'}
                        onMouseLeave={e => e.target.style.background = resizing?.colIndex === hi ? '#007bff' : 'rgba(255,255,255,0.2)'}
                        title="Drag to resize column"
                      />
                    )}
                  </th>
                ))}
                <th style={{
                  width: '40px',
                  padding: '4px',
                  textAlign: 'center',
                  borderRight: 'none'
                }}></th>
              </tr>
            </thead>
            <tbody>
              {(block.table.rows||[]).map((r,ri)=>(
                <tr key={ri} style={{
                  background: ri % 2 === 0 ? '#ffffff' : '#f6f6f6'
                }}>
                  {r.map((c,ci)=>(
                    <td key={ci} style={{
                      width: colWidths[ci] || 'auto',
                      padding: '10px 12px',
                      borderTop: '1.5px solid rgb(0, 0, 0)',
                      borderRight: ci < r.length - 1 ? '1.5px solid #000' : 'none',
                      fontFamily: 'Helvetica, Arial, sans-serif'
                    }}>
                      <div
                        ref={el => {
                          if (el) {
                            cellRefs.current[`${ri}-${ci}`] = el;
                            // Force LTR immediately when ref is set
                            el.style.direction = 'ltr';
                            el.style.textAlign = 'left';
                            el.style.unicodeBidi = 'normal';
                            el.setAttribute('dir', 'ltr');
                          }
                        }}
                        contentEditable
                        suppressContentEditableWarning
                        dir="ltr"
                        onInput={e => {
                          // ROOT CAUSE FIX: Cursor position issue in React contentEditable
                          const element = e.target;

                          // Save cursor position BEFORE getting text
                          const selection = window.getSelection();
                          const cursorPos = selection.anchorOffset;

                          let text = element.textContent || '';

                          console.log('🔧 CURSOR FIX - Text:', JSON.stringify(text), 'Cursor pos:', cursorPos);

                          // Force proper cursor positioning
                          element.setAttribute('dir', 'ltr');
                          element.style.direction = 'ltr';

                          updateCell(ri,ci,text);

                          // CRITICAL: Restore cursor to the END of text after React update
                          requestAnimationFrame(() => {
                            element.setAttribute('dir', 'ltr');
                            element.style.direction = 'ltr';

                            // Move cursor to end of text
                            const range = document.createRange();
                            const sel = window.getSelection();

                            if (element.childNodes.length > 0) {
                              range.setStart(element.childNodes[0], element.textContent.length);
                            } else {
                              range.setStart(element, 0);
                            }
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);

                            console.log('🔧 Cursor restored to end of text');
                          });
                        }}
                        onFocus={() => setSelectedCell({r: ri, c: ci})}
                        onBlur={(e) => {
                          // Don't clear selection if clicking on bold button
                          if (!e.relatedTarget || !e.relatedTarget.closest('.bold-button')) {
                            setSelectedCell(null);
                          }
                        }}
                        onKeyDown={e => {
                          if (e.ctrlKey && e.key === 'b') {
                            e.preventDefault();
                            toggleBold(ri, ci);
                          }
                        }}
                        style={{
                          width: '100%',
                          border: 'none',
                          background: 'transparent',
                          outline: selectedCell?.r === ri && selectedCell?.c === ci ? `2px solid ${theme}` : 'none',
                          fontWeight: boldCells.has(`${ri}-${ci}`) ? 'bold' : 'normal',
                          fontSize: '16px',
                          padding: '2px',
                          fontFamily: 'Helvetica, Arial, sans-serif',
                          minHeight: '20px',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          whiteSpace: 'normal',
                          lineHeight: '1.6',
                          direction: 'ltr',
                          textAlign: 'left',
                          unicodeBidi: 'normal'
                        }}
                      >
                        {c}
                      </div>
                    </td>
                  ))}
                  <td style={{
                    width: '40px',
                    padding: '4px',
                    textAlign: 'center',
                    borderTop: '1.5px solid rgb(0, 0, 0)',
                    position: 'relative'
                  }}>
                    <button
                      onClick={e=>{e.stopPropagation(); removeRow(ri);}}
                      title="Delete Row"
                      style={{
                        width:'16px',
                        height:'16px',
                        border:'1px solid #ff4444',
                        borderRadius:'50%',
                        background:'#ff4444',
                        color:'white',
                        cursor:'pointer',
                        fontSize:'8px',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center'
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {block.type==='timeline' && (
        <div className="timeline">
          {(block.events||[]).map((ev,idx)=>(
            <div className="timeline-event" key={idx} style={{display:'flex',gap:12,marginBottom:8}}>
              <input value={ev.year} onChange={e=>updateEvent(idx,'year',e.target.value)} style={{width:80}} />
              <input value={ev.desc} onChange={e=>updateEvent(idx,'desc',e.target.value)} style={{flex:1}} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Full stylesheet including timeline & citation ---
function getStyle(theme, useThemeColor = false){
  return `
/* NUCLEAR RTL OVERRIDE - DO NOT REMOVE */
html, body, *, *::before, *::after {
  direction: ltr !important;
  unicode-bidi: normal !important;
  text-align: left !important;
  writing-mode: horizontal-tb !important;
}
div, span, p, h1, h2, h3, h4, h5, h6, table, td, th, input, textarea {
  direction: ltr !important;
  unicode-bidi: normal !important;
  writing-mode: horizontal-tb !important;
}
table td, table th {
  text-align: left !important;
}
.stat .big, .stat .sub {
  text-align: center !important;
}
[contenteditable], [contenteditable] * {
  direction: ltr !important;
  unicode-bidi: normal !important;
  writing-mode: horizontal-tb !important;
}
/* END NUCLEAR RTL OVERRIDE */

.a4 { width:21cm; max-width:95%; min-height:29.7cm; padding:0.6cm; background:white; margin:10px auto; font-family:Helvetica; font-size:16px; line-height:1.6; direction:ltr !important; text-align:left !important; }
h1 { font-size:38px; font-weight:bold; margin-top:0; margin-bottom:20px; line-height:1.3; direction:ltr; text-align:left; ${useThemeColor ? `color:${theme};` : ''} }
h2 { font-size:24px; margin-top:0; margin-bottom:10px; direction:ltr; text-align:left; ${useThemeColor ? `color:${theme};` : ''} }
h3 { font-size:20px; margin-top:0; margin-bottom:8px; direction:ltr; text-align:left; ${useThemeColor ? `color:${theme};` : ''} }
p { font-size:16px; line-height:1.6; margin:6px 0 12px; direction:ltr; text-align:left; }
.fact { border-left:6px solid ${theme}; padding:12px 16px; margin:10px 0; }
.stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:12px 0 18px; direction:ltr !important; }
.stat { text-align:center !important; padding:12px 10px; border:1.5px solid #000; border-radius:10px; background:${theme}27; direction:ltr !important; unicode-bidi:normal !important; }
.stat .big { font-size:28px; color:${theme}; font-weight:800; line-height:1.1; direction:ltr !important; text-align:center !important; unicode-bidi:normal !important; writing-mode:horizontal-tb !important; }
.stat .sub { font-size:14px; color:${theme}; line-height:1.3; margin:10px 0; direction:ltr !important; text-align:center !important; unicode-bidi:normal !important; writing-mode:horizontal-tb !important; }
.stat * { direction:ltr !important; text-align:center !important; unicode-bidi:normal !important; writing-mode:horizontal-tb !important; }
.a4 table.editing-table,
.a4 table.editing-table * {
  border-collapse: separate !important;
  border-spacing: 0 !important;
}
.a4 table.editing-table {
  width: 100% !important;
  margin: 10px 0 20px 0 !important;
  border: 1.5px solid #000000 !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  line-height: 1.4 !important;
  font-family: Helvetica, Arial, sans-serif !important;
}
.a4 table.editing-table thead tr {
  background: ${theme} !important;
  color: #fff !important;
  line-height: 1.4 !important;
}
.a4 table.editing-table thead th {
  padding: 10px 12px !important;
  text-align: left !important;
  font-weight: 700 !important;
  border-right: 1.5px solid #000000 !important;
  font-family: Helvetica, Arial, sans-serif !important;
}
.a4 table.editing-table thead th:last-child {
  border-right: none !important;
}
.a4 table.editing-table tbody td {
  padding: 10px 12px !important;
  border-top: 1.5px solid rgb(0, 0, 0) !important;
  border-right: 1.5px solid #000 !important;
  font-family: Helvetica, Arial, sans-serif !important;
}
.a4 table.editing-table tbody td:last-child {
  border-right: none !important;
}
.a4 table.editing-table tbody tr:nth-child(odd) {
  background: #ffffff !important;
}
.a4 table.editing-table tbody tr:nth-child(even) {
  background: #f6f6f6 !important;
}
.a4 table.editing-table tbody td input,
.a4 table.editing-table tbody td div[contenteditable],
.a4 table.editing-table tbody td [contenteditable] {
  width: 100% !important;
  border: none !important;
  background: transparent !important;
  padding: 2px !important;
  font-size: 16px !important;
  font-family: Helvetica, Arial, sans-serif !important;
  outline: none !important;
  line-height: 1.6 !important;
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: normal !important;
  writing-mode: horizontal-tb !important;
}
.a4 table.editing-table tbody td,
.a4 table.editing-table tbody td * {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: normal !important;
  writing-mode: horizontal-tb !important;
}
.a4 table.editing-table thead th,
.a4 table.editing-table thead th * {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: normal !important;
  writing-mode: horizontal-tb !important;
}
.a4 table.editing-table thead th input,
.a4 table.editing-table thead th div[contenteditable],
.a4 table.editing-table thead th [contenteditable] {
  width: 100% !important;
  border: none !important;
  background: transparent !important;
  color: white !important;
  font-weight: bold !important;
  padding: 0 !important;
  font-size: inherit !important;
  outline: none !important;
  font-family: Helvetica, Arial, sans-serif !important;
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: normal !important;
}
.timeline { border-left:3px solid ${theme}; margin:12px 0; padding-left:16px; font-family:Helvetica; }
.timeline-event { display:flex; gap:12px; margin-bottom:12px; font-family:Helvetica; }
.timeline-event .year { font-weight:700; width:60px; color:${theme}; font-family:Helvetica; }
.citation { font-size:14px; font-style:italic; color:#444; margin:8px 0; }
button:hover { opacity: 0.8; transform: translateY(-1px); transition: all 0.2s ease; }
button:active { transform: translateY(0); }
[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }
h1[contenteditable], h2[contenteditable], h3[contenteditable], p[contenteditable], div[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
.a4 [contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
.a4 h1[contenteditable], .a4 h2[contenteditable], .a4 h3[contenteditable], .a4 p[contenteditable], .a4 div[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
* { unicode-bidi: normal !important; }
*[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }
table, table *, td, td *, th, th *, .stat, .stat *, .stat-grid, .stat-grid * { direction: ltr !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
table td, table th { text-align: left !important; }
.stat .big, .stat .sub { text-align: center !important; }
`;
}

export default A4Editor;
