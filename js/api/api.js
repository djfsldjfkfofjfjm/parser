// Импортируем cacheManager из модуля cache-manager.js
import { cacheManager } from '../utils/index.js';

// Константы для API
const FIRECRAWL_API_KEY = 'fc-28f038d334bc40bda77427cf1f275229';
const GEMINI_API_KEY = 'AIzaSyDWC3Mh8zfN7GaVqNGC_GIm3XwKSn0g4gs';
// Лимиты API
const FIRECRAWL_RATE_LIMIT = 20; // 20 запросов в минуту
const GEMINI_RATE_LIMIT = 14; // 14 запросов в минуту
const MINUTE = 60000; // 60 секунд в миллисекундах

// Функция для выполнения запроса с повторными попытками
const fetchWithRetry = async (url, options, maxRetries = 3, initialDelay = 2000) => {
    console.log(`fetchWithRetry: Отправка запроса на ${url}`, options);
    let retries = 0;
    
    while (retries <= maxRetries) {
        try {
            console.log(`fetchWithRetry: Попытка ${retries + 1} из ${maxRetries + 1}`);
            const response = await fetch(url, options);
            console.log(`fetchWithRetry: Получен ответ со статусом ${response.status}`);
            
            // Если получили 429, делаем повторную попытку с экспоненциальной задержкой
            if (response.status === 429 && retries < maxRetries) {
                const delay = initialDelay * Math.pow(2, retries) + Math.random() * 1000;
                console.log(`Превышен лимит запросов. Повторная попытка через ${delay/1000} секунд...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retries++;
                continue;
            }
            
            return response;
        } catch (error) {
            console.error(`fetchWithRetry: Ошибка запроса:`, error);
            if (retries < maxRetries) {
                const delay = initialDelay * Math.pow(2, retries) + Math.random() * 1000;
                console.log(`Ошибка запроса. Повторная попытка через ${delay/1000} секунд...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retries++;
            } else {
                throw error;
            }
        }
    }
};

// Получение структуры сайта с кэшированием
const getWebsiteMap = async (websiteUrl) => {
    // Проверяем кэш
    const cacheKey = `map_${websiteUrl}`;
    const cachedData = cacheManager.get(cacheKey);
    
    if (cachedData) {
        console.log('Загружена структура сайта из кэша');
        return cachedData;
    }
    
    // Если нет в кэше, делаем запрос
    const response = await fetchWithRetry('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: websiteUrl })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Сохраняем в кэш
    cacheManager.set(cacheKey, data);
    
    return data;
};

// Парсинг URL с кэшированием и повторными попытками
const parseUrlWithCache = async (url) => {
    // Проверка на невалидные URL
    if (url.startsWith('javascript:') || url === '#' || url === '') {
        throw new Error('Invalid URL: JavaScript link or empty URL');
    }
    
    // Проверяем кэш
    const cacheKey = `scrape_${url}`;
    const cachedData = cacheManager.get(cacheKey);
    
    if (cachedData) {
        console.log(`Загружен контент для ${url} из кэша`);
        return cachedData;
    }
    
    // Если нет в кэше, делаем запрос
    const response = await fetchWithRetry('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: url,
            formats: ['markdown'],
            onlyMainContent: true,
            blockAds: true,
            removeBase64Images: true
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Сохраняем в кэш
    cacheManager.set(cacheKey, data);
    
    return data;
};

// Обработка через Gemini с кэшированием
const processWithGeminiCache = async (url, content, prompt) => {
    // Проверяем кэш
    const cacheKey = `gemini_${url}`;
    const cachedData = cacheManager.get(cacheKey);
    
    if (cachedData) {
        console.log(`Загружена обработка Gemini для ${url} из кэша`);
        return cachedData;
    }
    
    // Если нет в кэше, делаем запрос
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetchWithRetry(geminiApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "contents": [{
                "parts": [{"text": prompt + "\n\n" + content}]
            }]
        })
    });
    
    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const extractedText = data.candidates[0]?.content?.parts[0]?.text || 'Не удалось извлечь информацию';
    
    // Сохраняем в кэш
    cacheManager.set(cacheKey, extractedText);
    
    return extractedText;
};

// Экспортируем константы и функции
export {
    FIRECRAWL_API_KEY,
    GEMINI_API_KEY,
    FIRECRAWL_RATE_LIMIT,
    GEMINI_RATE_LIMIT,
    MINUTE,
    fetchWithRetry,
    getWebsiteMap,
    parseUrlWithCache,
    processWithGeminiCache
};
