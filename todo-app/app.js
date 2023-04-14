const express = require("express");
const csrf = require("csurf"); // using csrf
// const csrf = require("tiny-csrf");
const app = express();
const { Todo, User } = require("./models");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");

const passport = require("passport"); // using passport
const LocalStrategy = require("passport-local"); // using passport-local as strategy
const session = require("express-session");
const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const flash = require("connect-flash");

// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname, "views"));
app.use(flash());

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("some other secret string"));
// ["POST", "PUT", "DELETE"]));
app.use(csrf({ cookie: true }));
// app.use(csrf("123456789iamasecret987654321look", // secret -- must be 32 bits or chars in length
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "secret-key-that-no-one-can-guess",
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// passport config
app.use(passport.initialize());
app.use(passport.session());

// authentication
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({
        where: {
          email: username,
        },
      })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "User does not exists" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

app.set("view engine", "ejs");

app.get("/", async function (request, response) {
  if (request.user) {
    return response.redirect("/todos");
  } else {
    return response.render("index", {
      title: "Todo App",
      csrfToken: request.csrfToken(),
    });
  }
});

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});

app.get("/login", (request, response) => {
  response.render("login", {
    title: "Login",
    csrfToken: request.csrfToken(),
  });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    response.redirect("/todos");
  }
);

app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) return next(err);
    response.redirect("/login");
  });
});

app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const userId = request.user.id;
    const userAcc = await User.findByPk(userId);
    const userName = userAcc.firstName + " " + userAcc.lastName;
    const overdueItems = await Todo.overdue(userId);
    const dueTodayItems = await Todo.dueToday(userId);
    const dueLaterItems = await Todo.dueLater(userId);
    const completedItems = await Todo.completed(userId);
    if (request.accepts("html")) {
      response.render("todo", {
        title: "Todos",
        overdueItems,
        dueTodayItems,
        dueLaterItems,
        completedItems,
        userName,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        overdueItems,
        dueTodayItems,
        dueLaterItems,
        completedItems,
        userName,
      });
    }
  }
);

app.get(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const todo = await Todo.findByPk(request.params.id);
      return response.json(todo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post("/users", async (request, response) => {
  const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);
  if (request.body.firstName == "") {
    request.flash("error", "First Name is required");
    return response.redirect("/signup");
  }
  if (request.body.email == "") {
    request.flash("error", "Invalid Email");
    return response.redirect("/signup");
  }
  if (request.body.password.length < 6) {
    request.flash("error", "Password must be at least 6 characters");
    return response.redirect("/signup");
  }
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPassword,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
      }
      response.redirect("/todos");
    });
  } catch (error) {
    request.flash("error", "Email already registered");
    return response.redirect("/signup");
  }
});

app.post(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    if (request.body.title == "") {
      request.flash("error", "Todo must have a title");
      return response.redirect("/todos");
    }
    if (request.body.dueDate == "") {
      request.flash("error", "Please provide a due date");
      return response.redirect("/todos");
    }
    try {
      await Todo.addTodo({
        title: request.body.title,
        dueDate: request.body.dueDate,
        userId: request.user.id,
      });
      return response.redirect("/todos");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.put(
  "/todos/:id/",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const todo = await Todo.findByPk(request.params.id);
    if (todo.userId === request.user.id) {
      try {
        const updatedTodo = await todo.setCompletionStatus(
          request.body.completed
        );
        return response.json(updatedTodo);
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else {
      return response
        .status(403)
        .json({ error: "You are not authorized to update this todo" });
    }
  }
);

app.delete(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("Deleting a Todo with ID: ", request.params.id);
    try {
      await Todo.remove(request.params.id, request.user.id);
      const todos = await Todo.findByPk(request.params.id);
      if (todos) {
        return response.json({ success: false });
      } else {
        return response.json({ success: true });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//testing route
app.get("/test_todos", async function (_request, response) {
  console.log("Processing list of all Todos ...");
  try {
    const todos = await Todo.findAll();
    response.send(todos);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

module.exports = app;
