/**
 * Индексный файл для промптов
 * 
 * Экспортирует все промпты и их конфигурации из одного места для удобного импорта
 */

// Импорт промптов и конфигураций
import extractionPrompt, { 
    extractionPromptConfig, 
    buildExtractionPrompt 
} from './extraction-prompt.js';

import knowledgeBasePrompt, { 
    knowledgeBasePromptConfig, 
    buildKnowledgeBasePrompt 
} from './knowledge-base-prompt.js';

// Объединенный экспорт
export {
    // Промпты
    extractionPrompt,
    knowledgeBasePrompt,
    
    // Конфигурации промптов
    extractionPromptConfig,
    knowledgeBasePromptConfig,
    
    // Функции для создания промптов
    buildExtractionPrompt,
    buildKnowledgeBasePrompt
};

// Экспорт объекта со всеми доступными промптами для удобства
export default {
    extraction: extractionPrompt,
    knowledgeBase: knowledgeBasePrompt,
    
    // Конфигурации
    configs: {
        extraction: extractionPromptConfig,
        knowledgeBase: knowledgeBasePromptConfig
    },
    
    // Функции для создания промптов
    builders: {
        extraction: buildExtractionPrompt,
        knowledgeBase: buildKnowledgeBasePrompt
    }
}; 