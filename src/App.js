import React, { useState, useRef, useEffect, useMemo } from "react";
import { SketchPicker } from "react-color";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function escapeHtml(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

// Simple fix based on Stack Overflow research - just force dir attribute

function renderBlockHtml(b, theme = '#1f6feb') { if (b.type === "h1") return `<h1>${b.html||" "}</h1>`; if (b.type === "h2") return `<h2>${b.html||" "}</h2>`; if (b.type === "h3") return `<h3>${b.html||" "}</h3>`; if (b.type === "p") return `<p>${b.html||" "}</p>`; if (b.type === "fact") return `<div class="fact">${b.html||" "}</div>`; if (b.type === "card") return `<div class="card">${b.html||" "}</div>`; if (b.type === "stat-grid") { const items = (b.stats||[]).map(s=>`<div class="stat" style="direction:ltr;"><div class="big" style="direction:ltr; text-align:center; unicode-bidi:normal;">${escapeHtml(s.value)}</div><div class="sub" style="direction:ltr; text-align:center; unicode-bidi:normal;">${escapeHtml(s.title)}</div></div>`).join(''); return `<div class="stat-grid">${items}</div>`; } if (b.type === "table") { const cols = b.table?.cols||[]; const rows = b.table?.rows||[]; const colWidths = b.table?.colWidths||{}; const boldCells = Array.isArray(b.table?.boldCells) ? b.table.boldCells : []; const thead = `<thead><tr style="background:${theme}; color:#fff; line-height:1.4;">${cols.map((c,i)=>`<th style="${colWidths[i] ? `width:${colWidths[i]}px; ` : ''}padding:8px 10px; text-align:left; font-weight:700; ${i < cols.length-1 ? 'border-right:1.5px solid #000000;' : ''} font-family:Helvetica; direction:ltr; unicode-bidi:normal;">${escapeHtml(c)}</th>`).join('')}</tr></thead>`; const tbody = `<tbody>${rows.map((r,ri)=>`<tr style="background:${ri % 2 === 0 ? '#ffffff' : '#f6f6f6'}">${r.map((c,ci)=>`<td style="${colWidths[ci] ? `width:${colWidths[ci]}px; ` : ''}padding:8px 10px; border-top:1.5px solid rgb(0,0,0); ${ci < r.length-1 ? 'border-right:1.5px solid #000;' : ''} font-family:Helvetica; direction:ltr; text-align:left; unicode-bidi:normal; ${boldCells.includes(`${ri}-${ci}`) ? 'font-weight:bold;' : ''}">${c || '&nbsp;'}</td>`).join('')}</tr>`).join('')}</tbody>`; return `<table class="rendered-table" style="border-collapse:separate; border-spacing:0; width:100%; margin:10px 0 20px 0; border:1.5px solid #000000; border-radius:8px; overflow:hidden; line-height:1.4; font-family:Helvetica;">${thead}${tbody}</table>`; } if (b.type === "timeline") { const events = (b.events||[]).map(e=>`<div class="timeline-event"><div class="year">${escapeHtml(e.year)}</div><div class="desc">${escapeHtml(e.desc)}</div></div>`).join(''); return `<div class="timeline">${events}</div>`; } if (b.type === "citation") { return `<div class="citation">${b.html||" "}</div>`; } if (b.type === "hr") { return `<hr class="divider" />`; } return `<div>${escapeHtml(b.html||" ")}</div>`; }

function A4Editor() {
  const defaultTheme = "#1f6feb"; // default theme
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("a4.theme") || defaultTheme;
    } catch (e) {
      return defaultTheme;
    }
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [useThemeColor, setUseThemeColor] = useState(() => {
    try {
      return localStorage.getItem("a4.useThemeColor") === "true";
    } catch (e) {
      return false;
    }
  });
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
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [showBoldButton, setShowBoldButton] = useState(false);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [showListButton, setShowListButton] = useState(false);
  const [isListActive, setIsListActive] = useState(false);
  const [importedFilename, setImportedFilename] = useState(null);

  useEffect(() => {
    localStorage.setItem("a4.blocks.v2", JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    localStorage.setItem("a4.theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("a4.useThemeColor", useThemeColor.toString());
  }, [useThemeColor]);

  // Global text selection monitoring and bold functionality
  // --- START OF NEW CODE ---
  // Global text selection monitoring and bold functionality
  useEffect(() => {
    function checkSelection() {
      const selection = window.getSelection();
      const hasSelection = selection && selection.toString().length > 0;
      const focusedElement = document.activeElement;
      const isInContentEditable = focusedElement && (
        focusedElement.contentEditable === 'true' ||
        focusedElement.closest('[contenteditable="true"]')
      );

      // Check if we're in a block type that supports lists (para, card, fact, citation)
      const selectedBlock = blocks.find(b => b.id === selected);
      const supportsLists = selectedBlock && ['p', 'card', 'fact', 'citation'].includes(selectedBlock.type);

      setHasTextSelection(hasSelection);
      setShowBoldButton(hasSelection || isInContentEditable);
      setShowListButton((hasSelection || isInContentEditable) && supportsLists);

      // If button is visible, check the bold state and list state of the selection/cursor
      if ((hasSelection || isInContentEditable) && selection && selection.rangeCount > 0) {
        try {
          const range = selection.getRangeAt(0);
          let parent = range.commonAncestorContainer;
          if (parent.nodeType === Node.TEXT_NODE) {
            parent = parent.parentElement;
          }

          // Robust check for bold by looking for tags or computed font weight
          const isBold = parent.closest('strong, b') ||
                       parseInt(window.getComputedStyle(parent).fontWeight) >= 700;

          // Check if we're in a list
          const inList = !!parent.closest('ul, ol');

          setIsBoldActive(!!isBold);
          setIsListActive(inList);
        } catch (e) {
          setIsBoldActive(false);
          setIsListActive(false);
        }
      } else {
        setIsBoldActive(false);
        setIsListActive(false);
      }
    }

    function handleGlobalKeyDown(e) {
      // Get fresh selection state directly from the DOM to avoid stale state
      const selection = window.getSelection();
      const hasSelection = selection && selection.toString().length > 0;
      const focusedElement = document.activeElement;
      const isInContentEditable = focusedElement && (
        focusedElement.contentEditable === 'true' ||
        focusedElement.closest('[contenteditable="true"]')
      );

      if (e.ctrlKey && e.key === 'b' && (hasSelection || isInContentEditable)) {
        e.preventDefault();
        // Call the component's bold handler, which correctly manages focus
        handleGlobalBold(e);
      }
    }

    function handleSelectionChange() {
      checkSelection();
    }

    function handleFocusChange() {
      checkSelection();
    }

    // Add global event listeners
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
    };
  }, [blocks, selected]); // Add dependencies so it can check the selected block type
  // --- END OF NEW CODE ---

  function handleGlobalBold(e) {
    e.preventDefault(); // Prevent the button from taking focus

    const selection = window.getSelection();
    const focusedElement = document.activeElement;

    // If we have a selection, work with that
    if (selection.rangeCount > 0 && hasTextSelection) {
      const range = selection.getRangeAt(0);

      // Get the parent element that's contentEditable
      const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : range.commonAncestorContainer;

      // Find the contentEditable element
      const contentEditableElement = parentElement.closest('[contenteditable="true"]');

      if (contentEditableElement) {
        // Focus the contentEditable element first
        contentEditableElement.focus();

        // Restore the selection
        const newSelection = window.getSelection();
        newSelection.removeAllRanges();
        newSelection.addRange(range);

        // Apply bold formatting
        document.execCommand('bold', false, null);
      }
    }
    // If no selection but cursor is in contentEditable, just apply bold
    else if (focusedElement && (
      focusedElement.contentEditable === 'true' ||
      focusedElement.closest('[contenteditable="true"]')
    )) {
      document.execCommand('bold', false, null);
    }
  }

  function handleGlobalList(e) {
    e.preventDefault(); // Prevent the button from taking focus

    const selection = window.getSelection();
    const focusedElement = document.activeElement;

    // Check if we're in a block that supports lists
    const selectedBlock = blocks.find(b => b.id === selected);
    if (!selectedBlock || !['p', 'card', 'fact', 'citation'].includes(selectedBlock.type)) {
      return;
    }

    // If we have a selection, work with that
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      // Get the parent element that's contentEditable
      const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : range.commonAncestorContainer;

      // Find the contentEditable element
      const contentEditableElement = parentElement.closest('[contenteditable="true"]');

      if (contentEditableElement) {
        // Focus the contentEditable element first
        contentEditableElement.focus();

        // Restore the selection
        const newSelection = window.getSelection();
        newSelection.removeAllRanges();
        newSelection.addRange(range);

        // Toggle list formatting
        document.execCommand('insertUnorderedList', false, null);
      }
    }
    // If no selection but cursor is in contentEditable, just apply list
    else if (focusedElement && (
      focusedElement.contentEditable === 'true' ||
      focusedElement.closest('[contenteditable="true"]')
    )) {
      document.execCommand('insertUnorderedList', false, null);
    }
  }


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
    if (type === "card") base.html = "<strong>This is a bolded header</strong><br><br>This is some regular text that follows the header. You can select any text and use the bold button or Ctrl+B to format it. This card demonstrates how you can mix bold and regular text within the same element.";
    if (type === "timeline") base.events = [
      { year: "2025", desc: "Event 1 description" },
      { year: "2026", desc: "Event 2 description" },
    ];
    if (type === "citation") base.html = "Author. Title. Publisher. Year.";
    if (type === "hr") base.html = "";

    setBlocks(b => {
      if (selected) {
        // Insert after the currently selected block
        const selectedIndex = b.findIndex(block => block.id === selected);
        if (selectedIndex !== -1) {
          const newBlocks = [...b];
          newBlocks.splice(selectedIndex + 1, 0, base);
          return newBlocks;
        }
      }
      // If no selection or selected block not found, add at the end
      return [...b, base];
    });

    // Auto-select the new block
    setSelected(base.id);
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

  function importHtml(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'text/html') {
      alert('Please select a valid HTML file');
      return;
    }

    // Store the filename
    setImportedFilename(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const htmlContent = e.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const a4Div = doc.querySelector('.a4');

        if (!a4Div) {
          alert('This does not appear to be a valid A4 document');
          return;
        }

        // Extract theme color from CSS
        const styleElement = doc.querySelector('style');
        if (styleElement) {
          const cssText = styleElement.textContent;
          // Look for color patterns in h1, table backgrounds, etc.
          const colorMatch = cssText.match(/color:#([a-fA-F0-9]{6})/);
          if (colorMatch) {
            const extractedColor = '#' + colorMatch[1];
            setTheme(extractedColor);

            // Also check if theme colors are used for headings
            const themeColorUsed = cssText.includes(`color:${extractedColor}`);
            setUseThemeColor(themeColorUsed);
          }
        }

        const newBlocks = [];
        const children = a4Div.children;

        for (let i = 0; i < children.length; i++) {
          const el = children[i];
          const id = genId();

          if (el.tagName === 'H1') {
            newBlocks.push({ id, type: 'h1', html: el.innerHTML });
          } else if (el.tagName === 'H2') {
            newBlocks.push({ id, type: 'h2', html: el.innerHTML });
          } else if (el.tagName === 'H3') {
            newBlocks.push({ id, type: 'h3', html: el.innerHTML });
          } else if (el.tagName === 'P') {
            newBlocks.push({ id, type: 'p', html: el.innerHTML });
          } else if (el.classList.contains('fact')) {
            newBlocks.push({ id, type: 'fact', html: el.innerHTML });
          } else if (el.classList.contains('card')) {
            newBlocks.push({ id, type: 'card', html: el.innerHTML });
          } else if (el.classList.contains('citation')) {
            newBlocks.push({ id, type: 'citation', html: el.innerHTML });
          } else if (el.tagName === 'HR' && el.classList.contains('divider')) {
            newBlocks.push({ id, type: 'hr', html: '' });
          } else if (el.classList.contains('timeline')) {
            const events = [];
            const timelineEvents = el.querySelectorAll('.timeline-event');
            timelineEvents.forEach(te => {
              const year = te.querySelector('.year')?.textContent || '';
              const desc = te.querySelector('.desc')?.textContent || '';
              events.push({ year, desc });
            });
            newBlocks.push({ id, type: 'timeline', events });
          } else if (el.classList.contains('stat-grid')) {
            const stats = [];
            const statElements = el.querySelectorAll('.stat');
            statElements.forEach(stat => {
              const value = stat.querySelector('.big')?.textContent || '';
              const title = stat.querySelector('.sub')?.textContent || '';
              stats.push({ value, title });
            });
            newBlocks.push({ id, type: 'stat-grid', stats });
          } else if (el.tagName === 'TABLE') {
            const headers = Array.from(el.querySelectorAll('thead th')).map(th => th.textContent || '');
            const rows = Array.from(el.querySelectorAll('tbody tr')).map(tr =>
              Array.from(tr.querySelectorAll('td')).map(td => {
                // Check if cell has CSS bold styling and convert to HTML
                const cellStyle = td.getAttribute('style') || '';
                const hasCssBold = cellStyle.includes('font-weight:bold') || cellStyle.includes('font-weight: bold');
                let cellContent = td.innerHTML || '';

                // If cell has CSS bold but no HTML bold tags, wrap content in <b>
                if (hasCssBold && !cellContent.includes('<b>') && !cellContent.includes('<strong>') && cellContent.trim()) {
                  cellContent = `<b>${cellContent}</b>`;
                }

                return cellContent;
              })
            );
            newBlocks.push({
              id,
              type: 'table',
              table: {
                cols: headers,
                rows: rows,
                colWidths: {},
                boldCells: []
              }
            });
          }
        }

        if (newBlocks.length > 0) {
          setBlocks(newBlocks);
          setSelected(null);
        }
      } catch (error) {
        console.error('Error importing HTML:', error);
        alert('Error importing file. Please check the file format.');
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset input
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
      <div style={{position:'sticky', top:0, zIndex:9999, background: `linear-gradient(to bottom, ${theme}25, ${theme}15)`, backdropFilter: 'blur(8px)', padding:'18px 24px', marginBottom:12, border:`2px solid ${theme}`, borderRadius:'16px', margin:'0 16px 12px 16px', boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex', gap:12, alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <h3 style={{margin:0, color: theme}}>A4 Editor</h3>
            {importedFilename && (
              <span style={{fontSize:'12px', color:'#666', fontStyle:'italic', background:'white', padding:'4px 8px', borderRadius:'12px', border:`1px solid ${theme}50`}}>
                📄 {importedFilename}
              </span>
            )}
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center', justifyContent:'center', flex:1, paddingRight:'200px'}}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={() => setShowColorPicker(s => !s)} title="Change Theme Color" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>🎨</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Colour</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={() => setUseThemeColor(s => !s)} title={useThemeColor ? "Use Black Headings" : "Use Theme Color Headings"} style={{width:'40px', height:'40px', border:'2px solid ' + (useThemeColor ? theme : '#333'), borderRadius:'50%', background: useThemeColor ? theme : 'white', color: useThemeColor ? 'white' : 'black', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>H</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Theme</span>
            </div>
            {showBoldButton && (
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
                <button onMouseDown={handleGlobalBold} title="Bold Text (Ctrl+B)" style={{
                  width:'40px',
                  height:'40px',
                  border: isBoldActive ? '2px solid #333' : '2px solid #666',
                  borderRadius:'50%',
                  background: isBoldActive ? '#333' : 'white',
                  color: isBoldActive ? 'white' : '#333',
                  cursor:'pointer',
                  fontSize:'18px',
                  fontWeight:'bold',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  boxShadow:'0 2px 4px rgba(0,0,0,0.1)',
                  animation:'fadeIn 0.2s ease',
                  transition: 'all 0.2s ease'
                }}>B</button>
                <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Bold</span>
              </div>
            )}
            {showColorPicker && (
              <div style={{ position: 'absolute', zIndex: 1000, top: '50px', left: '-10px' }}>
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }} onClick={() => setShowColorPicker(false)} />
                <SketchPicker color={theme} onChangeComplete={color => {
                  setTheme(color.hex);
                  setShowColorPicker(false);
                }} />
              </div>
            )}
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('h1')} title="Add H1" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>📝</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>H1</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('h2')} title="Add H2" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>📄</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>H2</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('h3')} title="Add H3" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>📃</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>H3</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('p')} title="Add Paragraph" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>📄</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Para</span>
            </div>
            {showListButton && (
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
                <button onMouseDown={handleGlobalList} title="Toggle Bullet List" style={{
                  width:'40px',
                  height:'40px',
                  border: isListActive ? '2px solid #333' : '2px solid #666',
                  borderRadius:'50%',
                  background: isListActive ? '#333' : 'white',
                  color: isListActive ? 'white' : '#333',
                  cursor:'pointer',
                  fontSize:'16px',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  boxShadow:'0 2px 4px rgba(0,0,0,0.1)',
                  animation:'fadeIn 0.2s ease',
                  transition: 'all 0.2s ease'
                }}>📋</button>
                <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>List</span>
              </div>
            )}
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('table')} title="Add Table" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>📊</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Table</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('stat-grid')} title="Add Stat Grid" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>📈</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Stats</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('fact')} title="Add Fact Box" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>💡</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Fact</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('card')} title="Add Card" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>🎴</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Card</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('timeline')} title="Add Timeline" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>⏰</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Time</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('citation')} title="Add Citation" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>📚</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Cite</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={()=>addBlock('hr')} title="Add Horizontal Line" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>➖</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Line</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={clearAll} title="Clear All Content" style={{width:'40px', height:'40px', border:'2px solid #ff4444', borderRadius:'50%', background:'#ff4444', color:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>🗑️</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Clear</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <label style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', transition:'all 0.3s ease'}}>
                📥
                <input type="file" accept=".html" onChange={importHtml} style={{display:'none'}} />
              </label>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Import</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={exportHtml} style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', transition:'all 0.3s ease'}}>📤</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Export</span>
            </div>
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

  // Update cell content when block data changes, but only if not currently editing
  useEffect(() => {
    if (block.type === 'table' && selected && block.table?.rows) {
      block.table.rows.forEach((row, ri) => {
        row.forEach((cell, ci) => {
          const cellElement = cellRefs.current[`${ri}-${ci}`];
          if (cellElement && cellElement !== document.activeElement) {
            // Only update if content is different and cell is not being edited
            if (cellElement.innerHTML !== (cell || '')) {
              cellElement.innerHTML = cell || '';
            }
          }
        });
      });
    }
  }, [block.table?.rows, selected, block.type]);

  useEffect(()=>{
    if(selected && ['fact','citation','card','p','h1','h2','h3'].includes(block.type) && ref.current){
      // Only set innerHTML if it's actually different to avoid cursor jumping
      if (ref.current.innerHTML !== (block.html || '')) {
        ref.current.innerHTML = block.html || '';
      }
      // Force LTR direction with JavaScript
      ref.current.style.direction = 'ltr';
      ref.current.style.textAlign = 'left';
      ref.current.style.unicodeBidi = 'normal';
      ref.current.setAttribute('dir', 'ltr');
    }
  }, [block.id, block.html, block.type, selected]);

  // Update stat content when block data changes
  useEffect(() => {
    if (block.type === 'stat-grid' && selected && block.stats) {
      block.stats.forEach((stat, idx) => {
        // Update stat value elements
        const statElements = document.querySelectorAll(`[data-stat-idx="${idx}"]`);
        statElements.forEach(el => {
          if (el.classList.contains('big') && el.textContent !== stat.value) {
            el.textContent = stat.value;
          }
          if (el.classList.contains('sub') && el.textContent !== stat.title) {
            el.textContent = stat.title;
          }
        });
      });
    }
  }, [block.stats, selected, block.type]);

  // Update timeline content when block data changes
  useEffect(() => {
    if (block.type === 'timeline' && selected && block.events) {
      block.events.forEach((event, idx) => {
        // Update timeline event elements
        const eventElements = document.querySelectorAll(`[data-event-idx="${idx}"]`);
        eventElements.forEach(el => {
          if (el.classList.contains('year') && el.textContent !== event.year) {
            el.textContent = event.year;
          }
          if (el.classList.contains('desc') && el.textContent !== event.desc) {
            el.textContent = event.desc;
          }
        });
      });
    }
  }, [block.events, selected, block.type]);

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

  // --- START: MINIMAL onInput FUNCTION ---
  function onInput(e) {
    const element = e.currentTarget;
    const html = element.innerHTML || '';
    onChange({ html });
    // No cursor restoration - let the browser handle cursor position naturally
  }
  // --- END: MINIMAL onInput FUNCTION ---

  // Table helpers
  function addRow(){ const rows = [...(block.table.rows||[])]; const cols = block.table.cols||[]; rows.push(cols.map(()=>"")); onChange({ table: {...block.table, rows }});}
  function addCol(){
    const cols = [...(block.table.cols||[])];
    cols.push('');
    const rows = block.table.rows.map(r=>[...r,'']);
    onChange({ table: {...block.table, cols, rows }});
  }
  function updateCell(r,c,val){
    const rows = block.table.rows.map((row,ri)=> ri===r ? row.map((cell,ci)=> ci===c? val : cell) : row );
    onChange({ table: {...block.table, rows }});
  }
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

    // Get the header cell element and its next sibling
    const th = e.target.parentElement;
    const nextTh = th.nextElementSibling;

    // We can only do this if there is a next column to adjust
    if (!nextTh || !nextTh.tagName === 'TH') {
      return; 
    }

    setResizing({
      colIndex,
      startX: e.clientX,
      startWidth: th.offsetWidth,
      startWidthNext: nextTh.offsetWidth, // <-- Store the next column's width
    });
  }

  useEffect(() => {
    function handleMouseMove(e) {
      if (resizing) {
        const deltaX = e.clientX - resizing.startX;
        const minWidth = 80; // Minimum width for a column
        const combinedWidth = resizing.startWidth + resizing.startWidthNext;

        // Calculate new widths for the two columns
        let newWidth = resizing.startWidth + deltaX;
        let newWidthNext = resizing.startWidthNext - deltaX;

        // Enforce minimum width, adjusting the other column to maintain total width
        if (newWidth < minWidth) {
          newWidth = minWidth;
          newWidthNext = combinedWidth - newWidth;
        }
        
        if (newWidthNext < minWidth) {
          newWidthNext = minWidth;
          newWidth = combinedWidth - newWidthNext;
        }

        const newColWidths = {
          ...colWidths,
          [resizing.colIndex]: newWidth,
          [resizing.colIndex + 1]: newWidthNext, // Update the adjacent column
        };
        
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
      <div style={{position:'absolute', right:6, top:6, display:'flex', gap:6, zIndex: 10}}>
        <button onClick={e=>{e.stopPropagation(); onRemove();}} title="Delete Block" style={{width:'32px', height:'32px', border:'2px solid #666', borderRadius:'50%', background:'#ff4444', color:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>🗑️</button>
      </div>

      {block.type==='h1' && <div contentEditable ref={ref} onInput={onInput} suppressContentEditableWarning style={{fontFamily:'Helvetica', fontSize:'38px', fontWeight:'bold', margin:'0 0 20px 0', lineHeight:'1.3', color: 'inherit', border:'none', background:'transparent', width:'100%', padding:'0', outline:'none', direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal', minHeight:'38px'}} dir="ltr"></div>}
      {block.type==='h2' && <div contentEditable ref={ref} onInput={onInput} suppressContentEditableWarning style={{fontFamily:'Helvetica', fontSize:'24px', fontWeight:'bold', margin:'0 0 10px 0', color: 'inherit', border:'none', background:'transparent', width:'100%', padding:'0', outline:'none', direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal', minHeight:'24px'}} dir="ltr"></div>}
      {block.type==='h3' && <div contentEditable ref={ref} onInput={onInput} suppressContentEditableWarning style={{fontFamily:'Helvetica', fontSize:'20px', fontWeight:'bold', margin:'0 0 8px 0', color: 'inherit', border:'none', background:'transparent', width:'100%', padding:'0', outline:'none', direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal', minHeight:'20px'}} dir="ltr"></div>}
      {block.type==='p' && <div contentEditable ref={ref} onInput={onInput} suppressContentEditableWarning style={{fontFamily:'Helvetica', fontSize:'16px', lineHeight:'1.6', margin:'6px 0 12px 0', color: 'inherit', border:'none', background:'transparent', width:'100%', padding:'0', outline:'none', direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal', minHeight:'20px', whiteSpace:'pre-wrap'}} dir="ltr"></div>}
      {block.type==='fact' && <div className={selected ? "fact fact-editing" : "fact"} contentEditable ref={ref} onInput={onInput} suppressContentEditableWarning style={{borderLeftColor: theme, direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal'}} dir="ltr"></div>}
      {block.type==='card' && <div className="card" contentEditable ref={ref} onInput={onInput} suppressContentEditableWarning style={{direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal'}} dir="ltr"></div>}
      {block.type==='citation' && <div className="citation" contentEditable ref={ref} onInput={onInput} suppressContentEditableWarning style={{direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal'}} dir="ltr"></div>}
      {block.type==='hr' && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            position: 'relative',
            padding: '10px 0',
            cursor: 'pointer',
            outline: selected ? '2px solid #007bff' : 'none',
            borderRadius: '4px'
          }}
        >
          <hr className="divider" style={{margin: '10px 0'}} />
          {selected && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              color: '#666',
              pointerEvents: 'none'
            }}>
              Horizontal Divider
            </div>
          )}
        </div>
      )}

      {block.type==='stat-grid' && (
        <div className={selected ? "stat-grid stat-grid-editing" : "stat-grid"}>
          {(block.stats||[]).map((s,idx)=> (
            <div className="stat" key={idx} style={{direction:'ltr'}}>
              <div className="big" contentEditable suppressContentEditableWarning={true} data-stat-idx={idx} onInput={e=>{
                const element = e.currentTarget;
                const text = element.textContent || '';
                const stats = [...(block.stats||[])];
                stats[idx].value = text;
                onChange({ stats });
              }} style={{direction:'ltr', textAlign:'center'}} dir="ltr">{s.value}</div>
              <div className="sub" contentEditable suppressContentEditableWarning={true} data-stat-idx={idx} onInput={e=>{
                const element = e.currentTarget;
                const text = element.textContent || '';
                const stats = [...(block.stats||[])];
                stats[idx].title = text;
                onChange({ stats });
              }} style={{direction:'ltr', textAlign:'center'}} dir="ltr">{s.title}</div>
            </div>
          ))}
        </div>
      )}

      {block.type==='table' && (
        <div>
          <div style={{display:'flex', gap:8, marginBottom:8, alignItems:'center'}}>
            <button onClick={e=>{e.stopPropagation(); addRow();}} title="Add Row" style={{width:'32px', height:'32px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>➕</button>
            <button onClick={e=>{e.stopPropagation(); addCol();}} title="Add Column" style={{width:'32px', height:'32px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>➕</button>
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
              fontFamily: 'Helvetica'
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
                    padding: '8px 10px',
                    textAlign: 'left',
                    fontWeight: 700,
                    borderRight: hi < (block.table.cols||[]).length - 1 ? '1.5px solid #000000' : 'none',
                    fontFamily: 'Helvetica'
                  }}>
                    {editingHeader === hi ? (
                      <div
                        ref={headerEditRef}
                        contentEditable
                        suppressContentEditableWarning
                        dir="ltr"
                        // onInput={e=>updateHeader(hi,e.target.textContent)}
                        onInput={e => {
                          const element = e.currentTarget;
                          const text = element.textContent || '';
                          updateHeader(hi, text);
                        }}
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
                          fontFamily: 'Helvetica',
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
                    <button onClick={e=>{e.stopPropagation(); removeCol(hi);}} title="Delete Column" style={{position:'absolute', top:'2px', right:'2px', width:'16px', height:'16px', border:'1px solid #666', borderRadius:'50%', background:'#ff4444', color:'white', cursor:'pointer', fontSize:'8px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,0.1)'}}>×</button>
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
                      padding: '8px 10px',
                      borderTop: '1.5px solid rgb(0, 0, 0)',
                      borderRight: ci < r.length - 1 ? '1.5px solid #000' : 'none',
                      fontFamily: 'Helvetica'
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
                            // Set initial content only if element is empty
                            if (el.innerHTML !== (c || '')) {
                              el.innerHTML = c || '';
                            }
                          }
                        }}
                        contentEditable
                        suppressContentEditableWarning
                        dir="ltr"
                        onInput={e => {
                          const element = e.currentTarget;
                          const html = element.innerHTML || '';
                          updateCell(ri,ci,html);
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
                          fontFamily: 'Helvetica',
                          minHeight: '20px',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          whiteSpace: 'normal',
                          lineHeight: '1.6',
                          direction: 'ltr',
                          textAlign: 'left',
                          unicodeBidi: 'normal'
                        }}
                      ></div>
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
                        border:'1px solid #666',
                        boxShadow:'0 1px 2px rgba(0,0,0,0.1)',
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
        <div className={selected ? "timeline timeline-editing" : "timeline"}>
          {(block.events||[]).map((ev,idx)=>(
            <div className="timeline-event" key={idx} style={{display:'flex',gap:12,marginBottom:12}}>
              <div className="year"
                contentEditable
                suppressContentEditableWarning
                ref={el => {
                  if (el) {
                    // Use innerHTML like working elements
                    if (el.innerHTML !== ev.year) {
                      el.innerHTML = ev.year;
                    }
                  }
                }}
                onInput={e=>{
                  const element = e.currentTarget;
                  // Use innerHTML like working elements
                  const html = element.innerHTML || '';
                  updateEvent(idx, 'year', html);
                }}
                style={{width:'60px', fontFamily:'Helvetica', fontWeight:'700', color: theme, fontSize:'16px', outline:'none', direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal'}}
                dir="ltr"></div>
              <div className="desc"
                contentEditable
                suppressContentEditableWarning
                ref={el => {
                  if (el) {
                    // Use innerHTML like working elements
                    if (el.innerHTML !== ev.desc) {
                      el.innerHTML = ev.desc;
                    }
                  }
                }}
                onInput={e=>{
                  const element = e.currentTarget;
                  // Use innerHTML like working elements
                  const html = element.innerHTML || '';
                  updateEvent(idx, 'desc', html);
                }}
                style={{flex:1, fontFamily:'Helvetica', fontSize:'16px', outline:'none', direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal'}}
                dir="ltr"></div>
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
p { font-size:16px; line-height:1.6; margin:6px 0 12px; direction:ltr; text-align:left; white-space: pre-wrap; }
.fact { border-left:6px solid ${theme}; padding:12px 16px; margin:10px 0; }
.card { background:${theme}1a; border-radius:12px; padding:18px; box-shadow:0 6px 18px rgba(0,0,0,0.06); border:1px solid #dfe6ea; margin:10px 0; direction:ltr !important; text-align:left !important; }
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
  table-layout: fixed !important; /* <--- ADD THIS LINE */
  width: 100% !important;
  margin: 10px 0 20px 0 !important;
  border: 1.5px solid #000000 !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  line-height: 1.4 !important;
  font-family: Helvetica !important;
}
.a4 table.editing-table thead tr {
  background: ${theme} !important;
  color: #fff !important;
  line-height: 1.4 !important;
}
.a4 table.editing-table thead th {
  padding: 8px 10px !important;
  text-align: left !important;
  font-weight: 700 !important;
  border-right: 1.5px solid #000000 !important;
  font-family: Helvetica !important;
  direction: ltr !important;
  box-sizing: border-box !important; /* <-- ADD THIS LINE */
}
.a4 table.editing-table thead th:last-child {
  border-right: none !important;
}
.a4 table.editing-table tbody td {
  padding: 8px 10px !important;
  border-top: 1.5px solid rgb(0, 0, 0) !important;
  border-right: 1.5px solid #000 !important;
  font-family: Helvetica !important;
  box-sizing: border-box !important; /* <-- ADD THIS LINE */
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
  padding: 0 !important;
  font-size: 16px !important;
  font-family: Helvetica !important;
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
  font-family: Helvetica !important;
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: normal !important;
}
.bullet-list { padding-left:24px; margin:10px 0; direction:ltr !important; text-align:left !important; unicode-bidi:normal !important; font-family:Helvetica; }
.bullet-list li { margin-bottom:6px; direction:ltr !important; text-align:left !important; unicode-bidi:normal !important; line-height:1.6; }
.bullet-list-editing { background:rgba(255,255,255,0.8); border-radius:4px; padding:8px; }
.timeline { border-left:3px solid ${theme}; margin:12px 0; padding-left:16px; font-family:Helvetica; }
.timeline-event { display:flex; gap:12px; margin-bottom:12px; font-family:Helvetica; }
.timeline-event .year { font-weight:700; width:60px; color:${theme}; font-family:Helvetica; }
.citation { font-size:14px; font-style:italic; color:#444; margin:8px 0; }
.divider { border:none; height:4px; background:${useThemeColor ? theme : '#000000'}; margin:20px 0; width:100%; }
button:hover { opacity: 0.8; transform: translateY(-1px); transition: all 0.2s ease; }
button:active { transform: translateY(0); }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }
h1[contenteditable], h2[contenteditable], h3[contenteditable], p[contenteditable], div[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
.a4 [contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
.a4 h1[contenteditable], .a4 h2[contenteditable], .a4 h3[contenteditable], .a4 p[contenteditable], .a4 div[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
* { unicode-bidi: normal !important; }
*[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }
table, table *, td, td *, th, th *, .stat, .stat *, .stat-grid, .stat-grid * { direction: ltr !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
table td, table th { text-align: left !important; }
.stat .big, .stat .sub { text-align: center !important; }

/* Word-like borderless editing */
.fact-editing { border-left: 6px solid ${theme}; outline: none !important; }
.fact-editing:focus { outline: none !important; border: none !important; }
.fact-editing * { outline: none !important; }
.stat-grid-editing .stat { border: 1.5px solid #000; background: ${theme}27; }
.stat-grid-editing .stat .big:hover, .stat-grid-editing .stat .sub:hover { outline: none; border: none; }
.stat-grid-editing .stat .big:focus, .stat-grid-editing .stat .sub:focus { outline: none !important; border: none !important; }
.timeline-editing { border-left: 3px solid ${theme}; }
.timeline-editing .year:hover, .timeline-editing .desc:hover { outline: none; border: none; }
.timeline-editing .year:focus, .timeline-editing .desc:focus { outline: none !important; border: none !important; }
.timeline-editing .year, .timeline-editing .desc { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }
.timeline .year, .timeline .desc { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }\n\n/* Rendered table styling to match A4.css */\n.rendered-table tbody td { padding: 8px 10px !important; min-height: 20px; }\n.rendered-table thead th { padding: 8px 10px !important; }
`;
}

export default A4Editor;