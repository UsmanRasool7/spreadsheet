import React, { useState, useMemo } from 'react';

const Spreadsheet = () => {
  const [data, setData] = useState([
    {
      id: 1,
      personName: 'John Doe',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      companyWebsite: 'https://example.com',
      email: 'john.doe@example.com'
    },
    {
      id: 2,
      personName: 'Jane Smith',
      linkedinUrl: 'https://linkedin.com/in/janesmith',
      companyWebsite: 'https://techcorp.com',
      email: 'jane.smith@techcorp.com'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    personName: '',
    linkedinUrl: '',
    companyWebsite: '',
    email: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [lastSelectedRow, setLastSelectedRow] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showCopyMessage, setShowCopyMessage] = useState(false);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(item =>
      item.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.linkedinUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.companyWebsite.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  // Handle adding new entry
  const handleAddEntry = (e) => {
    e.preventDefault();
    if (newEntry.personName.trim() && newEntry.email.trim()) {
      const newId = Math.max(...data.map(item => item.id), 0) + 1;
      setData([...data, { ...newEntry, id: newId }]);
      setNewEntry({
        personName: '',
        linkedinUrl: '',
        companyWebsite: '',
        email: ''
      });
      setShowAddForm(false);
    }
  };

  // Handle editing
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const saveEdit = () => {
    setData(data.map(item => 
      item.id === editingId ? editData : item
    ));
    setEditingId(null);
    setEditData({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  // Handle deleting entry
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      setData(data.filter(item => item.id !== id));
      // Remove from selection if it was selected
      const newSelectedRows = new Set(selectedRows);
      newSelectedRows.delete(id);
      setSelectedRows(newSelectedRows);
    }
  };

  // Handle deleting multiple selected rows
  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedRows.size} selected row${selectedRows.size > 1 ? 's' : ''}?`;
    if (window.confirm(confirmMessage)) {
      setData(data.filter(item => !selectedRows.has(item.id)));
      setSelectedRows(new Set());
      setLastSelectedRow(null);
    }
  };

  // Validate URL format
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle bulk import from Excel/CSV paste
  const handleBulkImport = () => {
    if (!bulkData.trim()) return;
    
    const lines = bulkData.trim().split('\n');
    const newEntries = [];
    
    lines.forEach((line, index) => {
      const columns = line.split('\t'); // Tab-separated for Excel paste
      if (columns.length >= 1 && columns[0].trim()) { // At least name required
        const entry = {
          id: Math.max(...data.map(item => item.id), 0) + newEntries.length + 1,
          personName: columns[0]?.trim() || '',
          linkedinUrl: columns[1]?.trim() || '',
          companyWebsite: columns[2]?.trim() || '',
          email: columns[3]?.trim() || ''
        };
        
        // Only add if we have at least a name
        if (entry.personName) {
          newEntries.push(entry);
        }
      }
    });
    
    if (newEntries.length > 0) {
      setData([...data, ...newEntries]);
      setBulkData('');
      setShowBulkImport(false);
    }
  };

  // Handle row selection (for both checkbox and row clicks)
  const handleRowSelect = (rowId, event) => {
    const newSelectedRows = new Set(selectedRows);
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+click: toggle individual row
      if (newSelectedRows.has(rowId)) {
        newSelectedRows.delete(rowId);
      } else {
        newSelectedRows.add(rowId);
      }
      setLastSelectedRow(rowId);
    } else if (event.shiftKey && lastSelectedRow !== null) {
      // Shift+click: select range
      const currentIndex = filteredData.findIndex(item => item.id === rowId);
      const lastIndex = filteredData.findIndex(item => item.id === lastSelectedRow);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const startIndex = Math.min(currentIndex, lastIndex);
        const endIndex = Math.max(currentIndex, lastIndex);
        
        // Clear current selection and add range
        newSelectedRows.clear();
        for (let i = startIndex; i <= endIndex; i++) {
          newSelectedRows.add(filteredData[i].id);
        }
      }
    } else {
      // Normal click: select single row
      newSelectedRows.clear();
      newSelectedRows.add(rowId);
      setLastSelectedRow(rowId);
    }
    
    setSelectedRows(newSelectedRows);
  };

  // Handle checkbox click specifically
  const handleCheckboxClick = (rowId, event) => {
    event.stopPropagation();
    handleRowSelect(rowId, event);
  };

  // Copy selected rows to clipboard
  const copySelectedRows = () => {
    if (selectedRows.size === 0) return;
    
    const selectedData = filteredData.filter(item => selectedRows.has(item.id));
    const copyText = selectedData.map(item => 
      [item.personName, item.linkedinUrl, item.companyWebsite, item.email].join('\t')
    ).join('\n');
    
    navigator.clipboard.writeText(copyText).then(() => {
      // Show success message
      setShowCopyMessage(true);
      setTimeout(() => setShowCopyMessage(false), 3000); // Hide after 3 seconds
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = copyText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setShowCopyMessage(true);
      setTimeout(() => setShowCopyMessage(false), 3000);
    });
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (event) => {
    // Only handle shortcuts when not in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && selectedRows.size > 0) {
      event.preventDefault();
      copySelectedRows();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      const allRowIds = new Set(filteredData.map(item => item.id));
      setSelectedRows(allRowIds);
      if (filteredData.length > 0) {
        setLastSelectedRow(filteredData[0].id);
      }
    }
    if (event.key === 'Delete' && selectedRows.size > 0) {
      event.preventDefault();
      handleDeleteSelected();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setSelectedRows(new Set());
      setLastSelectedRow(null);
    }
  };

  // Add keyboard event listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedRows, filteredData]);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white relative">
      {/* Copy Success Message */}
      {showCopyMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} copied to clipboard!
          </span>
        </div>
      )}
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Spreadsheet</h1>
        
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <input
            type="text"
            placeholder="Search people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              {showAddForm ? 'Cancel' : 'Add Person'}
            </button>
            <button 
              onClick={() => setShowBulkImport(!showBulkImport)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
            >
              {showBulkImport ? 'Cancel' : 'Bulk Import'}
            </button>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddEntry} className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Person Name *"
              value={newEntry.personName}
              onChange={(e) => setNewEntry({...newEntry, personName: e.target.value})}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <input
              type="url"
              placeholder="LinkedIn Profile URL"
              value={newEntry.linkedinUrl}
              onChange={(e) => setNewEntry({...newEntry, linkedinUrl: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <input
              type="url"
              placeholder="Company Website"
              value={newEntry.companyWebsite}
              onChange={(e) => setNewEntry({...newEntry, companyWebsite: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <input
              type="email"
              placeholder="Email *"
              value={newEntry.email}
              onChange={(e) => setNewEntry({...newEntry, email: e.target.value})}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200">
            Add Person
          </button>
        </form>
      )}

      {/* Bulk Import Form */}
      {showBulkImport && (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Bulk Import from Excel</h3>
          <p className="text-sm text-gray-600 mb-4">
            Copy and paste data from Excel. Format: Person Name [Tab] LinkedIn URL [Tab] Company Website [Tab] Email
          </p>
          <textarea
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
            placeholder="Paste your Excel data here... (use Ctrl+V)"
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          />
          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleBulkImport}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Import Data
            </button>
            <button 
              onClick={() => setBulkData('')}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Results Count and Selection Info */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {filteredData.length} of {data.length} people
        </div>
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-600 font-medium">
              {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={copySelectedRows}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Copy Selected
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedRows(new Set())}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selection Help Text */}
      <div className="mb-4 text-xs text-gray-500">
        💡 Tip: Click rows to select, Ctrl+Click for multiple selection, Shift+Click for range selection, Ctrl+C to copy, Delete key to delete selected, Ctrl+A to select all, Esc to clear
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
        <table className="min-w-full bg-white border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 w-12">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(filteredData.map(item => item.id)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Person Name</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">LinkedIn Profile</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Company Website</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Email</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.map(item => (
              <tr 
                key={item.id} 
                className={`hover:bg-gray-50 cursor-pointer ${selectedRows.has(item.id) ? 'bg-blue-50 border-blue-200' : ''}`}
                onClick={(e) => {
                  // Don't handle row click if clicking on checkbox, input, or button
                  if (e.target.type === 'checkbox' || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
                    return;
                  }
                  handleRowSelect(item.id, e);
                }}
              >
                <td className="px-4 py-4 border-r border-gray-200 align-top">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(item.id)}
                    onChange={(e) => handleCheckboxClick(item.id, e.nativeEvent)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 border-r border-gray-200 align-top">
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editData.personName}
                      onChange={(e) => setEditData({...editData, personName: e.target.value})}
                      className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{item.personName}</div>
                  )}
                </td>
                <td className="px-6 py-4 border-r border-gray-200 align-top">
                  {editingId === item.id ? (
                    <input
                      type="url"
                      value={editData.linkedinUrl}
                      onChange={(e) => setEditData({...editData, linkedinUrl: e.target.value})}
                      className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="text-sm text-gray-900 break-all max-w-xs">
                      {item.linkedinUrl || '-'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 border-r border-gray-200 align-top">
                  {editingId === item.id ? (
                    <input
                      type="url"
                      value={editData.companyWebsite}
                      onChange={(e) => setEditData({...editData, companyWebsite: e.target.value})}
                      className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="text-sm text-gray-900 break-all max-w-xs">
                      {item.companyWebsite || '-'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 border-r border-gray-200 align-top">
                  {editingId === item.id ? (
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="text-sm text-gray-900 break-all max-w-xs">
                      {item.email}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium align-top">
                  {editingId === item.id ? (
                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={saveEdit} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200">
                        Save
                      </button>
                      <button onClick={cancelEdit} className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => startEdit(item)} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors duration-200">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200">
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'No people found matching your search.' : 'No people available.'}
        </div>
      )}
    </div>
  );
};

export default Spreadsheet;
