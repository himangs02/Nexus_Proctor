import { DataTypes } from "sequelize";
import sequelize from "../config/mysql.js";

const TestCase = sequelize.define(
  "TestCase",
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

    input: {
      type: DataTypes.TEXT,
    },

    expectedOutput: {
      type: DataTypes.TEXT,
      field: "expected_output",
    },

    isHidden: {
      type: DataTypes.BOOLEAN,
      field: "is_hidden",
      defaultValue: false,
    },

    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    orderIndex: {
      type: DataTypes.INTEGER,
      field: "order_index",
      defaultValue: 0,
    },
  },
  {
    tableName: "test_cases",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default TestCase;
