// Реэкспорт утилит из модулей
export { safeGetTextContent, showProgress, hideProgress, switchTab, copyContent } from './ui-utils.js';

// Импортируем и реэкспортируем treeHelper из новой модульной структуры
import treeHelper from './tree/index.js';
export { treeHelper };

// Экспортируем функции дерева напрямую для обратной совместимости
export {
    adjustNodeHeights,
    refreshSelectionButtons,
    getJsTreeDomId,
    setupTreeEventListeners,
    buildTreeData,
    getParentPath,
    generateId,
    searchTree,
    isTreeReady,
    selectAllPages,
    getUrlsFromSelectedNodes,
    selectNodesByUrl,
    markAllNodesAsSelectable,
    highlightSelectableCategories,
    buildTreeFromCrawl,
    getSelectedUrls,
    initializeSiteTree
} from './tree/index.js';

console.log("Utils module loaded"); 