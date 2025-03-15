/**
 * Модуль для инициализации дерева URL
 */

import { 
    setupTreeEventListeners, 
    highlightSelectableCategories, 
    markAllNodesAsSelectable,
    refreshSelectionButtons,
    adjustNodeHeights,
    buildTreeFromCrawl,
    initializeSiteTree,
    addSelectionButtonsToMainCategories
} from './index.js';

/**
 * Инициализирует дерево URL с данными сканирования
 * @param {Object} crawlData - Данные сканирования сайта
 * @param {Object} options - Параметры инициализации
 * @returns {Object} Объект с методами управления деревом
 */
export function initializeUrlTree(crawlData, options = {}) {
    console.log('Инициализация дерева URL с данными сканирования:', crawlData);
    
    // Строим данные дерева и инициализируем jsTree
    const treeData = initializeSiteTree(crawlData, buildTreeFromCrawl);
    
    // Настраиваем обработчики событий
    setupTreeEventListeners();
    
    // Добавляем таймер для выполнения функций после полной инициализации дерева
    setTimeout(() => {
        console.log('Настройка дополнительных функций дерева...');
        markAllNodesAsSelectable();
        highlightSelectableCategories();
        
        // Добавляем кнопки выбора только к основным категориям
        addSelectionButtonsToMainCategories();
        
        // Регулируем высоту узлов
        adjustNodeHeights();
        
        // Выполняем пользовательский callback, если он предоставлен
        if (options.onReady && typeof options.onReady === 'function') {
            options.onReady(treeData);
        }
    }, 500);
    
    // Возвращаем объект управления
    return {
        treeData,
        refresh: () => {
            addSelectionButtonsToMainCategories(); // Обновляем кнопки
            refreshSelectionButtons();
            adjustNodeHeights();
        }
    };
}

export default {
    initializeUrlTree
}; 