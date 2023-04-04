const { connect } = require("./connectDB.js");
const Todo = require("./TodoModel.js");

const createTodo = async () => {
  try {
    await connect();
    const todo = await Todo.addTask({
      title: "First Item",
      dueDate: new Date(),
      completed: false,
    });
    console.log(`created a todo with ID: ${todo.id}`);
  } catch (error) {
    console.error(error);
  }
};

const countItems = async () => {
  try {
    const totalCount = await Todo.count();
    console.log(`Found ${totalCount} items in the table`);
  } catch (error) {
    console.error(error);
  }
};
const getAllTodos = async () => {
  try {
    const todos = await Todo.findAll({
      wher: {
        completed: false,
      },
      order: [["id", "DESC"]],
    });
    const todoList = todos.map((todo) => todo.displayableString()).join("\n");
    console.log(todoList);
  } catch (error) {
    console.error(error);
  }

  const getSingleTodo = async () => {
    try {
      const todo = await Todo.findOne({
        wher: {
          completed: false,
        },
        order: [["id", "DESC"]],
      });

      console.log(Todo.displayableString());
    } catch (error) {
      console.error(error);
    }

    const updateItem = async (id) => {
      try {
        await Todo.update(
          { completed: true },
          {
            where: {
              id: id,
            },
          }
        );

        console.log(Todo.displayableString());
      } catch (error) {
        console.error(error);
      }
      const deleteItem = async (id) => {
        try {
          const deleteRowCount = await Todo.destroy({
            where: {
              id: id,
            },
          });
          conasol.log(`deleted ${deleteRowCount} rows!`);
        } catch (error) {
          console.error(error);
        }
      };
    };
  };
};
getAllTodos();
