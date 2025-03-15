// Импортируем и реэкспортируем все функции из модуля API
import {
    FIRECRAWL_API_KEY,
    GEMINI_API_KEY,
    FIRECRAWL_RATE_LIMIT,
    GEMINI_RATE_LIMIT,
    MINUTE,
    fetchWithRetry,
    getWebsiteMap,
    parseUrlWithCache,
    processWithGeminiCache,
    // Добавляем новые функции
    getWebsiteMapDirect,
    parseUrl,
    processWithGemini
} from './api.js';

// Реэкспортируем все функции и константы
export {
    FIRECRAWL_API_KEY,
    GEMINI_API_KEY,
    FIRECRAWL_RATE_LIMIT,
    GEMINI_RATE_LIMIT,
    MINUTE,
    fetchWithRetry,
    getWebsiteMap,
    parseUrlWithCache,
    processWithGeminiCache,
    // Добавляем новые функции
    getWebsiteMapDirect,
    parseUrl,
    processWithGemini
};

console.log("API module loaded"); 