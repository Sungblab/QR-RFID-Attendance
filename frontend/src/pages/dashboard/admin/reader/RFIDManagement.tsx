import React, { useState, useEffect } from 'react';
import { userApi, type User } from '../../../../services/api';
import { webSerialManager } from '../../../../utils/webSerial';

interface RFIDUser extends User {
  rfid_card_id?: string;
}

interface SerialPort {
  path: string;
  manufacturer?: string;
}

// Window 객체 타입 확장
declare global {
  interface Window {
    currentScanInterval: number | null;
    currentScanTimeout: number | null;
  }
}

const RFIDManagement: React.FC = () => {
  const [students, setStudents] = useState<RFIDUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 검색 및 필터
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  
  // 포트 관리
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  // RFID 스캔 모달
  const [showRFIDModal, setShowRFIDModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<RFIDUser | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCard, setScannedCard] = useState('');
  const [scanMode, setScanMode] = useState<'register' | 'reregister'>('register');
  const [manualCardId, setManualCardId] = useState('');
  const [generatedCardId, setGeneratedCardId] = useState('');

  // 암호학적으로 안전한 랜덤 RFID 코드 생성 (4바이트 = 8자리 16진수)
  const generateSecureRFIDCode = (): string => {
    // 4바이트 (32비트) 랜덤 데이터 생성 - RC522 RFID UID 크기
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    
    // 16진수 문자열로 변환 (대문자)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0').toUpperCase()).join('');
  };

  // 랜덤 RFID 코드 생성 및 설정
  const generateNewRFIDCode = () => {
    const newCode = generateSecureRFIDCode();
    setGeneratedCardId(newCode);
    setManualCardId(newCode);
    setScannedCard(''); // 스캔된 카드 정보 초기화
  };

  // 학생 목록 로드
  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await userApi.getStudents();
      if (response.success) {
        setStudents(response.data || []);
      }
    } catch {
      setError('학생 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 포트 목록 로드 (Web Serial API)
  const loadPorts = async () => {
    try {
      if (!webSerialManager.isSupported()) {
        setError('Web Serial API가 지원되지 않습니다. Chrome, Edge, Opera 브라우저를 사용해주세요.');
        return;
      }

      const ports = await webSerialManager.getPorts();
      setPorts(ports);
      
      // Arduino 포트 자동 선택
      const arduinoPort = ports.find(port => 
        port.manufacturer?.toLowerCase().includes('arduino') ||
        port.vendorId === 0x2341 || // Arduino Uno
        port.vendorId === 0x1a86    // CH340
      );
      if (arduinoPort) {
        setSelectedPort(arduinoPort.path);
      }
    } catch (err) {
      console.error('포트 로드 실패:', err);
      setError('포트 목록을 불러올 수 없습니다.');
    }
  };

  // Arduino 연결 (Web Serial API)
  const connectArduino = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      await webSerialManager.connect(9600);
      setIsConnected(true);
      
      // 연결된 포트 정보 업데이트
      const ports = await webSerialManager.getPorts();
      setPorts(ports);
      if (ports.length > 0) {
        setSelectedPort(ports[0].path);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError('Arduino 연결 중 오류: ' + errorMessage);
      setIsConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  // Arduino 연결 해제 (Web Serial API)
  const disconnectArduino = async () => {
    try {
      await webSerialManager.disconnect();
      setIsConnected(false);
      setIsScanning(false);
    } catch (err) {
      console.error('연결 해제 실패:', err);
    }
  };

  // RFID 스캔 모달 열기
  const openRFIDModal = (student: RFIDUser, mode: 'register' | 'reregister') => {
    setSelectedStudent(student);
    setScanMode(mode);
    setScannedCard('');
    setManualCardId(student.rfid_card_id || '');
    setShowRFIDModal(true);
  };

  // RFID 스캔 모달 닫기
  const closeRFIDModal = () => {
    // 스캔 중이면 중지
    if (isScanning) {
      stopScan();
    }
    
    setShowRFIDModal(false);
    setSelectedStudent(null);
    setScannedCard('');
    setManualCardId('');
    setGeneratedCardId('');
  };

  // RFID 스캔 시작 (Web Serial API)
  const startScan = () => {
    console.log('[DEBUG] RFIDManagement - 스캔 시작, isConnected:', isConnected);
    
    if (!isConnected) {
      alert('Arduino를 먼저 연결하세요.');
      return;
    }
    
    setIsScanning(true);
    setScannedCard('');
    setError(null);
    
    let scanActive = true;
    
    const interval = setInterval(async () => {
      if (!scanActive) {
        clearInterval(interval);
        return;
      }
      
      try {
        console.log('[DEBUG] RFIDManagement - RFID 체크 시도...');
        const result = await webSerialManager.checkRFIDTag();
        console.log('[DEBUG] RFIDManagement - RFID 체크 결과:', result);
        
        if (result.hasNewTag && result.uid) {
          console.log('[DEBUG] RFIDManagement - ✅ 태그 발견:', result.uid);
          setScannedCard(result.uid);
          setManualCardId(result.uid);
          setIsScanning(false);
          scanActive = false;
          clearInterval(interval);
        }
      } catch (err) {
        console.error('[DEBUG] RFIDManagement - RFID 스캔 오류:', err);
        setError('RFID 스캔 중 오류가 발생했습니다.');
        setIsScanning(false);
        scanActive = false;
        clearInterval(interval);
      }
    }, 1000);

    // 30초 후 자동 중지
    const timeout = setTimeout(() => {
      if (scanActive) {
        setIsScanning(false);
        scanActive = false;
        clearInterval(interval);
        setError('스캔 시간 초과. 다시 시도해주세요.');
      }
    }, 30000);

    // cleanup을 위해 timeout과 interval을 저장
    window.currentScanInterval = interval;
    window.currentScanTimeout = timeout;
  };

  // 스캔 중지
  const stopScan = () => {
    setIsScanning(false);
    if (window.currentScanInterval) {
      clearInterval(window.currentScanInterval);
      window.currentScanInterval = null;
    }
    if (window.currentScanTimeout) {
      clearTimeout(window.currentScanTimeout);
      window.currentScanTimeout = null;
    }
  };

  // RFID 카드 등록/재등록
  const saveRFIDCard = async () => {
    if (!selectedStudent || !manualCardId.trim()) {
      alert('RFID 카드 ID를 입력하거나 스캔하세요.');
      return;
    }

    try {
      const response = await userApi.updateStudent(selectedStudent.id, {
        rfid_card_id: manualCardId.trim()
      });

      if (response.success) {
        alert(`RFID 카드가 ${scanMode === 'register' ? '등록' : '재등록'}되었습니다.`);
        closeRFIDModal();
        loadStudents();
      } else {
        setError(`RFID 카드 ${scanMode === 'register' ? '등록' : '재등록'} 실패: ` + response.message);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(`RFID 카드 ${scanMode === 'register' ? '등록' : '재등록'} 중 오류: ` + errorMessage);
    }
  };

  // RFID 카드에 학생 정보 쓰기 (Web Serial API)
  const writeToCard = async () => {
    if (!selectedStudent) {
      alert('학생이 선택되지 않았습니다.');
      return;
    }

    if (!isConnected) {
      alert('Arduino를 먼저 연결해주세요.');
      return;
    }

    // 생성된 코드가 있으면 사용, 없으면 새로 생성
    let codeToWrite = generatedCardId;
    if (!codeToWrite) {
      codeToWrite = generateSecureRFIDCode();
      setGeneratedCardId(codeToWrite);
      setManualCardId(codeToWrite);
    }

    try {
      const success = await webSerialManager.writeRFIDCard(codeToWrite, selectedStudent.name);

      if (success) {
        alert(`RFID 카드 쓰기가 성공했습니다.\n생성된 코드: ${codeToWrite}`);
        
        // 자동으로 DB에도 등록
        const updateResponse = await userApi.updateStudent(selectedStudent.id, {
          rfid_card_id: codeToWrite
        });
        
        if (updateResponse.success) {
          loadStudents(); // 학생 목록 새로고침
        }
      } else {
        setError('RFID 카드 쓰기에 실패했습니다. 카드를 리더기에 올려주세요.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError('RFID 카드 쓰기 중 오류: ' + errorMessage);
    }
  };

  // RFID 카드 삭제
  const removeCard = async (student: RFIDUser) => {
    if (!confirm(`${student.name} 학생의 RFID 카드를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await userApi.updateStudent(student.id, {
        rfid_card_id: null
      });

      if (response.success) {
        alert('RFID 카드가 삭제되었습니다.');
        loadStudents();
      } else {
        setError('RFID 카드 삭제 실패: ' + response.message);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError('RFID 카드 삭제 중 오류: ' + errorMessage);
    }
  };

  // 필터링된 학생 목록
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm || 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rfid_card_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGrade = !selectedGrade || student.grade?.toString() === selectedGrade;
    const matchesClass = !selectedClass || student.class?.toString() === selectedClass;
    
    return matchesSearch && matchesGrade && matchesClass;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  // 페이지 변경
  const changePage = (page: number) => {
    setCurrentPage(page);
  };

  // 페이지 크기 변경
  const changeItemsPerPage = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  // 고유한 학년/반 목록
  const availableGrades = [...new Set(students.map(s => s.grade).filter(Boolean))].sort();
  const availableClasses = [...new Set(
    students
      .filter(s => !selectedGrade || s.grade?.toString() === selectedGrade)
      .map(s => s.class)
      .filter(Boolean)
  )].sort();

  useEffect(() => {
    loadStudents();
    loadPorts();
    
    // 연결 상태 확인
    const checkConnection = () => {
      setIsConnected(webSerialManager.isConnected());
    };
    
    const interval = setInterval(checkConnection, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedGrade, selectedClass]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Arduino 연결 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Arduino 연결</h3>
        
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">시리얼 포트</label>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              disabled={isConnected}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">포트 선택...</option>
              {ports.map((port) => (
                <option key={port.path} value={port.path}>
                  {port.path} {port.manufacturer && `(${port.manufacturer})`}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={async () => {
              if (webSerialManager.isSupported()) {
                try {
                  await webSerialManager.requestPort();
                  await loadPorts();
                } catch (err) {
                  console.error('포트 요청 실패:', err);
                }
              } else {
                setError('Web Serial API가 지원되지 않습니다.');
              }
            }}
            disabled={isConnected}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            포트 선택
          </button>
          
          {!isConnected ? (
            <button
              onClick={connectArduino}
              disabled={!selectedPort || connecting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {connecting ? '연결 중...' : '연결'}
            </button>
          ) : (
            <button
              onClick={disconnectArduino}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              연결 해제
            </button>
          )}
        </div>
        
        <div className="mt-4 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-sm">
            {isConnected ? '연결됨' : '연결 안됨'} 
            {selectedPort && ` (${selectedPort})`}
          </span>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">학생 검색 및 필터</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">검색</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="이름, 학번, RFID ID 검색..."
              className="w-full p-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">학년</label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedClass('');
              }}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">전체 학년</option>
              {availableGrades.map(grade => (
                <option key={grade} value={grade}>{grade}학년</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">반</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">전체 반</option>
              {availableClasses.map(classNum => (
                <option key={classNum} value={classNum}>{classNum}반</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">페이지당 항목</label>
            <select
              value={itemsPerPage}
              onChange={(e) => changeItemsPerPage(parseInt(e.target.value))}
              className="w-full p-2 border rounded-lg"
            >
              <option value={15}>15개</option>
              <option value={30}>30개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={() => {
            setSearchTerm('');
            setSelectedGrade('');
            setSelectedClass('');
          }}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
        >
          필터 초기화
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* 학생 목록 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">학생 RFID 관리</h3>
          <div className="text-sm text-gray-500">
            총 {filteredStudents.length}명 | RFID 등록: {filteredStudents.filter(s => s.rfid_card_id).length}명
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">학생 정보</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFID 카드</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-gray-500">
                        {student.student_id} | {student.grade}학년 {student.class}반 {student.number}번
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {student.rfid_card_id ? (
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {student.rfid_card_id}
                      </code>
                    ) : (
                      <span className="text-gray-400">미등록</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      student.rfid_card_id ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.rfid_card_id ? '등록됨' : '미등록'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {!student.rfid_card_id ? (
                        <button
                          onClick={() => openRFIDModal(student, 'register')}
                          className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                        >
                          등록
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => openRFIDModal(student, 'reregister')}
                            className="text-orange-600 hover:text-orange-800 text-sm px-2 py-1 border border-orange-200 rounded hover:bg-orange-50"
                          >
                            재등록
                          </button>
                          <button
                            onClick={() => removeCard(student)}
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} / {filteredStudents.length}명
            </div>
            
            <div className="flex gap-1">
              <button
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                이전
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={page}
                    onClick={() => changePage(page)}
                    className={`px-3 py-1 text-sm border rounded ${
                      currentPage === page
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RFID 스캔 모달 */}
      {showRFIDModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              RFID 카드 {scanMode === 'register' ? '등록' : '재등록'}
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-sm">
                  <div><strong>학생:</strong> {selectedStudent.name}</div>
                  <div><strong>학번:</strong> {selectedStudent.student_id}</div>
                  <div><strong>학급:</strong> {selectedStudent.grade}학년 {selectedStudent.class}반 {selectedStudent.number}번</div>
                  {selectedStudent.rfid_card_id && (
                    <div><strong>현재 RFID:</strong> {selectedStudent.rfid_card_id}</div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">RFID 카드 ID</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={manualCardId}
                    onChange={(e) => setManualCardId(e.target.value)}
                    placeholder={isScanning ? "RFID 카드를 태그하세요..." : "직접 입력 또는 스캔"}
                    className="flex-1 p-2 border rounded-lg font-mono text-sm"
                    disabled={isScanning}
                  />
                  <button
                    onClick={isScanning ? stopScan : startScan}
                    disabled={!isConnected}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      isScanning
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                    }`}
                    title={!isConnected ? `Arduino 연결 안됨 (${selectedPort || '포트 선택 안됨'})` : ''}
                  >
                    {isScanning ? '스캔 중지' : '스캔'}
                  </button>
                </div>
                
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={generateNewRFIDCode}
                    className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    랜덤 코드 생성
                  </button>
                </div>
                
                {generatedCardId && (
                  <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded text-sm">
                    <div className="text-purple-700 font-medium">생성된 코드:</div>
                    <code className="text-purple-800 font-mono text-xs break-all">{generatedCardId}</code>
                  </div>
                )}
                
                {!isConnected && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    ⚠️ Arduino가 연결되지 않았습니다. 먼저 Arduino를 연결해주세요.
                    <br />포트: {selectedPort || '선택 안됨'}
                  </div>
                )}
                
                {isScanning && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    RFID 카드를 리더기에 태그해주세요...
                  </div>
                )}
                
                {scannedCard && (
                  <div className="mt-2 text-sm text-green-600">
                    카드 감지됨: {scannedCard}
                  </div>
                )}
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <div className="font-medium mb-1">RFID 카드 쓰기:</div>
                  <p className="text-xs mb-2">
                    학생 정보를 RFID 카드에 직접 저장할 수 있습니다. 
                    안전한 랜덤 코드가 자동 생성되어 카드에 저장되고 DB에도 등록됩니다.
                  </p>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    <strong>보안:</strong> 암호학적으로 안전한 4바이트(32비트) 랜덤 코드 사용
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeRFIDModal}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              
              <button
                onClick={writeToCard}
                disabled={!isConnected}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg disabled:cursor-not-allowed"
              >
               카드에 쓰기
              </button>
              
              <button
                onClick={saveRFIDCard}
                disabled={!manualCardId.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg disabled:cursor-not-allowed"
              >
                {scanMode === 'register' ? '등록' : '재등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RFIDManagement;