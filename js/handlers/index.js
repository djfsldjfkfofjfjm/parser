/**
 * Индексный файл для экспорта всех обработчиков событий
 */

import * as pageProcessing from './page-processing.js';
import * as knowledgeBase from './knowledge-base.js';
import * as uiHandlers from './ui-handlers.js';

/**
 * Экспорт обработчиков событий для обработки страниц
 */
export const {
    parseUrl,
    parseSelectedUrls,
    processContentWithGemini
} = pageProcessing;

/**
 * Экспорт обработчиков событий для работы с базой знаний
 */
export const {
    createKnowledgeBase,
    formatKnowledgeBase,
    exportKnowledgeBase,
    analyzeKnowledgeBase
} = knowledgeBase;

/**
 * Экспорт обработчиков UI-элементов
 */
export const {
    initUIHandlers,
    initTreeFilterHandlers,
    initPromptEditor
} = uiHandlers;

/**
 * Экспорт всех обработчиков как объекта по умолчанию
 */
export default {
    ...pageProcessing,
    ...knowledgeBase,
    ...uiHandlers
}; 