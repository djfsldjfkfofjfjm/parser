/**
 * Экспорт функций для работы с деревом URL
 */

// Импорт и реэкспорт функций из модулей
export * from './dom-handlers.js';
export * from './data-builder.js';
export * from './tree-operations.js';
export * from './tree-initializer.js';

// Создаем и экспортируем композитный объект со всеми функциями
import * as domHandlers from './dom-handlers.js';
import * as dataBuilder from './data-builder.js';
import * as treeOperations from './tree-operations.js';
import * as initializer from './tree-initializer.js';

// Объединяем все функции в один экспортируемый объект
const treeHelper = {
    ...domHandlers,
    ...dataBuilder,
    ...treeOperations,
    ...initializer
};

// Экспортируем по умолчанию объединенный объект
export default treeHelper;

console.log('Tree Helper modules loaded'); 