const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const User = require('./User')(sequelize);
const Post = require('./Post')(sequelize);
const Message = require('./Message')(sequelize);
const Appeal = require('./Appeal')(sequelize);

// Associations
User.hasMany(Post, { foreignKey: 'userId' });
Post.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Message, { foreignKey: 'userId' });
Message.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Appeal, { foreignKey: 'userId' });
Appeal.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
    sequelize,
    User,
    Post,
    Message,
    Appeal
};