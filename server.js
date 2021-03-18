require("dotenv").config();
const express = require("express");
const server = express();
//const bodyparser = require("body-parser");
const { pool } = require("./dbConfig.js");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const { initialize } = require("./passportConfig.js");

const PORT = process.env.PORT || 4000;

server.set("view engine", "ejs");
server.use(express.urlencoded({ extended: false }));
server.use(express.json());

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
  res.send(res);
});

server.get("/register", checkAuthenticated, async (req, res) => {
  res.send(res);
});

server.get("/login", checkAuthenticated, (req, res) => {
  res.send(res);
});

server.get("/customerDashboard", checkNotAuthenticated, async (req, res) => {
  res.send(res, { user: req.user.name });
});

server.get("/api", async (req, res) => {
  pool.query(
    `SELECT "custId", "firstName", "lastName", "email", "cell", "addr1", "addr2", "city", "st", "zip", "county", "createDate" FROM "Customer"`,
    (err, res) => {
      if (err) {
        console.log(err);
        throw err;
      }
      console.log(res);
      res.send(res);
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
    pwd,
  } = req.body;
  // console.log(`req=`, req);
  console.log(`req.body= `, req.body);
  console.log({firstName, lastName, email, cell, addr1, addr2, city, st, zip, pwd});

    try {
      pwd = await bcrypt.hash(pwd, 10);
    } catch (err) {
        console.log(`bcrypt error: `, err);
        throw err;
    };

    pool.query(
      `SELECT "email", "cell" FROM "Customer"
            WHERE "email" = $1 AND "cell" = $2`,
      [email, cell],
      (err, results) => {
        if (err) {
          console.log(`select email and cell error: `, err);
          throw err;
        }
        console.log(`results: `, results);

        if (results.length > 0) {
          err.push({ message: "Email or Cell is already in use" });
          res.send({ message });
        } else {
          pool.query(
            `INSERT INTO "Customer" ("firstName", "lastName", "email", "cell", "addr1", "addr2", "city", "st", "zip", "pwd")
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        RETURNING "custId", "pwd"`,
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
              pwd,
            ],
            (err, results) => {
              if (err) {
                console.log(`insert error: `, err);
                throw err;
              }
              console.log(`insert results: `, results);
              req.flash(
                "success_msg",
                "Registration was successful, please login"
              );
              res.send(results);
            }
          );
        }
      }
    );
});

server.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "http://localhost:3000/customerdashboard",
    failureRedirect: "http://localhost:3000/login",
    failureFlash: true,
  })

  
);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("http://localhost:3000/customerdashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("http://localhost:3000/login");
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
