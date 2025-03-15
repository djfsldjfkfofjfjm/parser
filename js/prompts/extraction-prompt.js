/**
 * Промпт для извлечения информации со страниц сайта через Gemini API
 * 
 * Этот промпт используется для обработки контента отдельных страниц и 
 * извлечения из них структурированной информации о продуктах, услугах, ценах и т.д.
 */

/**
 * Параметры промпта извлечения информации
 * @type {Object}
 */
export const extractionPromptConfig = {
  // Маркеры для выделения важности в промпте
  emphasisMarkers: {
    start: 'ВСЮ',
    middle: 'ВСЕХ',
    end: 'ПОЛНУЮ и ТОЧНУЮ'
  },
  
  // Настройки категорий информации
  categories: {
    includeProducts: true,
    includeCharacteristics: true,
    includeCompanyInfo: true,
    includePromotions: true,
    includePrices: true
  },
  
  // Настройки исключений
  exclusions: {
    excludeGeneralPhrases: true,
    excludeIrrelevantContent: true
  }
};

/**
 * Конструирует и возвращает промпт для извлечения информации на основе конфигурации
 * @param {Object} config - Параметры конфигурации промпта (опционально)
 * @returns {string} - Готовый текст промпта
 */
export function buildExtractionPrompt(config = extractionPromptConfig) {
  const { emphasisMarkers, categories, exclusions } = config;
  
  // Формируем части промпта в зависимости от конфигурации
  const whatToExtract = [
    categories.includeProducts ? 'продуктах' : '',
    categories.includeCharacteristics ? 'их характеристиках' : '',
    categories.includeCompanyInfo ? 'об компании' : '',
    categories.includePromotions ? 'акциях' : '',
    categories.includePrices ? 'точных ценах' : ''
  ].filter(Boolean).join(', ');
  
  const whatToExclude = [
    exclusions.excludeGeneralPhrases ? 'общие фразы' : '',
    exclusions.excludeIrrelevantContent ? 'воду и прочий нерелевантный контент' : ''
  ].filter(Boolean).join(', ');
  
  // Составляем итоговый промпт
  return `Извлеки из этого текста подробную и полную информацию о компании, КАЖДОМ ее продукте (его характеристиках, ценах и других важных спецификаций), контакты, акции, ссылки на соцсети, ссылки на конкретные страницы продуктов (чтобы отправлять потом клиентам) и другую важную инфомацию для Базы знаний о продуктах компании и компании. Исключи вводную информацию. Верни максимально полную информацию. Твой ответ будет использован для формирвоания инструкции для ии-чат-бота этой компании (который будет продавать продукты компании), поэтому ничего не упусти`;
}

/**
 * Экспортируем готовый промпт с настройками по умолчанию
 */
export const extractionPrompt = buildExtractionPrompt();

export default extractionPrompt; 