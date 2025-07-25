import React from 'react';
import type { Student } from '../../services/api';

interface Admin {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'teacher';
  createdAt: string;
  updatedAt: string;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  student?: Student | null;
  admin?: Admin | null;
  isBulkDelete?: boolean;
  bulkDeleteCount?: number;
  bulkDeleteType?: 'student' | 'admin';
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  student,
  admin,
  isBulkDelete,
  bulkDeleteCount,
  bulkDeleteType,
  onClose,
  onConfirm
}) => {
  const isStudent = !!student || bulkDeleteType === 'student';
  const name = student?.name || admin?.name;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {isBulkDelete ? '일괄 삭제' : `${isStudent ? '학생' : '관리자'} 삭제`}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {isBulkDelete ? (
            <>
              정말로 선택한 <strong>{bulkDeleteCount}명</strong>의 {bulkDeleteType === 'student' ? '학생' : '관리자'}을 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </>
          ) : (
            <>
              정말로 <strong>{name}</strong>{isStudent ? ' 학생' : ' 관리자'}을 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </>
          )}
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;