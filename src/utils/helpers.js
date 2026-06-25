/**
 * Smartly repairs and validates URLs for the MultiTab Launcher application.
 */

// Regular expression to check if input has a protocol prefix
const PROTOCOL_REGEX = /^[a-zA-Z0-9+-.]+:\/\//;

// A loose domain/URL validation regex
const URL_VALID_REGEX = /^(?:[a-zA-Z0-9+-.]+:\/\/)?(?:localhost|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(?::\d+)?(?:\/\S*)?$/;

export const smartRepairUrl = (input) => {
  if (!input) return '';
  let trimmed = input.trim();
  if (trimmed === '') return '';

  // If there's no protocol, prepend https://
  if (!PROTOCOL_REGEX.test(trimmed)) {
    // Check if it looks like a relative or directory path, skip if so
    if (trimmed.startsWith('/') || trimmed.startsWith('.')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }
  return trimmed;
};

export const validateUrl = (url) => {
  if (!url) return false;
  const repaired = smartRepairUrl(url);
  return URL_VALID_REGEX.test(repaired);
};

export const parseUrls = (text) => {
  if (!text) return [];
  // Split by linebreaks or commas
  const lines = text.split(/[\n,]+/);
  return lines
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(raw => {
      const repaired = smartRepairUrl(raw);
      const isValid = validateUrl(repaired);
      return {
        raw,
        url: isValid ? repaired : raw,
        isValid
      };
    });
};

export const browserDetect = () => {
  const ua = navigator.userAgent;
  
  // Brave detection
  if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
    return 'Brave';
  }
  
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Chrome/') && !ua.includes('Chromium/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  
  return 'Chrome'; // Default instruction set
};

export const runPopupTest = () => {
  return new Promise((resolve) => {
    try {
      const testWin = window.open('about:blank', '_blank', 'width=100,height=100,left=10000,top=10000');
      if (!testWin || testWin.closed || typeof testWin.closed === 'undefined') {
        resolve(false); // Blocked
      } else {
        testWin.close();
        resolve(true); // Allowed
      }
    } catch (e) {
      resolve(false); // Blocked
    }
  });
};

export const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const exportToCSV = (historyList) => {
  if (!historyList || historyList.length === 0) return '';
  
  const headers = ['ID', 'Timestamp', 'URLs Launched', 'Tab Count', 'Open Mode', 'Session Name', 'Starred'];
  const rows = historyList.map(item => [
    item.id,
    item.timestamp,
    `"${item.urls.join('; ')}"`,
    item.tabCount,
    item.openMode,
    item.sessionName ? `"${item.sessionName}"` : 'None',
    item.starred ? 'true' : 'false'
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(e => e.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `multitab_launcher_history_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importFromCSV = (csvText) => {
  try {
    const lines = csvText.split('\n');
    if (lines.length <= 1) return [];
    
    const results = [];
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Simple parse that handles quotes
      const row = [];
      let inQuotes = false;
      let currentVal = '';
      
      const charArray = lines[i];
      for (let j = 0; j < charArray.length; j++) {
        const char = charArray[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      row.push(currentVal.trim());

      if (row.length >= 5) {
        // Parse URLs list
        const urlsStr = row[2].replace(/"/g, '');
        const urls = urlsStr.includes(';') ? urlsStr.split(';').map(u => u.trim()) : [urlsStr];
        
        results.push({
          id: row[0] || 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          timestamp: row[1] || new Date().toISOString(),
          urls,
          tabCount: parseInt(row[3]) || 1,
          openMode: row[4] === 'window' ? 'window' : 'tab',
          sessionName: row[5] && row[5] !== 'None' ? row[5].replace(/"/g, '') : null,
          starred: row[6] === 'true'
        });
      }
    }
    return results;
  } catch (e) {
    console.error('Error parsing CSV', e);
    return [];
  }
};
