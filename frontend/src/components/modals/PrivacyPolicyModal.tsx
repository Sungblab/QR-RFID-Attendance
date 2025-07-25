import React from 'react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">개인정보 처리방침</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제1조 (개인정보의 처리목적)
              </h3>
              <div className="text-gray-700 text-sm space-y-2">
                <p>시스템은 다음의 목적을 위하여 개인정보를 처리합니다.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>학생 출결 관리 및 통계 작성</li>
                  <li>교사 및 관리자 계정 관리</li>
                  <li>시스템 운영을 위한 필수 정보 처리</li>
                  <li>서비스 개선 및 문의사항 처리</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제2조 (처리하는 개인정보 항목)
              </h3>
              <div className="text-gray-700 text-sm space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">학생 정보</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>필수항목: 이름, 학번, 학년, 반, RFID 카드 ID</li>
                    <li>생성정보: 출결 기록, 접속 로그</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">교사/관리자 정보</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>필수항목: 이름, 아이디, 비밀번호</li>
                    <li>생성정보: 서비스 이용 기록, 접속 로그</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제3조 (개인정보의 처리 및 보유기간)
              </h3>
              <div className="text-gray-700 text-sm">
                <ul className="list-disc pl-5 space-y-1">
                  <li>학생 출결 정보: 학기 종료 후 5년</li>
                  <li>교사/관리자 계정 정보: 계정 삭제 시까지</li>
                  <li>시스템 접속 로그: 6개월</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제4조 (개인정보 제3자 제공)
              </h3>
              <div className="text-gray-700 text-sm">
                <p>
                  시스템은 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 
                  다만, 법령의 규정에 의거하거나 수사기관 및 행정기관이 수사 또는 
                  조사의 목적으로 정해진 절차와 방법에 따라 요청하는 경우에만 제공할 수 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제5조 (정보주체의 권리·의무 및 행사방법)
              </h3>
              <div className="text-gray-700 text-sm">
                <p className="mb-2">이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>개인정보 처리현황 통지 요구</li>
                  <li>개인정보 열람 요구</li>
                  <li>개인정보 정정·삭제 요구</li>
                  <li>개인정보 처리정지 요구</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제6조 (개인정보보호 책임자)
              </h3>
              <div className="text-gray-700 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p><strong>개인정보보호 책임자</strong></p>
                  <p>성명: 시스템 관리자</p>
                  <p>연락처: admin@attend-system.edu</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                부칙
              </h3>
              <div className="text-gray-700 text-sm">
                <p>본 방침은 2025년 1월 1일부터 시행됩니다.</p>
              </div>
            </section>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary-blue text-white rounded-xl hover:bg-primary-navy transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;