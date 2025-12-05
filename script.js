const refreshSheetBtn = document.getElementById('refreshSheetBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const cardContainer = document.getElementById('cardContainer');
const filterButtons = document.getElementById('filterButtons');

// Google Sheet URL
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1mxjbNbemtxisdtMnEhU7csgYlIqpS5nAZDYfou9DDSQ/edit?usp=sharing';

// Store available page categories
const pageCategories = new Set();

// Load saved cards from localStorage
loadSavedCards();

// Load cards from Google Sheet on page load
loadCardsFromGoogleSheet();

// Filter button click handlers
filterButtons.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        // Update active state
        filterButtons.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        // Filter cards
        const filter = e.target.dataset.filter;
        filterCards(filter);
    }
});

refreshSheetBtn.addEventListener('click', loadCardsFromGoogleSheet);

// Filter cards by page category
function filterCards(filter) {
    const cards = document.querySelectorAll('.preview-card');
    cards.forEach(card => {
        if (filter === 'all' || card.dataset.pageCategory === filter) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Update filter buttons based on available page categories
function updateFilterButtons() {
    // Clear existing buttons except "All"
    const allBtn = filterButtons.querySelector('[data-filter="all"]');
    filterButtons.innerHTML = '';
    filterButtons.appendChild(allBtn);
    
    // Add buttons for each page category
    const sortedCategories = Array.from(pageCategories).sort();
    sortedCategories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.filter = category;
        btn.textContent = category;
        filterButtons.appendChild(btn);
    });
}


async function fetchPageMetadata(url) {
    try {
        // Use a CORS proxy to fetch the page metadata
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (data.contents) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, 'text/html');
            const title = doc.querySelector('title');
            const metaDescription = doc.querySelector('meta[name="description"]') || 
                                   doc.querySelector('meta[property="og:description"]');
            
            return {
                title: title ? title.textContent.trim() : extractDomain(url),
                description: metaDescription ? metaDescription.getAttribute('content').trim() : null
            };
        }
    } catch (e) {
        console.warn('Could not fetch metadata:', e);
    }
    return {
        title: extractDomain(url),
        description: null
    };
}

function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch (e) {
        return url;
    }
}

// Helper function to add detail items to the details grid
function addDetailItem(container, label, value, status = '') {
    const detailItem = document.createElement('div');
    detailItem.className = 'detail-item';
    if (status) {
        detailItem.classList.add(`detail-${status}`);
    }
    
    const detailLabel = document.createElement('div');
    detailLabel.className = 'detail-label';
    detailLabel.textContent = label + ':';
    
    const detailValue = document.createElement('div');
    detailValue.className = 'detail-value';
    detailValue.textContent = value;
    
    detailItem.appendChild(detailLabel);
    detailItem.appendChild(detailValue);
    container.appendChild(detailItem);
}


function createCard(data, url) {
    const card = document.createElement('div');
    card.className = 'preview-card';
    card.dataset.url = url;
    
    // Add page category for filtering
    if (data.sheetData && data.sheetData.Page) {
        const pageCategory = data.sheetData.Page.trim();
        card.dataset.pageCategory = pageCategory;
        pageCategories.add(pageCategory);
        updateFilterButtons();
    }

    // Card Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const titleSection = document.createElement('div');
    titleSection.className = 'card-title-section';

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = data.title || data.domain;
    title.title = data.title || data.domain;

    const domain = document.createElement('div');
    domain.className = 'card-domain';
    domain.textContent = data.domain;

    titleSection.appendChild(title);
    titleSection.appendChild(domain);

    // View Mode Switcher
    const viewSwitcher = document.createElement('div');
    viewSwitcher.className = 'view-switcher';

    const desktopBtn = document.createElement('button');
    desktopBtn.className = 'view-btn active';
    desktopBtn.dataset.view = 'desktop';
    desktopBtn.innerHTML = '🖥️ Desktop';
    desktopBtn.onclick = () => switchView(card, 'desktop');

    const mobileBtn = document.createElement('button');
    mobileBtn.className = 'view-btn';
    mobileBtn.dataset.view = 'mobile';
    mobileBtn.innerHTML = '📱 Mobile';
    mobileBtn.onclick = () => switchView(card, 'mobile');

    viewSwitcher.appendChild(desktopBtn);
    viewSwitcher.appendChild(mobileBtn);

    header.appendChild(titleSection);
    header.appendChild(viewSwitcher);

    // Card Preview with iframe
    const preview = document.createElement('div');
    preview.className = 'card-preview';

    // Browser Frame
    const browserFrame = document.createElement('div');
    browserFrame.className = 'browser-frame';

    // Browser Chrome (top bar)
    const browserChrome = document.createElement('div');
    browserChrome.className = 'browser-chrome';

    const browserDots = document.createElement('div');
    browserDots.className = 'browser-dots';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'browser-dot';
        browserDots.appendChild(dot);
    }

    const urlBar = document.createElement('div');
    urlBar.className = 'browser-url-bar';
    urlBar.textContent = url;
    urlBar.title = url;

    browserChrome.appendChild(browserDots);
    browserChrome.appendChild(urlBar);

    // Browser Content Area
    const browserContent = document.createElement('div');
    browserContent.className = 'browser-content';

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'iframe-loading';
    loadingDiv.innerHTML = '<div class="spinner"></div><p>Loading page...</p>';

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = 'fullscreen';
    iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation';
    iframe.setAttribute('width', '1920');
    iframe.setAttribute('height', '1080');
    iframe.style.width = '1920px';
    iframe.style.height = '1080px';
    iframe.style.minWidth = '1920px';
    iframe.style.maxWidth = '1920px';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    
    // Force desktop viewport by setting a wide width
    // Websites check iframe width to determine mobile vs desktop
    
    iframe.onload = () => {
        // Wait a bit for content to render
        setTimeout(() => {
            loadingDiv.remove();
            // Check if iframe loaded successfully
            try {
                // Try to access iframe content (will fail if CORS blocks)
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (!iframeDoc) {
                    throw new Error('Cannot access iframe content');
                }
                // Try to inject viewport meta if possible
                try {
                    const viewport = iframeDoc.querySelector('meta[name="viewport"]');
                    if (viewport) {
                        viewport.setAttribute('content', 'width=1920, initial-scale=1.0');
                    } else {
                        const meta = iframeDoc.createElement('meta');
                        meta.name = 'viewport';
                        meta.content = 'width=1920, initial-scale=1.0';
                        iframeDoc.head.appendChild(meta);
                    }
                } catch (e) {
                    // Can't modify viewport, that's okay
                }
            } catch (e) {
                // Iframe loaded but might be blocked by X-Frame-Options
                // Don't show error immediately, content might still render
            }
        }, 500);
    };

    iframe.onerror = () => {
        loadingDiv.remove();
        showIframeError(browserContent, url);
    };

    // Timeout fallback - remove loading after reasonable time
    setTimeout(() => {
        if (loadingDiv.parentNode) {
            loadingDiv.remove();
            // Assume it loaded even if we can't verify
        }
    }, 8000);

    browserContent.appendChild(loadingDiv);
    browserContent.appendChild(iframe);

    browserFrame.appendChild(browserChrome);
    browserFrame.appendChild(browserContent);

    preview.appendChild(browserFrame);

    card.appendChild(header);
    card.appendChild(preview);

    // Card Details Section
    const detailsSection = document.createElement('div');
    detailsSection.className = 'card-details';
    
    // Show Google Sheet data if available
    if (data.sheetData) {
        // Badges section at the top
        const badgesSection = document.createElement('div');
        badgesSection.className = 'card-badges';
        
        // Page badge (category)
        if (data.sheetData.Page) {
            const pageBadge = document.createElement('span');
            pageBadge.className = 'badge badge-page';
            pageBadge.textContent = data.sheetData.Page;
            badgesSection.appendChild(pageBadge);
        }
        
        // Won/Lost badge
        if (data.sheetData['Won/Lost']) {
            const wonLost = data.sheetData['Won/Lost'].toLowerCase();
            const statusBadge = document.createElement('span');
            statusBadge.className = `badge badge-status badge-${wonLost}`;
            statusBadge.textContent = data.sheetData['Won/Lost'];
            badgesSection.appendChild(statusBadge);
        }
        
        detailsSection.appendChild(badgesSection);
        
        // Details grid
        const detailsGrid = document.createElement('div');
        detailsGrid.className = 'details-grid';
        
        // Product
        if (data.sheetData.product) {
            addDetailItem(detailsGrid, 'Product', data.sheetData.product);
        }
        
        // Test Description
        if (data.sheetData['Test Description']) {
            addDetailItem(detailsGrid, 'Test Description', data.sheetData['Test Description']);
        }
        
        // Revenue Win %
        if (data.sheetData['Revenue Win (or AOV for post-purchase) %']) {
            const revenueWin = data.sheetData['Revenue Win (or AOV for post-purchase) %'];
            addDetailItem(detailsGrid, 'Revenue Win %', revenueWin, revenueWin.startsWith('-') ? 'negative' : 'positive');
        }
        
        // Leads Win %
        if (data.sheetData['Leads Win %']) {
            const leadsWin = data.sheetData['Leads Win %'];
            addDetailItem(detailsGrid, 'Leads Win %', leadsWin, leadsWin.startsWith('-') ? 'negative' : 'positive');
        }
        
        // Number of Leads
        if (data.sheetData['Number of Leads']) {
            addDetailItem(detailsGrid, 'Number of Leads', data.sheetData['Number of Leads']);
        }
        
        // Date Called
        if (data.sheetData['Date Called']) {
            addDetailItem(detailsGrid, 'Date Called', data.sheetData['Date Called']);
        }
        
        detailsSection.appendChild(detailsGrid);
    } else if (data.description) {
        // Fallback to description if no sheet data
        const descriptionText = document.createElement('div');
        descriptionText.className = 'card-description-text';
        descriptionText.textContent = data.description;
        detailsSection.appendChild(descriptionText);
    }
    
    card.appendChild(detailsSection);

    cardContainer.insertBefore(card, cardContainer.firstChild);
    
    // Save card
    saveCard(data, url);
}

function switchView(card, viewMode) {
    const browserFrame = card.querySelector('.browser-frame');
    const preview = card.querySelector('.card-preview');
    const desktopBtn = card.querySelector('.view-btn[data-view="desktop"]');
    const mobileBtn = card.querySelector('.view-btn[data-view="mobile"]');
    const browserContent = card.querySelector('.browser-content');
    const iframe = card.querySelector('iframe');
    
    if (viewMode === 'mobile') {
        // Mobile view: 500px width, scaled down
        browserFrame.style.width = '500px';
        browserFrame.style.maxWidth = '500px';
        browserContent.style.width = '100%';
        browserContent.style.height = '667px';
        iframe.style.width = '100%';
        iframe.style.minWidth = '200px';
        iframe.style.maxWidth = '500px';
        iframe.style.height = '667px';
        browserFrame.style.transform = 'scale(0.54)';
        preview.style.height = '420px';
        
        desktopBtn.classList.remove('active');
        mobileBtn.classList.add('active');
        browserFrame.dataset.view = 'mobile';
    } else {
        // Desktop view: 1920px width, scaled down
        browserFrame.style.width = '1920px';
        browserFrame.style.maxWidth = '1920px';
        browserContent.style.width = '100%';
        browserContent.style.height = '1080px';
        iframe.style.width = '100%';
        iframe.style.minWidth = '1920px';
        iframe.style.maxWidth = '100%';
        iframe.style.height = '1080px';
        browserFrame.style.transform = 'scale(0.20)';
        preview.style.height = '250px';
        
        desktopBtn.classList.add('active');
        mobileBtn.classList.remove('active');
        browserFrame.dataset.view = 'desktop';
    }
}

function showIframeError(browserContent, url) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'iframe-error';
    errorDiv.innerHTML = `
        <div class="iframe-error-message">
            ⚠️ This page cannot be displayed in an iframe<br>
            (Blocked by X-Frame-Options or CORS policy)
        </div>
        <a href="${url}" target="_blank" class="open-link-btn">Open in New Tab</a>
    `;
    browserContent.innerHTML = '';
    browserContent.appendChild(errorDiv);
}


function cardExists(url) {
    return document.querySelector(`.preview-card[data-url="${url}"]`) !== null;
}

function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
}

function hideError() {
    error.classList.add('hidden');
}


// LocalStorage functions
function saveCard(data, url) {
    const cards = getSavedCards();
    cards.push({ url, data, timestamp: Date.now() });
    localStorage.setItem('previewCards', JSON.stringify(cards));
}

function getSavedCards() {
    const saved = localStorage.getItem('previewCards');
    return saved ? JSON.parse(saved) : [];
}

function removeCardFromStorage(url) {
    const cards = getSavedCards();
    const filtered = cards.filter(card => card.url !== url);
    localStorage.setItem('previewCards', JSON.stringify(filtered));
}

// Convert Google Sheet URL to CSV export URL
function getGoogleSheetCSVUrl(sheetUrl) {
    // Extract sheet ID from URL
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
        throw new Error('Invalid Google Sheet URL');
    }
    const sheetId = match[1];
    
    // Extract gid if present
    const gidMatch = sheetUrl.match(/[#&]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Helper function to parse a CSV line
    function parseCSVLine(line) {
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    currentValue += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of value
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        // Add last value
        values.push(currentValue.trim());
        
        return values;
    }
    
    // Parse header row
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        // Create object from headers and values
        const row = {};
        headers.forEach((header, index) => {
            // Remove surrounding quotes and trim
            const value = (values[index] || '').replace(/^"|"$/g, '').trim();
            row[header] = value;
        });
        
        // Only add row if it has at least one non-empty value
        if (Object.values(row).some(val => val && val.trim())) {
            data.push(row);
        }
    }
    
    return data;
}

// Fetch data from Google Sheet and create cards
async function loadCardsFromGoogleSheet() {
    try {
        showLoading();
        refreshSheetBtn.disabled = true;
        refreshSheetBtn.innerHTML = '<span>🔄 Loading...</span>';
        
        const csvUrl = getGoogleSheetCSVUrl(GOOGLE_SHEET_URL);
        
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch Google Sheet data');
        }
        
        const csvText = await response.text();
        
        // Parse CSV to JSON (array of objects)
        const rows = parseCSV(csvText);
        
        // Log the parsed JSON for debugging
        console.log('Parsed CSV data (JSON):', JSON.stringify(rows, null, 2));
        
        if (rows.length === 0) {
            hideLoading();
            refreshSheetBtn.disabled = false;
            refreshSheetBtn.innerHTML = '<span>🔄 Refresh from Sheet</span>';
            return;
        }
        
        // Process each row and create cards
        let cardsCreated = 0;
        for (const row of rows) {
            // Try to find URL column (case-insensitive search for common column names)
            let url = '';
            let title = '';
            
            // Common column name variations
            const urlColumnNames = ['preview link', 'url', 'link', 'previewlink', 'preview_link'];
            const titleColumnNames = ['product', 'title', 'name', 'funnel name', 'funnelname', 'funnel_name'];
            
            for (const colName of urlColumnNames) {
                const key = Object.keys(row).find(k => k.toLowerCase() === colName.toLowerCase());
                if (key && row[key]) {
                    url = row[key].trim();
                    break;
                }
            }
            
            for (const colName of titleColumnNames) {
                const key = Object.keys(row).find(k => k.toLowerCase() === colName.toLowerCase());
                if (key && row[key]) {
                    title = row[key].trim();
                    break;
                }
            }
            
            // If no title found, use "Test funnel" as default
            if (!title) {
                title = 'Test funnel';
            }
            
            // If URL exists and card doesn't already exist, create it
            if (url) {
                // Validate and normalize URL
                let validUrl;
                try {
                    validUrl = new URL(url);
                } catch (e) {
                    try {
                        validUrl = new URL('https://' + url);
                    } catch (e2) {
                        console.warn(`Invalid URL in sheet: ${url}`);
                        continue;
                    }
                }
                
                const finalUrl = validUrl.href;
                
                // Skip if card already exists
                if (cardExists(finalUrl)) {
                    continue;
                }
                
                // Extract domain
                const domain = extractDomain(finalUrl);
                
                // Try to fetch metadata, but don't wait too long
                try {
                    const metadata = await fetchPageMetadata(finalUrl);
                    createCard({
                        title: title || metadata.title || domain,
                        description: metadata.description,
                        domain: domain,
                        sheetData: row // Pass the full row data
                    }, finalUrl);
                    cardsCreated++;
                } catch (e) {
                    // Create card with basic info if metadata fetch fails
                    createCard({
                        title: title || domain,
                        description: null,
                        domain: domain,
                        sheetData: row // Pass the full row data
                    }, finalUrl);
                    cardsCreated++;
                }
            }
        }
        
        hideLoading();
        refreshSheetBtn.disabled = false;
        refreshSheetBtn.innerHTML = '<span>🔄 Refresh from Sheet</span>';
        
        if (cardsCreated > 0) {
            console.log(`Created ${cardsCreated} card(s) from Google Sheet`);
        }
    } catch (error) {
        console.error('Error loading Google Sheet data:', error);
        hideLoading();
        refreshSheetBtn.disabled = false;
        refreshSheetBtn.innerHTML = '<span>🔄 Refresh from Sheet</span>';
        showError('Failed to load data from Google Sheet. Please check the console for details.');
    }
}

function loadSavedCards() {
    const cards = getSavedCards();
    cards.forEach(({ url, data }) => {
        // Recreate card structure for saved cards
        const card = document.createElement('div');
        card.className = 'preview-card';
        card.dataset.url = url;
        
        // Add page category for filtering
        if (data.sheetData && data.sheetData.Page) {
            const pageCategory = data.sheetData.Page.trim();
            card.dataset.pageCategory = pageCategory;
            pageCategories.add(pageCategory);
            updateFilterButtons();
        }

        const header = document.createElement('div');
        header.className = 'card-header';

        const titleSection = document.createElement('div');
        titleSection.className = 'card-title-section';

        const title = document.createElement('h2');
        title.className = 'card-title';
        title.textContent = data.title || data.domain;
        title.title = data.title || data.domain;

        const domain = document.createElement('div');
        domain.className = 'card-domain';
        domain.textContent = data.domain;

        titleSection.appendChild(title);
        titleSection.appendChild(domain);

        // View Mode Switcher
        const viewSwitcher = document.createElement('div');
        viewSwitcher.className = 'view-switcher';

        const desktopBtn = document.createElement('button');
        desktopBtn.className = 'view-btn active';
        desktopBtn.dataset.view = 'desktop';
        desktopBtn.innerHTML = '🖥️ Desktop';
        desktopBtn.onclick = () => switchView(card, 'desktop');

        const mobileBtn = document.createElement('button');
        mobileBtn.className = 'view-btn';
        mobileBtn.dataset.view = 'mobile';
        mobileBtn.innerHTML = '📱 Mobile';
        mobileBtn.onclick = () => switchView(card, 'mobile');

        viewSwitcher.appendChild(desktopBtn);
        viewSwitcher.appendChild(mobileBtn);

        header.appendChild(titleSection);
        header.appendChild(viewSwitcher);

        const preview = document.createElement('div');
        preview.className = 'card-preview';

        // Browser Frame
        const browserFrame = document.createElement('div');
        browserFrame.className = 'browser-frame';

        // Browser Chrome (top bar)
        const browserChrome = document.createElement('div');
        browserChrome.className = 'browser-chrome';

        const browserDots = document.createElement('div');
        browserDots.className = 'browser-dots';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'browser-dot';
            browserDots.appendChild(dot);
        }

        const urlBar = document.createElement('div');
        urlBar.className = 'browser-url-bar';
        urlBar.textContent = url;
        urlBar.title = url;

        browserChrome.appendChild(browserDots);
        browserChrome.appendChild(urlBar);

        // Browser Content Area
        const browserContent = document.createElement('div');
        browserContent.className = 'browser-content';

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'iframe-loading';
        loadingDiv.innerHTML = '<div class="spinner"></div><p>Loading page...</p>';

        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.allow = 'fullscreen';
        iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation';
        iframe.setAttribute('width', '1920');
        iframe.setAttribute('height', '1080');
        iframe.style.width = '1920px';
        iframe.style.height = '1080px';
        iframe.style.minWidth = '1920px';
        iframe.style.maxWidth = '1920px';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        
        iframe.onload = () => {
            setTimeout(() => {
                loadingDiv.remove();
            }, 500);
        };

        iframe.onerror = () => {
            loadingDiv.remove();
            showIframeError(browserContent, url);
        };

        setTimeout(() => {
            if (loadingDiv.parentNode) {
                loadingDiv.remove();
            }
        }, 8000);

        browserContent.appendChild(loadingDiv);
        browserContent.appendChild(iframe);

        browserFrame.appendChild(browserChrome);
        browserFrame.appendChild(browserContent);

        preview.appendChild(browserFrame);

        card.appendChild(header);
        card.appendChild(preview);

        // Card Details Section
        const detailsSection = document.createElement('div');
        detailsSection.className = 'card-details';
        
        // Show Google Sheet data if available
        if (data.sheetData) {
            // Badges section at the top
            const badgesSection = document.createElement('div');
            badgesSection.className = 'card-badges';
            
            // Page badge (category)
            if (data.sheetData.Page) {
                const pageBadge = document.createElement('span');
                pageBadge.className = 'badge badge-page';
                pageBadge.textContent = data.sheetData.Page;
                badgesSection.appendChild(pageBadge);
            }
            
            // Won/Lost badge
            if (data.sheetData['Won/Lost']) {
                const wonLost = data.sheetData['Won/Lost'].toLowerCase();
                const statusBadge = document.createElement('span');
                statusBadge.className = `badge badge-status badge-${wonLost}`;
                statusBadge.textContent = data.sheetData['Won/Lost'];
                badgesSection.appendChild(statusBadge);
            }
            
            detailsSection.appendChild(badgesSection);
            
            // Details grid
            const detailsGrid = document.createElement('div');
            detailsGrid.className = 'details-grid';
            
            // Product
            if (data.sheetData.product) {
                addDetailItem(detailsGrid, 'Product', data.sheetData.product);
            }
            
            // Test Description
            if (data.sheetData['Test Description']) {
                addDetailItem(detailsGrid, 'Test Description', data.sheetData['Test Description']);
            }
            
            // Revenue Win %
            if (data.sheetData['Revenue Win (or AOV for post-purchase) %']) {
                const revenueWin = data.sheetData['Revenue Win (or AOV for post-purchase) %'];
                addDetailItem(detailsGrid, 'Revenue Win %', revenueWin, revenueWin.startsWith('-') ? 'negative' : 'positive');
            }
            
            // Leads Win %
            if (data.sheetData['Leads Win %']) {
                const leadsWin = data.sheetData['Leads Win %'];
                addDetailItem(detailsGrid, 'Leads Win %', leadsWin, leadsWin.startsWith('-') ? 'negative' : 'positive');
            }
            
            // Number of Leads
            if (data.sheetData['Number of Leads']) {
                addDetailItem(detailsGrid, 'Number of Leads', data.sheetData['Number of Leads']);
            }
            
            // Date Called
            if (data.sheetData['Date Called']) {
                addDetailItem(detailsGrid, 'Date Called', data.sheetData['Date Called']);
            }
            
            detailsSection.appendChild(detailsGrid);
        } else if (data.description) {
            // Fallback to description if no sheet data
            const descriptionText = document.createElement('div');
            descriptionText.className = 'card-description-text';
            descriptionText.textContent = data.description;
            detailsSection.appendChild(descriptionText);
        }
        
        card.appendChild(detailsSection);

        cardContainer.appendChild(card);
    });
}

