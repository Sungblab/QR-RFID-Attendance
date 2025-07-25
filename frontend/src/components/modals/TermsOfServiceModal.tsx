import React from 'react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">서비스 이용약관</h2>
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
                제1조 (목적)
              </h3>
              <div className="text-gray-700 text-sm">
                <p>
                  본 약관은 완도고 출결 시스템이 제공하는 모든 서비스의 이용조건 및 절차, 
                  이용자와 시스템 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제2조 (정의)
              </h3>
              <div className="text-gray-700 text-sm space-y-2">
                <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>"시스템"이란 지능형 RFID 출결 관리 서비스를 의미합니다.</li>
                  <li>"이용자"란 본 약관에 따라 시스템이 제공하는 서비스를 받는 회원 및 비회원을 의미합니다.</li>
                  <li>"회원"이란 시스템에 개인정보를 제공하여 회원등록을 한 자로서, 시스템의 정보를 지속적으로 제공받으며 시스템이 제공하는 서비스를 계속적으로 이용할 수 있는 자를 의미합니다.</li>
                  <li>"RFID 카드"란 학생 출결 확인을 위해 사용되는 무선 인식 카드를 의미합니다.</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제3조 (약관의 효력 및 변경)
              </h3>
              <div className="text-gray-700 text-sm">
                <ol className="list-decimal pl-5 space-y-1">
                  <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력을 발생합니다.</li>
                  <li>시스템은 합리적인 사유가 발생할 경우 관련법령에 위배되지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
                  <li>약관이 변경되는 경우 시스템은 변경사항을 시행일 7일 전부터 공지사항을 통해 공지합니다.</li>
                </ol>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제4조 (서비스의 제공)
              </h3>
              <div className="text-gray-700 text-sm space-y-2">
                <p>시스템은 다음과 같은 업무를 수행합니다.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>RFID 기반 학생 출결 관리</li>
                  <li>실시간 출결 현황 모니터링</li>
                  <li>출결 통계 및 보고서 제공</li>
                  <li>교사 및 관리자를 위한 관리도구 제공</li>
                  <li>기타 시스템이 정하는 업무</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제5조 (회원의 의무)
              </h3>
              <div className="text-gray-700 text-sm space-y-2">
                <p>회원은 다음 행위를 하여서는 안 됩니다.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>신청 또는 변경 시 허위내용의 등록</li>
                  <li>타인의 정보 도용</li>
                  <li>시스템에 게시된 정보의 변경</li>
                  <li>시스템이 정한 정보 이외의 정보의 송신 또는 게시</li>
                  <li>시스템 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                  <li>시스템 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제6조 (개인정보보호)
              </h3>
              <div className="text-gray-700 text-sm">
                <p>
                  시스템은 이용자의 개인정보를 보호하기 위해 개인정보보호법 등 관련 법령을 준수하며, 
                  개인정보 처리방침을 별도로 정하여 시행합니다.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                제7조 (면책조항)
              </h3>
              <div className="text-gray-700 text-sm">
                <ol className="list-decimal pl-5 space-y-1">
                  <li>시스템은 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                  <li>시스템은 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
                  <li>시스템은 이용자가 서비스를 이용하여 기대하는 손익이나 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.</li>
                </ol>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                부칙
              </h3>
              <div className="text-gray-700 text-sm">
                <p>본 약관은 2025년 1월 1일부터 시행됩니다.</p>
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

export default TermsOfServiceModal;