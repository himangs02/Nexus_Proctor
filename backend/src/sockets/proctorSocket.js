let globalIO;

export const getIO = () => {
  if (!globalIO) throw new Error('Socket.io not initialized!');
  return globalIO;
};

export const setupProctorSockets = (io) => {
  globalIO = io;
  // Track active exam sessions: { examId: { studentId: socketId } }
  const activeSessions = new Map();

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_dashboard', ({ role }) => {
      if (role === 'student') socket.join('students_global');
    });

    socket.on('join_exam', ({ examId, studentId, studentName }) => {
      socket.join(`exam_${examId}`);
      socket.join(`student_${studentId}`);
      socket.examId = examId;
      socket.studentId = studentId;
      socket.studentName = studentName;

      if (!activeSessions.has(examId)) activeSessions.set(examId, new Map());
      activeSessions.get(examId).set(studentId, { socketId: socket.id, name: studentName, joinedAt: new Date() });

      io.to(`faculty_${examId}`).emit('student_joined', {
        studentId, studentName, timestamp: new Date(),
        activeCount: activeSessions.get(examId).size,
      });
    });

    socket.on('join_monitoring', ({ examId }) => {
      socket.join(`faculty_${examId}`);
      const sessions = activeSessions.get(examId);
      socket.emit('active_students', {
        students: sessions ? Array.from(sessions.entries()).map(([id, info]) => ({ studentId: id, ...info })) : [],
      });
    });

    socket.on('violation', (data) => {
      console.warn(`🚨 VIOLATION [${data.type}] from ${socket.studentName} (${socket.studentId})`);
      io.to(`faculty_${socket.examId}`).emit('violation_alert', {
        studentId: socket.studentId,
        studentName: socket.studentName,
        type: data.type,
        severity: data.severity || 'medium',
        details: data.details || '',
        timestamp: new Date(),
        count: data.count || 0,
      });
    });

    socket.on('student_restricted', (data) => {
      io.to(`faculty_${socket.examId}`).emit('student_restricted', {
        studentId: socket.studentId,
        studentName: socket.studentName,
        reason: data.reason,
        timestamp: new Date(),
      });
    });

    socket.on('exam_auto_submitted', (data) => {
      io.to(`faculty_${socket.examId}`).emit('student_auto_submitted', {
        studentId: socket.studentId,
        studentName: socket.studentName,
        reason: data.reason,
        timestamp: new Date(),
      });
    });

    socket.on('force_submit_student', ({ examId, studentId, reason }) => {
      io.to(`student_${studentId}`).emit('force_submit', { reason });
    });

    // 🚨 ALL LIVE VIDEO STREAMING LOGIC HAS BEEN COMPLETELY REMOVED FROM HERE 🚨

    socket.on('disconnect', () => {
      if (socket.examId && socket.studentId) {
        const sessions = activeSessions.get(socket.examId);
        if (sessions) {
          sessions.delete(socket.studentId);
          io.to(`faculty_${socket.examId}`).emit('student_left', {
            studentId: socket.studentId,
            studentName: socket.studentName,
            activeCount: sessions.size,
          });
        }
      }
    });
  });
};