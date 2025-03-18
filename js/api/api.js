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
    
    // Добавляем защиту от некорректных JSON-данных в теле запроса
    if (options && options.body && typeof options.body === 'string') {
        try {
            // Проверяем, является ли тело запроса валидным JSON
            JSON.parse(options.body);
        } catch (jsonError) {
            console.error('fetchWithRetry: Невалидный JSON в теле запроса:', jsonError);
            return {
                ok: false,
                status: 0,
                statusText: 'Invalid JSON in request body',
                json: async () => ({ error: 'Invalid JSON in request body' })
            };
        }
    }
    
    while (retries <= maxRetries) {
        try {
            console.log(`fetchWithRetry: Попытка ${retries + 1} из ${maxRetries + 1}`);
            
            // Убираем таймаут, так как он прерывает большие запросы
            const response = await fetch(url, options);
            console.log(`fetchWithRetry: Получен ответ со статусом ${response.status}`);
            
            // Если получили 429 или 500, делаем повторную попытку с экспоненциальной задержкой
            if ((response.status === 429 || response.status === 500 || response.status === 503) && retries < maxRetries) {
                const delay = initialDelay * Math.pow(2, retries) + Math.random() * 1000;
                console.log(`Получен статус ${response.status}. Повторная попытка через ${delay/1000} секунд...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retries++;
                continue;
            }
            
            return response;
        } catch (error) {
            // Безопасно логируем ошибку без циклических ссылок
            console.error(`fetchWithRetry: Ошибка запроса:`, error.toString());
            
            if (retries < maxRetries) {
                const delay = initialDelay * Math.pow(2, retries) + Math.random() * 1000;
                console.log(`Ошибка запроса. Повторная попытка через ${delay/1000} секунд...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retries++;
            } else {
                console.error(`fetchWithRetry: Исчерпаны все попытки (${maxRetries+1}). Возвращаем объект с ошибкой.`);
                // Вместо выбрасывания исключения, возвращаем объект с ошибкой
                return {
                    ok: false,
                    status: 0,
                    statusText: error.message || 'Unknown fetch error',
                    json: async () => ({ 
                        error: error.message || 'Unknown fetch error',
                        details: error.toString()
                    })
                };
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

// Получение структуры сайта без кэширования
const getWebsiteMapDirect = async (websiteUrl) => {
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
    
    return await response.json();
};

// Парсинг URL без кэширования
const parseUrl = async (url) => {
    // Проверка на невалидные URL
    if (url.startsWith('javascript:') || url === '#' || url === '') {
        throw new Error('Invalid URL: JavaScript link or empty URL');
    }
    
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
    
    return await response.json();
};

// Обработка через Gemini без кэширования
const processWithGemini = async (url, content, prompt) => {
    console.log(`processWithGemini: начало выполнения для ${url}`, {contentLength: content.length});
    
    try {
        // Уменьшаем размер контента, если он слишком большой
        let truncatedContent = content;
        // Проверка на слишком большой контент - 100K символов max для безопасности
        const MAX_CONTENT_SIZE = 100000;
        if (content.length > MAX_CONTENT_SIZE) {
            console.log(`Контент был сокращен с ${content.length} до ${MAX_CONTENT_SIZE} символов`);
            truncatedContent = content.substring(0, MAX_CONTENT_SIZE) + '... (контент был сокращен из-за большого размера)';
        }
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=${GEMINI_API_KEY}`;
        
        // Добавляем логирование до запроса
        console.log(`processWithGemini: Отправляем запрос к Gemini API, размер контента: ${truncatedContent.length} символов`);
        
        // Увеличиваем максимальное количество повторных попыток для ошибок 500
        const response = await fetchWithRetry(geminiApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "contents": [{
                    "parts": [{"text": prompt + "\n\n" + truncatedContent}]
                }],
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        }, 5, 3000);  // 5 попыток с начальной задержкой 3 секунды
        
        // Проверка на случай, если fetchWithRetry вернул подделанный объект response
        if (!response || typeof response.ok === 'undefined') {
            console.error('Ошибка: получен некорректный ответ от fetchWithRetry');
            return 'Ошибка связи с API. Пожалуйста, попробуйте еще раз.';
        }
        
        // Добавляем логирование после получения ответа
        console.log(`processWithGemini: Получен ответ от Gemini API со статусом: ${response.status}`);
        
        if (!response.ok) {
            console.error(`Gemini API error: ${response.status} - ${response.statusText || 'No status text'}`);
            
            let errorMessage = `Ошибка при обращении к API Gemini: ${response.status}`;
            
            // Пытаемся получить более детальную информацию об ошибке
            try {
                const errorData = await response.json();
                if (errorData && errorData.error && errorData.error.message) {
                    errorMessage += ` - ${errorData.error.message}`;
                    console.error('Дополнительная информация об ошибке:', errorData.error);
                }
            } catch (jsonError) {
                console.error('Не удалось получить детали ошибки:', jsonError);
            }
            
            return errorMessage;
        }
        
        try {
            const data = await response.json();
            // Логируем структуру данных для отладки
            console.log('processWithGemini: Получены данные от API', { 
                hasCandidates: !!data?.candidates,
                candidatesCount: data?.candidates?.length
            });
            
            // Проверка на наличие данных
            if (!data || !data.candidates || !data.candidates[0]) {
                console.error('processWithGemini: Нет данных в ответе', data);
                return 'Получен пустой ответ от API Gemini';
            }
            
            const text = data.candidates[0]?.content?.parts[0]?.text;
            if (!text) {
                console.error('processWithGemini: Нет текста в ответе', data.candidates[0]);
                return 'Не удалось извлечь текст из ответа API';
            }
            
            console.log(`processWithGemini: успешное завершение для ${url}`, {resultLength: text.length});
            return text;
        } catch (jsonError) {
            console.error("Ошибка при разборе JSON-ответа:", jsonError);
            // Логируем текст ответа для отладки
            try {
                const textResponse = await response.text();
                console.error("Текст ответа:", textResponse.substring(0, 200) + "...");
            } catch (textError) {
                console.error("Не удалось получить текст ответа:", textError);
            }
            return 'Ошибка при обработке ответа от API';
        }
    } catch (error) {
        console.error("Критическая ошибка в processWithGemini:", error);
        return 'Произошла ошибка при обработке запроса: ' + error.message;
    }
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
    processWithGeminiCache,
    // Добавляем новые функции в экспорт
    getWebsiteMapDirect,
    parseUrl,
    processWithGemini
};
