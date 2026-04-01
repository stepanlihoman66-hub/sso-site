require('dotenv').config();
const { User } = require('./models');

async function checkRole() {
    const users = await User.findAll();
    console.log('Пользователи в базе:');
    users.forEach(user => {
        console.log(`- ${user.username} (ID: ${user.id})`);
        console.log(`  Discord ID: ${user.discordId}`);
        console.log(`  Роль: ${user.role}`);
        console.log(`  Префикс: ${user.unitPrefix}`);
        console.log('---');
    });
    process.exit();
}

checkRole();