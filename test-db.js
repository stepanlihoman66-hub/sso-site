const { sequelize } = require('./models');

console.log('1. Начинаю проверку подключения к базе данных...');

async function testConnection() {
    try {
        console.log('2. Пытаюсь подключиться...');
        await sequelize.authenticate();
        console.log('3. ✅ ПОДКЛЮЧЕНИЕ УСПЕШНО! База данных работает.');
        console.log('4. Проверяю, есть ли таблицы...');
        await sequelize.sync({ alter: false });
        console.log('5. ✅ Всё работает!');
        process.exit(0);
    } catch (error) {
        console.error('6. ❌ ОШИБКА ПОДКЛЮЧЕНИЯ:');
        console.error('   Текст ошибки:', error.message);
        console.error('   Проверьте:');
        console.error('   - Запущен ли PostgreSQL?');
        console.error('   - Правильный ли пароль в .env?');
        console.error('   - Существует ли база данных sso_unit_db?');
        process.exit(1);
    }
}

testConnection();