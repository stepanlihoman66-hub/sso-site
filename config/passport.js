const DiscordStrategy = require('passport-discord').Strategy;
const { User } = require('../models');

module.exports = (passport) => {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findByPk(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    passport.use(new DiscordStrategy({
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK_URL,
        scope: ['identify']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ where: { discordId: profile.id } });
            
            if (!user) {
                // Create new user
                user = await User.create({
                    discordId: profile.id,
                    username: profile.username,
                    avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
                    role: profile.id === process.env.ADMIN_DISCORD_ID ? 'admin' : 'user',
                    isBanned: false,
                    verified: false
                });
            } else {
                // Update user info
                user.username = profile.username;
                user.avatar = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
                await user.save();
            }
            
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
};