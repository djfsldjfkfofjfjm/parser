/**
 * Операции с деревом jsTree
 */

console.log("Tree Operations loading...");

/**
 * Проверяет, готово ли дерево к использованию
 * @returns {boolean} true, если дерево инициализировано
 */
export function isTreeReady() {
    return $('#pagesTree').jstree(true) !== false;
}

/**
 * Выбирает все узлы страниц в дереве
 * @returns {boolean} true, если успешно
 */
export function selectAllPages() {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return false;
    
    // Находим все узлы с URL (узлы страниц)
    const pageNodes = tree.get_json('#', { flat: true })
        .filter(node => {
            return (node.original && node.original.url) || 
                   (node.data && node.data.url) ||
                   (node.li_attr && node.li_attr['data-url']) ||
                   (node.a_attr && node.a_attr.href && node.a_attr.href !== '#');
        })
        .map(node => node.id);
    
    if (pageNodes.length) {
        tree.select_node(pageNodes);
        return true;
    }
    return false;
}

/**
 * Получает URL из выбранных узлов
 * @returns {Array<string>} Массив URL
 */
export function getUrlsFromSelectedNodes() {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return [];
    
    const selectedNodes = tree.get_selected(true);
    
    // Извлекаем URL из нескольких возможных мест хранения
    const urls = [];
    
    selectedNodes.forEach(node => {
        // Проверяем все возможные места хранения URL
        let url = null;
        
        if (node.original && node.original.url) {
            url = node.original.url;
        } else if (node.data && node.data.url) {
            url = node.data.url;
        } else if (node.a_attr && node.a_attr.href && node.a_attr.href !== '#') {
            url = node.a_attr.href;
        } else if (node.li_attr && node.li_attr['data-url']) {
            url = node.li_attr['data-url'];
        }
        
        if (url && !urls.includes(url)) {
            urls.push(url);
        }
    });
    
    return urls;
}

/**
 * Выбирает узлы по URL
 * @param {string} url - URL для поиска узлов
 * @returns {boolean} true, если найдены и выбраны узлы
 */
export function selectNodesByUrl(url) {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return false;
    
    // Находим узлы с соответствующим URL
    const allNodes = tree.get_json('#', { flat: true });
    const matchingNodes = allNodes.filter(node => {
        return (node.original && node.original.url === url) || 
               (node.data && node.data.url === url) ||
               (node.li_attr && node.li_attr['data-url'] === url) ||
               (node.a_attr && node.a_attr.href === url);
    });
    
    if (matchingNodes.length) {
        tree.select_node(matchingNodes.map(node => node.id));
        return true;
    }
    return false;
}

/**
 * Помечает все узлы (включая категории) как выбираемые
 */
export function markAllNodesAsSelectable() {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return;
    
    // Получаем все узлы
    const allNodes = tree.get_json('#', {flat: true});
    
    // Помечаем каждый узел как выбираемый
    allNodes.forEach(node => {
        tree.set_state(node.id, { disabled: false });
        
        // Убеждаемся, что узлы категорий имеют данные URL
        const treeNode = tree.get_node(node.id);
        if (treeNode) {
            if (!treeNode.original) treeNode.original = {};
            if (!treeNode.data) treeNode.data = {};
            
            // Если узел имеет дочерние элементы и еще не имеет URL, пытаемся его построить
            if (treeNode.children && treeNode.children.length && 
                !treeNode.original.url && !treeNode.data.url) {
                // Пытаемся получить URL из DOM-элемента
                const $node = $(tree.get_node(node.id, true));
                const href = $node.find('a').attr('href');
                if (href && href !== '#') {
                    treeNode.original.url = href;
                    treeNode.data.url = href;
                    treeNode.li_attr = treeNode.li_attr || {};
                    treeNode.li_attr['data-url'] = href;
                }
            }
        }
    });
    
    // Обновляем дерево для применения изменений
    tree.redraw(true);
}

/**
 * Полностью переписанная функция для получения выбранных URL из дерева
 * @returns {Array<string>} Массив URL
 */
export function getSelectedUrls() {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return [];
    
    const selectedNodes = tree.get_selected(true);
    const urls = [];
    
    for (const node of selectedNodes) {
        // Специальная обработка для корневого узла (домашняя страница)
        if (node.id === 'root') {
            // Получаем базовый URL напрямую из результатов сканирования
            if (window.crawlResults && window.crawlResults.baseUrl) {
                urls.push(window.crawlResults.baseUrl);
                console.log('Добавлен URL домашней страницы из crawlResults:', window.crawlResults.baseUrl);
                continue;
            }
            
            // Если crawlResults недоступны, пытаемся получить URL из document.baseURI
            const baseUrl = document.getElementById('websiteUrl')?.value || document.baseURI;
            if (baseUrl && !urls.includes(baseUrl)) {
                try {
                    // Проверяем, что это валидный URL
                    new URL(baseUrl);
                    urls.push(baseUrl);
                    console.log('Добавлен URL домашней страницы из websiteUrl:', baseUrl);
                    continue;
                } catch (e) {
                    console.warn('Невалидный URL домашней страницы:', baseUrl);
                }
            }
        }
        
        // Извлекаем URL из всех возможных мест хранения
        let nodeUrl = null;
        
        // Проверяем в порядке наиболее вероятного расположения
        if (node.li_attr && node.li_attr['data-url']) {
            nodeUrl = node.li_attr['data-url'];
        } else if (node.original && node.original.url) {
            nodeUrl = node.original.url;
        } else if (node.data && node.data.url) {
            nodeUrl = node.data.url;
        } else if (node.a_attr && node.a_attr['data-url']) {
            nodeUrl = node.a_attr['data-url'];
        } else if (node.a_attr && node.a_attr.href && node.a_attr.href !== '#' && !node.a_attr.href.startsWith('javascript:')) {
            nodeUrl = node.a_attr.href;
        }
        
        // Если всё еще нет URL и это корневой узел, пытаемся извлечь из текста
        if (!nodeUrl && node.id === 'root' && node.text) {
            try {
                // Имя домена может быть в тексте узла
                const possibleUrl = `https://${node.text}`;
                new URL(possibleUrl); // Это вызовет исключение, если URL недействителен
                nodeUrl = possibleUrl;
                console.log('Создан URL главной страницы из текста узла:', possibleUrl);
            } catch (e) {
                console.warn('Не удалось создать URL из текста корневого узла:', node.text);
            }
        }
        
        // Если нашли URL, проверяем его на валидность
        if (nodeUrl) {
            // Проверяем очевидно невалидные ссылки
            if (nodeUrl === '#' || nodeUrl === '' || nodeUrl.startsWith('javascript:')) {
                console.warn('Пропущен невалидный URL:', nodeUrl);
            } else {
                // Принимаем URL, если он еще не добавлен
                if (!urls.includes(nodeUrl)) {
                    urls.push(nodeUrl);
                }
            }
        } else {
            console.warn('Узел без URL:', node);
        }
    }
    
    return urls;
}

/**
 * Инициализирует дерево сайта с данными сканирования
 * @param {Object} crawlData - Данные сканирования сайта
 * @returns {Array} Данные дерева
 */
export function initializeSiteTree(crawlData, treeDataBuilder) {
    const treeContainer = $('.tree-container');
    
    // Создаем элемент дерева, если он не существует
    if ($('#pagesTree').length === 0) {
        treeContainer.html('<div id="pagesTree"></div>');
    }
    
    const treeData = treeDataBuilder(crawlData);
    
    // Инициализируем jsTree
    $('#pagesTree').jstree({
        core: {
            data: treeData,
            themes: {
                name: 'default',
                dots: false,
                icons: true
            },
            check_callback: true,
            multiple: true
        },
        types: {
            default: {
                icon: 'jstree-folder'
            },
            page: {
                icon: 'jstree-file'
            }
        },
        plugins: ['types', 'checkbox', 'search', 'state'],
        checkbox: {
            three_state: false,
            cascade: 'down'
        },
        search: {
            show_only_matches: true,
            show_only_matches_children: true
        },
        state: {
            key: 'site_tree_state'
        }
    });
    
    // Обрабатываем события дерева
    $('#pagesTree').on('select_node.jstree', function(e, data) {
        console.log('Выбран узел:', data.node.text, 'URL:', 
                   (data.node.original && data.node.original.url) || 'Н/Д');
    });
    
    // Добавляем функционал поиска
    const searchTimeout = 300;
    let searchTimer = null;
    
    const searchBox = $('#pagesSearch');
    
    searchBox.on('keyup', function() {
        if (searchTimer) clearTimeout(searchTimer);
        const value = $(this).val();
        
        searchTimer = setTimeout(function() {
            $('#pagesTree').jstree(true).search(value);
        }, searchTimeout);
    });
    
    return treeData;
} 