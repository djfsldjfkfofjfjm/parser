const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Обслуживание статических файлов
app.use(express.static(path.join(__dirname)));

// Эндпоинт для переменных окружения
app.get('/api/env.js', (req, res) => {
  // Устанавливаем заголовки
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  // Формируем содержимое с переменными окружения
  // Используем JSON.stringify для гарантии правильного форматирования
  const envVars = {
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || "",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || ""
  };
  
  const envContent = `
// Этот файл генерируется на сервере и содержит переменные окружения
window.__ENV = ${JSON.stringify(envVars, null, 2)};

// Проверка загрузки переменных окружения
console.log('Переменные окружения загружены из Render');
  `;
  
  // Отправляем содержимое
  res.status(200).send(envContent);
});

// Обработка всех остальных запросов - отправляем index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
