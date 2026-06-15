import { DataTypes } from "sequelize";
import sequelize from "../config/mysql.js";

const Exam = sequelize.define(
  "Exam",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
    },

    course: {
      type: DataTypes.STRING,
      defaultValue: '',
    },

    facultyId: {
      type: DataTypes.BIGINT,
      field: "faculty_id",
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },

    publishedAt: {
      type: DataTypes.DATE,
      field: "published_at",
    },

    startTime: {
      type: DataTypes.DATE,
      field: "start_time",
    },

    endTime: {
      type: DataTypes.DATE,
      field: "end_time",
    },

    durationMinutes: {
      type: DataTypes.INTEGER,
      field: "duration_minutes",
      defaultValue: 60,
    },

    status: {
      type: DataTypes.ENUM('draft', 'published', 'active', 'ended'),
      defaultValue: 'draft',
    },

    // Proctoring settings (stored as JSON)
    proctoringConfig: {
      type: DataTypes.JSON,
      field: "proctoring_config",
      defaultValue: {
        enableWebcam: false,
        enableScreenShare: false,
        maxViolations: 3,
        restrictionMinutes: 30,
        disableCopyPaste: true,
        requireFullscreen: true,
        autoSubmitOnMax: true,
      },
    },

    totalMarks: {
      type: DataTypes.INTEGER,
      field: "total_marks",
      defaultValue: 0,
    },

    passingMarks: {
      type: DataTypes.INTEGER,
      field: "passing_marks",
      defaultValue: 40,
    },
  },
  {
    tableName: "exams",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Exam;
