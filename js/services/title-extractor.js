// Функции для извлечения заголовков страниц

// Функция для извлечения заголовка из HTML-контента
const extractTitleFromHTML = (content) => {
    if (!content) return null;
    
    try {
        // Используем DOMParser для корректного парсинга HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        
        // Попытка найти тег <title>
        const titleElement = doc.querySelector('title');
        if (titleElement && titleElement.textContent) {
            const title = titleElement.textContent.trim();
            console.log(`Найден заголовок в теге <title> через DOMParser: "${title}"`);
            return title;
        }
        
        // Попытка найти тег <h1>
        const h1Element = doc.querySelector('h1');
        if (h1Element && h1Element.textContent) {
            const title = h1Element.textContent.trim();
            console.log(`Найден заголовок в теге <h1> через DOMParser: "${title}"`);
            return title;
        }
        
        // Если DOMParser не сработал, пробуем через регулярные выражения
        console.log('DOMParser не нашел заголовок, пробуем через регулярные выражения');
    } catch (error) {
        console.error('Ошибка при использовании DOMParser:', error);
        console.log('Ошибка DOMParser, переходим к регулярным выражениям');
    }
    
    // Запасной вариант: попытка найти тег <title> через регулярное выражение
    const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i;
    const titleMatch = content.match(titleRegex);
    if (titleMatch && titleMatch[1]) {
        const title = titleMatch[1].trim();
        console.log(`Найден заголовок в теге <title> через регулярное выражение: "${title}"`);
        return title;
    }
    
    // Запасной вариант: попытка найти тег <h1> через регулярное выражение
    const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
    const h1Match = content.match(h1Regex);
    if (h1Match && h1Match[1]) {
        const title = h1Match[1].trim();
        console.log(`Найден заголовок в теге <h1> через регулярное выражение: "${title}"`);
        return title;
    }
    
    // Попытка найти заголовок в тексте (например, "ОРИГИНАЛЬНЫЙ ТЕНЕВОЙ ПРОФИЛЬ ТИП2")
    const headingMatch = content.match(/ОРИГИНАЛЬНЫЙ\s*ТЕНЕВОЙ\s*ПРОФИЛЬ\s*ТИП\s*(\d+)/i);
    if (headingMatch) {
        const title = `Теневой профиль Тип ${headingMatch[1]}`;
        console.log(`Найден заголовок в тексте: "${title}"`);
        return title;
    }
    
    // Попытка найти название продукта
    const productMatch = content.match(/ТИП\s*(\d+)\s*ДЛЯ\s*([А-Яа-яA-Za-z\s]+)/i);
    if (productMatch) {
        const title = `Теневой профиль Тип ${productMatch[1]} для ${productMatch[2].trim()}`;
        console.log(`Найден заголовок продукта: "${title}"`);
        return title;
    }
    
    return null;
};

// Функция для создания читаемого заголовка из URL
const createTitleFromURL = (url) => {
    try {
        const urlObj = new URL(url);
        
        // Получаем путь URL без / в начале
        const path = urlObj.pathname;
        if (!path || path === '/') {
            // Если путь пустой или только /, используем домен
            return urlObj.hostname;
        }
        
        // Разбиваем путь на сегменты
        const segments = path.split('/').filter(seg => seg);
        if (segments.length === 0) {
            // Если нет сегментов пути, используем домен
            return urlObj.hostname;
        }
        
        // Берем последний сегмент пути и преобразуем его
        let lastSegment = segments[segments.length - 1];
        
        // Удаляем расширение файла, если есть
        lastSegment = lastSegment.replace(/\.[^/.]+$/, '');
        
        // Заменяем дефисы, подчеркивания и плюсы на пробелы
        lastSegment = lastSegment.replace(/[-_+]/g, ' ');
        
        // Преобразуем первую букву каждого слова в верхний регистр
        lastSegment = lastSegment.split(' ')
            .map(word => {
                if (word.length > 0) {
                    return word.charAt(0).toUpperCase() + word.slice(1);
                }
                return word;
            })
            .join(' ');
        
        // Проверяем длину заголовка
        if (lastSegment.length > 50) {
            lastSegment = lastSegment.substring(0, 47) + '...';
        }
        
        // Если заголовок пустой или содержит только спецсимволы
        if (!lastSegment || /^[^a-zA-Zа-яА-Я0-9]+$/.test(lastSegment)) {
            return urlObj.hostname;
        }
        
        return lastSegment;
    } catch (error) {
        console.error(`Ошибка при создании заголовка из URL: ${error.message}`);
        return url;
    }
};

// Экспортируем функции
export { extractTitleFromHTML, createTitleFromURL };
