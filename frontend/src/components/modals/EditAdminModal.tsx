import React, { useState, useEffect } from 'react';

interface Admin {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'teacher';
  createdAt: string;
  updatedAt: string;
}

interface EditAdminModalProps {
  isOpen: boolean;
  admin: Admin | null;
  onClose: () => void;
  onSubmit: (id: number, data: Partial<Admin>) => void;
}

const EditAdminModal: React.FC<EditAdminModalProps> = ({
  isOpen,
  admin,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: 'teacher' as 'admin' | 'teacher'
  });

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name || '',
        username: admin.username || '',
        role: admin.role || 'teacher'
      });
    }
  }, [admin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (admin) {
      onSubmit(admin.id, formData);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen || !admin) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          관리자 정보 수정
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              이름
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              아이디
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              역할
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as 'admin' | 'teacher'})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="teacher">교사</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              수정
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAdminModal;