import { DataTypes } from "sequelize";
import sequelize from "../config/mysql.js";

const Submission = sequelize.define(
  "Submission",
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

    studentId: {
      type: DataTypes.BIGINT,
      field: "student_id",
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },

    status: {
      type: DataTypes.ENUM('in_progress', 'submitted', 'auto_submitted', 'disqualified'),
      defaultValue: 'in_progress',
    },

    totalScore: {
      type: DataTypes.INTEGER,
      field: "total_score",
      defaultValue: 0,
    },

    maxScore: {
      type: DataTypes.INTEGER,
      field: "max_score",
      defaultValue: 0,
    },

    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },

    startedAt: {
      type: DataTypes.DATE,
      field: "started_at",
      defaultValue: DataTypes.NOW,
    },

    submittedAt: {
      type: DataTypes.DATE,
      field: "submitted_at",
    },

    autoSubmit: {
      type: DataTypes.BOOLEAN,
      field: "auto_submit",
      defaultValue: false,
    },

    autoSubmitReason: {
      type: DataTypes.TEXT,
      field: "auto_submit_reason",
    },

    violationCount: {
      type: DataTypes.INTEGER,
      field: "violation_count",
      defaultValue: 0,
    },
  },
  {
    tableName: "submissions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ['exam_id', 'student_id'],
        unique: true,
        name: 'unique_exam_student'
      }
    ]
  }
);

export default Submission;
