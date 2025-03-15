/**
 * Промпт для создания структурированной базы знаний через Gemini API
 * 
 * Этот промпт используется для объединения и структурирования информации
 * со всех обработанных страниц в единую базу знаний.
 */

/**
 * Параметры промпта создания базы знаний
 * @type {Object}
 */
export const knowledgeBasePromptConfig = {
  // Маркеры для выделения важности в промпте
  emphasisMarkers: {
    start: 'ВАЖНО:',
    middle: 'ВСЕ',
    end: 'ПОДРОБНОЙ и точной'
  },
  
  // Настройки структурирования
  structure: {
    useCategories: true,
    useSections: true,
    mergeSimilarConcepts: true,
    useReadableFormat: true,
    includeHeadersAndSubheaders: true
  },
  
  // Настройки фокуса контента
  focus: {
    onProducts: true,
    onPrices: true,
    onServices: true,
    onPromotions: true,
    onUniqueOffers: true
  }
};

/**
 * Конструирует и возвращает промпт для создания базы знаний на основе конфигурации
 * @param {Object} config - Параметры конфигурации промпта (опционально)
 * @returns {string} - Готовый текст промпта
 */
export function buildKnowledgeBasePrompt(config = knowledgeBasePromptConfig) {
  const { emphasisMarkers, structure, focus } = config;
  
  // Формируем части промпта в зависимости от конфигурации
  const structureOptions = [
    structure.useCategories ? 'категориям' : '',
    structure.useSections ? 'разделам' : '',
    structure.mergeSimilarConcepts ? 'объедини похожие концепты' : ''
  ].filter(Boolean).join(' и ');
  
  const focusAreas = [
    focus.onProducts ? 'продуктах' : '',
    focus.onPrices ? 'ценах' : '',
    focus.onServices ? 'услугах' : '',
    focus.onPromotions ? 'акциях' : '',
    focus.onUniqueOffers ? 'уникальных предложениях' : ''
  ].filter(Boolean).join(', ');
  
  const formatOptions = structure.useReadableFormat 
    ? `Формат должен быть удобным для чтения${structure.includeHeadersAndSubheaders ? ' с заголовками и подзаголовками' : ''}.`
    : '';
  
  // Составляем итоговый промпт
  return `
Создай полную и детальную структурированную базу знаний о компании и ее продуктах на основе предоставленной информации. 
Сохрани ВСЕ продукты компании в наличии с их полными характеристиками, кратким описанием и ЦЕНАМИ, и ссылками на конкретные страницы продуктов (чтобы отправлять потом клиентам).
Организуй информацию чтобы затем легко эту базу занний добавить ии-чат-боту в инструкцию.(он будет продавать продукты компании)
Сделай акцент на продуктах компании.
Эта База знаний далее будет добавлена в Инструкцию Чат-бота компании, поэтому очень важно, чтобы она была максимально ${emphasisMarkers.end}.
`;
}

/**
 * Экспортируем готовый промпт с настройками по умолчанию
 */
export const knowledgeBasePrompt = buildKnowledgeBasePrompt();

export default knowledgeBasePrompt; 