const request = require("supertest");
const db = require("../models/index");
const app = require("../app");
let cheerio = require("cheerio");

let server, agent;
function extractCsrfToken(res) {
  let $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      _csrf: csrfToken,
      firstName: "Test",
      lastName: "User 1",
      email: "user1@test.com",
      password: "password",
    });
    expect(res.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    let res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  });

  // test adding new todos
  test("Creates a todo and responds with json at /todos POST endpoint", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    const res = await agent.get("/todos");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  // test the update endpoint for changing the completion status
  test("Update the completed field of the given todo", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    const res = await agent.get("/todos");
    const csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "wash dishes",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    // the above added todo is second in the list of newly added todos
    const todoID = await agent
      .get("/todos")
      .set("Accept", "application/json")
      .then((response) => {
        const parsedResponse = JSON.parse(response.text);
        return parsedResponse.dueTodayItems[1]["id"];
      });

    // Testing for false to true
    const setCompletionResponse = await agent
      .put(`/todos/${todoID}`)
      .send({ completed: true, _csrf: csrfToken });
    const parsedUpdateResponse = JSON.parse(setCompletionResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);

    // Testing for true to false
    const setCompletionResponse2 = await agent
      .put(`/todos/${todoID}`)
      .send({ completed: false, _csrf: csrfToken });
    const parsedUpdateResponse2 = JSON.parse(setCompletionResponse2.text);
    expect(parsedUpdateResponse2.completed).toBe(false);
  });

  // testing the deletion of a todo
  test("testing the delete endpoint", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    const res = await agent.get("/todos"); // using the  page to get the csrf token
    const csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy Momos",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    // get the id of 'Buying Momos' so that we can delete it
    const todoID = await agent
      .get("/todos")
      .set("Accept", "application/json")
      .then((response) => {
        const parsedMixedResponse = JSON.parse(response.text);
        const parsedResponse = parsedMixedResponse.dueTodayItems;
        return parsedResponse[2]["id"];
      });

    const deleteResponse = await agent
      .delete(`/todos/${todoID}`)
      .send({ _csrf: csrfToken });
    // extract the text from the response
    const parsedDeleteResponse = JSON.parse(deleteResponse.text);
    expect(parsedDeleteResponse.success).toBe(true);
  });

  test("Check if a user can access someone else's todo", async () => {
    // Create a new user test user 2
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      _csrf: csrfToken,
      firstName: "Test",
      lastName: "User 2",
      email: "user2@test.com",
      password: "password",
    });

    // Add a todo to user 2
    res = await agent.get("/todos"); // using the  page to get the csrf token
    await agent.post("/todos").send({
      title: "Demo Todo",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const todoID = await agent
      .get("/todos")
      .set("Accept", "application/json")
      .then((response) => {
        const parsedMixedResponse = JSON.parse(response.text);
        const parsedResponse = parsedMixedResponse.dueTodayItems;
        const latestTodo = parsedResponse[parsedResponse.length - 1];
        return latestTodo.id;
      });

    // Sign out and sign in as user 1
    await agent.get("/signout");
    await login(agent, "user1@test.com", "password");

    // Try to update the todo of user 2
    const setCompletionResponse = await agent
      .put(`/todos/${todoID}`)
      .send({ completed: true, _csrf: csrfToken });
    expect(setCompletionResponse.statusCode).toBe(403);

    // Try to delete the todo of user 2
    const deleteResponse = await agent
      .delete(`/todos/${todoID}`)
      .send({ _csrf: csrfToken });
    // extract the text from the response
    const parsedDeleteResponse = JSON.parse(deleteResponse.text);
    expect(parsedDeleteResponse.success).toBe(false);
  });
});
