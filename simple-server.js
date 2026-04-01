const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.send('<h1>Сервер работает!</h1><p>Если вы видите это сообщение, проблема в подключении к PostgreSQL</p>');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log('Тестовый сервер запущен на http://localhost:' + PORT);
});