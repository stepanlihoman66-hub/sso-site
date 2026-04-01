const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Post = sequelize.define('Post', {
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        imageUrl: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        sticker: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isPinned: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isModeratorPost: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    });

    return Post;
};