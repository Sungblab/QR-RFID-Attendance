import React, { useState, useEffect } from 'react';
import type { Student } from '../../services/api';

interface EditStudentModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onSubmit: (id: number, data: Partial<Student>) => void;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    grade: 1,
    class: 1,
    number: 1,
    rfid_card_id: ''
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        grade: student.grade || 1,
        class: student.class || 1,
        number: student.number || 1,
        rfid_card_id: student.rfid_card_id || ''
      });
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (student) {
      onSubmit(student.id, formData);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          학생 정보 수정
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                학년
              </label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({...formData, grade: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                반
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.class}
                onChange={(e) => setFormData({...formData, class: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                번호
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.number}
                onChange={(e) => setFormData({...formData, number: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              RFID 카드 ID
            </label>
            <input
              type="text"
              value={formData.rfid_card_id}
              onChange={(e) => setFormData({...formData, rfid_card_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="선택사항"
            />
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

export default EditStudentModal;