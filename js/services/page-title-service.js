// Импортируем необходимые функции и константы из других модулей
import { fetchWithRetry } from '../api/index.js';
import { extractTitleFromHTML, createTitleFromURL } from './title-extractor.js';

// Получение заголовка страницы с кэшированием
const getPageTitleWithCache = async (url) => {
    console.log(`Запрос заголовка для URL: ${url}`);

    // Проверяем кэш
    const cacheKey = `title_${url}`;
    const cachedTitle = cacheManager.get(cacheKey);
    
    if (cachedTitle) {
        console.log(`Загружен заголовок для ${url} из кэша: "${cachedTitle}"`);
        return cachedTitle;
    }

    try {
        // Создаем заголовок из URL
        const title = createTitleFromURL(url);
        console.log(`Создан заголовок из URL: "${title}"`);
        
        // Сохраняем в кэш
        cacheManager.set(cacheKey, title);
        console.log(`Сохранен заголовок в кэш для ${url}: "${title}"`);
        
        return title;
    } catch (error) {
        console.error(`Ошибка при получении заголовка для ${url}:`, error);
        
        // В случае ошибки создаем заголовок из URL
        const title = createTitleFromURL(url);
        console.log(`Создан заголовок из URL после ошибки: "${title}"`);
        
        // Сохраняем в кэш
        cacheManager.set(cacheKey, title);
        
        return title;
    }
};

// Получение заголовков страниц в пакетном режиме с кэшированием
const getBatchPageTitlesWithCache = async (urls, batchSize = 10) => {
    console.log(`Запрос заголовков для ${urls.length} URL в пакетном режиме`);
    
    // Результаты для всех URL
    const results = {};
    
    // Проверяем кэш для каждого URL
    const uncachedUrls = [];
    for (const url of urls) {
        const cacheKey = `title_${url}`;
        const cachedTitle = cacheManager.get(cacheKey);
        
        if (cachedTitle) {
            console.log(`Загружен заголовок для ${url} из кэша: "${cachedTitle}"`);
            results[url] = cachedTitle;
        } else {
            uncachedUrls.push(url);
        }
    }
    
    // Если все URL в кэше, возвращаем результаты
    if (uncachedUrls.length === 0) {
        return results;
    }
    
    // Разбиваем URL на пакеты оптимального размера
    const batches = [];
    for (let i = 0; i < uncachedUrls.length; i += batchSize) {
        batches.push(uncachedUrls.slice(i, i + batchSize));
    }
    
    console.log(`Разбито на ${batches.length} пакетов по ${batchSize} URL`);
    
    // Обрабатываем каждый URL
    for (const url of uncachedUrls) {
        try {
            // Создаем заголовок из URL
            const title = createTitleFromURL(url);
            
            // Сохраняем в кэш
            const cacheKey = `title_${url}`;
            cacheManager.set(cacheKey, title);
            console.log(`Сохранен заголовок в кэш для ${url}: "${title}"`);
            
            // Добавляем в результаты
            results[url] = title;
        } catch (error) {
            console.error(`Ошибка при обработке URL ${url}:`, error);
            
            // В случае ошибки создаем заголовок из URL
            const title = createTitleFromURL(url);
            
            // Сохраняем в кэш
            const cacheKey = `title_${url}`;
            cacheManager.set(cacheKey, title);
            
            // Добавляем в результаты
            results[url] = title;
        }
    }
    
    return results;
};

// Получение заголовка страницы без кэширования
const getPageTitle = async (url) => {
    console.log(`Запрос заголовка для URL: ${url}`);
    
    try {
        // Создаем заголовок из URL
        const title = createTitleFromURL(url);
        console.log(`Создан заголовок из URL: "${title}"`);
        
        return title;
    } catch (error) {
        console.error(`Ошибка при получении заголовка для ${url}:`, error);
        return url.split('/').pop() || url;
    }
};

// Получение заголовков страниц в пакетном режиме без кэширования
const getBatchPageTitles = async (urls, batchSize = 10) => {
    console.log(`Запрос заголовков для ${urls.length} URL в пакетном режиме`);
    
    const results = {};
    
    const batches = [];
    for (let i = 0; i < urls.length; i += batchSize) {
        batches.push(urls.slice(i, i + batchSize));
    }
    
    // Обрабатываем каждую группу URL
    for (const batch of batches) {
        await Promise.all(batch.map(async (url) => {
            try {
                const title = await getPageTitle(url);
                results[url] = title;
            } catch (error) {
                console.error(`Ошибка получения заголовка для ${url}:`, error);
                results[url] = url;
            }
        }));
    }
    
    return results;
};

// Экспортируем функции
export { 
    getPageTitleWithCache, 
    getBatchPageTitlesWithCache,
    // Добавляем новые функции
    getPageTitle,
    getBatchPageTitles
};
