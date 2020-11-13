require('dotenv').config()// Get environment file

const express           = require('express'),
      app               = express(),
      PORT              = process.env.PORT || 8000,
      IP                = process.env.IP || "127.0.0.1",
      bodyParser        = require('body-parser'),
      mongoose          = require('mongoose'),
      cookieParser      = require("cookie-parser"),
      flash             = require('connect-flash'),
      passport          = require('passport'),
      LocalStrategy     = require('passport-local'),
      methodOverride    = require('method-override'),
      tooBusy           = require('toobusy-js'),
      User              = require('./models/user'),
      csrf              = require('csurf'),
      helmet            = require('helmet')

const db = {
    address: process.env.DB_ADDRESS,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD
}

const commentRoutes     = require('./routes/comments'),
      articleRoutes     = require('./routes/articles'),
      authRoutes        = require('./routes/index')

if(db.address === undefined || db.username === undefined || db.password === undefined) throw new Error('Database variables undefined, check environmental variables.')
mongoose.connect(`mongodb+srv://${db.username}:${db.password}@${db.address}`,{useUnifiedTopology: true, useNewUrlParser: true})
app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'))

//PASSPORT CONFIGURATION
app.use(require('express-session')({
    //Change this key for your project
    secret:'denmarkisbetterthanswedenandfinland',
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
app.use(cookieParser('secret'))
app.use(flash())

//DDoS prevention
app.use((req, res, next) => {
    if(tooBusy()) {
        return res.sendStatus(503)
    }
    next()
})

//Set data limits for requests
app.use(express.urlencoded({ limit: "1kb" }))
app.use(express.json({ limit: "1kb" }))
app.use(express.multipart({ limit:"10mb" }))
app.use(express.limit("5kb"))

//Setup Anti-CSRF Token security NOT DONE IMPLEMENT ON ROUTES
app.use(csrf({ cookie: true }))

//Set up HTTP Parameter Pollution
app.use(require('hpp')())

//Set up Helmet
//app.use(helmet.hsts()) //HTTP Strict-Transport-Security enable once ssl
app.use(helmet.frameguard())
app.use(helmet.noSniff())
app.use(helmet.ieNoOpen())
app.use(helmet.hidePoweredBy({setTo: 'Whisky Powered.'}))

//Disable XSS Auditor
app.use((req, res, next) => {
    res.setHeader('X-XSS-Protection', '0')
    next()
})


//Passport setup
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

//Set local variables
app.use((req, res, next) => {
        res.locals.currentUser = req.user;
        res.locals.error = req.flash('error')
        res.locals.success = req.flash('success')
        next()
    }
)

app.use('/', authRoutes)
app.use('/articles', articleRoutes)
app.use('/articles/:id/comments', commentRoutes)
app.locals.moment = require('moment')

app.listen(PORT, IP, () => console.log('Server is listening on PORT:', PORT))