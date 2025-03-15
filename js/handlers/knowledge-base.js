/**
 * Обработчики функциональности создания базы знаний
 */

import { showProgress, hideProgress, safeGetTextContent } from '../utils/index.js';
import { processWithGeminiCache } from '../api/index.js';
import { knowledgeBasePrompt } from '../prompts/index.js';

/**
 * Создает базу знаний на основе обработанного контента
 * 
 * @param {NodeList} processedBlocks - Блоки с обработанным контентом
 * @param {HTMLElement} processingProgress - Контейнер прогресса
 * @param {HTMLElement} processingFill - Заполнение прогресс-бара
 * @param {HTMLElement} processingText - Текст прогресса
 * @param {HTMLElement} processingDetails - Детали прогресса
 * @param {HTMLElement} knowledgeBaseContent - Элемент для вывода базы знаний
 * @returns {Promise<string|null>} - Созданная база знаний или null в случае ошибки
 */
export async function createKnowledgeBase(processedBlocks, processingProgress, processingFill, processingText, processingDetails, knowledgeBaseContent) {
    showProgress(processingProgress, processingFill, processingText, processingDetails,
        'Создание базы знаний...', 0);

    try {
        // Собираем контент со всех обработанных блоков
        const allProcessedContent = Array.from(processedBlocks)
            .map(block => {
                const url = safeGetTextContent(block, 'h3', 'Неизвестный URL');
                const content = safeGetTextContent(block, 'pre', '');
                if (!content) return '';
                return `
URL: ${url}
Информация: ${content}
-------------------
`;
            })
            .filter(content => content)
            .join('\n');

        // Показываем прогресс перед отправкой запроса к Gemini
        showProgress(processingProgress, processingFill, processingText, processingDetails,
            'Отправка данных в Gemini для создания базы знаний...', 50);

        // Отправляем в Gemini для создания структурированной базы знаний
        const knowledgeBase = await processWithGeminiCache('knowledgeBase', allProcessedContent, knowledgeBasePrompt);

        // Заменяем переносы строк HTML-тегами для отображения
        knowledgeBaseContent.innerHTML = knowledgeBase.replace(/\n/g, '<br>');
        
        hideProgress(processingProgress);
        return knowledgeBase;

    } catch (error) {
        console.error('Ошибка создания базы знаний:', error);
        hideProgress(processingProgress);
        return null;
    }
}

/**
 * Форматирует базу знаний для более удобного отображения
 * 
 * @param {string} knowledgeBase - Текст базы знаний
 * @returns {string} - Отформатированный текст
 */
export function formatKnowledgeBase(knowledgeBase) {
    if (!knowledgeBase) return '';
    
    // Добавляем стилизацию для заголовков и подзаголовков
    let formatted = knowledgeBase
        // Выделяем заголовки (строки с большими буквами и числами)
        .replace(/^([A-ZА-Я\d\s]{5,})$/gm, '<h2>$1</h2>')
        // Выделяем подзаголовки (строки, начинающиеся с числа или "-")
        .replace(/^(\d+\.\s+|\-\s+)(.+)$/gm, '<h3>$1$2</h3>')
        // Выделяем цены
        .replace(/(\d+[\.,]?\d*\s*(руб|₽))/g, '<strong>$1</strong>')
        // Разделяем блоки информации
        .replace(/^---+$/gm, '<hr>')
        // Добавляем перенос строк
        .replace(/\n/g, '<br>');
    
    return formatted;
}

/**
 * Экспортирует базу знаний в различные форматы
 * 
 * @param {string} knowledgeBase - Текст базы знаний
 * @param {string} format - Формат экспорта ('text', 'html', 'markdown')
 * @returns {string} - Текст в указанном формате
 */
export function exportKnowledgeBase(knowledgeBase, format = 'text') {
    if (!knowledgeBase) return '';
    
    switch (format) {
        case 'html':
            return formatKnowledgeBase(knowledgeBase);
        
        case 'markdown':
            return knowledgeBase
                // Заголовки
                .replace(/^([A-ZА-Я\d\s]{5,})$/gm, '# $1')
                // Подзаголовки
                .replace(/^(\d+\.\s+|\-\s+)(.+)$/gm, '## $1$2')
                // Разделители
                .replace(/^---+$/gm, '---');
        
        case 'text':
        default:
            return knowledgeBase;
    }
}

/**
 * Анализирует базу знаний и выделяет ключевые сущности
 * 
 * @param {string} knowledgeBase - Текст базы знаний
 * @returns {Object} - Объект с ключевыми сущностями
 */
export function analyzeKnowledgeBase(knowledgeBase) {
    if (!knowledgeBase) return { products: [], categories: [], prices: [] };
    
    // Найдем продукты (строки, содержащие цены)
    const products = knowledgeBase.split('\n')
        .filter(line => /\d+[\.,]?\d*\s*(руб|₽)/.test(line))
        .map(line => line.trim());
    
    // Найдем категории (строки с большими буквами)
    const categories = knowledgeBase.split('\n')
        .filter(line => /^[A-ZА-Я\d\s]{5,}$/.test(line))
        .map(line => line.trim());
    
    // Найдем цены
    const priceRegex = /(\d+[\.,]?\d*)\s*(руб|₽)/g;
    const prices = [];
    let match;
    while ((match = priceRegex.exec(knowledgeBase)) !== null) {
        prices.push(parseFloat(match[1].replace(',', '.')));
    }
    
    return {
        products,
        categories,
        prices,
        stats: {
            productCount: products.length,
            categoryCount: categories.length,
            minPrice: prices.length ? Math.min(...prices) : 0,
            maxPrice: prices.length ? Math.max(...prices) : 0,
            avgPrice: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
        }
    };
}

export default {
    createKnowledgeBase,
    formatKnowledgeBase,
    exportKnowledgeBase,
    analyzeKnowledgeBase
}; 