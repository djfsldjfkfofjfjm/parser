// Безопасное получение текстового содержимого элемента
const safeGetTextContent = (element, selector, defaultValue = '') => {
    if (!element) return defaultValue;
    const targetElement = element.querySelector(selector);
    return targetElement ? targetElement.textContent : defaultValue;
};

// Показать прогресс
const showProgress = (container, fill, text, details, message, percent = 0, detailsText = '') => {
    container.style.display = 'block';
    fill.style.width = `${percent}%`;
    text.textContent = message;
    if (detailsText) {
        details.textContent = detailsText;
    }
};

// Скрыть прогресс
const hideProgress = (container) => {
    container.style.display = 'none';
};

// Переключение табов
const switchTab = (tabBtn, contentDiv) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    tabBtn.classList.add('active');
    contentDiv.classList.add('active');
};

// Копирование контента
const copyContent = async (content, successMessage = 'Содержимое скопировано в буфер обмена') => {
    try {
        let textToCopy = '';
        
        // Проверяем, является ли content DOM-элементом
        if (content instanceof HTMLElement) {
            // Если это DOM-элемент, извлекаем текст из всех блоков результатов
            if (content.classList.contains('tab-content')) {
                // Для общего блока с результатами
                const blocks = content.querySelectorAll('.parsing-results, .processed-result');
                textToCopy = Array.from(blocks)
                    .map(block => {
                        const url = safeGetTextContent(block, 'h3', 'Неизвестный URL');
                        const text = safeGetTextContent(block, 'pre', '');
                        return `URL: ${url}\n\n${text}\n\n-------------------\n`;
                    })
                    .join('\n');
            } else if (content.classList.contains('knowledge-base-content')) {
                // Для базы знаний
                textToCopy = content.textContent || '';
            } else {
                // Для любого другого элемента
                textToCopy = content.textContent || content.innerText || '';
            }
        } else {
            // Если это строка или другой тип
            textToCopy = String(content);
        }
        
        // Проверяем, что есть что копировать
        if (!textToCopy.trim()) {
            alert('Нет контента для копирования');
            return;
        }
        
        await navigator.clipboard.writeText(textToCopy);
        alert(successMessage);
    } catch (err) {
        console.error('Ошибка копирования:', err);
        alert('Не удалось скопировать результаты. Проверьте консоль для деталей.');
    }
};

// Экспортируем функции
export { safeGetTextContent, showProgress, hideProgress, switchTab, copyContent };