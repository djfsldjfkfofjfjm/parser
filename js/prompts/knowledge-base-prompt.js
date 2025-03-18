/**
 * Модуль с промптом для создания базы знаний
 */

/**
 * Параметры оформления для промпта базы знаний
 * @type {Object}
 */
export const knowledgeBasePromptConfig = {
    // Глубина детализации информации: от 1 (минимальная) до 5 (максимальная)
    detalizationLevel: 5,
    
    // Структурировать информацию по категориям товаров
    categorizeByProducts: true,
    
    // Включить информацию о ценах
    includePrices: true,
    
    // Включить ссылки на продукты
    includeLinks: true,
    
    // Добавлять маркеры для выделения важной информации
    useEmphasisMarkers: true,
    
    // Формат вывода
    outputFormat: 'structured' // 'structured', 'simple', 'markdown'
};

/**
 * Создает промпт для формирования базы знаний
 * 
 * @param {Object} config - Конфигурационные параметры
 * @returns {string} - Промпт для Gemini API
 */
export function buildKnowledgeBasePrompt(config = knowledgeBasePromptConfig) {
    // Возвращаем готовый промпт
    return `ВАЖНО: СОЗДАЙ МАКСИМАЛЬНО ДЕТАЛЬНУЮ БАЗУ ЗНАНИЙ! НИКАКИХ СОКРАЩЕНИЙ!

Создай детальную, структурированную базу знаний о компании и ВСЕХ её продуктах на основе предоставленной информации:

1. СТРУКТУРА:
   - Раздели информацию по логическим категориям и подкатегориям
   - Размести продукты в соответствующих категориях
   - Используй понятную иерархию: категория → подкатегория → продукт

2. ДЛЯ КАЖДОГО ПРОДУКТА ОБЯЗАТЕЛЬНО УКАЖИ:
   - Полное наименование
   - Исчерпывающее описание без сокращений
   - ВСЕ технические характеристики (состав, размеры, материалы и т.д.)
   - ТОЧНУЮ цену с учётом скидок и акций
   - Артикул/SKU/код продукта
   - Полную ссылку на страницу продукта

3. ОБЩАЯ ИНФОРМАЦИЯ О КОМПАНИИ:
   - Полные контактные данные (все телефоны, адреса, email)
   - Условия доставки, оплаты и возврата
   - Актуальные акции и специальные предложения
   - Гарантийные условия
   - Ссылки на социальные сети

КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- Использовать любые сокращения текста
- Пропускать любые характеристики продуктов
- Объединять или группировать разные модели
- Удалять информацию, которая кажется незначительной
- Обобщать вместо приведения точных данных
- Использовать маркдаун, гиперссылки или HTML-форматирование

Эта база знаний будет напрямую использована в инструкции чат-бота для продажи товаров компании, поэтому КАЖДАЯ ДЕТАЛЬ критически важна!`;
}

/**
 * Экспортируем готовый промпт
 */
export const knowledgeBasePrompt = buildKnowledgeBasePrompt();

export default knowledgeBasePrompt; 