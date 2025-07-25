import { Link } from 'react-router-dom';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              개인정보 처리방침
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              디지털 출결 시스템(이하 "시스템")은 개인정보보호법에 따라 
              이용자의 개인정보 보호 및 권익을 보장하고자 다음과 같이 개인정보 처리방침을 명시합니다.
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제1조 (개인정보의 처리목적)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <p>시스템은 다음의 목적을 위하여 개인정보를 처리합니다.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>학생 출결 관리 및 통계 작성</li>
                  <li>교사 및 관리자 계정 관리</li>
                  <li>시스템 운영을 위한 필수 정보 처리</li>
                  <li>서비스 개선 및 문의사항 처리</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제2조 (처리하는 개인정보 항목)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <p>시스템은 다음의 개인정보 항목을 처리합니다.</p>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">학생 정보</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>필수항목: 이름, 학번, 학년, 반, RFID 카드 ID</li>
                    <li>생성정보: 출결 기록, 접속 로그</li>
                  </ul>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">교사/관리자 정보</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>필수항목: 이름, 아이디, 비밀번호</li>
                    <li>생성정보: 서비스 이용 기록, 접속 로그</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제3조 (개인정보의 처리 및 보유기간)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <p>개인정보는 다음과 같은 기간 동안 보유 및 처리됩니다.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>학생 출결 정보: 학기 종료 후 5년</li>
                  <li>교사/관리자 계정 정보: 계정 삭제 시까지</li>
                  <li>시스템 접속 로그: 6개월</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제4조 (개인정보 제3자 제공)
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>
                  시스템은 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 
                  다만, 법령의 규정에 의거하거나 수사기관 및 행정기관이 수사 또는 
                  조사의 목적으로 정해진 절차와 방법에 따라 요청하는 경우에만 제공할 수 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제5조 (개인정보 처리의 위탁)
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>시스템은 개인정보 처리업무를 외부에 위탁하지 않습니다.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제6조 (정보주체의 권리·의무 및 행사방법)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <p>이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>개인정보 처리현황 통지 요구</li>
                  <li>개인정보 열람 요구</li>
                  <li>개인정보 정정·삭제 요구</li>
                  <li>개인정보 처리정지 요구</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제7조 (개인정보의 안전성 확보조치)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <p>시스템은 개인정보 보호를 위해 다음과 같은 조치를 취하고 있습니다.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육</li>
                  <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치</li>
                  <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제8조 (개인정보보호 책임자)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <p>개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 처리하기 위하여 아래와 같이 개인정보보호 책임자를 지정하고 있습니다.</p>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p><strong className="text-gray-800 dark:text-white">개인정보보호 책임자</strong></p>
                  <p className="text-gray-700 dark:text-gray-300">성명: 시스템 관리자</p>
                  <p className="text-gray-700 dark:text-gray-300">연락처: admin@attend-system.edu</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제9조 (개인정보 처리방침 변경)
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>
                  이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                부칙
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>본 방침은 2025년 1월 1일부터 시행됩니다.</p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-center">
              <Link 
                to="/auth/signup"
                className="px-6 py-3 bg-primary-blue text-white rounded-xl hover:bg-primary-navy transition-colors focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                회원가입으로 돌아가기
              </Link>
            </div>
          </div>
          <div className="mt-4 pt-2 border-gray-200 dark:border-gray-600">
            <div className="flex justify-center">
              <Link 
                to="/auth/login"
                className="px-6 py-3 bg-primary-blue text-white rounded-xl hover:bg-primary-navy transition-colors focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                로그인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;