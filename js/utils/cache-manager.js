// Настройки кэширования
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах

// Объект для работы с кэшем
const cacheManager = {
    // Сохранить данные в кэш
    set: (key, data) => {
        try {
            const cacheItem = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(cacheItem));
            return true;
        } catch (error) {
            console.warn('Ошибка при сохранении в кэш:', error);
            return false;
        }
    },
    
    // Получить данные из кэша
    get: (key) => {
        try {
            const cacheItem = JSON.parse(localStorage.getItem(key));
            if (!cacheItem) return null;
            
            // Проверяем срок действия кэша
            if (Date.now() - cacheItem.timestamp > CACHE_EXPIRATION) {
                localStorage.removeItem(key);
                return null;
            }
            
            return cacheItem.data;
        } catch (error) {
            console.warn('Ошибка при получении из кэша:', error);
            return null;
        }
    },
    
    // Очистить кэш для конкретного URL
    clearForUrl: (url) => {
        try {
            const keys = ['map_', 'scrape_', 'gemini_', 'kb_', 'title_'];
            keys.forEach(prefix => localStorage.removeItem(`${prefix}${url}`));
        } catch (error) {
            console.warn('Ошибка при очистке кэша:', error);
        }
    },
    
    // Очистить весь кэш
    clearAll: () => {
        try {
            console.log('Очистка всего кэша...');
            localStorage.clear();
            console.log('Весь кэш успешно очищен');
            return true;
        } catch (error) {
            console.error('Ошибка при очистке всего кэша:', error);
            return false;
        }
    }
};

// Экспортируем объект cacheManager и константу CACHE_EXPIRATION
export { cacheManager, CACHE_EXPIRATION };
