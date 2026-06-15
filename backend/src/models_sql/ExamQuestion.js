import { DataTypes } from "sequelize";
import sequelize from "../config/mysql.js";

const ExamQuestion = sequelize.define(
  "ExamQuestion",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    examId: {
      type: DataTypes.BIGINT,
      field: "exam_id",
      allowNull: false,
      references: {
        model: 'exams',
        key: 'id'
      }
    },

    type: {
      type: DataTypes.ENUM('mcq', 'coding', 'subjective'),
      allowNull: false,
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
    },

    points: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },

    // Coding fields
    starterCode: {
      type: DataTypes.JSON,
      field: "starter_code",
      defaultValue: {},
    },

    timeLimitSeconds: {
      type: DataTypes.INTEGER,
      field: "time_limit_seconds",
      defaultValue: 5,
    },

    memoryLimitMB: {
      type: DataTypes.INTEGER,
      field: "memory_limit_mb",
      defaultValue: 256,
    },

    inputFormat: {
      type: DataTypes.TEXT,
      field: "input_format",
    },

    outputFormat: {
      type: DataTypes.TEXT,
      field: "output_format",
    },

    constraints: {
      type: DataTypes.TEXT,
    },

    allowedLanguages: {
      type: DataTypes.JSON,
      field: "allowed_languages",
      defaultValue: ['python', 'javascript', 'java', 'cpp', 'c'],
    },
  },
  {
    tableName: "exam_questions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default ExamQuestion;
