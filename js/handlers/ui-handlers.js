/**
 * Обработчики UI-элементов и функции для работы с интерфейсом
 */

import { switchTab, copyContent } from '../utils/index.js';
import { parseSelectedUrls } from './page-processing.js';
import { processContentWithGemini } from './page-processing.js';
import { createKnowledgeBase } from './knowledge-base.js';
import { GEMINI_RATE_LIMIT } from '../api/index.js';
import { safeGetTextContent } from '../utils/index.js';

/**
 * Функция для скачивания текста в виде TXT файла
 * 
 * @param {string} text - Текст для скачивания
 * @param {string} filename - Имя файла
 */
function downloadTextFile(text, filename) {
    // Создаем Blob с текстом
    const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
    
    // Создаем временную ссылку для скачивания
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    // Добавляем ссылку в документ
    document.body.appendChild(link);
    
    // Симулируем клик по ссылке
    link.click();
    
    // Удаляем ссылку из документа
    document.body.removeChild(link);
}

/**
 * Инициализирует обработчики событий для кнопок и элементов интерфейса
 * 
 * @param {Object} elements - Объект, содержащий DOM-элементы
 * @param {Function} getSelectedUrls - Функция для получения выбранных URL
 */
export function initUIHandlers(elements, getSelectedUrls) {
    // Табы в результатах
    elements.showRawBtn.addEventListener('click', () => switchTab(elements.showRawBtn, elements.parsingResultsDiv));
    elements.showProcessedBtn.addEventListener('click', () => switchTab(elements.showProcessedBtn, elements.processedResultsDiv));
    elements.showKnowledgeBaseBtn.addEventListener('click', () => switchTab(elements.showKnowledgeBaseBtn, elements.knowledgeBaseDiv));
    
    // Обработчик кнопки парсинга выбранных URL
    elements.parseSelectedBtn.addEventListener('click', async () => {
        console.log('Клик на кнопку "Анализировать выбранные"');
        
        // Получаем выбранные URL из дерева
        const selectedUrls = getSelectedUrls();
        console.log('Выбранные URL для парсинга:', selectedUrls);
        
        if (selectedUrls.length === 0) {
            alert('Пожалуйста, выберите хотя бы одну страницу для анализа.');
            return;
        }

        // Отображаем блок результатов
        elements.resultsBlock.style.display = 'block';
        elements.processedResultsDiv.innerHTML = '';
        elements.knowledgeBaseContent.innerHTML = '';

        // Вызываем функцию парсинга
        await parseSelectedUrls(
            selectedUrls, 
            elements.progressContainer, 
            elements.progressFill, 
            elements.progressText, 
            elements.progressDetails,
            elements.parsingResultsDiv
        );
    });
    
    // Обработчик кнопки обработки через Gemini
    elements.processWithGeminiBtn.addEventListener('click', async (event) => {
        // Явно предотвращаем стандартное поведение, которое может вызывать перезагрузку
        event.preventDefault();
        
        const parsingResultBlocks = elements.parsingResultsDiv.querySelectorAll('.parsing-results');
        
        if (parsingResultBlocks.length === 0) {
            alert('Сначала выполните парсинг страниц.');
            return;
        }
        
        // Вызываем функцию обработки через Gemini
        await processContentWithGemini(
            parsingResultBlocks,
            elements.processingProgress,
            elements.processingFill,
            elements.processingText,
            elements.processingDetails,
            elements.processedResultsDiv,
            GEMINI_RATE_LIMIT
        );
        
        // Переключаемся на таб с обработанными результатами
        switchTab(elements.showProcessedBtn, elements.processedResultsDiv);
    });
    
    // Обработчик кнопки создания базы знаний
    elements.createKnowledgeBaseBtn.addEventListener('click', async (event) => {
        // Явно предотвращаем стандартное поведение, которое может вызывать перезагрузку
        event.preventDefault();
        
        const processedBlocks = elements.processedResultsDiv.querySelectorAll('.processed-result');
        if (processedBlocks.length === 0) {
            alert('Сначала обработайте страницы через Gemini.');
            return;
        }

        // Вызываем функцию создания базы знаний
        const knowledgeBase = await createKnowledgeBase(
            processedBlocks,
            elements.processingProgress,
            elements.processingFill,
            elements.processingText,
            elements.processingDetails,
            elements.knowledgeBaseContent
        );
        
        // Переключаемся на таб с базой знаний
        switchTab(elements.showKnowledgeBaseBtn, elements.knowledgeBaseDiv);
    });
    
    // Копирование и очистка
    if (elements.copyRawResultsBtn) {
        elements.copyRawResultsBtn.addEventListener('click', () => copyContent(elements.parsingResultsDiv));
    }
    
    if (elements.copyProcessedResultsBtn) {
        elements.copyProcessedResultsBtn.addEventListener('click', () => copyContent(elements.processedResultsDiv));
    }
    
    if (elements.copyKnowledgeBaseBtn) {
        elements.copyKnowledgeBaseBtn.addEventListener('click', () => copyContent(elements.knowledgeBaseContent));
    }
    
    if (elements.clearRawResultsBtn) {
        elements.clearRawResultsBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите очистить исходные результаты?')) {
                elements.parsingResultsDiv.innerHTML = '';
            }
        });
    }
    
    if (elements.clearProcessedResultsBtn) {
        elements.clearProcessedResultsBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите очистить обработанные результаты?')) {
                elements.processedResultsDiv.innerHTML = '';
            }
        });
    }
    
    if (elements.clearKnowledgeBaseBtn) {
        elements.clearKnowledgeBaseBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите очистить базу знаний?')) {
                elements.knowledgeBaseContent.innerHTML = '';
            }
        });
    }
    
    // Кнопки скачивания результатов
    const downloadRawResults = document.getElementById('downloadRawResults');
    if (downloadRawResults) {
        downloadRawResults.addEventListener('click', () => {
            // Собираем текст из всех блоков результатов
            let text = '';
            const blocks = elements.parsingResultsDiv.querySelectorAll('.parsing-results');
            blocks.forEach(block => {
                const url = safeGetTextContent(block, 'h3', 'Неизвестный URL');
                const content = safeGetTextContent(block, 'pre', '');
                text += `==== URL: ${url} ====\n\n${content}\n\n`;
            });
            
            if (text.trim() === '') {
                alert('Нет результатов для скачивания');
                return;
            }
            
            // Скачиваем файл
            const date = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            downloadTextFile(text, `raw-parsing-results-${date}.txt`);
        });
    }
    
    const downloadProcessedResults = document.getElementById('downloadProcessedResults');
    if (downloadProcessedResults) {
        downloadProcessedResults.addEventListener('click', () => {
            // Собираем текст из всех блоков обработанных результатов
            let text = '';
            const blocks = elements.processedResultsDiv.querySelectorAll('.processed-result');
            blocks.forEach(block => {
                const url = safeGetTextContent(block, 'h3', 'Неизвестный URL');
                const content = safeGetTextContent(block, 'pre', '');
                text += `==== URL: ${url} ====\n\n${content}\n\n`;
            });
            
            if (text.trim() === '') {
                alert('Нет обработанных результатов для скачивания');
                return;
            }
            
            // Скачиваем файл
            const date = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            downloadTextFile(text, `processed-results-${date}.txt`);
        });
    }
    
    const downloadKnowledgeBase = document.getElementById('downloadKnowledgeBase');
    if (downloadKnowledgeBase) {
        downloadKnowledgeBase.addEventListener('click', () => {
            // Получаем текст базы знаний
            const content = elements.knowledgeBaseContent.textContent;
            
            if (!content || content.trim() === '') {
                alert('База знаний пуста, нечего скачивать');
                return;
            }
            
            // Скачиваем файл
            const date = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            downloadTextFile(content, `knowledge-base-${date}.txt`);
        });
    }
}

/**
 * Инициализирует обработчики быстрых фильтров для дерева
 * 
 * @param {Object} elements - Объект с DOM-элементами
 * @param {Object} treeHelper - Вспомогательный объект для работы с деревом
 */
export function initTreeFilterHandlers(elements, treeHelper) {
    // Обработчик "Выбрать все"
    elements.selectAllBtn.addEventListener('click', () => {
        const tree = $('#pagesTree').jstree(true);
        if (!tree) return;
        
        // Выбираем только узлы типа 'page'
        const pageNodes = tree.get_json('#', { flat: true })
            .filter(node => node.original && node.original.url)
            .map(node => node.id);
        
        tree.select_node(pageNodes);
        
        // Добавляем выбор главной страницы
        tree.select_node('root');
        console.log('Добавлен корневой узел (главная страница) в выбор.');
        
        // Выводим информацию о выбранных URL
        console.log('Выбраны все узлы. URL для парсинга:', treeHelper.getSelectedUrls());
    });

    // Обработчик "Выбрать только главную страницу"
    elements.selectHomepageBtn.addEventListener('click', () => {
        const tree = $('#pagesTree').jstree(true);
        if (!tree) return;
        
        // Сначала снимаем все выделения
        tree.deselect_all();
        
        // Затем выбираем только корневой узел
        tree.select_node('root');
        console.log('Выбрана только главная страница.');
        
        // Выводим информацию о выбранном URL
        console.log('URL главной страницы для парсинга:', treeHelper.getSelectedUrls());
    });

    // Обработчик "Снять выделение"
    elements.deselectAllBtn.addEventListener('click', () => {
        const tree = $('#pagesTree').jstree(true);
        if (tree) {
            tree.deselect_all();
            console.log('Выбор снят со всех узлов.');
        }
    });
    
    // Добавляем обработчик для логирования выбора в дереве
    $('#pagesTree').on('select_node.jstree deselect_node.jstree', function() {
        console.log('Изменение выбора в дереве. Текущие URL для парсинга:', treeHelper.getSelectedUrls());
    });
}

/**
 * Инициализирует редактор промптов
 * 
 * @param {Object} elements - Объект, содержащий DOM-элементы
 * @param {Object} prompts - Объект с промптами и их конфигурациями
 * @param {Function} onPromptChange - Функция обратного вызова для обновления промптов
 */
export function initPromptEditor(elements, prompts, onPromptChange) {
    // Проверяем наличие контейнера редактора промптов
    if (!elements.promptEditorContainer) {
        console.log("Контейнер редактора промптов не найден, пропускаем инициализацию редактора");
        return;
    }

    // Получаем контейнер для содержимого редакторов
    const promptEditorsContent = document.getElementById('prompt-editors-content');
    if (!promptEditorsContent) {
        console.error("Контейнер для содержимого редакторов не найден");
        return;
    }
    
    // Очищаем содержимое контейнера
    promptEditorsContent.innerHTML = '';
    
    // Создаем редактор промпта извлечения информации
    const extractionEditor = document.createElement('div');
    extractionEditor.className = 'prompt-editor';
    extractionEditor.innerHTML = `
        <h3>Промпт извлечения информации</h3>
        <p>Этот промпт используется для обработки контента страниц и извлечения ключевой информации.</p>
        <textarea id="extraction-prompt-editor" rows="12" class="form-control" spellcheck="false">${prompts.extraction}</textarea>
        <div class="button-row">
            <button id="save-extraction-prompt" class="btn-primary">Сохранить</button>
            <button id="reset-extraction-prompt" class="clear-button">Сбросить</button>
            <button id="apply-extraction-prompt" class="prompt-apply">Применить к выбранным</button>
        </div>
    `;
    
    // Создаем редактор промпта базы знаний
    const knowledgeBaseEditor = document.createElement('div');
    knowledgeBaseEditor.className = 'prompt-editor';
    knowledgeBaseEditor.innerHTML = `
        <h3>Промпт базы знаний</h3>
        <p>Этот промпт используется для создания структурированной базы знаний на основе обработанного контента.</p>
        <textarea id="knowledge-base-prompt-editor" rows="12" class="form-control" spellcheck="false">${prompts.knowledgeBase}</textarea>
        <div class="button-row">
            <button id="save-knowledge-base-prompt" class="btn-primary">Сохранить</button>
            <button id="reset-knowledge-base-prompt" class="clear-button">Сбросить</button>
            <button id="apply-knowledge-base-prompt" class="prompt-apply">Применить к обработанному</button>
        </div>
    `;
    
    // Добавляем редакторы в контейнер
    promptEditorsContent.appendChild(extractionEditor);
    promptEditorsContent.appendChild(knowledgeBaseEditor);
    
    // Закрытие редактора промптов
    document.getElementById('closePromptEditor').addEventListener('click', () => {
        elements.promptEditorContainer.style.display = 'none';
    });
    
    // Открытие редактора промптов
    const togglePromptEditorBtn = document.getElementById('togglePromptEditor');
    if (togglePromptEditorBtn) {
        togglePromptEditorBtn.addEventListener('click', () => {
            // Если элемент существует, переключаем его видимость
            if (elements.promptEditorContainer) {
                const isVisible = elements.promptEditorContainer.style.display !== 'none';
                elements.promptEditorContainer.style.display = isVisible ? 'none' : 'flex';
            }
        });
    }
    
    // Загрузка сохраненных промптов из localStorage при запуске
    try {
        const savedExtractionPrompt = localStorage.getItem('extractionPrompt');
        if (savedExtractionPrompt) {
            const extractionTextarea = document.getElementById('extraction-prompt-editor');
            if (extractionTextarea) {
                extractionTextarea.value = savedExtractionPrompt;
                onPromptChange('extraction', savedExtractionPrompt);
            }
        }
        
        const savedKnowledgeBasePrompt = localStorage.getItem('knowledgeBasePrompt');
        if (savedKnowledgeBasePrompt) {
            const knowledgeBaseTextarea = document.getElementById('knowledge-base-prompt-editor');
            if (knowledgeBaseTextarea) {
                knowledgeBaseTextarea.value = savedKnowledgeBasePrompt;
                onPromptChange('knowledgeBase', savedKnowledgeBasePrompt);
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке сохраненных промптов:', error);
    }
    
    // Обработчики для редактора промпта извлечения
    document.getElementById('save-extraction-prompt').addEventListener('click', () => {
        const newPrompt = document.getElementById('extraction-prompt-editor').value;
        onPromptChange('extraction', newPrompt);
        
        // Сохраняем в localStorage
        try {
            localStorage.setItem('extractionPrompt', newPrompt);
        } catch (error) {
            console.error('Ошибка при сохранении промпта в localStorage:', error);
        }
        
        alert('Промпт извлечения информации сохранен');
    });
    
    document.getElementById('reset-extraction-prompt').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите сбросить промпт к значению по умолчанию?')) {
            const defaultPrompt = prompts.builders.extraction(prompts.configs.extraction);
            document.getElementById('extraction-prompt-editor').value = defaultPrompt;
            onPromptChange('extraction', defaultPrompt);
            
            // Удаляем из localStorage
            try {
                localStorage.removeItem('extractionPrompt');
            } catch (error) {
                console.error('Ошибка при удалении промпта из localStorage:', error);
            }
        }
    });
    
    // Обработчик для применения промпта извлечения к выбранным страницам
    document.getElementById('apply-extraction-prompt').addEventListener('click', () => {
        // Получаем текущий промпт из редактора
        const newPrompt = document.getElementById('extraction-prompt-editor').value;
        // Обновляем промпт
        onPromptChange('extraction', newPrompt);
        
        // Проверяем, есть ли уже обработанные результаты
        if (elements.parsingResultsDiv && elements.parsingResultsDiv.children.length > 0) {
            if (confirm('Вы хотите применить этот промпт к уже загруженным страницам?')) {
                // Закрываем редактор промптов
                elements.promptEditorContainer.style.display = 'none';
                
                // Симулируем клик на кнопку "Обработать через Gemini"
                if (elements.processWithGeminiBtn) {
                    elements.processWithGeminiBtn.click();
                }
            }
        } else {
            alert('Сначала загрузите и проанализируйте страницы');
        }
    });
    
    // Обработчики для редактора промпта базы знаний
    document.getElementById('save-knowledge-base-prompt').addEventListener('click', () => {
        const newPrompt = document.getElementById('knowledge-base-prompt-editor').value;
        onPromptChange('knowledgeBase', newPrompt);
        
        // Сохраняем в localStorage
        try {
            localStorage.setItem('knowledgeBasePrompt', newPrompt);
        } catch (error) {
            console.error('Ошибка при сохранении промпта в localStorage:', error);
        }
        
        alert('Промпт базы знаний сохранен');
    });
    
    document.getElementById('reset-knowledge-base-prompt').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите сбросить промпт к значению по умолчанию?')) {
            const defaultPrompt = prompts.builders.knowledgeBase(prompts.configs.knowledgeBase);
            document.getElementById('knowledge-base-prompt-editor').value = defaultPrompt;
            onPromptChange('knowledgeBase', defaultPrompt);
            
            // Удаляем из localStorage
            try {
                localStorage.removeItem('knowledgeBasePrompt');
            } catch (error) {
                console.error('Ошибка при удалении промпта из localStorage:', error);
            }
        }
    });
    
    // Обработчик для применения промпта базы знаний
    document.getElementById('apply-knowledge-base-prompt').addEventListener('click', () => {
        // Получаем текущий промпт из редактора
        const newPrompt = document.getElementById('knowledge-base-prompt-editor').value;
        // Обновляем промпт
        onPromptChange('knowledgeBase', newPrompt);
        
        // Проверяем, есть ли уже обработанные результаты
        if (elements.processedResultsDiv && elements.processedResultsDiv.children.length > 0) {
            if (confirm('Вы хотите применить этот промпт для создания базы знаний?')) {
                // Закрываем редактор промптов
                elements.promptEditorContainer.style.display = 'none';
                
                // Симулируем клик на кнопку "Создать базу знаний"
                if (elements.createKnowledgeBaseBtn) {
                    elements.createKnowledgeBaseBtn.click();
                }
            }
        } else {
            alert('Сначала обработайте контент страниц через Gemini');
        }
    });
}

export default {
    initUIHandlers,
    initTreeFilterHandlers,
    initPromptEditor
}; 