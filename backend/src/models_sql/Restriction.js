import { DataTypes } from "sequelize";
import sequelize from "../config/mysql.js";

const Restriction = sequelize.define(
  "Restriction",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
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

    examId: {
      type: DataTypes.BIGINT,
      field: "exam_id",
      allowNull: false,
      references: {
        model: 'exams',
        key: 'id'
      }
    },

    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    restrictedAt: {
      type: DataTypes.DATE,
      field: "restricted_at",
      defaultValue: DataTypes.NOW,
    },

    expiresAt: {
      type: DataTypes.DATE,
      field: "expires_at",
      allowNull: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      field: "is_active",
      defaultValue: true,
    },

    violationCount: {
      type: DataTypes.INTEGER,
      field: "violation_count",
      defaultValue: 0,
    },

    imposedById: {
      type: DataTypes.BIGINT,
      field: "imposed_by_id",
      references: {
        model: 'users',
        key: 'id'
      }
    },
  },
  {
    tableName: "restrictions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ['student_id', 'exam_id']
      },
      {
        fields: ['expires_at']
      }
    ]
  }
);

export default Restriction;
