import React, { useState, useEffect, useCallback, useRef } from 'react';
import Spreadsheet from 'react-spreadsheet';

const ExcelSpreadsheet = () => {
  // Initial empty data with 25 rows and 15 columns for better Excel compatibility
  const createInitialData = () => {
    return Array(25).fill().map(() => 
      Array(15).fill().map(() => ({ value: '' }))
    );
  };

  const [data, setData] = useState(createInitialData());
  const [history, setHistory] = useState([createInitialData()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCells, setSelectedCells] = useState([]);
  const [clipboardData, setClipboardData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [highlightedRows, setHighlightedRows] = useState(new Set());
  const [lastClickTarget, setLastClickTarget] = useState(null); // Track what was clicked
  
  // Use refs to store current values without causing re-renders
  const spreadsheetRef = useRef(null);
  const dataRef = useRef(data);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);

  // Update refs when state changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Column labels (A, B, C, etc.) - Extended to support more columns
  const columnLabels = Array.from({ length: 15 }, (_, i) => {
    if (i < 26) {
      return String.fromCharCode(65 + i);
    } else {
      const firstChar = String.fromCharCode(65 + Math.floor((i - 26) / 26));
      const secondChar = String.fromCharCode(65 + ((i - 26) % 26));
      return firstChar + secondChar;
    }
  });

  // Row labels (1, 2, 3, etc.)
  const rowLabels = Array.from({ length: 25 }, (_, i) => (i + 1).toString());

  // Handle data changes - stable function using refs
  const handleDataChange = useCallback((newData) => {
    // Only update if data actually changed
    const currentData = dataRef.current;
    if (JSON.stringify(currentData) === JSON.stringify(newData)) {
      return;
    }
    
    setData(newData);
    
    // Add to history using refs to avoid dependencies
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    const newHistory = currentHistory.slice(0, currentIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, []);

  // Undo functionality - using refs for stability
  const undo = useCallback(() => {
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setHistoryIndex(newIndex);
      setData(JSON.parse(JSON.stringify(currentHistory[newIndex])));
    }
  }, []);

  // Redo functionality - using refs for stability
  const redo = useCallback(() => {
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex < currentHistory.length - 1) {
      const newIndex = currentIndex + 1;
      setHistoryIndex(newIndex);
      setData(JSON.parse(JSON.stringify(currentHistory[newIndex])));
    }
  }, []);

  // Enhanced copy functionality - works with selected cells
  const copySelectedData = useCallback(async () => {
    try {
      const currentData = dataRef.current;
      let textData = [];
      
      console.log('Button copy - Selection state:', selectedCells);
      console.log('Button copy - Last click target:', lastClickTarget);
      
      // If there are selected cells, copy only those
      if (selectedCells && (selectedCells.length > 0 || (selectedCells.start !== undefined && selectedCells.end !== undefined))) {
        let minRow, maxRow, minCol, maxCol;
        
        // Handle different selection formats using click tracking
        if (selectedCells.start !== undefined && selectedCells.end !== undefined) {
          if (lastClickTarget?.type === 'column') {
            // Column selection - copy entire column
            const colIndex = columnLabels.indexOf(lastClickTarget.value);
            minRow = 0;
            maxRow = currentData.length - 1;
            minCol = colIndex;
            maxCol = colIndex;
            console.log(`Button copy - Column selection: column ${lastClickTarget.value} (index ${colIndex}), all rows`);
          } else {
            // Row selection (default)
            minRow = Math.min(selectedCells.start, selectedCells.end);
            maxRow = Math.max(selectedCells.start, selectedCells.end);
            minCol = 0;
            maxCol = currentData[0]?.length - 1 || 14;
            console.log(`Button copy - Row selection: rows ${minRow + 1}-${maxRow + 1}, all columns`);
          }
        } else if (Array.isArray(selectedCells) && selectedCells.length > 0) {
          // Handle cell array format [{ row: 0, col: 1 }, ...]
          minRow = Math.min(...selectedCells.map(cell => cell.row));
          maxRow = Math.max(...selectedCells.map(cell => cell.row));
          minCol = Math.min(...selectedCells.map(cell => cell.col));
          maxCol = Math.max(...selectedCells.map(cell => cell.col));
          console.log(`Button copy - Cell selection: rows ${minRow + 1}-${maxRow + 1}, columns ${minCol + 1}-${maxCol + 1}`);
        } else {
          console.log('Button copy - Unknown selection format, not copying');
          alert('Please select some cells first before copying.');
          return;
        }
        
        // Copy the rectangular region
        for (let row = minRow; row <= maxRow; row++) {
          const rowData = [];
          for (let col = minCol; col <= maxCol; col++) {
            const cellValue = currentData[row]?.[col]?.value || '';
            const escapedValue = cellValue.includes(',') || cellValue.includes('"') 
              ? `"${cellValue.replace(/"/g, '""')}"` 
              : cellValue;
            rowData.push(escapedValue);
          }
          textData.push(rowData.join('\t'));
        }
      } else {
        console.log('Button copy - No cells selected, not copying anything');
        alert('Please select some cells first before copying.');
        return;
      }
      
      const clipboardText = textData.join('\n');
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(clipboardText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = clipboardText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setClipboardData(clipboardText);
      console.log('Button copy - Selected data copied to clipboard');
      
      const copyButton = document.querySelector('#copy-all-btn');
      if (copyButton) {
        const originalText = copyButton.textContent;
        copyButton.textContent = '✓ Copied!';
        copyButton.style.backgroundColor = '#10b981';
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.style.backgroundColor = '';
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy data:', error);
      alert('Failed to copy data to clipboard. Please try selecting the data manually and using Ctrl+C.');
    }
  }, [selectedCells, lastClickTarget]);

  // Keyboard shortcuts - using refs to avoid re-renders
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          // Use refs directly to avoid stale closures
          const currentHistory = historyRef.current;
          const currentIndex = historyIndexRef.current;
          if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setHistoryIndex(newIndex);
            setData(JSON.parse(JSON.stringify(currentHistory[newIndex])));
          }
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault();
          // Use refs directly to avoid stale closures
          const currentHistory = historyRef.current;
          const currentIndex = historyIndexRef.current;
          if (currentIndex < currentHistory.length - 1) {
            const newIndex = currentIndex + 1;
            setHistoryIndex(newIndex);
            setData(JSON.parse(JSON.stringify(currentHistory[newIndex])));
          }
        } else if (event.key === 'c') {
          event.preventDefault();
          // Copy selected data using refs - respects selection
          copySelectedDataToClipboard();
        }
      }
    };

    const handlePasteEvent = async (event) => {
      event.preventDefault();
      
      try {
        let clipboardData;
        
        if (event.clipboardData) {
          clipboardData = event.clipboardData.getData('text/plain');
        } else {
          clipboardData = await navigator.clipboard.readText();
        }
        
        if (clipboardData) {
          const rows = clipboardData.split(/\r?\n/).filter(row => row.length > 0);
          const parsedData = rows.map(row => {
            const cells = row.includes('\t') ? row.split('\t') : row.split(',');
            return cells.map(cell => ({ 
              value: cell.replace(/^"|"$/g, '').trim()
            }));
          });

          const currentData = dataRef.current;
          const newData = JSON.parse(JSON.stringify(currentData));
          
          // Determine paste location based on selection
          let startRow = 0;
          let startCol = 0;
          
          if (selectedCells && selectedCells.length > 0) {
            // Use the first selected cell as the paste location
            startRow = selectedCells[0].row;
            startCol = selectedCells[0].col;
          }

          parsedData.forEach((row, rowIndex) => {
            const targetRowIndex = startRow + rowIndex;
            if (targetRowIndex < newData.length) {
              row.forEach((cell, colIndex) => {
                const targetColIndex = startCol + colIndex;
                if (targetColIndex < newData[targetRowIndex].length) {
                  newData[targetRowIndex][targetColIndex] = cell;
                }
              });
            }
          });

          // Use refs and update functions directly
          const currentHistory = historyRef.current;
          const currentIndex = historyIndexRef.current;
          const newHistory = currentHistory.slice(0, currentIndex + 1);
          newHistory.push(JSON.parse(JSON.stringify(newData)));
          
          setData(newData);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
          console.log('Data pasted successfully');
        }
      } catch (error) {
        console.error('Error pasting data:', error);
        alert('Error pasting data. Please try again or check your clipboard content.');
      }
    };

    // Helper function to copy selected data
    const copySelectedDataToClipboard = async () => {
      try {
        const currentData = dataRef.current;
        let textData = [];
        
        console.log('Selection state:', selectedCells);
        console.log('Ctrl+C - Last click target:', lastClickTarget);
        
        // If there are selected cells, copy only those
        if (selectedCells && (selectedCells.length > 0 || (selectedCells.start !== undefined && selectedCells.end !== undefined))) {
          let minRow, maxRow, minCol, maxCol;
          
          // Handle different selection formats using click tracking
          if (selectedCells.start !== undefined && selectedCells.end !== undefined) {
            if (lastClickTarget?.type === 'column') {
              // Column selection - copy entire column
              const colIndex = columnLabels.indexOf(lastClickTarget.value);
              minRow = 0;
              maxRow = currentData.length - 1;
              minCol = colIndex;
              maxCol = colIndex;
              console.log(`Ctrl+C - Column selection: column ${lastClickTarget.value} (index ${colIndex}), all rows`);
            } else {
              // Row selection (default)
              minRow = Math.min(selectedCells.start, selectedCells.end);
              maxRow = Math.max(selectedCells.start, selectedCells.end);
              minCol = 0;
              maxCol = currentData[0]?.length - 1 || 14;
              console.log(`Ctrl+C - Row selection: rows ${minRow + 1}-${maxRow + 1}, all columns`);
            }
          } else if (Array.isArray(selectedCells) && selectedCells.length > 0) {
            // Handle cell array format [{ row: 0, col: 1 }, ...]
            minRow = Math.min(...selectedCells.map(cell => cell.row));
            maxRow = Math.max(...selectedCells.map(cell => cell.row));
            minCol = Math.min(...selectedCells.map(cell => cell.col));
            maxCol = Math.max(...selectedCells.map(cell => cell.col));
            console.log(`Ctrl+C - Cell selection: rows ${minRow + 1}-${maxRow + 1}, columns ${minCol + 1}-${maxCol + 1}`);
          } else {
            console.log('Ctrl+C - Unknown selection format - NOT copying anything');
            return;
          }
          
          // Copy the rectangular region
          for (let row = minRow; row <= maxRow; row++) {
            const rowData = [];
            for (let col = minCol; col <= maxCol; col++) {
              const cellValue = currentData[row]?.[col]?.value || '';
              const escapedValue = cellValue.includes(',') || cellValue.includes('"') 
                ? `"${cellValue.replace(/"/g, '""')}"` 
                : cellValue;
              rowData.push(escapedValue);
            }
            textData.push(rowData.join('\t'));
          }
        } else {
          console.log('Ctrl+C - No cells selected - NOT copying anything');
          // Don't copy anything if no selection
          return;
        }
        
        const clipboardText = textData.join('\n');
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(clipboardText);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = clipboardText;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        
        setClipboardData(clipboardText);
        console.log('Selected data copied to clipboard');
        
        // Visual feedback
        const copyButton = document.querySelector('#copy-all-btn');
        if (copyButton) {
          const originalText = copyButton.textContent;
          copyButton.textContent = '✓ Copied!';
          copyButton.style.backgroundColor = '#10b981';
          setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.style.backgroundColor = '';
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to copy data:', error);
        alert('Failed to copy data to clipboard. Please try selecting the data manually and using Ctrl+C.');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('paste', handlePasteEvent);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('paste', handlePasteEvent);
    };
  }, [selectedCells, lastClickTarget]); // Include selectedCells and lastClickTarget to update copy functionality

  // Enhanced search functionality - filter and show only matching rows
  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setFilteredData(null);
      setHighlightedRows(new Set());
      return;
    }

    setIsSearching(true);
    const results = [];
    const searchLower = searchTerm.toLowerCase();
    const currentData = dataRef.current;
    const rowsWithMatches = new Set();
    const filteredRows = [];

    // Find all matching cells and track rows
    currentData.forEach((row, rowIndex) => {
      let hasMatch = false;
      row.forEach((cell, colIndex) => {
        const cellValue = cell.value?.toString() || '';
        if (cellValue.toLowerCase().includes(searchLower)) {
          hasMatch = true;
          rowsWithMatches.add(rowIndex);
          results.push({
            row: rowIndex,
            col: colIndex,
            value: cellValue,
            position: `${columnLabels[colIndex]}${rowIndex + 1}`,
            rowLabel: rowIndex + 1,
            colLabel: columnLabels[colIndex]
          });
        }
      });
      
      // If this row has matches, include it in filtered data
      if (hasMatch) {
        filteredRows.push(row);
      }
    });

    // Sort results by row first, then by column
    results.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    setSearchResults(results);
    setHighlightedRows(rowsWithMatches);
    
    // Create filtered data showing only matching rows
    if (filteredRows.length > 0) {
      setFilteredData(filteredRows);
    } else {
      setFilteredData([]); // Empty array to show no results
    }
    
    console.log(`Search found ${results.length} matches in ${rowsWithMatches.size} rows`);
  }, [searchTerm, columnLabels]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
    setFilteredData(null);
    setHighlightedRows(new Set());
  }, []);

  // Add more rows
  const addRows = useCallback((count = 10) => {
    const currentData = dataRef.current;
    const newRows = Array(count).fill().map(() => 
      Array(currentData[0]?.length || 15).fill().map(() => ({ value: '' }))
    );
    const newData = [...currentData, ...newRows];
    
    // Update state and history directly using refs
    setData(newData);
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    const newHistory = currentHistory.slice(0, currentIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, []);

  // Add more columns
  const addColumns = useCallback((count = 5) => {
    const currentData = dataRef.current;
    const newData = currentData.map(row => [
      ...row,
      ...Array(count).fill().map(() => ({ value: '' }))
    ]);
    
    // Update state and history directly using refs
    setData(newData);
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    const newHistory = currentHistory.slice(0, currentIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, []);

  // Clear all data
  const clearAllData = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      const clearedData = createInitialData();
      
      // Update state and history directly using refs
      setData(clearedData);
      const currentHistory = historyRef.current;
      const currentIndex = historyIndexRef.current;
      const newHistory = currentHistory.slice(0, currentIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(clearedData)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, []);

  // Export data as CSV
  const exportToCSV = useCallback(() => {
    const currentData = dataRef.current;
    const csvContent = currentData.map(row => 
      row.map(cell => {
        const value = cell.value || '';
        return value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'spreadsheet-data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return (
    <div className="p-4 max-w-full overflow-auto bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Excel-like Spreadsheet</h1>
        <p className="text-gray-600 mb-4">Full Excel compatibility with copy/paste, undo/redo, and search</p>
        
        {/* Control Panel */}
        <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          {/* Undo/Redo Buttons */}
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
              title="Undo (Ctrl+Z)"
            >
              <span>↶</span> Undo
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
              title="Redo (Ctrl+Y)"
            >
              <span>↷</span> Redo
            </button>
          </div>

          {/* Search */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search in spreadsheet..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center gap-2"
            >
              🔍 Search
            </button>
            {isSearching && (
              <button
                onClick={clearSearch}
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Copy/Export Buttons */}
          <div className="flex gap-2">
            <button
              id="copy-all-btn"
              onClick={() => copySelectedData()}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200 flex items-center gap-2"
              title="Copy selected data to clipboard (Ctrl+C)"
            >
              📋 Copy Selected
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 flex items-center gap-2"
            >
              💾 Export CSV
            </button>
          </div>

          {/* Add Rows/Columns */}
          <div className="flex gap-2">
            <button
              onClick={() => addRows(10)}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200"
            >
              + 10 Rows
            </button>
            <button
              onClick={() => addColumns(5)}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200"
            >
              + 5 Columns
            </button>
          </div>

          {/* Clear Data */}
          <button
            onClick={clearAllData}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
          >
            🗑️ Clear All
          </button>
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">
                Search Results for "{searchTerm}" ({searchResults.length} matches in {highlightedRows.size} rows)
              </h3>
              <button
                onClick={clearSearch}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors duration-200"
              >
                Show All Rows
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="text-sm text-gray-700">
                <p className="mb-2">Showing only rows with matching data in the spreadsheet below.</p>
                <p className="text-xs text-gray-500">
                  Found matches in rows: {Array.from(highlightedRows).map(row => row + 1).sort((a, b) => a - b).join(', ')}
                </p>
              </div>
            ) : (
              <p className="text-gray-600">No results found.</p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-700 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="font-semibold mb-2">📋 Instructions:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <ul className="list-disc list-inside space-y-1">
              <li>Use <kbd>Ctrl+Z</kbd> to undo, <kbd>Ctrl+Y</kbd> to redo</li>
              <li>Use <kbd>Ctrl+C</kbd> to copy, <kbd>Ctrl+V</kbd> to paste</li>
              <li>Copy/paste directly from/to Excel seamlessly</li>
            </ul>
            <ul className="list-disc list-inside space-y-1">
              <li>Search function finds all matching values</li>
              <li>Export data as CSV file for Excel import</li>
              <li>Add rows/columns dynamically as needed</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Spreadsheet Container */}
      <div 
        className="border-2 border-gray-300 rounded-lg overflow-auto shadow-lg bg-white" 
        style={{ maxHeight: '65vh', minHeight: '500px' }}
        onClick={(e) => {
          // Track what was clicked to help determine selection type
          const target = e.target;
          if (target.tagName === 'TH') {
            // Check if it's a row header or column header
            const isRowHeader = target.textContent && /^\d+$/.test(target.textContent.trim());
            const isColumnHeader = target.textContent && /^[A-Z]+$/.test(target.textContent.trim());
            
            if (isRowHeader) {
              setLastClickTarget({ type: 'row', value: parseInt(target.textContent.trim()) - 1 });
              console.log('Clicked on row header:', target.textContent);
            } else if (isColumnHeader) {
              setLastClickTarget({ type: 'column', value: target.textContent.trim() });
              console.log('Clicked on column header:', target.textContent);
            }
          } else {
            setLastClickTarget({ type: 'cell' });
            console.log('Clicked on cell or other element');
          }
        }}
      >
        <Spreadsheet
          ref={spreadsheetRef}
          data={isSearching && filteredData !== null ? filteredData : data}
          onChange={handleDataChange}
          columnLabels={columnLabels}
          rowLabels={isSearching && filteredData !== null ? 
            Array.from(highlightedRows).sort((a, b) => a - b).map(row => (row + 1).toString()) : 
            rowLabels
          }
          onSelect={(selection) => {
            console.log('Selected cells:', selection);
            console.log('Selection type check:', {
              hasStart: selection?.start !== undefined,
              hasEnd: selection?.end !== undefined,
              hasRange: selection?.range !== undefined,
              isArray: Array.isArray(selection),
              keys: selection ? Object.keys(selection) : 'null'
            });
            setSelectedCells(selection);
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="mt-4 text-sm text-gray-600 flex flex-wrap justify-between items-center p-3 bg-gray-50 rounded-lg border">
        <div className="flex flex-wrap gap-4">
          <span className="font-medium">
            📊 Dimensions: {isSearching && filteredData !== null ? filteredData.length : data.length} rows × {data[0]?.length || 0} columns
            {isSearching && filteredData !== null && (
              <span className="text-orange-600 ml-2">(filtered view)</span>
            )}
          </span>
          <span>
            🕒 History: {historyIndex + 1}/{history.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-medium">✅ Excel Compatible</span>
          {clipboardData && (
            <span className="text-blue-600">📋 Data in clipboard</span>
          )}
          {selectedCells && selectedCells.length > 0 && (
            <span className="text-purple-600">🎯 {selectedCells.length} cells selected</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelSpreadsheet;
