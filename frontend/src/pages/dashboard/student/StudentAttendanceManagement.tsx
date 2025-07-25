import React from 'react';
import AttendanceRecords from './attendance/AttendanceRecords';

const StudentAttendanceManagement: React.FC = () => {

  return (
    <div className="transition-colors">
      <AttendanceRecords />
    </div>
  );
};

export default StudentAttendanceManagement;