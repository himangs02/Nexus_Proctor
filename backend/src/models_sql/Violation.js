import { DataTypes } from "sequelize";
import sequelize from "../config/mysql.js";

const Violation = sequelize.define(
  "Violation",
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

    type: {
      type: DataTypes.ENUM(
        'tab_switch', 'window_blur', 'fullscreen_exit', 'copy_paste',
        'right_click', 'devtools', 'keyboard_shortcut', 'screen_resize',
        'multiple_faces', 'no_face', 'face_mismatch', 'app_switch',
        'browser_switch', 'minimize', 'other'
      ),
      allowNull: false,
    },

    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },

    details: {
      type: DataTypes.TEXT,
    }
  },
  {
    tableName: "violations",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ['exam_id', 'student_id']
      },
      {
        fields: ['student_id', 'created_at']
      }
    ]
  }
);

export default Violation;
