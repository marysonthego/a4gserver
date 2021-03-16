require("dotenv").config();
const express = require("express");

const server = express();

const { pool } = require("./dbConfig.js");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const { initialize } = require("./passportConfig.js");

const PORT = process.env.PORT || 4000;

server.set("view engine", "ejs");
server.use(express.urlencoded({ extended: false }));

server.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);
server.use(passport.initialize());
server.use(passport.session());

server.use(flash());

server.get("/", (req, res) => {
  res.render("home");
});

server.get("/register", checkAuthenticated, (req, res) => {
  res.render("register");
});

server.get("/login", checkAuthenticated, (req, res) => {
  res.render("login");
});

server.get("/customerdashboard", checkNotAuthenticated, (req, res) => {
  res.render("customerdashboard", { user: req.user.name });
});

server.get("/api", (req, res) => {
  pool.query(
    `SELECT "custId", "firstName", "lastName", "email", "cell", "addr1", "addr2", "city", "st", "zip", "county", "createDate" FROM "Customer"`,
    (err, results) => {
      if (err) {
        console.log(err);
        throw err;
      }
      console.log(results);
      res.send(results);
    }
  );
});

server.post("/register", async (req, res) => {
  let {
    firstName,
    lastName,
    email,
    cell,
    addr1,
    addr2,
    city,
    st,
    zip,
    county,
    password,
  } = req.body;

  if (errors.length > 0) {
    res.render("register", { errors });
  } else {
    let hashedPassword = await bcrypt.hash(password, 10);
    pool.query(
      `SELECT * FROM Customer
            WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        }
        console.log(results.rows);

        if (results.rows.length > 0) {
          errors.push({ message: "Email is already in use" });
          res.render("register", { errors });
        } else {
          pool.query(
            `INSERT INTO customer (firstName, lastName, email, cell, addr1, addr2, city, st, zip, county, password)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        RETURNING custId, password`,
            [
              firstName,
              lastName,
              email,
              cell,
              addr1,
              addr2,
              city,
              st,
              zip,
              county,
              hashedPassword,
            ],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash(
                "success_msg",
                "Registration was successful, please login"
              );
              res.redirect("/login");
            }
          );
        }
      }
    );
  }
});

server.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/customerdashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })

  
);

server.post(
  "/loginMUI",
  passport.authenticate("local", {
    successRedirect: "/customerdashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/customerdashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
