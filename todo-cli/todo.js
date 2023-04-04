const todoList = () => {
  let all = [];
  const add = (todoItem) => {
    all.push(todoItem);
  };
  const markAsComplete = (index) => {
    all[index].completed = true;
  };
  const today = new Date().toLocaleDateString("en-CA");

  const overdue = () => {
    return all.filter((todo) => today > todo.dueDate);
  };

  const dueToday = () => {
    return all.filter((todo) => today == todo.dueDate);
    // Write the date check condition here and return the array
    // of todo items that are due today accordingly.
  };

  const dueLater = () => {
    return all.filter((todo) => today < todo.dueDate);
    // Write the date check condition here and return the array
    // of todo items that are due later accordingly.
  };

  const toDisplayableList = (list) => {
    return list
      .map(
        (todo) =>
          `${todo.completed ? "[x]" : "[ ]"} ${todo.title} ${
            todo.dueDate == today ? "" : todo.dueDate
          }`
      )
      .join("\n");
    // Format the To-Do list here, and return the output string
    // as per the format given above.
  };

  return {
    all,
    add,
    markAsComplete,
    overdue,
    dueToday,
    dueLater,
    toDisplayableList,
  };
};

// ####################################### #
// DO NOT CHANGE ANYTHING BELOW THIS LINE. #
// ####################################### #
module.exports = todoList;
