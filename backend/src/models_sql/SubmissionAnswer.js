import { DataTypes } from "sequelize";
import sequelize from "../config/mysql.js";

const SubmissionAnswer = sequelize.define(
  "SubmissionAnswer",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    submissionId: {
      type: DataTypes.BIGINT,
      field: "submission_id",
      allowNull: false,
      references: {
        model: 'submissions',
        key: 'id'
      }
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

    questionType: {
      type: DataTypes.ENUM('mcq', 'coding', 'subjective'),
      field: "question_type",
    },

    // MCQ
    selectedOption: {
      type: DataTypes.INTEGER,
      field: "selected_option",
      defaultValue: -1,
    },

    // Coding
    code: {
      type: DataTypes.TEXT('long'),
    },

    language: {
      type: DataTypes.STRING,
      defaultValue: 'python',
    },

    // Subjective
    textAnswer: {
      type: DataTypes.TEXT('long'),
      field: "text_answer",
    },

    // Grading
    isCorrect: {
      type: DataTypes.BOOLEAN,
      field: "is_correct",
      defaultValue: false,
    },

    score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    maxScore: {
      type: DataTypes.INTEGER,
      field: "max_score",
      defaultValue: 0,
    },

    // Coding verdict
    verdict: {
      type: DataTypes.STRING,
    },

    passedTests: {
      type: DataTypes.INTEGER,
      field: "passed_tests",
      defaultValue: 0,
    },

    totalTests: {
      type: DataTypes.INTEGER,
      field: "total_tests",
      defaultValue: 0,
    },
  },
  {
    tableName: "submission_answers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default SubmissionAnswer;
