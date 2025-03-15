/**
 * DOM-ориентированные функции для работы с деревом jsTree
 */

// Проверяем, что jQuery загружен
console.log("DOM Handlers loading...");
if (typeof jQuery === 'undefined') {
    console.error("jQuery не загружен! DOM Handlers не могут быть инициализированы.");
}

/**
 * Динамически регулирует высоту узлов на основе их содержимого
 */
export function adjustNodeHeights() {
    $('.jstree-node').each(function() {
        const $node = $(this);
        const $buttons = $node.find('> .node-selection-buttons');
        
        if ($buttons.length) {
            // Получаем высоту кнопок
            const buttonsHeight = $buttons.outerHeight();
            
            // Получаем текущую высоту узла
            const nodeHeight = $node.height();
            
            // Устанавливаем минимальную высоту для размещения кнопок
            const minHeight = Math.max(buttonsHeight + 8, 32); // Добавляем отступ
            
            if (nodeHeight < minHeight) {
                $node.css('min-height', minHeight + 'px');
            }
        }
    });
}

/**
 * Добавляет кнопки выбора только к корневым категориям и элементам,
 * а не ко всем элементам дерева
 */
export function addSelectionButtonsToMainCategories() {
    // Удаляем все существующие кнопки выбора прежде чем добавить новые,
    // чтобы избежать дублирования
    $('.node-selection-buttons').remove();
    
    // Получаем дерево и проверяем, что оно инициализировано
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return;
    
    // Добавляем кнопки только к основным категориям (1 и 2 уровня)
    // и только если они имеют дочерние элементы
    const rootNodes = tree.get_node('#').children;
    
    rootNodes.forEach(nodeId => {
        const node = tree.get_node(nodeId);
        if (node && node.children && node.children.length > 0) {
            addSelectionButtonsToNode(node);
            
            // Для категорий первого уровня также добавим кнопки к их прямым дочерним категориям
            node.children.forEach(childId => {
                const childNode = tree.get_node(childId);
                if (childNode && childNode.children && childNode.children.length > 0) {
                    addSelectionButtonsToNode(childNode);
                }
            });
        }
    });
    
    // Обновляем позиции кнопок
    refreshSelectionButtons();
}

/**
 * Добавляет кнопки выбора к указанному узлу
 */
export function addSelectionButtonsToNode(node) {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return;
    
    const nodeId = node.id;
    const $nodeElement = $(tree.get_node(nodeId, true));
    
    if (!$nodeElement || $nodeElement.length === 0) return;
    
    // Удаляем существующие кнопки у этого узла, если они есть
    $nodeElement.find('> .node-selection-buttons').remove();
    
    // Создаем контейнер для кнопок
    const $buttonsContainer = $('<div class="node-selection-buttons"></div>');
    $buttonsContainer.attr('data-node-id', nodeId);
    
    // Создаем кнопки
    const $selectAllBtn = $('<button class="tree-select-btn">Выбрать все</button>');
    const $deselectBtn = $('<button class="tree-deselect-btn">Снять выбор</button>');
    
    // Добавляем обработчики событий
    $selectAllBtn.on('click', function(e) {
        e.stopPropagation();
        const childIds = tree.get_node(nodeId).children_d;
        if (childIds.length) {
            tree.select_node(childIds);
        } else {
            tree.select_node(nodeId);
        }
    });
    
    $deselectBtn.on('click', function(e) {
        e.stopPropagation();
        const childIds = tree.get_node(nodeId).children_d;
        if (childIds.length) {
            tree.deselect_node(childIds);
        } else {
            tree.deselect_node(nodeId);
        }
    });
    
    // Добавляем кнопки в контейнер
    $buttonsContainer.append($selectAllBtn);
    $buttonsContainer.append($deselectBtn);
    
    // Добавляем контейнер к узлу
    $nodeElement.append($buttonsContainer);
}

/**
 * Обновляет позиционирование кнопок выбора для всех узлов
 */
export function refreshSelectionButtons() {
    $('.node-selection-buttons').each(function() {
        const nodeId = $(this).data('node-id');
        const tree = $('#pagesTree').jstree(true);
        if (!tree) return;
        
        const $nodeElement = $(tree.get_node(nodeId, true));
        if (!$nodeElement || $nodeElement.length === 0) return;
        
        const $anchor = $nodeElement.find('> .jstree-anchor');
        if (!$anchor.length) return;
        
        const anchorPosition = $anchor.position();
        if (!anchorPosition) return;
        
        // Позиционируем кнопки рядом с текстом узла
        $(this).css({
            'position': 'absolute',
            'left': (anchorPosition.left + $anchor.outerWidth() + 10) + 'px',
            'top': (anchorPosition.top + 2) + 'px',
            'z-index': 100 // Убеждаемся, что кнопки будут поверх других элементов
        });
    });
}

/**
 * Получает DOM ID узла jsTree (может отличаться от логического ID)
 */
export function getJsTreeDomId(nodeId) {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return null;
    
    const node = tree.get_node(nodeId, true);
    return node ? node.attr('id') : null;
}

/**
 * Устанавливает обработчики событий для дерева
 */
export function setupTreeEventListeners() {
    // Обновляем кнопки выбора при прокрутке
    $('.tree-container').on('scroll', function() {
        refreshSelectionButtons();
    });
    
    // Обновляем кнопки выбора при открытии/закрытии узлов
    $('#pagesTree').on('open_node.jstree close_node.jstree', function() {
        setTimeout(refreshSelectionButtons, 100);
    });
    
    // Обновляем кнопки выбора при перерисовке дерева
    $('#pagesTree').on('redraw.jstree', function() {
        setTimeout(refreshSelectionButtons, 100);
    });
    
    // Также инициализируем кнопки, когда дерево полностью загружено
    $('#pagesTree').on('ready.jstree', function() {
        setTimeout(function() {
            addSelectionButtonsToMainCategories();
        }, 200);
    });
}

/**
 * Визуально выделяет выбираемые категории
 */
export function highlightSelectableCategories() {
    const tree = $('#pagesTree').jstree(true);
    if (!tree) return;
    
    // Получаем все узлы
    const allNodes = tree.get_json('#', {flat: true});
    
    // Подсвечиваем каждый узел категории, имеющий URL
    allNodes.forEach(node => {
        const treeNode = tree.get_node(node.id);
        if (!treeNode) return;
        
        // Проверяем, является ли узел категорией с URL
        const isCategory = (treeNode.children && treeNode.children.length > 0);
        const hasUrl = (treeNode.original && treeNode.original.url) || 
                      (treeNode.data && treeNode.data.url) ||
                      (treeNode.li_attr && treeNode.li_attr['data-url']) ||
                      (treeNode.a_attr && treeNode.a_attr.href && treeNode.a_attr.href !== '#');
        
        if (isCategory && hasUrl) {
            // Добавляем специальный класс к элементу узла
            const $node = $(tree.get_node(node.id, true));
            if ($node.length) {
                $node.addClass('selectable-category');
                $node.find('> a').css({
                    'font-weight': 'bold',
                    'color': '#2196F3'
                });
            }
        }
    });
}

// Инициализируем DOM обработчики для дерева при загрузке документа
$(document).ready(function() {
    console.log('DOM Handlers готовы к использованию');
}); 