/**
 * Обработчики функциональности создания базы знаний
 */

import { showProgress, hideProgress, safeGetTextContent } from '../utils/index.js';
import { processWithGemini } from '../api/index.js';
import { knowledgeBasePrompt } from '../prompts/index.js';
import { GEMINI_RATE_LIMIT, MINUTE } from '../api/index.js';

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
        
        // Преобразуем NodeList в массив для работы с ним
        const blocksArray = Array.from(processedBlocks);
        
        // Функция для обновления прогресса
        const updateProgress = (processedCount, totalCount) => {
            const progress = (processedCount / totalCount) * 100;
            showProgress(processingProgress, processingFill, processingText, processingDetails,
                'Создание базы знаний...', progress,
                `Обработано ${processedCount} из ${totalCount} групп страниц`);
        };
        
        // Количество страниц в одной группе
        const PAGES_PER_GROUP = 10;
        
        // Количество параллельных запросов
        const CHUNK_SIZE = 1;
        
        // Задержка между чанками запросов
        const DELAY_BETWEEN_CHUNKS = MINUTE / GEMINI_RATE_LIMIT * CHUNK_SIZE;
        
        // Разбиваем на группы по PAGES_PER_GROUP страниц
        const pageGroups = [];
        for (let i = 0; i < blocksArray.length; i += PAGES_PER_GROUP) {
            pageGroups.push(blocksArray.slice(i, i + PAGES_PER_GROUP));
        }
        
        // Массив для хранения результатов обработки каждой группы
        const groupResults = [];
        let processed = 0;
        const totalGroups = pageGroups.length;
        
        // Обрабатываем каждую группу последовательно с задержками
        for (let i = 0; i < pageGroups.length; i++) {
            const group = pageGroups[i];
            
            // Показываем сообщение о задержке, если это не первая группа
            if (i > 0) {
                const waitTime = Math.ceil(DELAY_BETWEEN_CHUNKS / 1000);
                showProgress(processingProgress, processingFill, processingText, processingDetails,
                    'Ожидание перед следующей группой запросов Gemini...', 
                    (processed / totalGroups) * 100,
                    `Пауза ${waitTime} секунд для соблюдения лимита запросов (${GEMINI_RATE_LIMIT} в минуту)`);
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
            }
            
            // Объединяем контент группы
            const groupContent = group
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
            
            if (!groupContent.trim()) {
                console.warn(`Группа ${i+1} не содержит данных для обработки`);
                processed++;
                updateProgress(processed, totalGroups);
                continue;
        }

        // Показываем прогресс перед отправкой запроса
        showProgress(processingProgress, processingFill, processingText, processingDetails,
                `Отправка группы ${i+1} из ${totalGroups} в Gemini...`, 
                (processed / totalGroups) * 100);

        // Вывод размера контента для диагностики
            console.log(`Отправка группы ${i+1} из ${totalGroups} в Gemini, размер контента: ${groupContent.length} символов, ${group.length} блоков`);
            
        // Безопасный вызов Gemini API
        try {
                const groupResult = await processWithGemini(`knowledgeBaseGroup${i+1}`, groupContent, knowledgeBasePrompt);
            
            // Проверка результата
                if (!groupResult || typeof groupResult !== 'string' || groupResult.startsWith('Ошибка')) {
                    console.error(`Получена ошибка от Gemini API для группы ${i+1}:`, groupResult);
                    groupResults.push(`Группа ${i+1}: Ошибка обработки`);
                } else {
                    groupResults.push(groupResult);
            }
        } catch (geminiError) {
                console.error(`Ошибка при обработке группы ${i+1} через Gemini:`, geminiError);
                groupResults.push(`Группа ${i+1}: ${geminiError.message || 'Ошибка обработки'}`);
            }
            
            processed++;
            updateProgress(processed, totalGroups);
        }
        
        // Объединяем результаты всех групп
        let combinedKnowledgeBase = groupResults.join('\n\n');
        
        // Если есть более одной группы, делаем финальный запрос для объединения знаний
        if (groupResults.length > 1) {
            showProgress(processingProgress, processingFill, processingText, processingDetails,
                'Финальное объединение базы знаний...', 90);
                
            // Ждем перед финальным запросом
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
            
            // Финальный запрос для объединения всех результатов
            try {
                const finalPrompt = `Объедини и структурируй следующие фрагменты базы знаний в единую согласованную базу знаний. Устрани повторения и противоречия. Сохрани всю важную информацию о продуктах, ценах и характеристиках:\n\n${combinedKnowledgeBase}`;
                combinedKnowledgeBase = await processWithGemini('finalKnowledgeBase', combinedKnowledgeBase, finalPrompt);
            } catch (finalError) {
                console.error('Ошибка при финальном объединении базы знаний:', finalError);
                // В случае ошибки оставляем простое объединение
            }
        }
        
            // Ограничение размера для предотвращения проблем с DOM
            const MAX_HTML_SIZE = 1000000;
        if (combinedKnowledgeBase.length > MAX_HTML_SIZE) {
            combinedKnowledgeBase = combinedKnowledgeBase.substring(0, MAX_HTML_SIZE) + '... (Текст был сокращен из-за большого размера)';
            }
            
            // Безопасное обновление HTML
        try {
            knowledgeBaseContent.innerHTML = '';  // Сначала очищаем
            knowledgeBaseContent.textContent = combinedKnowledgeBase;  // Используем textContent для безопасности
            
            // Затем делаем замену переносов строк на <br>
            knowledgeBaseContent.innerHTML = knowledgeBaseContent.textContent.replace(/\n/g, '<br>');
        } catch (domError) {
            console.error('Ошибка при обновлении DOM:', domError);
            
            // Попытка использовать более безопасный метод
            try {
                knowledgeBaseContent.textContent = 'Не удалось отобразить результат целиком. Текст базы знаний: ' + 
                    combinedKnowledgeBase.substring(0, 10000) + '... (сокращено)';
            } catch (e) {
                knowledgeBaseContent.textContent = 'Ошибка отображения результата.';
            }
        }
        
        hideProgress(processingProgress);
        return combinedKnowledgeBase;

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