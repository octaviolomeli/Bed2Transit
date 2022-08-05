var theEmail = "";
var error_message = "";
var theRow;

// imports
const express = require('express');
require('dotenv').config();
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const mysql = require("mysql");

// Use
app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/css'));
app.use('/js', express.static(__dirname + 'public/js'));
app.use('/img', express.static(__dirname + 'public/img'));
app.use(express.urlencoded({ extended: false}));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(methodOverride('_method'));
app.use(cors());
app.use(express.json());
// Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Set views
app.set('views', './views');
app.set('view engine', 'ejs');

app.get('', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

// Database connection
const db = mysql.createPool({
    connectionLimit: 100,
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    port: process.env.DB_PORT
});

db.getConnection( (err, connection) => {
    if (err) throw (err)
    console.log(`DB connected successful: ${connection.threadId}`);
})

// Pages
app.get('', (req, res) => {
    res.render('index')
});

app.get('/', (req, res) => {
    res.render('index')
});

app.get("/help", (req, res) => {
    res.render('help.ejs')
});

// users have to be logged in to access monitor page. Send data to the page as well, helps populate the table with user data.
// checkAuthenticated
app.get("/monitor", (req, res) => {
    res.render('monitor.ejs', {
        email: theEmail, 
        user_data: JSON.stringify(theRow),
    })
});

// users have to not be logged in to access the login page
//checkNotAuthenticated
app.get('/login', (req, res) => {
    res.render('login.ejs', {err_msg: error_message})
});

// when user logs in, direct them to the monitor page if successful
//checkNotAuthenticated
app.post("/login", (req, res) => {
    const inputted_email = req.body.email;
    const inputted_password = req.body.password;
    db.getConnection( async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "SELECT * FROM information WHERE email = ?";
        const search_query = mysql.format(sqlSearch, [inputted_email]);

        await connection.query (search_query, async (err, result) => {
            connection.release();
            if (err) throw (err)
            if (result.length == 0) {
                error_message = "No users with that email.";
                res.redirect('/login')
            }
            else{
                const hashedPassword = result[0].password;
                if (await bcrypt.compare(inputted_password, hashedPassword)){
                    theEmail = inputted_email;
                    theRow = result[0];
                    error_message = "";
                    res.redirect("/monitor");
                }
                else {
                    error_message = "Incorrect password.";
                    res.redirect("/login");
                }
            }
        })
    })
})


// users have to not be logged in to access signup page
app.get('/signup', (req, res) => {
    res.render('signup.ejs')
})

// when user signs up, make an account and direct them to the login page
app.post('/signup', async (req, res) => {
    try {
        const input_email = req.body.email;
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const entry = " | | | | | | | ";

        db.getConnection( async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = "SELECT * FROM information WHERE email = ?";
            const search_query = mysql.format(sqlSearch, [input_email]);
            const sqlInsert = "INSERT INTO information VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            const insert_query = mysql.format(sqlInsert, [input_email, hashedPassword, entry, entry, entry, entry, entry, entry, entry]);
            await connection.query(search_query, async (err, result) => {
                if (err) throw (err)
                // result.length = how many rows with this email
                if (result.length != 0){
                    connection.release();
                    res.redirect('/signup')
                }
                else {
                    await connection.query (insert_query, (err, result) => {
                        connection.release();
                        if (err) throw (err)
                        res.redirect('/login');
                    })
                }
            })
        })
    } catch {
        res.redirect('/signup');
    }
})

app.delete('/logout', (req, res, next)=> {
    req.logout((err) => {
      if (err) { return next(err); }
      res.redirect('/login');
    });
});

// updates user's information in the database
app.post('/update_user', (req, res) => {
    var request = req.body;
    try {
        // update user's information in the database
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlUpdate = "UPDATE information SET "+request['entry_name']+" = ? WHERE email = ?";
            const update_query = mysql.format(sqlUpdate, [request['new_value'], request['user_email']]);
            await connection.query(update_query, async (err, result) => {
                if (err) throw (err)
            })
            connection.release();
        })
    }catch (err) {
        console.log(err);
    }
})

app.listen(process.env.PORT, () => {console.log("App is running.")});