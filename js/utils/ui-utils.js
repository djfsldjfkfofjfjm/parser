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
const copyContent = async (content, successMessage) => {
    try {
        await navigator.clipboard.writeText(content);
        alert(successMessage);
    } catch (err) {
        console.error('Ошибка копирования:', err);
        alert('Не удалось скопировать результаты. Проверьте консоль.');
    }
};

// Экспортируем функции
export { safeGetTextContent, showProgress, hideProgress, switchTab, copyContent };