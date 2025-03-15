// Импортируем необходимые функции и константы из других модулей
import { 
    safeGetTextContent, 
    showProgress, 
    hideProgress, 
    switchTab, 
    copyContent,
    treeHelper
} from './utils/index.js';
import { 
    FIRECRAWL_API_KEY, 
    GEMINI_API_KEY,
    FIRECRAWL_RATE_LIMIT,
    GEMINI_RATE_LIMIT,
    MINUTE, 
    getWebsiteMapDirect as getWebsiteMap
} from './api/index.js';
import { 
    getPageTitle as getPageTitleWithCache,
    initializeTree,
    buildUrlTree
} from './services/index.js';
import {
    initUIHandlers,
    initTreeFilterHandlers,
    initPromptEditor,
    parseSelectedUrls,
    processContentWithGemini,
    createKnowledgeBase
} from './handlers/index.js';
import { 
    extractionPrompt, 
    knowledgeBasePrompt,
    extractionPromptConfig,
    knowledgeBasePromptConfig,
    buildExtractionPrompt,
    buildKnowledgeBasePrompt
} from './prompts/index.js';

console.log("Main module loaded");

// Ждем загрузку DOM
document.addEventListener('DOMContentLoaded', () => {
    // Глобальные обработчики ошибок
    window.addEventListener('error', function(event) {
        console.error('Глобальная ошибка:', event.error);
        event.preventDefault();
        return false; // Предотвращает стандартную обработку ошибок браузера
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.error('Необработанное отклонение промиса:', event.reason);
        event.preventDefault();
    });

    // Предотвращаем отправку форм, которая может вызывать перезагрузку страницы
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Предотвращена отправка формы');
        });
    });

    // Убеждаемся, что все кнопки имеют type="button", а не type="submit"
    document.querySelectorAll('button').forEach(button => {
        if (!button.type || button.type === 'submit') {
            button.type = 'button';
            console.log('Изменен тип кнопки на button:', button.id || 'безымянная кнопка');
        }
    });

    // DOM элементы
    const elements = {
        websiteUrlInput: document.getElementById('websiteUrl'),
        startButton: document.getElementById('startButton'),
        progressContainer: document.getElementById('progress'),
        progressBar: document.getElementById('progress')?.querySelector('.progress-bar'),
        progressFill: document.getElementById('progress')?.querySelector('.progress-bar')?.querySelector('.progress-fill'),
        progressText: document.getElementById('progress')?.querySelector('.progress-text'),
        progressDetails: document.getElementById('progress')?.querySelector('.progress-details'),
        pageSelection: document.getElementById('pageSelection'),
        pagesSearch: document.getElementById('pagesSearch'),
        pagesTree: document.getElementById('pagesTree'),
        selectAllBtn: document.getElementById('selectAll'),
        selectHomepageBtn: document.getElementById('selectHomepage'),
        deselectAllBtn: document.getElementById('deselectAll'),
        parseSelectedBtn: document.getElementById('parseSelected'),
        resultsBlock: document.getElementById('results'),
        parsingResultsDiv: document.getElementById('parsing-results'),
        processedResultsDiv: document.getElementById('processed-results'),
        knowledgeBaseDiv: document.getElementById('knowledge-base'),
        knowledgeBaseContent: document.getElementById('knowledge-base')?.querySelector('.knowledge-base-content'),
        processWithGeminiBtn: document.getElementById('processWithGemini'),
        createKnowledgeBaseBtn: document.getElementById('createKnowledgeBase'),
        copyRawResultsBtn: document.getElementById('copyRawResults'),
        copyProcessedResultsBtn: document.getElementById('copyProcessedResults'),
        copyKnowledgeBaseBtn: document.getElementById('copyKnowledgeBase'),
        clearRawResultsBtn: document.getElementById('clearRawResults'),
        clearProcessedResultsBtn: document.getElementById('clearProcessedResults'),
        clearKnowledgeBaseBtn: document.getElementById('clearKnowledgeBase'),
        showRawBtn: document.getElementById('showRawBtn'),
        showProcessedBtn: document.getElementById('showProcessedBtn'),
        showKnowledgeBaseBtn: document.getElementById('showKnowledgeBaseBtn'),
        processingProgress: document.getElementById('processing-progress'),
        processingFill: document.getElementById('processing-progress')?.querySelector('.progress-fill'),
        processingText: document.getElementById('processing-progress')?.querySelector('.progress-text'),
        processingDetails: document.getElementById('processing-progress')?.querySelector('.progress-details'),
        clearCacheButton: document.getElementById('clearCacheButton'),
        // Элемент может отсутствовать в текущей версии HTML
        promptEditorContainer: document.getElementById('prompt-editor-container')
    };

    // Инициализация промптов
    const prompts = {
        extraction: extractionPrompt,
        knowledgeBase: knowledgeBasePrompt,
        configs: {
            extraction: extractionPromptConfig,
            knowledgeBase: knowledgeBasePromptConfig
        },
        builders: {
            extraction: buildExtractionPrompt,
            knowledgeBase: buildKnowledgeBasePrompt
        }
    };
    
    // Колбэк для обновления промптов
    const onPromptChange = (type, newPrompt) => {
        if (type === 'extraction') {
            prompts.extraction = newPrompt;
        } else if (type === 'knowledgeBase') {
            prompts.knowledgeBase = newPrompt;
        }
        console.log(`Промпт типа "${type}" обновлен`);
    };

    // Проверяем наличие всех необходимых элементов
    if (!elements.progressContainer || !elements.progressFill || !elements.progressText || !elements.progressDetails) {
        console.error('Не удалось найти элементы прогресс-бара, некоторые функции могут не работать');
    }

    if (!elements.parsingResultsDiv || !elements.processedResultsDiv || !elements.knowledgeBaseContent) {
        console.error('Не удалось найти элементы для отображения результатов, функциональность ограничена');
    }

    // Инициализация обработчиков UI
    initUIHandlers(elements, treeHelper.getSelectedUrls);
    
    // Инициализация обработчиков для фильтров дерева
    initTreeFilterHandlers(elements, treeHelper);
    
    // Инициализация редактора промптов
    initPromptEditor(elements, prompts, onPromptChange);

    // Получить структуру сайта
    elements.startButton.addEventListener('click', async () => {
        let websiteUrl = elements.websiteUrlInput.value.trim();
        if (!websiteUrl) {
            alert('Пожалуйста, введите URL сайта.');
            return;
        }

        if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
            websiteUrl = "https://" + websiteUrl;
        }

        try {
            const urlObject = new URL(websiteUrl);
            websiteUrl = urlObject.href;
        } catch (error) {
            alert('Пожалуйста, введите корректный URL сайта.');
            return;
        }

        showProgress(elements.progressContainer, elements.progressFill, elements.progressText, elements.progressDetails, 'Получение структуры сайта...', 20);

        try {
            const data = await getWebsiteMap(websiteUrl);
            const links = data.links || [];
            const baseUrl = new URL(websiteUrl).origin;
            
            // Сохраняем результаты сканирования и baseUrl в глобальную переменную
            window.crawlResults = {
                baseUrl: baseUrl,
                links: links,
                date: new Date().toISOString()
            };
            console.log('URL базового сайта сохранен:', baseUrl);

            // Создаем древовидную структуру
            const treeData = buildUrlTree(links, baseUrl);
            
            // Инициализируем jsTree
            initializeTree(treeData);

            elements.pageSelection.style.display = 'block';
            
            // Тестируем функцию getPageTitleWithCache с одним URL
            console.log('Тестирование функции getPageTitleWithCache с URL:', baseUrl);
            try {
                const testTitle = await getPageTitleWithCache(baseUrl);
                console.log('Результат тестирования getPageTitleWithCache:', testTitle);
            } catch (testError) {
                console.error('Ошибка при тестировании getPageTitleWithCache:', testError);
            }
            
            console.log('Автоматическое обновление заголовков отключено');
            
            hideProgress(elements.progressContainer);

        } catch (error) {
            console.error('Ошибка получения структуры сайта:', error);
            alert('Не удалось получить структуру сайта. Проверьте консоль для деталей.');
            hideProgress(elements.progressContainer);
        }
    });
});