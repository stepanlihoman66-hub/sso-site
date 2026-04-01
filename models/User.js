const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        discordId: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false
        },
        callsign: {
            type: DataTypes.STRING,
            defaultValue: 'Боец'
        },
        avatar: {
            type: DataTypes.STRING,
            allowNull: false
        },
        personalFileUrl: {
            type: DataTypes.STRING,
            validate: {
                isUrl: true
            }
        },
        unitPrefix: {
            type: DataTypes.STRING,
            defaultValue: 'ССО'
        },
        role: {
            type: DataTypes.ENUM('user', 'sro_tuman', 'admin', 'superadmin'),
            defaultValue: 'user'
        },
        isBanned: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    });

    return User;
};