"use strict";
const { Op } = require("sequelize");
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Todo.belongsTo(models.User, {
        foreignKey: "userId",
      });
      // define association here
    }

    static async overdue(userId) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date(),
          },
          userId: userId,
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }

    static async dueToday(userId) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date(),
          },
          userId: userId,
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }

    static async dueLater(userId) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date(),
          },
          userId: userId,
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }
    static async completed(userId) {
      return await Todo.findAll({
        where: {
          completed: true,
          userId: userId,
        },
        order: [["id", "ASC"]],
      });
    }

    static async addTodo({ title, dueDate, userId }) {
      return await this.create({
        title: title,
        dueDate: dueDate,
        completed: false,
        userId: userId,
      });
    }

    static async remove(id, userId) {
      return await this.destroy({
        where: {
          id: id,
          userId: userId,
        },
      });
    }

    setCompletionStatus(status) {
      return this.update({ completed: status });
    }
    static async getTodos() {
      return await this.findAll();
    }
  }
  Todo.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
        },
      },
      dueDate: DataTypes.DATEONLY,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
