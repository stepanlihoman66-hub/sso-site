const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Appeal = sequelize.define('Appeal', {
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('new', 'read'),
            defaultValue: 'new'
        }
    });

    return Appeal;
};