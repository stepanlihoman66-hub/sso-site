const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Message = sequelize.define('Message', {
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        imageUrl: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        fileUrl: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        room: {
            type: DataTypes.STRING,
            defaultValue: 'main'
        },
        recipientId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        replyToId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        mentions: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    });

    return Message;
};