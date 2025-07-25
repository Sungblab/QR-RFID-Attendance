import { Link } from 'react-router-dom';

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              서비스 이용약관
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              디지털 출결 시스템(이하 "시스템")의 서비스를 이용하시는 모든 분들께 
              적용되는 이용약관입니다. 서비스 이용 전 반드시 내용을 확인해 주시기 바랍니다.
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제1조 (목적)
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>
                  본 약관은 디지털 출결 시스템이 제공하는 모든 서비스의 이용조건 및 절차, 
                  이용자와 시스템 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제2조 (정의)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>"시스템"이란 지능형 RFID 출결 관리 서비스를 의미합니다.</li>
                  <li>"이용자"란 본 약관에 따라 시스템이 제공하는 서비스를 받는 회원 및 비회원을 의미합니다.</li>
                  <li>"회원"이란 시스템에 개인정보를 제공하여 회원등록을 한 자로서, 시스템의 정보를 지속적으로 제공받으며 시스템이 제공하는 서비스를 계속적으로 이용할 수 있는 자를 의미합니다.</li>
                  <li>"RFID 카드"란 학생 출결 확인을 위해 사용되는 무선 인식 카드를 의미합니다.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제3조 (약관의 효력 및 변경)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <ol className="list-decimal pl-6 space-y-2">
                  <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력을 발생합니다.</li>
                  <li>시스템은 합리적인 사유가 발생할 경우 관련법령에 위배되지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
                  <li>약관이 변경되는 경우 시스템은 변경사항을 시행일 7일 전부터 공지사항을 통해 공지합니다.</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제4조 (회원가입)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <ol className="list-decimal pl-6 space-y-2">
                  <li>이용자는 시스템이 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
                  <li>시스템은 다음 각 호에 해당하는 신청에 대하여는 승낙하지 않거나 사후에 이용계약을 해지할 수 있습니다.
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                      <li>실명이 아니거나 타인의 명의를 이용한 경우</li>
                      <li>허위 정보를 기재하거나 시스템이 제시하는 내용을 기재하지 않은 경우</li>
                    </ul>
                  </li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제5조 (서비스의 제공 및 변경)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <p>시스템은 다음과 같은 업무를 수행합니다.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>RFID 기반 학생 출결 관리</li>
                  <li>실시간 출결 현황 모니터링</li>
                  <li>출결 통계 및 보고서 제공</li>
                  <li>교사 및 관리자를 위한 관리도구 제공</li>
                  <li>기타 시스템이 정하는 업무</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제6조 (서비스의 중단)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <ol className="list-decimal pl-6 space-y-2">
                  <li>시스템은 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
                  <li>시스템은 제1항의 사유로 서비스의 제공이 일시적으로 중단됨으로 인하여 이용자 또는 제3자가 입은 손해에 대하여 배상하지 않습니다.</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제7조 (회원의 의무)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <p>회원은 다음 행위를 하여서는 안 됩니다.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>신청 또는 변경 시 허위내용의 등록</li>
                  <li>타인의 정보 도용</li>
                  <li>시스템에 게시된 정보의 변경</li>
                  <li>시스템이 정한 정보 이외의 정보(컴퓨터 프로그램 등)의 송신 또는 게시</li>
                  <li>시스템 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                  <li>시스템 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                  <li>외설 또는 폭력적인 메시지, 화상, 음성 기타 공서양속에 반하는 정보를 시스템에 공개 또는 게시하는 행위</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제8조 (저작권의 귀속 및 이용제한)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <ol className="list-decimal pl-6 space-y-2">
                  <li>시스템이 작성한 저작물에 대한 저작권 기타 지적재산권은 시스템에 귀속합니다.</li>
                  <li>이용자는 시스템을 이용함으로써 얻은 정보 중 시스템에게 지적재산권이 귀속된 정보를 시스템의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제9조 (개인정보보호)
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>
                  시스템은 이용자의 개인정보를 보호하기 위해 개인정보보호법 등 관련 법령을 준수하며, 
                  개인정보 처리방침을 별도로 정하여 시행합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제10조 (면책조항)
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <ol className="list-decimal pl-6 space-y-2">
                  <li>시스템은 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                  <li>시스템은 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
                  <li>시스템은 이용자가 서비스를 이용하여 기대하는 손익이나 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                제11조 (준거법 및 재판관할)
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>
                  본 약관의 해석 및 시스템과 이용자 간의 분쟁에 대하여는 대한민국의 법을 적용하며, 
                  이용자와 시스템 사이에 발생한 분쟁에 관한 소송은 민사소송법상의 관할법원에 제기합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                부칙
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>본 약관은 2025년 1월 1일부터 시행됩니다.</p>
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

export default TermsOfServicePage;