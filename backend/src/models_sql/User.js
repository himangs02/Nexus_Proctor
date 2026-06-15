import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import sequelize from "../config/mysql.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    studentId: {
      type: DataTypes.STRING,
      field: "student_id",
    },

    facultyId: {
      type: DataTypes.STRING,
      field: "faculty_id",
    },

    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM(
        "student",
        "teacher",
        "admin",
        "faculty"
      ),
      defaultValue: "student",
    },

    department: DataTypes.STRING,

    isActive: {
      type: DataTypes.BOOLEAN,
      field: "is_active",
      defaultValue: true,
    },

    lastLogin: {
      type: DataTypes.DATE,
      field: "last_login",
    },

    passwordResetRequired: {
      type: DataTypes.BOOLEAN,
      field: "password_reset_required",
      defaultValue: false,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// Hash password on CREATE
User.beforeCreate(async (user) => {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

// Hash password on UPDATE (e.g., changePassword)
User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(
    enteredPassword,
    this.password
  );
};

export default User;