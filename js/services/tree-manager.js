// Импортируем необходимые функции из других модулей
import { getPageTitle, getBatchPageTitles } from './page-title-service.js';
import { showProgress, hideProgress } from '../utils/index.js';
import { treeHelper } from '../utils/index.js';

// Инициализация jsTree
const initializeTree = (treeData) => {
    console.log('Инициализация дерева jsTree с данными:', treeData);
    
    // Уничтожаем существующее дерево, если оно есть
    if ($.jstree.reference('#pagesTree')) {
        console.log('Уничтожение существующего дерева jsTree');
        $('#pagesTree').jstree('destroy');
    }
    
    // Инициализируем новое дерево
    $('#pagesTree').jstree({
        core: {
            data: treeData,
            themes: {
                name: 'default',
                dots: false,
                icons: true
            },
            check_callback: true
        },
        plugins: ['checkbox', 'search', 'types', 'wholerow'],
        types: {
            root: {
                icon: 'jstree-folder'
            },
            folder: {
                icon: 'jstree-folder'
            },
            page: {
                icon: 'jstree-file'
            }
        },
        checkbox: {
            three_state: false, // Отключаем автоматический выбор дочерних элементов
            cascade: '' // Отключаем каскадный выбор
        }
    });
    
    console.log('Дерево jsTree инициализировано');
    
    // Добавляем обработчик для добавления кнопок выбора
    $('#pagesTree').on('ready.jstree', function() {
        enhanceTreeWithSelectionButtons();
    });
    
    // Обработчик события выбора узла
    $('#pagesTree').on('select_node.jstree', function(e, data) {
        // Если это папка, не выбираем автоматически все дочерние элементы
        if (data.node.type === 'folder' || data.node.type === 'root') {
            // Предотвращаем автоматический выбор дочерних элементов
            setTimeout(() => {
                const tree = $('#pagesTree').jstree(true);
                const children = tree.get_node(data.node).children;
                
                // Снимаем выбор с дочерних элементов
                children.forEach(childId => {
                    tree.deselect_node(childId, true);
                });
            }, 0);
        }
    });
    
    // Настройка поиска
    let searchTimeout = false;
    $('#pagesSearch').keyup(function() {
        if(searchTimeout) { clearTimeout(searchTimeout); }
        searchTimeout = setTimeout(function() {
            const v = $('#pagesSearch').val();
            $('#pagesTree').jstree(true).search(v);
        }, 250);
    });
};

// Функция для добавления кнопок выбора ко всем категориям
function enhanceTreeWithSelectionButtons() {
    // Сначала делаем все категории доступными для выбора
    treeHelper.markAllNodesAsSelectable();
    
    // Добавляем кнопки выбора ко всем категориям
    addSelectionButtonsToAllCategories();
    
    // Подсвечиваем категории, которые могут быть выбраны
    treeHelper.highlightSelectableCategories();
    
    // Добавляем кнопки к узлам, когда они открываются
    $('#pagesTree').on('open_node.jstree', function(e, data) {
        setTimeout(() => {
            const nodeId = data.node.id;
            addSelectionButtonsToNode(nodeId);
            
            // Добавляем кнопки ко всем дочерним категориям
            if (data.node.children && data.node.children.length > 0) {
                data.node.children.forEach(childId => {
                    const childNode = $('#pagesTree').jstree(true).get_node(childId);
                    if (childNode && childNode.children && childNode.children.length > 0) {
                        addSelectionButtonsToNode(childId);
                    }
                });
            }
        }, 100);
    });
    
    // Обработчики для кнопок выбора/снятия выбора
    $(document).off('click', '.select-node-all').on('click', '.select-node-all', function(e) {
        e.stopPropagation();
        const nodeId = $(this).parent().data('node-id');
        selectAllInNode(nodeId);
    });
    
    $(document).off('click', '.deselect-node-all').on('click', '.deselect-node-all', function(e) {
        e.stopPropagation();
        const nodeId = $(this).parent().data('node-id');
        deselectAllInNode(nodeId);
    });
    
    // Обновляем положение кнопок при прокрутке
    $('.tree-container').on('scroll', function() {
        setTimeout(refreshSelectionButtons, 50);
    });
}

// Добавляем кнопки выбора ко всем категориям
function addSelectionButtonsToAllCategories() {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return;
    
    // Получаем все узлы
    const allNodes = tree.get_json('#', {flat: true});
    
    // Добавляем кнопки к каждой категории (узел с дочерними элементами)
    allNodes.forEach(node => {
        const treeNode = tree.get_node(node.id);
        if (treeNode && treeNode.children && treeNode.children.length > 0) {
            addSelectionButtonsToNode(node.id);
        }
    });
}

// Добавляем кнопки выбора к конкретному узлу
function addSelectionButtonsToNode(nodeId) {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return;
    
    const node = tree.get_node(nodeId);
    if (!node || !node.children || node.children.length === 0) return;
    
    // Получаем DOM-элемент для узла
    const $nodeElement = $(tree.get_node(nodeId, true));
    if (!$nodeElement || $nodeElement.length === 0) return;
    
    // Проверяем, есть ли уже кнопки
    if ($nodeElement.find('> .node-selection-buttons').length > 0) return;
    
    // Создаем HTML для кнопок
    const buttonsHtml = `
        <div class="node-selection-buttons" data-node-id="${nodeId}">
            <button class="select-node-all">Выбрать все</button>
            <button class="deselect-node-all">Снять выбор</button>
        </div>
    `;
    
    // Добавляем кнопки к узлу
    $nodeElement.append(buttonsHtml);
    
    // Позиционируем кнопки
    positionSelectionButtons($nodeElement);
}

// Функция для позиционирования кнопок
function positionSelectionButtons($nodeElement) {
    const $buttons = $nodeElement.find('> .node-selection-buttons');
    const $anchor = $nodeElement.find('> .jstree-anchor');
    const anchorPosition = $anchor.position();
    
    if (anchorPosition) {
        $buttons.css({
            'position': 'absolute',
            'left': (anchorPosition.left + $anchor.outerWidth() + 5) + 'px',
            'top': (anchorPosition.top + 2) + 'px',
            'z-index': 100
        });
    }
}

// Обновление положения всех кнопок выбора
function refreshSelectionButtons() {
    $('.node-selection-buttons').each(function() {
        const nodeId = $(this).data('node-id');
        const tree = $('#pagesTree').jstree(true);
        if (!tree) return;
        
        const $nodeElement = $(tree.get_node(nodeId, true));
        if (!$nodeElement || $nodeElement.length === 0) return;
        
        positionSelectionButtons($nodeElement);
    });
}

// Выбираем все дочерние элементы узла
function selectAllInNode(nodeId) {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return;
    
    const node = tree.get_node(nodeId);
    if (!node) return;
    
    // Собираем все дочерние элементы
    const descendants = collectDescendants(nodeId);
    
    if (descendants.length > 0) {
        tree.select_node(descendants);
    }
}

// Снимаем выбор со всех дочерних элементов узла
function deselectAllInNode(nodeId) {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return;
    
    const node = tree.get_node(nodeId);
    if (!node) return;
    
    // Собираем все выбранные дочерние элементы
    const selectedDescendants = collectSelectedDescendants(nodeId);
    
    if (selectedDescendants.length > 0) {
        tree.deselect_node(selectedDescendants);
    }
}

// Собираем все дочерние элементы узла
function collectDescendants(nodeId) {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return [];
    
    const descendants = [];
    
    function traverse(id) {
        const node = tree.get_node(id);
        if (!node) return;
        
        // Добавляем текущий узел, если это не корневой узел категории
        if (id !== nodeId) {
            descendants.push(id);
        }
        
        // Обрабатываем дочерние элементы
        if (node.children && node.children.length > 0) {
            node.children.forEach(traverse);
        }
    }
    
    traverse(nodeId);
    return descendants;
}

// Собираем выбранные дочерние элементы узла
function collectSelectedDescendants(nodeId) {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return [];
    
    const selectedDescendants = [];
    
    function traverse(id) {
        const node = tree.get_node(id);
        if (!node) return;
        
        // Если узел выбран и это не корневой узел категории
        if (id !== nodeId && tree.is_selected(id)) {
            selectedDescendants.push(id);
        }
        
        // Обрабатываем дочерние элементы
        if (node.children && node.children.length > 0) {
            node.children.forEach(traverse);
        }
    }
    
    traverse(nodeId);
    return selectedDescendants;
}

// Получение выбранных URL из дерева
const getSelectedUrls = () => {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return [];
    
    const selectedNodes = tree.get_selected(true);
    const urls = [];
    
    selectedNodes.forEach(node => {
        // Специальная обработка для корневого узла (главной страницы)
        if (node.id === 'root') {
            // Пытаемся получить URL главной страницы из разных источников
            let rootUrl = null;
            
            // 1. Проверяем сохраненные результаты сканирования
            if (window.crawlResults && window.crawlResults.baseUrl) {
                rootUrl = window.crawlResults.baseUrl;
            } 
            // 2. Если не нашли, проверяем атрибуты узла
            else if (node.li_attr && node.li_attr['data-url']) {
                rootUrl = node.li_attr['data-url'];
            } 
            else if (node.original && node.original.url) {
                rootUrl = node.original.url;
            }
            
            // 3. Если нашли URL, добавляем его в список
            if (rootUrl && !urls.includes(rootUrl)) {
                urls.push(rootUrl);
                console.log('Добавлен URL главной страницы:', rootUrl);
                // После обработки корневого узла переходим к следующему
                return;
            }
        }
        
        // Для остальных узлов продолжаем обычную обработку
        // Проверяем все возможные места хранения URL в порядке приоритета
        let url = null;
        
        if (node.li_attr && node.li_attr['data-url']) {
            url = node.li_attr['data-url'];
        } else if (node.a_attr && node.a_attr.href && node.a_attr.href !== '#' && !node.a_attr.href.startsWith('javascript:')) {
            url = node.a_attr.href;
        } else if (node.original && node.original.url) {
            url = node.original.url;
        } else if (node.data && node.data.url) {
            url = node.data.url;
        }
        
        if (url && !urls.includes(url)) {
            // Проверка на валидность URL
            if (url !== '#' && !url.startsWith('javascript:')) {
                urls.push(url);
            } else {
                console.warn('Пропущен невалидный URL:', url);
            }
        }
    });
    
    return urls;
};

// Обновление заголовков страниц в дереве
const updatePageTitles = async (selectedUrls, progressContainer, progressFill, progressText, progressDetails) => {
    console.log('Функция updatePageTitles вызвана с параметрами:', selectedUrls);
    
    const tree = $('#pagesTree').jstree(true);
    if (!tree) {
        console.error('Дерево jsTree не инициализировано');
        return;
    }
    
    // Если не переданы URL, используем все URL из дерева
    if (!selectedUrls || selectedUrls.length === 0) {
        console.log('URL не переданы, получаем все URL из дерева');
        selectedUrls = [];
        
        // Получаем все узлы типа 'page'
        const allNodes = tree.get_json('#', { flat: true });
        const pageNodes = allNodes.filter(node => node.type === 'page');
        
        console.log('Найдено узлов типа page:', pageNodes.length);
        
        // Извлекаем URL из атрибутов узлов
        for (const node of pageNodes) {
            if (node.li_attr && node.li_attr['data-url']) {
                selectedUrls.push(node.li_attr['data-url']);
            }
        }
        
        console.log('Извлечено URL из узлов:', selectedUrls.length);
    }
    
    if (selectedUrls.length === 0) {
        console.warn('Нет URL для обновления заголовков');
        return;
    }
    
    showProgress(progressContainer, progressFill, progressText, progressDetails,
        'Получение заголовков страниц...', 0);
    
    const totalUrls = selectedUrls.length;
    
    try {
        console.log('Запуск пакетного получения заголовков для всех URL');
        
        // Получаем заголовки для всех URL в пакетном режиме
        const titleResults = await getBatchPageTitles(selectedUrls, 10); // Оптимальный размер пакета
        
        console.log(`Получены заголовки для ${Object.keys(titleResults).length} URL, обновляем дерево`);
        
        // Обновляем заголовки в дереве
        let processed = 0;
        
        for (const url of selectedUrls) {
            console.log(`Проверка заголовка для URL ${url}`);
            const title = titleResults[url];
            if (!title) {
                console.warn(`Не получен заголовок для URL ${url}`);
                continue;
            }
            
            console.log(`Поиск узла для URL ${url}, заголовок: "${title}"`);
            // Ищем узел с соответствующим URL в атрибуте data-url
            // Получаем все узлы в дереве
            const allNodes = tree.get_json('#', { flat: true });
            console.log(`Всего узлов в дереве: ${allNodes.length}`);
            
            // Перебираем все узлы и ищем соответствующий URL
            let nodeFound = false;
            for (const node of allNodes) {
                if (node.li_attr && node.li_attr['data-url'] === url) {
                    console.log(`Найден узел ${node.id} для URL ${url}`);
                    nodeFound = true;
                    
                    // Получаем текущий текст узла для сравнения
                    const currentText = tree.get_text(node.id);
                    console.log(`Текущий текст узла: "${currentText}", новый текст: "${title}"`);
                    
                    // Формируем новый текст узла, включающий URL и заголовок
                    const newText = `${url} - ${title}`;
                    
                    // Обновляем текст узла через API jsTree
                    tree.rename_node(node.id, newText);
                    console.log(`Обновлен текст узла ${node.id} для URL ${url} на "${newText}" через API jsTree`);
                    
                    // Проверяем, что текст узла действительно обновился
                    const updatedText = tree.get_text(node.id);
                    console.log(`Проверка после обновления: текст узла "${updatedText}"`);
                    
                    if (updatedText !== newText) {
                        console.warn(`Предупреждение: текст узла не обновился корректно. Ожидалось: "${newText}", получено: "${updatedText}"`);
                    }
                    
                    break;
                }
            }
            
            if (!nodeFound) {
                console.warn(`Не найден узел для URL ${url} в дереве jsTree`);
            }
            
            processed++;
            const progress = (processed / totalUrls) * 100;
            showProgress(progressContainer, progressFill, progressText, progressDetails,
                'Обновление заголовков страниц...', progress,
                `Обработано ${processed} из ${totalUrls} URL`);
        }
    } catch (error) {
        console.error('Ошибка при пакетном обновлении заголовков:', error);
    }
    
    hideProgress(progressContainer);
};

// Экспортируем функции
export {
    initializeTree,
    getSelectedUrls,
    updatePageTitles,
    enhanceTreeWithSelectionButtons,
    addSelectionButtonsToAllCategories,
    addSelectionButtonsToNode,
    refreshSelectionButtons
};
