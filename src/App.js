import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { SketchPicker } from "react-color";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function escapeHtml(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

// Performance optimization: Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Simple fix based on Stack Overflow research - just force dir attribute

function renderBlockHtml(b, theme = '#1f6feb') { if (b.type === "h1") return `<h1>${b.html||" "}</h1>`; if (b.type === "h2") return `<h2>${b.html||" "}</h2>`; if (b.type === "h3") return `<h3>${b.html||" "}</h3>`; if (b.type === "p") return `<p>${b.html||" "}</p>`; if (b.type === "fact") return `<div class="fact">${b.html||" "}</div>`; if (b.type === "card") return `<div class="card">${b.html||" "}</div>`; if (b.type === "stat-grid") { const items = (b.stats||[]).map(s=>`<div class="stat" style="direction:ltr;"><div class="big" style="direction:ltr; text-align:center; unicode-bidi:normal;">${escapeHtml(s.value)}</div><div class="sub" style="direction:ltr; text-align:center; unicode-bidi:normal;">${escapeHtml(s.title)}</div></div>`).join(''); return `<div class="stat-grid">${items}</div>`; } if (b.type === "table") { const cols = b.table?.cols||[]; const rows = b.table?.rows||[]; const colWidths = b.table?.colWidths||{}; const boldCells = Array.isArray(b.table?.boldCells) ? b.table.boldCells : []; const thead = `<thead><tr style="background:${theme}; color:#fff; line-height:1.4;">${cols.map((c,i)=>`<th style="${colWidths[i] ? `width:${colWidths[i]}%; ` : ''}padding:8px 10px; text-align:left !important; font-weight:700; ${i < cols.length-1 ? 'border-right:1.5px solid #000000;' : ''} font-family:Helvetica; direction:ltr !important; unicode-bidi:normal !important; writing-mode:horizontal-tb !important;" dir="ltr">${escapeHtml(c)}</th>`).join('')}</tr></thead>`; const tbody = `<tbody>${rows.map((r,ri)=>`<tr style="background:${ri % 2 === 0 ? '#ffffff' : '#f6f6f6'}">${r.map((c,ci)=>`<td style="${colWidths[ci] ? `width:${colWidths[ci]}%; ` : ''}padding:8px 10px; border-top:1.5px solid rgb(0,0,0); ${ci < r.length-1 ? 'border-right:1.5px solid #000;' : ''} font-family:Helvetica; direction:ltr; text-align:left; unicode-bidi:normal; line-height:1.4;">${c || '&nbsp;'}</td>`).join('')}</tr>`).join('')}</tbody>`; return `<table class="rendered-table" style="border-collapse:separate; border-spacing:0; width:100%; max-width:100%; table-layout:fixed; margin:10px 0 20px 0; border:1.5px solid #000000; border-radius:8px; overflow:hidden; line-height:1.4; font-family:Helvetica;">${thead}${tbody}</table>`; } if (b.type === "timeline") { const events = (b.events||[]).map(e=>`<div class="timeline-event"><div class="year">${escapeHtml(e.year)}</div><div class="desc">${escapeHtml(e.desc)}</div></div>`).join(''); return `<div class="timeline">${events}</div>`; } if (b.type === "citation") { return `<div class="citation">${b.html||" "}</div>`; } if (b.type === "hr") { return `<hr class="divider" />`; } return `<div>${escapeHtml(b.html||" ")}</div>`; }

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

  // Undo history
  const [undoHistory, setUndoHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);

  // Save current state to history before making changes
  const saveToHistory = () => {
    console.log('saveToHistory: saving current blocks to history');
    console.log('current blocks[1].stats:', blocks.find(b => b.type === 'stat-grid')?.stats);
    setUndoHistory(prev => [...prev.slice(-19), blocks]); // Keep last 20 states
    setRedoHistory([]); // Clear redo history when new action is performed
  };

  // Debounced save for content changes
  const [contentChangeTimer, setContentChangeTimer] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // This function is no longer used - keeping for backwards compatibility
  const saveToHistoryDebounced = () => {
    console.log('WARNING: saveToHistoryDebounced should not be called anymore');
  };

  // Undo function
  const undo = () => {
    console.log('undo: undoHistory.length:', undoHistory.length);
    if (undoHistory.length > 0) {
      // Debug: Check all history entries
      undoHistory.forEach((historyState, index) => {
        const historyStats = historyState.find(b => b.type === 'stat-grid')?.stats;
        console.log(`History[${index}] stats[1].title:`, historyStats?.[1]?.title);
      });

      const previousState = undoHistory[undoHistory.length - 1];
      const currentStats = blocks.find(b => b.type === 'stat-grid')?.stats;
      const previousStats = previousState.find(b => b.type === 'stat-grid')?.stats;

      console.log('undo: current stats[1].title:', currentStats?.[1]?.title);
      console.log('undo: previous stats[1].title:', previousStats?.[1]?.title);
      console.log('undo: restoring previous state');

      setRedoHistory(prev => [blocks, ...prev.slice(0, 19)]); // Keep last 20 redo states
      setUndoHistory(prev => prev.slice(0, -1));
      setBlocks(previousState);

      // Force update by logging the new state after a brief delay
      setTimeout(() => {
        console.log('undo: after setBlocks, current blocks should be updated');
      }, 10);
    } else {
      console.log('undo: no history available');
    }
  };

  // Redo function
  const redo = () => {
    if (redoHistory.length > 0) {
      const nextState = redoHistory[0];
      setUndoHistory(prev => [...prev.slice(-19), blocks]);
      setRedoHistory(prev => prev.slice(1));
      setBlocks(nextState);
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoHistory, redoHistory, blocks]);
  const [selected, setSelected] = useState(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);
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
    saveToHistory();
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
      { year: "2023", desc: "Event 2 description" },
      { year: "2023", desc: "Event 3 description" },
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

  function updateBlock(id, patch, isContentChange = false) {
    console.log('updateBlock called:', { id, patch, isContentChange });

    // Capture current state before any changes
    const currentBlocks = blocks;

    if (isContentChange) {
      // For content changes, save BEFORE applying the change
      console.log('calling saveToHistoryDebounced BEFORE applying change');
      if (!hasUnsavedChanges) {
        console.log('First change - saving current state before applying');

        // Save the current state explicitly (before changes)
        console.log('Saving currentBlocks with stats[1].title:', currentBlocks.find(b => b.type === 'stat-grid')?.stats?.[1]?.title);
        setUndoHistory(prev => [...prev.slice(-19), currentBlocks]);
        setRedoHistory([]);

        setHasUnsavedChanges(true);
        if (contentChangeTimer) {
          clearTimeout(contentChangeTimer);
        }
        const timer = setTimeout(() => {
          console.log('resetting hasUnsavedChanges to false');
          setHasUnsavedChanges(false);
        }, 2000);
        setContentChangeTimer(timer);
      } else {
        console.log('Skipping save - recent changes exist');
      }
    } else {
      // For structural changes, save immediately
      console.log('calling saveToHistory directly');
      saveToHistory();
    }
    setBlocks(b => b.map(x => x.id === id ? { ...x, ...patch } : x));
  }

  function removeBlock(id) {
    saveToHistory();
    setBlocks(b => b.filter(x => x.id !== id));
  }

  function clearAll() {
    if (window.confirm('Are you sure you want to clear all content?')) {
      saveToHistory();
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
            const headerElements = Array.from(el.querySelectorAll('thead th'));
            const headers = headerElements.map(th => th.textContent || '');

            // Extract column widths from th elements
            const colWidths = {};
            headerElements.forEach((th, index) => {
              const style = th.getAttribute('style') || '';
              // Support both percentage and pixel widths
              const percentMatch = style.match(/width:\s*(\d+(?:\.\d+)?)%/);
              const pixelMatch = style.match(/width:\s*(\d+)px/);
              if (percentMatch) {
                colWidths[index] = parseFloat(percentMatch[1]);
              } else if (pixelMatch) {
                colWidths[index] = parseInt(pixelMatch[1]);
              }
            });

            const rows = Array.from(el.querySelectorAll('tbody tr')).map(tr =>
              Array.from(tr.querySelectorAll('td')).map((td, index) => {
                // Also check td elements for width if th didn't have it
                if (!colWidths[index]) {
                  const tdStyle = td.getAttribute('style') || '';
                  // Support both percentage and pixel widths
                  const tdPercentMatch = tdStyle.match(/width:\s*(\d+(?:\.\d+)?)%/);
                  const tdPixelMatch = tdStyle.match(/width:\s*(\d+)px/);
                  if (tdPercentMatch) {
                    colWidths[index] = parseFloat(tdPercentMatch[1]);
                  } else if (tdPixelMatch) {
                    colWidths[index] = parseInt(tdPixelMatch[1]);
                  }
                }

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
                colWidths: colWidths,
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
      <div style={{position:'sticky', top:'16px', zIndex:9999, background: `linear-gradient(to bottom, ${theme}25, ${theme}15)`, backdropFilter: 'blur(8px)', padding:'18px 24px', marginBottom:12, border:`2px solid ${theme}`, borderRadius:'16px', margin:'0 16px 12px 16px', boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex', gap:12, alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <h3 style={{margin:0, color: theme}}>A4 Editor</h3>
            {importedFilename && (
              <span style={{fontSize:'12px', color:'#666', fontStyle:'italic', background:'white', padding:'4px 8px', borderRadius:'12px', border:`1px solid ${theme}50`}}>
                📄 {importedFilename}
              </span>
            )}
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center', justifyContent:'center', flex:1, paddingRight:'200px', flexWrap:'wrap', maxWidth:'calc(100vw - 400px)'}}>
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
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={() => setGlobalEditMode(!globalEditMode)} title={globalEditMode ? "Exit Edit Mode" : "Enter Edit Mode"} style={{
                width:'40px',
                height:'40px',
                border: globalEditMode ? '2px solid #28a745' : '2px solid #666',
                borderRadius:'50%',
                background: globalEditMode ? '#28a745' : 'white',
                color: globalEditMode ? 'white' : '#333',
                cursor:'pointer',
                fontSize:'18px',
                fontWeight:'bold',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                boxShadow:'0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}>✏️</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Edit</span>
            </div>
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
              <button
                onClick={globalEditMode ? undo : undefined}
                disabled={!globalEditMode || undoHistory.length === 0}
                title="Undo"
                style={{
                  width:'40px',
                  height:'40px',
                  border:'2px solid #666',
                  borderRadius:'50%',
                  background: (!globalEditMode || undoHistory.length === 0) ? '#f0f0f0' : 'white',
                  cursor: (!globalEditMode || undoHistory.length === 0) ? 'not-allowed' : 'pointer',
                  fontSize:'16px',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  boxShadow:'0 2px 4px rgba(0,0,0,0.1)',
                  opacity: (!globalEditMode || undoHistory.length === 0) ? 0.3 : 1
                }}
              >
                ↶
              </button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Undo</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button
                onClick={globalEditMode ? redo : undefined}
                disabled={!globalEditMode || redoHistory.length === 0}
                title="Redo"
                style={{
                  width:'40px',
                  height:'40px',
                  border:'2px solid #666',
                  borderRadius:'50%',
                  background: (!globalEditMode || redoHistory.length === 0) ? '#f0f0f0' : 'white',
                  cursor: (!globalEditMode || redoHistory.length === 0) ? 'not-allowed' : 'pointer',
                  fontSize:'16px',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  boxShadow:'0 2px 4px rgba(0,0,0,0.1)',
                  opacity: (!globalEditMode || redoHistory.length === 0) ? 0.3 : 1
                }}
              >
                ↷
              </button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Redo</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? ()=>addBlock('h1') : undefined} title="Add H1" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>📝</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>H1</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? ()=>addBlock('h2') : undefined} title="Add H2" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>📄</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>H2</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? ()=>addBlock('h3') : undefined} title="Add H3" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>📃</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>H3</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? ()=>addBlock('p') : undefined} title="Add Paragraph" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>📄</button>
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
              <button onClick={globalEditMode ? ()=>addBlock('table') : undefined} title="Add Table" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>📊</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Table</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? ()=>addBlock('stat-grid') : undefined} title="Add Stat Grid" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>📈</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Stats</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? ()=>addBlock('fact') : undefined} title="Add Fact Box" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>💡</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Fact</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? ()=>addBlock('card') : undefined} title="Add Card" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>🎴</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Card</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? ()=>addBlock('timeline') : undefined} title="Add Timeline" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>⏰</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Time</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? ()=>addBlock('citation') : undefined} title="Add Citation" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>📚</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Cite</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? ()=>addBlock('hr') : undefined} title="Add Horizontal Line" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>➖</button>
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
                        onChange={patch => {
                          // All changes should use debounced save (like paragraphs)
                          updateBlock(block.id, patch, true);
                        }}
                        onRemove={() => removeBlock(block.id)}
                        onSelect={() => setSelected(block.id)}
                        selected={selected===block.id}
                        globalEditMode={globalEditMode}
                        theme={theme}
                        useThemeColor={useThemeColor}
                        onSaveToHistory={saveToHistory}
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

// --- Block Editor (optimized with React.memo) ---
// --- Block Editor (optimized with React.memo) ---
const BlockEditor = memo(function BlockEditor({ block, onChange, onRemove, onSelect, selected, globalEditMode, theme, useThemeColor, onSaveToHistory }){
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
  const selectedCellRef = useRef(null);
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
    if(globalEditMode && ['fact','citation','card','p','h1','h2','h3'].includes(block.type) && ref.current){
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
  }, [block.id, block.html, block.type, globalEditMode]);

  // Update stat content when block data changes
  useEffect(() => {
    if (block.type === 'stat-grid' && globalEditMode && block.stats) {
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
  }, [block.stats, globalEditMode, block.type]);

  // Update timeline content when block data changes
  useEffect(() => {
    if (block.type === 'timeline' && globalEditMode && block.events) {
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
  }, [block.events, globalEditMode, block.type]);

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

  // No auto-focus - let natural click behavior handle focusing

  // Focus header editor when editing starts
  useEffect(() => {
    if (editingHeader !== null && headerEditRef.current) {
      const element = headerEditRef.current;
      element.focus();
      // Select all text for easy editing
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
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


  // --- START: REUSABLE LTR ENFORCEMENT FUNCTION ---
  function enforceLTR(element) {
    if (element) {
      element.style.setProperty('direction', 'ltr', 'important');
      element.style.setProperty('unicode-bidi', 'normal', 'important');
      element.style.setProperty('writing-mode', 'horizontal-tb', 'important');
      element.setAttribute('dir', 'ltr');
    }
  }

  // Reusable ref callback for LTR enforcement
  const ltrRef = (element) => {
    enforceLTR(element);
    return element;
  };

  // Aggressive timeline onInput that forces correct display
  function timelineOnInput(field, idx) {
    return (e) => {
      const element = e.currentTarget;

      // Get the current text
      const text = element.textContent || '';

      // Update the data immediately
      updateEvent(idx, field, text);

      // Force correct display by directly setting content
      setTimeout(() => {
        if (element && text) {
          // Temporarily disable contentEditable to prevent interference
          element.contentEditable = false;
          element.textContent = text;
          element.contentEditable = true;

          // Aggressive LTR enforcement
          element.style.setProperty('direction', 'ltr', 'important');
          element.style.setProperty('unicode-bidi', 'normal', 'important');
          element.style.setProperty('writing-mode', 'horizontal-tb', 'important');
          element.setAttribute('dir', 'ltr');
        }
      }, 1);
    };
  }

  // --- START: MINIMAL onInput FUNCTION ---
  function onInput(e) {
    const element = e.currentTarget;
    enforceLTR(element);
    const html = element.innerHTML || '';
    onChange({ html });
    // No cursor restoration - let the browser handle cursor position naturally
  }
  // --- END: MINIMAL onInput FUNCTION ---

  // Table helpers - optimized with useCallback
  const addRow = useCallback(() => {
    const rows = [...(block.table.rows||[])];
    const cols = block.table.cols||[];
    const newRow = cols.map(()=>"");

    // Insert after the currently selected row, or at the end if no selection
    const insertIndex = selectedCellRef.current ? selectedCellRef.current.r + 1 : rows.length;
    rows.splice(insertIndex, 0, newRow);

    onChange({ table: {...block.table, rows }});
  }, [block.table, onChange]);
  const addCol = useCallback(() => {
    const cols = [...(block.table.cols||[])];

    // Insert after the currently selected column, or at the end if no selection
    const insertIndex = selectedCellRef.current ? selectedCellRef.current.c + 1 : cols.length;
    cols.splice(insertIndex, 0, '');

    const rows = block.table.rows.map(r => {
      const newRow = [...r];
      newRow.splice(insertIndex, 0, '');
      return newRow;
    });

    // Redistribute column widths to accommodate new column
    const currentColWidths = block.table.colWidths || {};
    const newColWidths = {};
    const totalCols = cols.length;

    // If we have existing widths, redistribute them properly
    if (Object.keys(currentColWidths).length > 0) {
      const scaleFactor = (totalCols - 1) / totalCols;

      // Rebuild column widths with the new column inserted
      let newIndex = 0;
      for (let i = 0; i < totalCols; i++) {
        if (i === insertIndex) {
          // New column gets average width of existing columns
          const avgWidth = Object.values(currentColWidths).reduce((sum, w) => sum + w, 0) / Object.keys(currentColWidths).length;
          newColWidths[i] = Math.floor(avgWidth * scaleFactor);
        } else {
          // Existing columns get scaled down
          const oldIndex = i > insertIndex ? newIndex - 1 : newIndex;
          if (currentColWidths[oldIndex]) {
            newColWidths[i] = Math.floor(currentColWidths[oldIndex] * scaleFactor);
          }
          newIndex++;
        }
      }
    } else {
      // No existing widths, set equal percentage widths for all columns
      const equalWidthPercent = Math.floor(100 / totalCols);
      for (let i = 0; i < totalCols; i++) {
        newColWidths[i] = equalWidthPercent;
      }
    }

    onChange({ table: {...block.table, cols, rows, colWidths: newColWidths }});
  }, [block.table, onChange]);
  const updateCell = useCallback((r,c,val) => {
    const rows = block.table.rows.map((row,ri)=> ri===r ? row.map((cell,ci)=> ci===c? val : cell) : row );
    onChange({ table: {...block.table, rows }});
  }, [block.table, onChange]);
  const updateHeader = useCallback((i,val) => { const cols = block.table.cols.map((h,hi)=> hi===i? val:h); onChange({ table: {...block.table, cols }}); }, [block.table, onChange]);
  const removeRow = useCallback((i) => { const rows = block.table.rows.filter((_,ri)=>ri!==i); onChange({ table: {...block.table, rows }}); }, [block.table, onChange]);
  const removeCol = useCallback((i) => {
    const cols = block.table.cols.filter((_,ci)=>ci!==i);
    const rows = block.table.rows.map(r=>r.filter((_,ci)=>ci!==i));

    // Update column widths by removing the deleted column and redistributing
    const currentColWidths = block.table.colWidths || {};
    const newColWidths = {};
    let colIndex = 0;

    for (let originalIndex = 0; originalIndex < block.table.cols.length; originalIndex++) {
      if (originalIndex !== i) {
        if (currentColWidths[originalIndex]) {
          newColWidths[colIndex] = currentColWidths[originalIndex];
        }
        colIndex++;
      }
    }

    onChange({ table: {...block.table, cols, rows, colWidths: newColWidths }});
  }, [block.table, onChange]);
  const toggleBold = useCallback((r,c) => {
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
  }, [boldCells, block.table, onChange]);

  // Timeline helpers
  const updateEvent = useCallback((idx, key, val) => {
    console.log('updateEvent called:', { idx, key, val });
    const events = [...block.events]; events[idx][key] = val; onChange({ events });
  }, [block.events, onChange]);

  const addTimelineEvent = useCallback(() => {
    const events = [...(block.events||[])];
    events.push({ year: "2024", desc: "Event description" });
    onChange({ events });
  }, [block.events, onChange]);

  const removeTimelineEvent = useCallback((idx) => {
    const events = [...(block.events||[])];
    events.splice(idx, 1);
    onChange({ events });
  }, [block.events, onChange]);

  // Column resize helpers
  const handleResizeStart = useCallback((colIndex, e) => {
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
  }, []);

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

  if (!globalEditMode) {
    return (
      <div style={{marginBottom:12, position:'relative'}} onClick={onSelect}>
        <div dangerouslySetInnerHTML={{ __html: renderBlockHtml(block, theme) }} />
      </div>
    );
  }

  return (
    <div style={{marginBottom:12, position:'relative'}}>
      <div style={{position:'absolute', right:6, top:6, display:'flex', gap:6, zIndex: 10}}>
        <div style={{
          display:'flex',
          flexDirection:'column',
          alignItems:'center',
          gap:'4px',
          position:'relative'
        }}>
          {/* Whitish backdrop glow */}
          <div style={{
            position:'absolute',
            top:'-10px',
            left:'-10px',
            right:'-10px',
            bottom:'-8px',
            background:'radial-gradient(ellipse 120% 150%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 25%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.65) 65%, rgba(255,255,255,0.3) 80%, transparent 100%)',
            borderRadius:'50%',
            zIndex:'999',
            pointerEvents:'none',
            filter:'blur(3px)'
          }}></div>

          <button
            onClick={e=>{e.stopPropagation(); onRemove();}}
            title="Delete Table"
            style={{
              width:'24px',
              height:'24px',
              border:'1px solid #ff4444',
              borderRadius:'50%',
              background:'rgba(255, 68, 68, 0.8)',
              color:'white',
              cursor:'pointer',
              fontSize:'12px',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              boxShadow:'0 2px 6px rgba(0,0,0,0.1)',
              transition:'all 0.2s ease',
              position:'relative',
              zIndex:'1000',
              opacity:'0.7'
            }}
            onMouseEnter={e => {
              e.target.style.opacity = '1';
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 3px 8px rgba(255,68,68,0.3)';
            }}
            onMouseLeave={e => {
              e.target.style.opacity = '0.7';
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
            }}
          >
            🗑️
          </button>
        </div>
      </div>

      {block.type==='h1' && <div contentEditable ref={ref} onInput={onInput} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); setTimeout(() => onSelect(null), 0); } }}  suppressContentEditableWarning style={{fontFamily:'Helvetica', fontSize:'38px', fontWeight:'bold', margin:'0 0 20px 0', lineHeight:'1.3', color: useThemeColor ? theme : 'inherit', border:'none', background:'transparent', width:'100%', padding:'4px', outline:'none', direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal', minHeight:'38px', borderRadius:'8px'}} dir="ltr"></div>}
      {block.type==='h2' && <div contentEditable ref={ref} onInput={onInput} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); setTimeout(() => onSelect(null), 0); } }}  suppressContentEditableWarning style={{fontFamily:'Helvetica', fontSize:'24px', fontWeight:'bold', margin:'0 0 10px 0', color: useThemeColor ? theme : 'inherit', border:'none', background:'transparent', width:'100%', padding:'4px', outline:'none', direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal', minHeight:'24px', borderRadius:'6px'}} dir="ltr"></div>}
      {block.type==='h3' && <div contentEditable ref={ref} onInput={onInput} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); setTimeout(() => onSelect(null), 0); } }}  suppressContentEditableWarning style={{fontFamily:'Helvetica', fontSize:'20px', fontWeight:'bold', margin:'0 0 8px 0', color: useThemeColor ? theme : 'inherit', border:'none', background:'transparent', width:'100%', padding:'4px', outline:'none', direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal', minHeight:'20px', borderRadius:'6px'}} dir="ltr"></div>}
      {block.type==='p' && <div contentEditable ref={ref} onInput={onInput} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); setTimeout(() => onSelect(null), 0); } }}  suppressContentEditableWarning style={{fontFamily:'Helvetica', fontSize:'16px', lineHeight:'1.6', margin:'6px 0 12px 0', color: 'inherit', border:'none', background:'transparent', width:'100%', padding:'4px', outline:'none', direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal', minHeight:'20px', whiteSpace:'pre-wrap', borderRadius:'6px'}} dir="ltr"></div>}
      {block.type==='fact' && <div className={globalEditMode ? "fact fact-editing" : "fact"} contentEditable ref={ref} onInput={onInput} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); setTimeout(() => onSelect(null), 0); } }}  suppressContentEditableWarning style={{borderLeftColor: theme, direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal'}} dir="ltr"></div>}
      {block.type==='card' && <div className={globalEditMode ? "card-editing" : "card"} contentEditable ref={ref} onInput={onInput} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); setTimeout(() => onSelect(null), 0); } }}  suppressContentEditableWarning style={{direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal', border:'0px solid transparent !important', borderTop:'0px solid transparent !important', borderRight:'0px solid transparent !important', borderBottom:'0px solid transparent !important', borderLeft:'0px solid transparent !important', borderWidth:'0px !important', borderStyle:'none !important', borderColor:'transparent !important', boxSizing:'border-box !important', background: `${theme}1a`, borderRadius: '12px', padding: '18px', margin: '10px 0'}} dir="ltr"></div>}
      {block.type==='citation' && <div className={globalEditMode ? "citation citation-editing" : "citation"} contentEditable ref={ref} onInput={onInput} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); setTimeout(() => onSelect(null), 0); } }}  suppressContentEditableWarning style={{direction:'ltr !important', textAlign:'left !important', unicodeBidi:'normal'}} dir="ltr"></div>}
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
            boxShadow: (globalEditMode && selected) ? '0 0 8px rgba(255, 68, 68, 0.4)' : 'none',
            borderRadius: '4px',
            transition: 'box-shadow 0.2s ease'
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
              <input className="big"
                value={s.value}
                onChange={e=>{
                  console.log('stat value onChange:', { idx, value: e.target.value });
                  const stats = [...(block.stats||[])];
                  stats[idx].value = e.target.value;
                  onChange({ stats });
                }}
                onInput={e=>{
                  const stats = [...(block.stats||[])];
                  stats[idx].value = e.target.value;
                  onChange({ stats });
                }}
                onFocus={() => {
                  // Save to history when starting to edit a stat box
                  if (window.statBoxFocusTimer) clearTimeout(window.statBoxFocusTimer);
                  window.statBoxFocusTimer = setTimeout(() => {
                    onSaveToHistory();
                  }, 100);
                }}
                style={{
                  direction:'ltr',
                  textAlign:'center',
                  background:'transparent',
                  border:'none',
                  outline:'none',
                  width:'100%',
                  fontSize:'28px',
                  color:theme,
                  fontWeight:'800',
                  lineHeight:'1.1',
                  fontFamily:'Helvetica, Arial, sans-serif'
                }}
                dir="ltr" />
              <input className="sub"
                value={s.title}
                onChange={e=>{
                  console.log('stat title onChange:', { idx, title: e.target.value });
                  const stats = [...(block.stats||[])];
                  stats[idx].title = e.target.value;
                  onChange({ stats });
                }}
                onInput={e=>{
                  const stats = [...(block.stats||[])];
                  stats[idx].title = e.target.value;
                  onChange({ stats });
                }}
                onFocus={() => {
                  // Save to history when starting to edit a stat box
                  if (window.statBoxFocusTimer) clearTimeout(window.statBoxFocusTimer);
                  window.statBoxFocusTimer = setTimeout(() => {
                    onSaveToHistory();
                  }, 100);
                }}
                style={{
                  direction:'ltr',
                  textAlign:'center',
                  background:'transparent',
                  border:'none',
                  outline:'none',
                  width:'100%',
                  fontSize:'14px',
                  color:theme,
                  lineHeight:'1.3',
                  margin:'10px 0',
                  fontFamily:'Helvetica, Arial, sans-serif'
                }}
                dir="ltr" />
            </div>
          ))}
        </div>
      )}

      {block.type==='table' && (
        <div>
          <div className="table-toolbar" style={{display:'flex', gap:12, marginBottom:8, alignItems:'flex-end'}}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? e=>{e.stopPropagation(); addRow();} : undefined} title="Add Row" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>➕</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Add Row</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <button onClick={globalEditMode ? e=>{e.stopPropagation(); addCol();} : undefined} title="Add Column" style={{width:'40px', height:'40px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>➕</button>
              <span style={{fontSize:'10px', color:'#666', fontFamily:'Helvetica', fontWeight:'500'}}>Add Col</span>
            </div>

            {selectedCell && (
              <>
                <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
                  <button
                    onClick={e=>{e.stopPropagation(); removeRow(selectedCell.r);}}
                    title={`Delete Row ${selectedCell.r + 1}`}
                    style={{
                      width:'24px',
                      height:'24px',
                      border:'1px solid #ff4444',
                      borderRadius:'50%',
                      background:'rgba(255, 68, 68, 0.8)',
                      color:'white',
                      cursor:'pointer',
                      fontSize:'12px',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      boxShadow:'0 2px 6px rgba(0,0,0,0.1)',
                      fontWeight:'bold',
                      opacity:'0.7'
                    }}
                  >
                    🗑️
                  </button>
                </div>
                <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
                  <button
                    onClick={e=>{e.stopPropagation(); removeCol(selectedCell.c);}}
                    title={`Delete Column ${selectedCell.c + 1}`}
                    style={{
                      width:'24px',
                      height:'24px',
                      border:'1px solid #ff4444',
                      borderRadius:'50%',
                      background:'rgba(255, 68, 68, 0.8)',
                      color:'white',
                      cursor:'pointer',
                      fontSize:'12px',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      boxShadow:'0 2px 6px rgba(0,0,0,0.1)',
                      fontWeight:'bold',
                      opacity:'0.7'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
          <table
            className="editing-table"
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              width: '100%',
              maxWidth: '100%',
              tableLayout: 'fixed',
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
                    width: colWidths[hi] ? `${colWidths[hi]}%` : 'auto',
                    position: 'relative',
                    padding: '8px 10px',
                    textAlign: 'left',
                    fontWeight: 700,
                    borderRight: hi < (block.table.cols||[]).length - 1 ? '1.5px solid #000000' : 'none',
                    fontFamily: 'Helvetica'
                  }}>
                    {editingHeader === hi ? (
                      <div
                        ref={el => {
                          if (el) {
                            headerEditRef.current = el;
                            // Force LTR immediately when ref is set (same as table cells)
                            el.style.setProperty('direction', 'ltr', 'important');
                            el.style.setProperty('text-align', 'left', 'important');
                            el.style.setProperty('unicode-bidi', 'normal', 'important');
                            el.style.setProperty('writing-mode', 'horizontal-tb', 'important');
                            el.setAttribute('dir', 'ltr');
                            // Set initial content only if element is empty (same as table cells)
                            if (el.innerHTML !== (h || '')) {
                              el.innerHTML = h || '';
                            }
                          }
                        }}
                        contentEditable
                        suppressContentEditableWarning
                        dir="ltr"
                        onInput={e => {
                          const element = e.currentTarget;
                          // Aggressive LTR enforcement on input (same as table cells)
                          element.style.setProperty('direction', 'ltr', 'important');
                          element.style.setProperty('unicode-bidi', 'normal', 'important');
                          element.style.setProperty('writing-mode', 'horizontal-tb', 'important');
                          element.setAttribute('dir', 'ltr');

                          const html = element.innerHTML || '';
                          updateHeader(hi, html);
                        }}
                        onFocus={(e) => {
                          // Clear all focused cells first
                          const table = e.target.closest('table');
                          if (table) {
                            table.querySelectorAll('.cell-focused').forEach(cell => {
                              cell.classList.remove('cell-focused');
                            });
                          }
                          // Add glow to parent header cell
                          const parentCell = e.target.closest('th');
                          if (parentCell) {
                            parentCell.classList.add('cell-focused');
                          }
                        }}
                        onBlur={(e) => {
                          setEditingHeader(null);
                          // Remove glow from parent header cell
                          const parentCell = e.target.closest('th');
                          if (parentCell) {
                            parentCell.classList.remove('cell-focused');
                          }
                        }}
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
                          direction: 'ltr !important',
                          textAlign: 'left !important',
                          unicodeBidi: 'normal !important',
                          writingMode: 'horizontal-tb !important'
                        }}
                      ></div>
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
              </tr>
            </thead>
            <tbody>
              {(block.table.rows||[]).map((r,ri)=>(
                <tr key={ri} style={{
                  background: ri % 2 === 0 ? '#ffffff' : '#f6f6f6',
                  position: 'relative'
                }}
                onMouseEnter={e => {
                  if (selected) {
                    const btn = e.currentTarget.querySelector('.row-delete-btn');
                    if (btn) btn.style.opacity = '1';
                  }
                }}
                onMouseLeave={e => {
                  const btn = e.currentTarget.querySelector('.row-delete-btn');
                  if (btn) btn.style.opacity = '0';
                }}
                >
                  {r.map((c,ci)=>(
                    <td key={ci} style={{
                      width: colWidths[ci] ? `${colWidths[ci]}%` : 'auto',
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
                            el.style.setProperty('direction', 'ltr', 'important');
                            el.style.setProperty('text-align', 'left', 'important');
                            el.style.setProperty('unicode-bidi', 'normal', 'important');
                            el.style.setProperty('writing-mode', 'horizontal-tb', 'important');
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
                          // Aggressive LTR enforcement on input
                          element.style.setProperty('direction', 'ltr', 'important');
                          element.style.setProperty('unicode-bidi', 'normal', 'important');
                          element.style.setProperty('writing-mode', 'horizontal-tb', 'important');
                          element.setAttribute('dir', 'ltr');

                          const html = element.innerHTML || '';
                          updateCell(ri,ci,html);
                        }}
                        onFocus={(e) => {
                          const cellPos = {r: ri, c: ci};
                          setSelectedCell(cellPos);
                          selectedCellRef.current = cellPos;
                          // Clear all focused cells first
                          const table = e.target.closest('table');
                          if (table) {
                            table.querySelectorAll('.cell-focused').forEach(cell => {
                              cell.classList.remove('cell-focused');
                            });
                          }
                          // Add glow to parent cell
                          const parentCell = e.target.closest('td');
                          if (parentCell) {
                            parentCell.classList.add('cell-focused');
                          }
                        }}
                        onBlur={(e) => {
                          // Don't clear selection if clicking on toolbar buttons
                          if (!e.relatedTarget || !e.relatedTarget.closest('.table-toolbar')) {
                            setSelectedCell(null);
                            selectedCellRef.current = null;
                          }
                          // Remove glow from parent cell
                          const parentCell = e.target.closest('td');
                          if (parentCell) {
                            parentCell.classList.remove('cell-focused');
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
                          fontSize: '16px',
                          padding: '2px',
                          fontFamily: 'Helvetica',
                          minHeight: '20px',
                          lineHeight: '1.4',
                          direction: 'ltr !important',
                          textAlign: 'left !important',
                          unicodeBidi: 'normal !important',
                          writingMode: 'horizontal-tb !important',
                          borderRadius: '4px'
                        }}
                      ></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {block.type==='timeline' && (
        <div>
          {selected && (
            <div style={{marginBottom:12, display:'flex', gap:8, alignItems:'center'}}>
              <button onClick={globalEditMode ? e=>{e.stopPropagation(); addTimelineEvent();} : undefined} title="Add Timeline Event" style={{width:'32px', height:'32px', border:'2px solid #666', borderRadius:'50%', background:'white', cursor: globalEditMode ? 'pointer' : 'not-allowed', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', opacity: globalEditMode ? 1 : 0.3}}>➕</button>
              <span style={{fontSize:'12px', color:'#666', fontFamily:'Helvetica'}}>Add Event</span>
            </div>
          )}
          <div className={globalEditMode ? "timeline timeline-editing" : "timeline"}>
            {(block.events||[]).map((ev,idx)=>(
              <div className="timeline-event" key={idx} style={{position:'relative'}}>
                <input
                  className="year"
                  value={ev.year}
                  onChange={(e) => updateEvent(idx, 'year', e.target.value)}
                  onFocus={(e) => {
                    // Save to history when starting to edit a timeline field
                    if (window.timelineFocusTimer) clearTimeout(window.timelineFocusTimer);
                    window.timelineFocusTimer = setTimeout(() => {
                      onSaveToHistory();
                    }, 100);
                    // Add red glow effect
                    e.target.style.boxShadow = '0 0 8px rgba(255, 68, 68, 0.4)';
                    e.target.style.borderRadius = '6px';
                  }}
                  onBlur={(e) => {
                    // Remove red glow effect
                    e.target.style.boxShadow = 'none';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.target.blur();
                      onSelect(null);
                    }
                  }}
                  onClick={(e) => {
                    onSelect();
                    e.target.focus();
                  }}
                  style={{
                    direction:'ltr',
                    textAlign:'center',
                    background:'transparent',
                    border:'none',
                    outline:'none',
                    width:'40px',
                    position:'absolute',
                    left:'-10px',
                    top:'50%',
                    transform:'translateY(-50%) rotate(-90deg)',
                    fontSize:'14px',
                    fontWeight:'600',
                    color:theme,
                    fontFamily:'Helvetica, Arial, sans-serif',
                    whiteSpace:'nowrap'
                  }}
                  dir="ltr" />
                <div style={{position:'relative', display:'inline-block', width:'100%'}}>
                  {/* START: MODIFIED CODE */}
                  <input
                    className="desc"
                    value={ev.desc}
                    onChange={(e) => updateEvent(idx, 'desc', e.target.value)}
                    onFocus={() => {
                      // Save to history when starting to edit a timeline field
                      if (window.timelineFocusTimer) clearTimeout(window.timelineFocusTimer);
                      window.timelineFocusTimer = setTimeout(() => {
                        onSaveToHistory();
                      }, 100);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.target.blur();
                        onSelect(null);
                      }
                    }}
                    onClick={(e) => {
                      onSelect();
                      e.target.focus();
                    }}
                    style={{
                      direction:'ltr',
                      textAlign:'left',
                      background:'#fff',
                      border:'1px solid #e0e0e0',
                      borderRadius:'8px',
                      padding:'16px',
                      paddingRight:'40px',
                      width:'100%',
                      fontSize:'14px',
                      color:'#333',
                      fontFamily:'Helvetica, Arial, sans-serif',
                      boxShadow:'0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    dir="ltr" />
                  {/* END: MODIFIED CODE */}
                  {globalEditMode && (
                    <button
                      onClick={e=>{e.stopPropagation(); removeTimelineEvent(idx);}}
                      title="Delete Event"
                      style={{
                        position:'absolute',
                        right:'8px',
                        top:'8px',
                        width:'24px',
                        height:'24px',
                        border:'1px solid #ff4444',
                        borderRadius:'50%',
                        background:'rgba(255, 68, 68, 0.8)',
                        color:'white',
                        cursor:'pointer',
                        fontSize:'12px',
                        fontWeight:'bold',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        opacity:'0.7',
                        boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                        zIndex:10
                      }}
                    >🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
});

// --- Full stylesheet including timeline & citation ---
// --- Full stylesheet including timeline & citation ---
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
.card { background:${theme}1a; border-radius:12px; padding:18px; box-shadow:0 6px 18px rgba(0,0,0,0.06); border:none !important; margin:10px 0; direction:ltr !important; text-align:left !important; }
.card-editing { background:${theme}1a; border-radius:12px; padding:18px; box-shadow:0 6px 18px rgba(0,0,0,0.06); border:none !important; margin:10px 0; direction:ltr !important; text-align:left !important; }
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
  margin: 0 !important;
  font-size: inherit !important;
  outline: none !important;
  font-family: Helvetica !important;
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: normal !important;
  line-height: 1.4 !important;
  min-height: auto !important;
  height: auto !important;
  display: block !important;
  writing-mode: horizontal-tb !important;
}
/* Table cell focus styling - show glow on cell edges instead of text */
.a4 table.editing-table tbody td [contenteditable]:focus {
  box-shadow: none !important;
}
.a4 table.editing-table thead th [contenteditable]:focus {
  box-shadow: none !important;
}
.a4 table.editing-table tbody td.cell-focused {
  box-shadow:
    inset 0 0 8px rgba(255, 68, 68, 0.3),
    0 0 4px rgba(255, 68, 68, 0.4) !important;
  transition: box-shadow 0.2s ease !important;
  position: relative !important;
  z-index: 10 !important;
}
.a4 table.editing-table thead th.cell-focused {
  box-shadow:
    inset 0 0 8px rgba(255, 68, 68, 0.3),
    0 0 4px rgba(255, 68, 68, 0.4) !important;
  transition: box-shadow 0.2s ease !important;
  position: relative !important;
  z-index: 10 !important;
}
.a4 table.editing-table tbody td.cell-focused,
.a4 table.editing-table thead th.cell-focused {
  overflow: visible !important;
}
.bullet-list { padding-left:24px; margin:10px 0; direction:ltr !important; text-align:left !important; unicode-bidi:normal !important; font-family:Helvetica; }
.bullet-list li { margin-bottom:6px; direction:ltr !important; text-align:left !important; unicode-bidi:normal !important; line-height:1.6; }
.bullet-list-editing { background:rgba(255,255,255,0.8); border-radius:4px; padding:8px; }
.timeline { position: relative; margin: 20px 0 20px 60px; padding: 0; font-family: Helvetica, Arial, sans-serif; }
.timeline::before { content: ''; position: absolute; inset-inline-start: 50px; top: 0; bottom: 0; width: 2px; background: ${theme}; }
.timeline-event { position: relative; margin-bottom: 24px; padding-inline-start: 70px; font-family: Helvetica, Arial, sans-serif; }
.timeline-event::before { content: ''; position: absolute; inset-inline-start: 42px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; border-radius: 50%; background: ${theme}; border: 3px solid #fff; box-shadow: 0 0 0 2px ${theme}; }
.timeline-event .year { position: absolute; inset-inline-start: -10px; top: 50%; transform: translateY(-50%) rotate(-90deg); transform-origin: center; font-size: 14px; font-weight: 600; color: ${theme}; line-height: 1; font-family: Helvetica, Arial, sans-serif; width: 40px; text-align: center; white-space: nowrap; }
.timeline-event .desc { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 14px; color: #333; line-height: 1.5; font-family: Helvetica, Arial, sans-serif; text-align: start; max-width: calc(100% - 70px); width: auto; overflow: hidden; word-wrap: break-word; }
.citation { font-size:14px; font-style:italic; color:#444; margin:8px 0; }
.divider { border:none; height:4px; background:${useThemeColor ? theme : '#000000'}; margin:20px 0; width:100%; }
button:hover { opacity: 0.8; transform: translateY(-1px); transition: all 0.2s ease; }
button:active { transform: translateY(0); }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; caret-color: #ff4444 !important; }
[contenteditable]:focus { box-shadow: 0 0 8px rgba(255, 68, 68, 0.4) !important; transition: box-shadow 0.2s ease !important; }
h1[contenteditable], h2[contenteditable], h3[contenteditable], p[contenteditable], div[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
.a4 [contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
.a4 h1[contenteditable], .a4 h2[contenteditable], .a4 h3[contenteditable], .a4 p[contenteditable], .a4 div[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
* { unicode-bidi: normal !important; }
*[contenteditable] { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }
table, table *, td, td *, th, th *, .stat, .stat *, .stat-grid, .stat-grid * { direction: ltr !important; unicode-bidi: normal !important; writing-mode: horizontal-tb !important; }
table td, table th { text-align: left !important; }
.stat .big, .stat .sub { text-align: center !important; }

/* Word-like borderless editing with performance optimizations */
.fact-editing { border-left: 6px solid ${theme}; outline: none !important; will-change: transform; }
[contenteditable] { will-change: contents; }
.editing-table td, .editing-table th { will-change: transform; }
.table-toolbar { will-change: auto; }
button { will-change: transform; transition: transform 0.1s ease; }
button:hover { transform: translateZ(0) scale(1.05); }
button:active { transform: translateZ(0) scale(0.95); }
.card, .fact, .stat { will-change: transform; }
.timeline-event { will-change: transform; }
.fact-editing:focus { outline: none !important; border: none !important; caret-color: #ff4444 !important; border-radius: 8px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important; }
.fact-editing * { outline: none !important; }
.card { box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06) !important; outline: none !important; }
.card-editing { box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06) !important; outline: none !important; }
.card-editing:focus { outline: none !important; border: none !important; caret-color: #ff4444 !important; border-radius: 12px !important; box-shadow: 0 0 8px rgba(255, 68, 68, 0.4), 0 6px 18px rgba(0, 0, 0, 0.06) !important; transition: box-shadow 0.2s ease !important; }
.card-editing * { outline: none !important; }
.card-editing, .card-editing:focus, .card-editing:focus-visible { outline: none !important; border: none !important; }
.card-editing *:focus, .card-editing *:focus-visible { outline: none !important; border: none !important; }
.citation-editing:focus { outline: none !important; border: none !important; caret-color: #ff4444 !important; border-radius: 6px !important; box-shadow: 0 0 8px rgba(255, 68, 68, 0.4) !important; transition: box-shadow 0.2s ease !important; }
.citation-editing * { outline: none !important; }
.citation-editing, .citation-editing:focus, .citation-editing:focus-visible { outline: none !important; border: none !important; }
.citation-editing *:focus, .citation-editing *:focus-visible { outline: none !important; border: none !important; }
.stat-grid-editing .stat { border: 1.5px solid #000; background: ${theme}27; }
.stat-grid-editing .stat .big:hover, .stat-grid-editing .stat .sub:hover { outline: none; border: none; }
.stat-grid-editing .stat .big:focus, .stat-grid-editing .stat .sub:focus { outline: none !important; border: none !important; caret-color: #ff4444 !important; border-radius: 6px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important; }
.timeline-editing .timeline-event .desc { border-color: ${theme}; box-shadow: 0 4px 12px rgba(0,0,0,0.12); max-width: calc(100% - 70px); width: auto; overflow: hidden; word-wrap: break-word; }
.timeline-editing .timeline-event::before { background: ${theme}; box-shadow: 0 0 0 3px ${theme}; }
.timeline-editing .year:hover, .timeline-editing .desc:hover { outline: none; }
.timeline-editing .year:focus { outline: none !important; background: rgba(255,255,255,0.9); border-radius: 6px; padding: 2px; caret-color: #ff4444 !important; box-shadow: 0 0 8px rgba(255, 68, 68, 0.4) !important; }
/* START: MODIFIED CODE */
.timeline-editing .desc:focus {
  outline: none !important;
  border-color: ${theme};
  border-radius: 8px !important;
  box-shadow: 0 0 8px rgba(255, 68, 68, 0.4) !important;
  caret-color: #ff4444 !important;
}
/* END: MODIFIED CODE */
.timeline-editing .year, .timeline-editing .desc { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }
.timeline .year, .timeline .desc { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }\n\n/* Rendered table styling to match A4.css */\n.rendered-table tbody td { padding: 8px 10px !important; min-height: 20px; }\n.rendered-table thead th { padding: 8px 10px !important; }
`;
}

export default A4Editor;