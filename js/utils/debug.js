/**
 * Enhanced Debug utility to help diagnose jstree and URL selection issues
 */

function debugTreeSelections() {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) {
        console.error('Tree not initialized');
        return;
    }
    
    console.group('JSTree Selection Debug');
    
    const selectedIds = tree.get_selected();
    console.log('Selected IDs:', selectedIds);
    
    const selectedNodes = tree.get_selected(true);
    console.log('Selected nodes:', selectedNodes);
    
    // Check for URL in different possible locations
    const urlsFound = [];
    selectedNodes.forEach(node => {
        console.group(`Node ID: ${node.id}`);
        console.log('Full node object:', node);
        
        if (node.original && node.original.url) {
            console.log('URL from node.original.url:', node.original.url);
            urlsFound.push({source: 'original.url', url: node.original.url});
        }
        
        if (node.data && node.data.url) {
            console.log('URL from node.data.url:', node.data.url);
            urlsFound.push({source: 'data.url', url: node.data.url});
        }
        
        if (node.a_attr && node.a_attr.href && node.a_attr.href !== '#') {
            console.log('URL from node.a_attr.href:', node.a_attr.href);
            urlsFound.push({source: 'a_attr.href', url: node.a_attr.href});
        }
        
        if (node.li_attr && node.li_attr['data-url']) {
            console.log('URL from node.li_attr[data-url]:', node.li_attr['data-url']);
            urlsFound.push({source: 'li_attr[data-url]', url: node.li_attr['data-url']});
        }
        
        console.groupEnd();
    });
    
    console.log('URLs found by source:', urlsFound);
    console.groupEnd();
}

function inspectTreeStructure() {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) {
        console.error('Tree not initialized');
        return;
    }
    
    console.group('JSTree Structure Debug');
    
    // Get full tree structure
    const treeData = tree.get_json('#', {flat: false});
    console.log('Full tree structure:', treeData);
    
    // Sample some nodes to check URL structure
    const sampleNodes = tree.get_json('#', {flat: true}).slice(0, 5);
    console.log('Sample nodes (first 5):', sampleNodes);
    
    console.groupEnd();
}

function fixSelection() {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) {
        console.error('Tree not initialized');
        return;
    }
    
    // Get all leaf nodes (pages)
    const allNodes = tree.get_json('#', {flat: true});
    const pageNodes = allNodes.filter(node => 
        (node.original && node.original.url) || 
        (node.data && node.data.url) || 
        (node.type === 'page'));
    
    if (pageNodes.length > 0) {
        // Select first 3 nodes as a test
        const nodesToSelect = pageNodes.slice(0, 3).map(node => node.id);
        tree.select_node(nodesToSelect);
        console.log('Auto-selected nodes:', nodesToSelect);
    } else {
        console.error('No page nodes found to select');
    }
}

// Add debug buttons
document.addEventListener('DOMContentLoaded', () => {
    const buttonStyles = `
        position: fixed;
        z-index: 9999;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        color: white;
        margin: 5px;
    `;
    
    // Debug Selection button
    const debugBtn = document.createElement('button');
    debugBtn.textContent = 'Debug Selection';
    debugBtn.style.cssText = buttonStyles;
    debugBtn.style.bottom = '10px';
    debugBtn.style.right = '10px';
    debugBtn.style.backgroundColor = '#ff9800';
    debugBtn.addEventListener('click', debugTreeSelections);
    
    // Inspect Tree button
    const inspectBtn = document.createElement('button');
    inspectBtn.textContent = 'Inspect Tree';
    inspectBtn.style.cssText = buttonStyles;
    inspectBtn.style.bottom = '10px';
    inspectBtn.style.right = '150px';
    inspectBtn.style.backgroundColor = '#2196F3';
    inspectBtn.addEventListener('click', inspectTreeStructure);
    
    // Test Fix button
    const fixBtn = document.createElement('button');
    fixBtn.textContent = 'Auto-Select (Test)';
    fixBtn.style.cssText = buttonStyles;
    fixBtn.style.bottom = '10px';
    fixBtn.style.right = '260px';
    fixBtn.style.backgroundColor = '#4CAF50';
    fixBtn.addEventListener('click', fixSelection);
    
    document.body.appendChild(debugBtn);
    document.body.appendChild(inspectBtn);
    document.body.appendChild(fixBtn);
    
    console.log('Enhanced debug tools initialized');
});
