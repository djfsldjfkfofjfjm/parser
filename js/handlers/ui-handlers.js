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

        // Переключаемся на вкладку с результатами
        switchTab(elements.showRawBtn, elements.parsingResultsDiv);
    });
    
    // Обработчик кнопки обработки через Gemini
    elements.processWithGeminiBtn.addEventListener('click', async () => {
        const resultBlocks = elements.parsingResultsDiv.querySelectorAll('.parsing-results');
        if (resultBlocks.length === 0) {
            alert('Сначала получите контент страниц.');
            return;
        }

        // Вызываем функцию обработки через Gemini
        await processContentWithGemini(
            resultBlocks,
            elements.processingProgress,
            elements.processingFill,
            elements.processingText,
            elements.processingDetails,
            elements.processedResultsDiv,
            GEMINI_RATE_LIMIT
        );

        // Переключаемся на вкладку с обработанными результатами
        switchTab(elements.showProcessedBtn, elements.processedResultsDiv);
    });

    // Обработчик кнопки создания базы знаний
    elements.createKnowledgeBaseBtn.addEventListener('click', async () => {
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

        if (knowledgeBase) {
            // Переключаемся на вкладку с базой знаний
            switchTab(elements.showKnowledgeBaseBtn, elements.knowledgeBaseDiv);
        } else {
            alert('Не удалось создать базу знаний. Проверьте консоль для деталей.');
        }
    });

    // Обработчики для кнопок копирования
    elements.copyRawResultsBtn.addEventListener('click', () => {
        const content = Array.from(elements.parsingResultsDiv.querySelectorAll('.parsing-results'))
            .map(block => {
                const url = safeGetTextContent(block, 'h3', 'Неизвестный URL');
                const text = safeGetTextContent(block, 'pre', '');
                return `URL: ${url}\n\n${text}\n\n-------------------\n`;
            })
            .join('\n');
        copyContent(content);
    });

    elements.copyProcessedResultsBtn.addEventListener('click', () => {
        const content = Array.from(elements.processedResultsDiv.querySelectorAll('.processed-result'))
            .map(block => {
                const url = safeGetTextContent(block, 'h3', 'Неизвестный URL');
                const text = safeGetTextContent(block, 'pre', '');
                return `URL: ${url}\n\n${text}\n\n-------------------\n`;
            })
            .join('\n');
        copyContent(content);
    });

    elements.copyKnowledgeBaseBtn.addEventListener('click', () => {
        const content = elements.knowledgeBaseContent.innerText || elements.knowledgeBaseContent.textContent;
        copyContent(content);
    });

    // Обработчики для кнопок очистки
    elements.clearRawResultsBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите очистить все результаты парсинга?')) {
            elements.parsingResultsDiv.innerHTML = '';
        }
    });

    elements.clearProcessedResultsBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите очистить все обработанные результаты?')) {
            elements.processedResultsDiv.innerHTML = '';
        }
    });

    elements.clearKnowledgeBaseBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите очистить базу знаний?')) {
            elements.knowledgeBaseContent.innerHTML = '';
        }
    });

    // Поиск по дереву
    elements.pagesSearch.addEventListener('keyup', function() {
        const searchText = this.value;
        $('#pagesTree').jstree(true).search(searchText);
    });
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
 * Инициализирует интерфейс для редактирования промптов
 * 
 * @param {Object} elements - Объект с DOM-элементами
 * @param {Object} prompts - Объект с промптами и их конфигурациями
 * @param {Function} onPromptChange - Колбэк, вызываемый при изменении промпта
 */
export function initPromptEditor(elements, prompts, onPromptChange) {
    if (!elements.promptEditorContainer) {
        console.log("Контейнер редактора промптов не найден, пропускаем инициализацию редактора");
        return;
    }
    
    // Создаем интерфейс редактора промптов
    const extractionEditor = document.createElement('div');
    extractionEditor.className = 'prompt-editor';
    extractionEditor.innerHTML = `
        <h3>Редактор промпта извлечения информации</h3>
        <textarea id="extraction-prompt-editor" rows="6" class="form-control">${prompts.extraction}</textarea>
        <button id="save-extraction-prompt" class="btn btn-primary mt-2">Сохранить</button>
        <button id="reset-extraction-prompt" class="btn btn-secondary mt-2 ml-2">Сбросить</button>
    `;
    
    const knowledgeBaseEditor = document.createElement('div');
    knowledgeBaseEditor.className = 'prompt-editor mt-4';
    knowledgeBaseEditor.innerHTML = `
        <h3>Редактор промпта базы знаний</h3>
        <textarea id="knowledge-base-prompt-editor" rows="6" class="form-control">${prompts.knowledgeBase}</textarea>
        <button id="save-knowledge-base-prompt" class="btn btn-primary mt-2">Сохранить</button>
        <button id="reset-knowledge-base-prompt" class="btn btn-secondary mt-2 ml-2">Сбросить</button>
    `;
    
    // Добавляем редакторы в контейнер
    elements.promptEditorContainer.appendChild(extractionEditor);
    elements.promptEditorContainer.appendChild(knowledgeBaseEditor);
    
    // Обработчики для редактора промпта извлечения
    document.getElementById('save-extraction-prompt').addEventListener('click', () => {
        const newPrompt = document.getElementById('extraction-prompt-editor').value;
        onPromptChange('extraction', newPrompt);
        alert('Промпт извлечения информации сохранен');
    });
    
    document.getElementById('reset-extraction-prompt').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите сбросить промпт к значению по умолчанию?')) {
            document.getElementById('extraction-prompt-editor').value = prompts.builders.extraction(prompts.configs.extraction);
        }
    });
    
    // Обработчики для редактора промпта базы знаний
    document.getElementById('save-knowledge-base-prompt').addEventListener('click', () => {
        const newPrompt = document.getElementById('knowledge-base-prompt-editor').value;
        onPromptChange('knowledgeBase', newPrompt);
        alert('Промпт базы знаний сохранен');
    });
    
    document.getElementById('reset-knowledge-base-prompt').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите сбросить промпт к значению по умолчанию?')) {
            document.getElementById('knowledge-base-prompt-editor').value = prompts.builders.knowledgeBase(prompts.configs.knowledgeBase);
        }
    });
}

export default {
    initUIHandlers,
    initTreeFilterHandlers,
    initPromptEditor
}; 