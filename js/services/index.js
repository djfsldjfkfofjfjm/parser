// Реэкспорт всех сервисных функций

// Из page-title-service.js
export { 
    getPageTitleWithCache,
    getBatchPageTitlesWithCache
} from './page-title-service.js';

// Из tree-manager.js
export {
    initializeTree,
    getSelectedUrls,
    updatePageTitles,
    enhanceTreeWithSelectionButtons,
    addSelectionButtonsToAllCategories,
    addSelectionButtonsToNode,
    refreshSelectionButtons
} from './tree-manager.js';

// Из url-tree-builder.js
export {
    buildUrlTree
} from './url-tree-builder.js';

// Из title-extractor.js
export {
    extractTitleFromHTML,
    createTitleFromURL
} from './title-extractor.js';

console.log("Services module loaded"); 