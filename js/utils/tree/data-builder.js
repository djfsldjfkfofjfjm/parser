/**
 * Функции для построения данных дерева URL
 */

console.log("Data Builder loading...");

/**
 * Построение данных дерева на основе массива URL
 * @param {Array} pages - Массив объектов страниц
 * @returns {Array} Данные дерева для jsTree
 */
export function buildTreeData(pages) {
    // Получаем уникальные URL
    const uniqueUrls = [...new Set(pages.map(page => page.url))];
    
    // Создаем структуру дерева
    const tree = [];
    const nodeMap = {};
    
    uniqueUrls.forEach(url => {
        // Разбор URL для извлечения компонентов пути
        let urlObj;
        try {
            urlObj = new URL(url);
        } catch (e) {
            console.error('Неверный URL:', url);
            return;
        }
        
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        let currentPath = '';
        let parent = '#';
        
        // Обработка каждого компонента пути для создания структуры дерева
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            currentPath += '/' + part;
            const fullPath = urlObj.origin + currentPath;
            const nodeId = 'node_' + fullPath.replace(/[^a-zA-Z0-9]/g, '_');
            
            if (!nodeMap[nodeId]) {
                // Определяем, является ли это конечным узлом (фактической страницей) или категорией
                const isLeaf = i === pathParts.length - 1;
                
                // Создаем данные узла - важно: помечаем все узлы как выбираемые
                // и сохраняем URL для конечных узлов и категорий
                const node = {
                    id: nodeId,
                    text: decodeURIComponent(part),
                    parent: parent,
                    type: isLeaf ? 'page' : 'category',
                    li_attr: {
                        'data-url': fullPath
                    },
                    a_attr: {
                        href: fullPath
                    },
                    // Сохраняем URL в нескольких местах для обеспечения доступа
                    data: {
                        url: fullPath,
                        isCategory: !isLeaf
                    },
                    original: {
                        url: fullPath,
                        isCategory: !isLeaf
                    },
                    state: {
                        // Разрешаем выбор категорий
                        disabled: false
                    }
                };
                
                // Добавляем в дерево, если корневой узел, иначе в nodeMap
                if (parent === '#') {
                    tree.push(node);
                }
                
                nodeMap[nodeId] = node;
            }
            
            parent = nodeId;
        }
    });
    
    return tree;
}

/**
 * Создает данные дерева из результатов сканирования
 * @param {Object} crawlData - Данные сканирования сайта
 * @returns {Array} Данные дерева для jsTree
 */
export function buildTreeFromCrawl(crawlData) {
    if (!crawlData || !crawlData.baseUrl) {
        console.error('Неверные данные сканирования');
        return [];
    }
    
    const baseUrl = crawlData.baseUrl;
    const pages = crawlData.pages || {};
    
    // Создаем корневой узел (домашняя страница)
    const hostname = new URL(baseUrl).hostname;
    const treeData = [{
        id: 'root',
        text: hostname,
        icon: 'jstree-folder',
        state: { opened: true },
        // Убеждаемся, что домашняя страница имеет правильный URL
        url: baseUrl,
        // Также сохраняем URL в нескольких местах для надежного определения
        original: { url: baseUrl },
        data: { url: baseUrl },
        li_attr: { 'data-url': baseUrl },
        a_attr: { href: '#', 'data-url': baseUrl }
    }];
    
    // Обрабатываем все страницы в структуру на основе URL
    const urlMap = {};
    Object.keys(pages).forEach(url => {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            
            // Генерируем вложенный путь для страницы
            let currentPath = '';
            let currentParentId = 'root';
            
            // Создаем сегменты пути по мере необходимости
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                const isLastPart = i === pathParts.length - 1;
                currentPath += '/' + part;
                
                const fullPath = urlObj.origin + currentPath;
                const nodeId = 'node_' + btoa(fullPath).replace(/=/g, '');
                
                // Проверяем, существует ли уже этот узел
                if (!urlMap[nodeId]) {
                    const nodeData = {
                        id: nodeId,
                        text: part,
                        parent: currentParentId,
                        icon: isLastPart ? 'jstree-file' : 'jstree-folder',
                        // Убеждаемся, что URL правильно установлен в нескольких местах
                        url: isLastPart ? url : fullPath,
                        original: { url: isLastPart ? url : fullPath },
                        data: { url: isLastPart ? url : fullPath },
                        li_attr: { 'data-url': isLastPart ? url : fullPath },
                        a_attr: { href: '#', 'data-url': isLastPart ? url : fullPath }
                    };
                    
                    // Если это страница (последняя часть), добавляем тип страницы
                    if (isLastPart) {
                        nodeData.type = 'page';
                    }
                    
                    urlMap[nodeId] = nodeData;
                }
                
                currentParentId = nodeId;
            }
        } catch (e) {
            console.error('Ошибка обработки URL:', url, e);
        }
    });
    
    // Добавляем все узлы в данные дерева
    Object.values(urlMap).forEach(node => {
        treeData.push(node);
    });
    
    return treeData;
}

/**
 * Получает родительский путь из URL
 * @param {string} url - URL для извлечения родительского пути
 * @returns {string|null} Родительский путь или null
 */
export function getParentPath(url) {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length <= 1) {
        return null;
    }
    
    pathParts.pop();
    return urlObj.origin + '/' + pathParts.join('/');
}

/**
 * Генерирует случайный ID для узлов
 * @returns {string} Случайный ID
 */
export function generateId() {
    return 'node_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Ищет в дереве узлы, соответствующие условию поиска
 * @param {Array} tree - Данные дерева
 * @param {string} term - Строка поиска
 * @returns {Array} Отфильтрованные данные дерева
 */
export function searchTree(tree, term) {
    if (!term) return tree;
    
    const termLower = term.toLowerCase();
    
    function filterNodes(nodes) {
        return nodes.filter(node => {
            // Проверяем, соответствует ли этот узел
            const textMatch = node.text.toLowerCase().includes(termLower);
            const urlMatch = node.original && node.original.url && 
                             node.original.url.toLowerCase().includes(termLower);
            
            // Если есть дочерние элементы, рекурсивно фильтруем их
            if (node.children && node.children.length) {
                node.children = filterNodes(node.children);
                // Сохраняем этот узел, если у него есть соответствующие дочерние элементы или он сам соответствует
                return node.children.length > 0 || textMatch || urlMatch;
            }
            
            // Конечный узел - сохраняем, если он соответствует
            return textMatch || urlMatch;
        });
    }
    
    return filterNodes(JSON.parse(JSON.stringify(tree)));
} 