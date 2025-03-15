/**
 * Обработчики функциональности создания базы знаний
 */

import { showProgress, hideProgress, safeGetTextContent } from '../utils/index.js';
import { processWithGemini } from '../api/index.js';
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
        // Проверка входных параметров
        if (!processedBlocks || !Array.from(processedBlocks).length) {
            console.error('Нет данных для создания базы знаний');
            knowledgeBaseContent.textContent = 'Нет данных для создания базы знаний. Пожалуйста, сначала обработайте страницы.';
            hideProgress(processingProgress);
            return null;
        }
        
        // Безопасное извлечение контента
        const allProcessedContent = Array.from(processedBlocks)
            .map(block => {
                try {
                    const url = safeGetTextContent(block, 'h3', 'Неизвестный URL');
                    const content = safeGetTextContent(block, 'pre', '');
                    if (!content) return '';
                    return `
URL: ${url}
Информация: ${content}
-------------------
`;
                } catch (e) {
                    console.error('Ошибка при обработке блока:', e);
                    return '';
                }
            })
            .filter(content => content)
            .join('\n');
            
        if (!allProcessedContent.trim()) {
            console.error('Нет данных для отправки в Gemini');
            knowledgeBaseContent.textContent = 'Не удалось собрать данные для базы знаний.';
            hideProgress(processingProgress);
            return null;
        }

        // Показываем прогресс перед отправкой запроса
        showProgress(processingProgress, processingFill, processingText, processingDetails,
            'Отправка данных в Gemini для создания базы знаний...', 50);

        // Вывод размера контента для диагностики
        console.log(`Отправка базы знаний в Gemini, размер контента: ${allProcessedContent.length} символов, ${Array.from(processedBlocks).length} блоков`);
            
        // Безопасный вызов Gemini API
        let knowledgeBase;
        try {
            knowledgeBase = await processWithGemini('knowledgeBase', allProcessedContent, knowledgeBasePrompt);
            
            // Проверка результата
            if (!knowledgeBase || typeof knowledgeBase !== 'string' || knowledgeBase.startsWith('Ошибка')) {
                console.error('Получена ошибка от Gemini API:', knowledgeBase);
                knowledgeBaseContent.textContent = knowledgeBase || 'Ошибка при создании базы знаний';
                hideProgress(processingProgress);
                return null;
            }
        } catch (geminiError) {
            console.error('Ошибка при обработке через Gemini:', geminiError);
            knowledgeBaseContent.textContent = 'Произошла ошибка при обработке данных через Gemini';
            hideProgress(processingProgress);
            return null;
        }

        // Безопасное обновление DOM
        try {
            // Ограничение размера для предотвращения проблем с DOM
            const MAX_HTML_SIZE = 1000000;
            if (knowledgeBase.length > MAX_HTML_SIZE) {
                knowledgeBase = knowledgeBase.substring(0, MAX_HTML_SIZE) + '... (Текст был сокращен из-за большого размера)';
            }
            
            // Безопасное обновление HTML
            knowledgeBaseContent.innerHTML = '';  // Сначала очищаем
            knowledgeBaseContent.textContent = knowledgeBase;  // Используем textContent для безопасности
            
            // Затем делаем замену переносов строк на <br>
            knowledgeBaseContent.innerHTML = knowledgeBaseContent.textContent.replace(/\n/g, '<br>');
        } catch (domError) {
            console.error('Ошибка при обновлении DOM:', domError);
            
            // Попытка использовать более безопасный метод
            try {
                knowledgeBaseContent.textContent = 'Не удалось отобразить результат целиком. Текст базы знаний: ' + 
                    knowledgeBase.substring(0, 10000) + '... (сокращено)';
            } catch (e) {
                knowledgeBaseContent.textContent = 'Ошибка отображения результата.';
            }
        }
        
        hideProgress(processingProgress);
        return knowledgeBase;

    } catch (error) {
        console.error('Критическая ошибка создания базы знаний:', error);
        hideProgress(processingProgress);
        
        // Безопасное обновление DOM
        try {
            knowledgeBaseContent.textContent = 'Произошла ошибка при создании базы знаний: ' + error.message;
        } catch (e) {
            console.error('Не удалось обновить DOM после ошибки:', e);
        }
        
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