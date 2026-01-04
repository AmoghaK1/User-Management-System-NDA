const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
require("dotenv").config();

const normalizeUserForSession = (user) => {
    if (!user) return user;
    user.profilePicture = user.profilepicture;
    user.createdAt = user.createdat;
    user.verifiedAt = user.verifiedat;
    return user;
};

module.exports = (passport) => {
    passport.use(
        new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
            try {
                // Hardcoded user authentication
                if (email === "rajjii11@gmail.com" && password === process.env.TEACHER_PASSWORD) {
                    const hardcodedUser = {
                        id: "hardcoded-user", // Use a distinct string
                        email: "rajjii11@gmail.com",
                        name: "Rajshree Khare",
                    };
                    return done(null, hardcodedUser);
                }

                // Find user in the database
                const user = await User.findOne({ email });
                if (!user) return done(null, false, { message: "No user found" });

                // Match password
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return done(null, false, { message: "Incorrect password" });

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        })
    );

    const googleOAuthReady =
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_CALLBACK_URL;

    if (googleOAuthReady) {
        passport.use(
            "google-verify",
            new GoogleStrategy(
                {
                    clientID: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackURL: process.env.GOOGLE_CALLBACK_URL,
                    passReqToCallback: true,
                },
                async (req, accessToken, refreshToken, profile, done) => {
                    try {
                        const email = profile.emails?.[0]?.value;
                        if (!email) {
                            return done(null, false, {
                                message: "Google account must have a visible email address",
                            });
                        }

                        let targetUser = null;
                        if (req.session?.verifyUserId) {
                            targetUser = await User.findById(req.session.verifyUserId);
                        }

                        if (!targetUser) {
                            targetUser = await User.findOne({ email });
                        }

                        if (!targetUser) {
                            return done(null, false, {
                                message: "No student account is linked to this Google email",
                            });
                        }

                        const normalizedEmail = targetUser.email?.toLowerCase?.();
                        if (
                            req.session?.verifyUserId &&
                            normalizedEmail &&
                            normalizedEmail !== email.toLowerCase()
                        ) {
                            return done(null, false, {
                                message: "Please use the same email you registered with",
                            });
                        }

                        const verificationStamp = new Date().toISOString();
                        let updatedUser;

                        try {
                            updatedUser = await User.updateById(targetUser.id, {
                                is_verified: true,
                                verifiedat: verificationStamp,
                                google_sub: profile.id,
                                google_email: email,
                            });
                        } catch (updateError) {
                            const missingGoogleColumns =
                                updateError?.message?.includes('google_sub') ||
                                updateError?.message?.includes('google_email');

                            if (missingGoogleColumns) {
                                console.warn(
                                    "[Google Verification] google_sub/google_email columns missing. Falling back to basic verification update.",
                                    updateError.message
                                );

                                updatedUser = await User.updateById(targetUser.id, {
                                    is_verified: true,
                                    verifiedat: verificationStamp,
                                });
                            } else {
                                throw updateError;
                            }
                        }

                        if (req.session) {
                            req.session.verifyUserId = null;
                        }

                        return done(null, normalizeUserForSession(updatedUser));
                    } catch (error) {
                        return done(error);
                    }
                }
            )
        );
    } else {
        console.warn("Google OAuth environment variables are missing. Verification is disabled.");
    }

    passport.serializeUser((user, done) => {
        // For Supabase, user.id is already a UUID string
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            // Handle hardcoded user separately
            if (id === "hardcoded-user") {
                return done(null, {
                    id: "hardcoded-user",
                    email: "rajjii11@gmail.com",
                    name: "Rajshree Khare",
                });
            }

            // For normal users, query from Supabase
            const user = await User.findById(id);
            done(null, normalizeUserForSession(user));
        } catch (error) {
            done(error);
        }
    });
};
