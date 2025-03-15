/**
 * Обработчики функциональности парсинга и обработки страниц
 */

import { showProgress, hideProgress, safeGetTextContent } from '../utils/index.js';
import { parseUrl, processWithGemini } from '../api/index.js';
import { extractionPrompt } from '../prompts/index.js';
import { FIRECRAWL_RATE_LIMIT, MINUTE } from '../api/index.js';

/**
 * Обрабатывает одну страницу сайта
 * 
 * @param {string} url - URL страницы для парсинга
 * @param {HTMLElement} parsingResultsDiv - Элемент для вывода результатов
 * @param {Function} updateProgress - Функция для обновления прогресса
 * @param {number} totalUrls - Общее количество URL для обработки
 * @param {number} processed - Количество уже обработанных URL
 * @param {number} errors - Количество ошибок при обработке
 * @returns {Object} - Объект с обновленными счетчиками и флагом успешности
 */
export async function parseUrlPage(url, parsingResultsDiv, updateProgress, totalUrls, processed, errors) {
    try {
        // Специальная обработка для URL главной страницы
        if (url === window.crawlResults?.baseUrl) {
            console.log(`Обрабатываем URL главной страницы: ${url}`);
        }
        
        // Проверка на JavaScript псевдо-URL и другие невалидные URL
        if (url.startsWith('javascript:') || url === '#' || url === '') {
            console.warn(`Пропуск невалидного URL: ${url}`);
            const errorBlock = document.createElement('div');
            errorBlock.className = 'parsing-results warning';
            errorBlock.innerHTML = `<h3>${url}</h3><p>URL пропущен: JavaScript-ссылка или невалидный URL</p>`;
            parsingResultsDiv.appendChild(errorBlock);
            
            processed++;
            updateProgress(processed, totalUrls, errors);
            return { processed, errors, success: false };
        }
        
        // Попытка нормализовать URL
        try {
            new URL(url); // Проверка на валидность URL
        } catch (urlError) {
            console.warn(`Невалидный URL: ${url}, пропуск`);
            const errorBlock = document.createElement('div');
            errorBlock.className = 'parsing-results warning';
            errorBlock.innerHTML = `<h3>${url}</h3><p>URL пропущен: не является валидным URL (${urlError.message})</p>`;
            parsingResultsDiv.appendChild(errorBlock);
            
            processed++;
            errors++;
            updateProgress(processed, totalUrls, errors);
            return { processed, errors, success: false };
        }
        
        const data = await parseUrl(url);
        const markdownContent = data.data?.markdown || 'Не удалось получить контент';

        const resultBlock = document.createElement('div');
        resultBlock.className = 'parsing-results';
        resultBlock.innerHTML = `<h3>${url}</h3><pre>${markdownContent}</pre>`;
        parsingResultsDiv.appendChild(resultBlock);

        processed++;
        updateProgress(processed, totalUrls, errors);
        return { processed, errors, success: true, resultBlock };

    } catch (error) {
        console.error(`Ошибка парсинга страницы ${url}:`, error);
        const errorBlock = document.createElement('div');
        errorBlock.className = 'parsing-results error';
        errorBlock.innerHTML = `<h3>${url}</h3><p>Ошибка парсинга: ${error.message}</p>`;
        parsingResultsDiv.appendChild(errorBlock);
        
        errors++;
        processed++;
        updateProgress(processed, totalUrls, errors);
        return { processed, errors, success: false };
    }
}

/**
 * Обрабатывает группу URL с паузами для соблюдения лимитов API
 * 
 * @param {Array<string>} selectedUrls - URL для обработки
 * @param {HTMLElement} progressContainer - Контейнер прогресса
 * @param {HTMLElement} progressFill - Заполнение прогресс-бара
 * @param {HTMLElement} progressText - Текст прогресса
 * @param {HTMLElement} progressDetails - Детали прогресса
 * @param {HTMLElement} parsingResultsDiv - Элемент для вывода результатов
 * @returns {Promise<void>}
 */
export async function parseSelectedUrls(selectedUrls, progressContainer, progressFill, progressText, progressDetails, parsingResultsDiv) {
    showProgress(progressContainer, progressFill, progressText, progressDetails, 'Парсинг страниц...', 0);
    parsingResultsDiv.innerHTML = '';
    
    const totalUrls = selectedUrls.length;
    let processed = 0;
    let errors = 0;
    
    // Функция для обновления прогресса
    const updateProgress = (processedCount, totalCount, errorCount) => {
        const progress = (processedCount / totalCount) * 100;
        showProgress(progressContainer, progressFill, progressText, progressDetails, 
            'Парсинг страниц...', progress, 
            `Обработано ${processedCount} из ${totalCount} страниц (ошибок: ${errorCount})`);
    };
    
    // Разбиваем URLs на группы с учетом лимита API
    const CHUNK_SIZE = 3; // Меньший размер группы для снижения вероятности ошибок
    const DELAY_BETWEEN_CHUNKS = MINUTE / FIRECRAWL_RATE_LIMIT * CHUNK_SIZE;
    
    const chunks = [];
    for (let i = 0; i < selectedUrls.length; i += CHUNK_SIZE) {
        chunks.push(selectedUrls.slice(i, i + CHUNK_SIZE));
    }

    // Обрабатываем каждую группу с задержкой
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Показываем сообщение о задержке, если это не первая группа
        if (i > 0) {
            const waitTime = Math.ceil(DELAY_BETWEEN_CHUNKS / 1000);
            showProgress(progressContainer, progressFill, progressText, progressDetails,
                'Ожидание перед следующей группой запросов...', 
                (processed / totalUrls) * 100,
                `Пауза ${waitTime} секунд для соблюдения лимита запросов`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
        }

        // Обрабатываем текущую группу URL
        const results = await Promise.all(chunk.map(url => parseUrlPage(url, parsingResultsDiv, updateProgress, totalUrls, processed, errors)));
        
        // Обновляем счетчики
        processed = results.reduce((acc, result) => result.processed > acc ? result.processed : acc, processed);
        errors = results.reduce((acc, result) => result.errors > acc ? result.errors : acc, errors);
    }

    hideProgress(progressContainer);
    return { processed, errors, totalUrls };
}

/**
 * Обрабатывает полученный контент страниц через Gemini
 * 
 * @param {Array<HTMLElement>} resultBlocks - HTML-блоки с результатами парсинга
 * @param {HTMLElement} processingProgress - Контейнер прогресса обработки
 * @param {HTMLElement} processingFill - Заполнение прогресс-бара
 * @param {HTMLElement} processingText - Текст прогресса
 * @param {HTMLElement} processingDetails - Детали прогресса
 * @param {HTMLElement} processedResultsDiv - Элемент для вывода результатов обработки
 * @param {number} GEMINI_RATE_LIMIT - Лимит запросов к Gemini API
 * @returns {Promise<void>}
 */
export async function processContentWithGemini(resultBlocks, processingProgress, processingFill, processingText, processingDetails, processedResultsDiv, GEMINI_RATE_LIMIT) {
    showProgress(processingProgress, processingFill, processingText, processingDetails, 
        'Обработка через Gemini...', 0);
    processedResultsDiv.innerHTML = '';

    let processed = 0;
    let errors = 0;
    const totalBlocks = resultBlocks.length;
    
    // Функция для обновления прогресса
    const updateProgress = (processedCount, totalCount, errorCount) => {
        const progress = (processedCount / totalCount) * 100;
        showProgress(processingProgress, processingFill, processingText, processingDetails,
            'Обработка через Gemini...', progress,
            `Обработано ${processedCount} из ${totalCount} страниц (ошибок: ${errorCount})`);
    };
    
    // Количество страниц, обрабатываемых за один запрос к Gemini
    const PAGES_PER_REQUEST = 7;
    
    // Количество параллельных запросов
    const CHUNK_SIZE = 3;
    
    const DELAY_BЕТWEEN_CHUNKS = MINUTE / GEMINI_RATE_LIMIT * CHUNK_SIZE;
    
    const blocksArray = Array.from(resultBlocks);
    
    // Разбиваем на группы по 7 страниц
    const pageGroups = [];
    for (let i = 0; i < blocksArray.length; i += PAGES_PER_REQUEST) {
        pageGroups.push(blocksArray.slice(i, i + PAGES_PER_REQUEST));
    }
    
    // Разбиваем группы на чанки для параллельной обработки
    const chunks = [];
    for (let i = 0; i < pageGroups.length; i += CHUNK_SIZE) {
        chunks.push(pageGroups.slice(i, i + CHUNK_SIZE));
    }

    // Обрабатываем каждую группу с задержкой
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Показываем сообщение о задержке, если это не первая группа
        if (i > 0) {
            const waitTime = Math.ceil(DELAY_BЕТWEEN_CHUNKS / 1000);
            showProgress(processingProgress, processingFill, processingText, processingDetails,
                'Ожидание перед следующей группой запросов Gemini...', 
                (processed / totalBlocks) * 100,
                `Пауза ${waitTime} секунд для соблюдения лимита запросов (${GEMINI_RATE_LIMIT} в минуту)`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BЕТWEEN_CHUNKS));
        }

        // Обрабатываем текущую группу блоков (каждая группа - это до 7 страниц)
        await Promise.all(chunk.map(async (pageGroup) => {
            try {
                // ВСЕГДА объединяем контент страниц в группе
                let combinedContent = '';
                const pagesInfo = [];
                
                // Собираем информацию о каждой странице в группе
                pageGroup.forEach(block => {
                    const url = safeGetTextContent(block, 'h3', 'Неизвестный URL');
                    const content = safeGetTextContent(block, 'pre', '');
                    
                    if (!content || content === 'Не удалось получить контент') {
                        console.warn(`Пустой контент для URL: ${url}`);
                        const errorBlock = document.createElement('div');
                        errorBlock.className = 'processed-result warning';
                        errorBlock.innerHTML = `
                            <h3>${url}</h3>
                            <pre>Нет данных для обработки</pre>
                        `;
                        processedResultsDiv.appendChild(errorBlock);
                        processed++;
                        return;
                    }
                    
                    // Добавляем страницу в общий контент
                    combinedContent += `\n\n--- СТРАНИЦА: ${url} ---\n${content}`;
                    pagesInfo.push({ url, block, hasContent: true });
                });
                
                // Если после фильтрации пустого контента ничего не осталось, прекращаем обработку
                if (combinedContent === '') {
                    updateProgress(processed, totalBlocks, errors);
                    return;
                }
                
                // Отправляем один запрос с контентом всех страниц в группе
                const groupKey = pagesInfo.map(p => p.url).join('_').substring(0, 50) + '...';
                console.log(`Отправляем группу из ${pagesInfo.length} страниц в одном запросе`);
                const extractedText = await processWithGemini(groupKey, combinedContent, extractionPrompt);
                
                // Применяем результат ко всем страницам в группе
                pagesInfo.forEach(pageInfo => {
                    if (!pageInfo.hasContent) return;
                    
                    const processedBlock = document.createElement('div');
                    processedBlock.className = 'processed-result';
                    processedBlock.innerHTML = `
                        <h3>${pageInfo.url}</h3>
                        <pre>${extractedText}</pre>
                    `;
                    processedResultsDiv.appendChild(processedBlock);
                    processed++;
                });
                
                updateProgress(processed, totalBlocks, errors);

            } catch (error) {
                console.error('Ошибка обработки через Gemini:', error);
                
                // В случае ошибки отмечаем все страницы в группе как обработанные с ошибкой
                pageGroup.forEach(block => {
                    const url = safeGetTextContent(block, 'h3', 'Неизвестный URL');
                    const errorBlock = document.createElement('div');
                    errorBlock.className = 'processed-result error';
                    errorBlock.innerHTML = `
                        <h3>${url}</h3>
                        <p>Ошибка обработки: ${error.message}</p>
                    `;
                    processedResultsDiv.appendChild(errorBlock);
                    errors++;
                    processed++;
                });
                
                updateProgress(processed, totalBlocks, errors);
            }
        }));
    }

    hideProgress(processingProgress);
    return { processed, errors, totalBlocks };
} 