/**
 * Файл конфигурации для API-ключей и других настроек
 * Этот файл не должен быть отправлен в Git-репозиторий
 */

// Получаем API-ключи из переменных окружения, если они доступны
// Иначе используем демонстрационные значения для тестирования
let FIRECRAWL_API_KEY = 'demo-firecrawl-api-key-for-testing';
let GEMINI_API_KEY = 'demo-gemini-api-key-for-testing';

// Проверяем наличие переменных окружения из Vercel
if (typeof window !== 'undefined' && window.__ENV) {
    FIRECRAWL_API_KEY = window.__ENV.FIRECRAWL_API_KEY || FIRECRAWL_API_KEY;
    GEMINI_API_KEY = window.__ENV.GEMINI_API_KEY || GEMINI_API_KEY;
    console.log('Загружены API-ключи из переменных окружения');
}

// Лимиты API и другие константы 
// (эти значения можно оставить по умолчанию)
const FIRECRAWL_RATE_LIMIT = 20; // 20 запросов в минуту 
const GEMINI_RATE_LIMIT = 14; // 14 запросов в минуту
const MINUTE = 60000; // 60 секунд в миллисекундах

// Экспортируем все константы
export {
    FIRECRAWL_API_KEY,
    GEMINI_API_KEY,
    FIRECRAWL_RATE_LIMIT,
    GEMINI_RATE_LIMIT,
    MINUTE
};
