import { DataTypes } from "sequelize";
import sequelize from "../config/mysql.js";

const QuestionOption = sequelize.define(
  "QuestionOption",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    questionId: {
      type: DataTypes.BIGINT,
      field: "question_id",
      allowNull: false,
      references: {
        model: 'exam_questions',
        key: 'id'
      }
    },

    text: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    isCorrect: {
      type: DataTypes.BOOLEAN,
      field: "is_correct",
      defaultValue: false,
    },

    orderIndex: {
      type: DataTypes.INTEGER,
      field: "order_index",
      defaultValue: 0,
    },
  },
  {
    tableName: "question_options",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default QuestionOption;
