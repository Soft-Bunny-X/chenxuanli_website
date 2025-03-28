const Users = require("../models/userProfile");
const Credentials = require("../models/userCredential");

const asyncHandler = require("express-async-handler");
const {body, validationResult} = require("express-validator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const redis = require("redis");
const redisClient = redis.createClient({
    host: "127.0.0.1",
    port: 6379
});

redisClient.on("error", (err) => {
    console.error("Error connecting to Redis:", err);
});

redisClient.connect()
    .then(() => console.log("Connected to Redis!"))
    .catch((err) => console.error("Failed to connect to Redis: ", err));

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "chenxuanli.official@gmail.com",
        pass: "dfjm nwfi hlhx tkzw"
    }
});

// a function that takes care of sending the verification code through email
function sendVerificationCode(emailAddress, codeToSend){
    
    const mailOptions = {
        from: "chenxuanli.official@gmail.com",
        to: emailAddress,
        subject: "Email Verification - Chenuxan Li's Personal Website",
        html: `
            <h1>We Are Sending You A Verification Code!</h1>
            <p> Greetings, <br><br></p>
            <p> Your verification code is:<br></p>
            <h2 style="margin: 10px; padding: 10px; background-color: #DDD; color: #A22; border-radius: 5px; text-align: center;">${codeToSend}</h2>
            <p> <br> The code will remain valid for 10 minutes.<br>Please ignore this email if you believe this action is not taken by you. </p>
            <p> Best,<br>Chenxuan Li</p>
            <div style="magin: 10px; padding: 10px; background-color: #DDD;">
                <a href="mailto:nickchenxuanli@outlook.com" style="text-decoration: none;">nickchenxuanli@outlook.com</a>
            </div>
        `
    }
    
    transporter.sendMail(mailOptions, (error, info) => {
        if(error) {
            console.log("Error: ", error);
        }
        else{
            console.log("Email sent: ", info.response);
        }
    });
}

exports.user_get = [
    asyncHandler(async (req, res, next) => {
        // obtain the userID in cookie if there is any
        const userID = req.cookies.userID;
        // if no userID fetched, render the public user page, otherwise, redirect to the user specific page
        if(!userID){
            //====================
            // console.log(`no userID found in cookies`);
            //====================
            res.render("user", {title: "User Center - Chenxuan's Personal Website"});
        }
        else if(!await redisClient.get(userID)){
            res.render("user", {title: "User Center - Chenxuan's Personal Website"});
        }
        else{
            res.redirect(`/user/main/${userID}`);
        }
    }),
];

exports.user_main_get = [
    asyncHandler(async (req, res, next) => {
        // obtain userID and authentication token from the cookies
        const token = req.cookies.authToken;
        const userID = req.cookies.userID;
        // if either is missing, render the public user page
        if(!token || !userID){
            //====================
            // console.log("token or userID not found from cookies");
            //====================
            res.redirect("/user");
        }
        else{
            // otherwise, verify the account. Render the public user page if secretKey not found or if verification fails
            const secretKey = await redisClient.get(userID);
            //====================
            // console.log(`\nsecretKey obtained from redis server is: ${secretKey}\n`);
            //====================
            if(!secretKey){
                //====================
                // console.log("secretKey not found from redis server");
                // console.log(`\nID obtained is:`)
                // console.log(userID);
                //====================
                res.redirect("/user");
            }
            else{
                try{
                    // This part renders the user specific page, not completed yet
                    const decoded = jwt.verify(token, secretKey);
                    const userTemporary = Users.find({userID: req.params.userID});
                    res.render("user-main", {title: "User Center - Chenxuan's User"});
                } catch(error){
                    console.log("token verification fails");
                    res.redirect("/user");
                }
            }
        }
    }),
];

exports.user_log_out_get = [
    asyncHandler(async (req, res, next) => {
        const userID = req.cookies.userID;

        if(!userID){
            res.redirect("/user");
        }
        else{
            // if(!await redisClient.del(userID)){
            //     res.redirect("/user");
            // }
            // else{
            //     res.redirect("/user");
            // }
            await redisClient.del(userID)
            res.redirect("/user");
        }
    }),
];

exports.user_sign_up_post = [
    // validate and sanitize the inputs
    body("email")
        .trim()
        .toLowerCase()
        .isLength({min: 1})
        .escape()
        .withMessage("email must be filled")
        .isEmail()
        .withMessage("invalid email address"),
    body("username")
        .trim()
        .isLength({min: 1})
        .escape()
        .withMessage("username must be filled")
        .matches(/^[a-zA-Z_-]+$/)
        .withMessage("username can only consist of letters, numbers, underscore, and dash"),
    body("password")
        .trim()
        .isLength({min: 8})
        .escape()
        .withMessage("password must contain at least 8 characters"),
    // handle the inputs
    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);
        // cannot create an account that already exists (uniqueness determined by email address)
        if(await Users.exists({email: req.body.email})){
            errors.errors.push({
                msg: "User already exists!",
                param: "email",
                location: "body"
            });
        }
        // if any error occured, re-render the sign up page with the errors
        // otherwise, create a temporary profile on redis for later uses and send the email with verification code to the user
        if(!errors.isEmpty()){
            res.render("user-sign-up", {
                title: "Sign Up - Chenxuan's User",
                errors: errors.array()
            });
        }
        else{
            const verificationCode = crypto.randomInt(100000, 999999).toString();
            
            const userTemporaryProfile = {
                username: req.body.username,
                password: req.body.password,
                code: verificationCode,
            };
            
            redisClient.set(req.body.email, JSON.stringify(userTemporaryProfile), {
                EX: 600
            });
            
            sendVerificationCode(req.body.email, verificationCode);

            res.redirect(`/user/sign-up/verification/${req.body.email}`);
        }
    }), 
];

exports.user_sign_up_verification_post = [
    // validate and sanitize the inputs
    body("code")
        .trim()
        .isLength({min: 6, max: 6})
        .escape()
        .withMessage("verification code must be 6-digit")
        .isNumeric()
        .withMessage("verification code must be numerical input"),
    // handle the inputs
    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);
        // get the verification code created earlier when the user submited the sign up form
        const userTemporaryProfile = JSON.parse(await redisClient.get(req.params.email));
        // test if no verification code on file (could due to expiration) or if the code doesn't match
        if(userTemporaryProfile == null || userTemporaryProfile.code != req.body.code){
            errors.errors.push({
                msg: "Incorrect Verification Code!",
                param: "code",
                location: "body"
            });
        }
        // if any error occured, re-render the sign up page with the errors
        // otherwise, create the user's credential and redirect to the user's main page
        if(!errors.isEmpty()){
            res.render("user-verify", {
                title: "Email Verification - Chenxuan's User",
                errors: errors.array()
            });
        }
        else{
            const newCredential = new Credentials({
                password: userTemporaryProfile.password,
                dateCreated: new Date(),
            });
            await newCredential.save();
            const newUser = new Users({
                userID: newCredential._id,
                username: userTemporaryProfile.username,
                email: req.params.email,
                contact: [],
                conversation: [],
            });
            await newUser.save();
            res.redirect(`/user/main/${newCredential._id}`);
        }
    }),
];

exports.user_log_in_post = [
    // validate and sanitize the inputs
    body("email")
        .trim()
        .toLowerCase()
        .isLength({min: 1})
        .escape()
        .withMessage("email must be filled")
        .isEmail()
        .withMessage("invalid email address"),
    body("password")
        .trim()
        .isLength({min: 8})
        .escape()
        .withMessage("password must contain at least 8 characters"),
    // handle the inputs
    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);
        // test if the user exists in the database
        if(!await Users.exists({email: req.body.email})){
            errors.errors.push({
                msg: "User does not exists!",
                param: "email",
                location: "body"
            });
            console.log("user doesn't exists");
        }
        // test if the password is correct
        const userTemporary = await Users.findOne({email: req.body.email});
        const credentialTemporary = await Credentials.findById(userTemporary.userID);
        if(req.body.password != credentialTemporary.password){
            errors.errors.push({
                msg: "Incorrect Password!",
                param: "password",
                location: "body"
            });
        }
        // if any error occured, re-render the log in page with the errors
        // otherwise, redirect to the user's main page
        if(!errors.isEmpty()){
            res.render("user-log-in", {
                title: "Log In - Chenxuan's User",
                errors: errors.array()
            });
        }
        else{
            // create a 8-byte random number and express it in hexadecimal string
            const secretKey = crypto.randomBytes(4).toString("hex");
            // save the user specific key in the memory
            //====================
            // console.log(userTemporary.userID);
            // console.log(secretKey);
            //====================
            await redisClient.set(userTemporary.userID.toString(), secretKey, {EX: 604800});
            //====================
            // console.log(`\nuserID set: ${userTemporary.userID.toString()}\n`);
            // console.log(`\nsecretKey set: ${secretKey}\n`);
            //====================
            // sign the token with the user specific key
            const token = jwt.sign({userID: userTemporary.userID.toString()}, secretKey, {expiresIn: "7d"});
            // set cookie with authentication token
            res.cookie("authToken", token, {
                httpOnly: true,
                // secure: true,
                sameSite: "strict",
                maxAge: 604800000
            });

            res.cookie("userID", userTemporary.userID.toString(), {
                httpOnly: true,
                // secure: true,
                sameSite: "strict",
                maxAge: 604800000
            });

            res.redirect(`/user/main/${credentialTemporary._id}`);
        }
    }), 
];

exports.user_recovery_post = [
    // validate and sanitize the inputs
    body("email")
        .trim()
        .toLowerCase()
        .escape()
        .isEmail()
        .withMessage("Invalid email input"),
    body("password")
        .trim()
        .isLength({min: 8})
        .escape()
        .withMessage("password must contain at least 8 characters"),
    // handle the inputs
    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);
        // test if the email is on file
        if(!await Users.exists({email: req.body.email})){
            errors.errors.push({
                msg: "User does not exists!",
                param: "email",
                location: "body"
            });
            console.log("user doesn't exists");
        }
        // if any error occured, re-render the recovery page with the errors
        // otherwise, redirect to the verification page
        if(!errors.isEmpty()){
            res.render("user-recovery", {
                title: "Account Recovery - Chenxuan's User",
                errors: errors.array()
            });
        }
        else{
            const verificationCode = crypto.randomInt(100000, 999999).toString();

            const userTemporaryProfile = {
                email: req.body.email,
                password: req.body.password,
                code: verificationCode,
            };

            await redisClient.set(req.body.email, JSON.stringify(userTemporaryProfile), {
                EX: 600
            });

            sendVerificationCode(req.body.email, verificationCode);

            res.redirect(`/user/recovery/verification/${req.body.email}`);
        }
    }),
];

exports.user_recovery_verification_post = [
    // validate and sanitize the inputs
    body("code")
        .trim()
        .isLength({min: 6, max: 6})
        .escape()
        .withMessage("verification code must be 6-digit")
        .isNumeric()
        .withMessage("verification code must be numerical input"),
    // handle the inputs
    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);
        // get the verification code created earlier when the user submited the sign up form
        const userTemporaryProfile = JSON.parse(await redisClient.get(req.params.email));
        // test if no verification code on file (could due to expiration) or if the code doesn't match
        if(userTemporaryProfile == null || userTemporaryProfile.code != req.body.code){
            errors.errors.push({
                msg: "Incorrect Verification Code!",
                param: "code",
                location: "body"
            });
        }
        // if any error occured, re-render the sign up page with the errors
        // otherwise, create the user's credential and redirect to the user's main page
        if(!errors.isEmpty()){
            res.render("user-verify", {
                title: "Email Verification - Chenxuan's User",
                errors: errors.array()
            });
        }
        else{
            const recoveryUser = await Users.findOne({email: req.params.email});
            const recoveryCredential = await Credentials.findById(recoveryUser.userID);
            recoveryCredential.password = userTemporaryProfile.password;
            console.log(recoveryCredential);
            console.log(userTemporaryProfile);
            await recoveryCredential.save();
            res.redirect(`/user/main/${recoveryCredential._id}`);
        }
    }),
];