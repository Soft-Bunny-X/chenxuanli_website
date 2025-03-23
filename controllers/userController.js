const Users = require("../models/userProfile");
const Credentials = require("../models/userCredential");

const asyncHandler = require("express-async-handler");
const {body, validationResult} = require("express-validator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

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

exports.user_sign_up_post = [
    // validate and sanitize the inputs
    body("email")
        .trim()
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
            
            // const mailOptions = {
            //     from: "chenxuanli.official@gmail.com",
            //     to: req.body.email,
            //     subject: "Sign Up Email Verification - Chenuxan Li's Personal Website",
            //     html: `
            //         <h1>Thank you for joining Chenxuan's Personal Website!</h1>
            //         <p> Greetings, <br><br></p>
            //         <p> Your verification code is:<br></p>
            //         <h2 style="margin: 10px; padding: 10px; background-color: #DDD; color: #A22; border-radius: 5px; text-align: center;">${verificationCode}</h2>
            //         <p> <br> Please ignore this email if you did not sign up on Chenxuan's Personal Website. </p>
            //         <p> Best,</p>
            //         <p> Chenxuan Li</p>
            //         <div style="magin: 10px; padding: 10px; background-color: #DDD;">
            //             <a href="mailto:nickchenxuanli@outlook.com" style="text-decoration: none;">nickchenxuanli@outlook.com</a>
            //         </div>
            //     `
            // }
            
            // transporter.sendMail(mailOptions, (error, info) => {
            //     if(error) {
            //         console.log("Error: ", error);
            //     }
            //     else{
            //         console.log("Email sent: ", info.response);
            //     }
            // });
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
            res.render("user-sign-up-verify", {
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
            res.redirect(`/user/${newCredential._id}`);
        }
    }),
];

exports.user_log_in_post = [
    // validate and sanitize the inputs
    body("email")
        .trim()
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
            res.redirect(`/user/${credentialTemporary._id}`);
        }
    }), 
];

exports.user_main_get = [
    asyncHandler(async (req, res, next) => {
        const userTemporary = Users.find({userID: req.params.userID});
        res.render("user-main", {title: "User Center - Chenxuan's User"});
        // res.render("not found");
    }),
];