import React, { useState, useRef, useEffect } from 'react';
import api, { holidayApi } from '../../../../services/api';
import { Html5Qrcode } from 'html5-qrcode';
import { webSerialManager } from '../../../../utils/webSerial';
import checkedSound from '../../../../assets/sound/checked.mp3';

// html5-qrcode 스타일 오버라이드
const qrReaderStyles = `
  #qr-reader-element {
    border: none !important;
  }
  #qr-reader-element > div {
    border-radius: 0.5rem !important;
  }
  #qr-reader-element video {
    border-radius: 0.5rem !important;
  }
`;

interface AttendanceRecord {
  id: number;
  user: {
    name: string;
    grade: number;
    class: number;
    number: number;
  };
  check_in_time: string | null;
  status: 'on_time' | 'late' | 'error';
  method: 'qr' | 'rfid';
  // classroom: string; // 교실 구분 제거
  created_at: string;
  error_message?: string;
}

interface StudentData {
  student_id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
  timestamp: number;
}

const QRRFIDReader: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'holiday'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [attendanceStatus, setAttendanceStatus] = useState<{
    isHoliday: boolean;
    holidayName?: string;
    canAttend: boolean;
    timeStatus: 'before_start' | 'normal' | 'late' | 'after_close';
    statusMessage: string;
  }>({
    isHoliday: false,
    canAttend: true,
    timeStatus: 'normal',
    statusMessage: '출결 체크 가능'
  });
  const [holidayInfo, setHolidayInfo] = useState<{ isHoliday: boolean; holidayName?: string; lastChecked?: string } | null>(null);
  const [attendanceSettings, setAttendanceSettings] = useState<{
    id: number;
    start_time: string;
    late_time: string;
    end_time?: string;
    is_active: boolean;
    created_by: number;
    updated_by: number;
    created_at: string;
    updated_at: string;
  } | null>(null);

  // Arduino 연결 상태
  const [arduinoConnected, setArduinoConnected] = useState(false);
  const [checkingArduino, setCheckingArduino] = useState(false);
  const [rfidStatus, setRfidStatus] = useState<{ connected: boolean; port?: string; reader_info?: { model?: string; version?: string } } | null>(null);
  const [availablePorts, setAvailablePorts] = useState<{ path: string; manufacturer?: string; pnpId?: string }[]>([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [selectedBaudRate, setSelectedBaudRate] = useState('9600');
  const [isLoadingPorts, setIsLoadingPorts] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [readerMode, setReaderMode] = useState<'both' | 'qr' | 'rfid'>('both'); // 리더 모드 선택
  const [soundEnabled, setSoundEnabled] = useState(true); // 사운드 활성화 상태
  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const qrReaderElementRef = useRef<HTMLDivElement>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isProcessingQR = useRef<boolean>(false);
  
  // RFID 이벤트 리스너를 위한 ref
  const rfidListenerRef = useRef<((data: any) => void) | null>(null);
  const [isRfidListening, setIsRfidListening] = useState(false);

  // 사운드 재생을 위한 ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 사운드 재생 함수
  const playSuccessSound = () => {
    if (!soundEnabled) return; // 사운드가 비활성화되면 재생하지 않음
    
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0; // 처음부터 재생
        audioRef.current.volume = 0.7; // 볼륨 설정 (0.0 ~ 1.0)
        audioRef.current.play().catch(error => {
          // 자동재생 정책으로 인한 실패는 조용히 처리
          if (error.name !== 'NotAllowedError') {
            console.warn('사운드 재생 실패:', error);
          }
        });
      }
    } catch (error) {
      console.warn('사운드 재생 중 오류:', error);
    }
  };

  // 컴포넌트 마운트 시 오디오 초기화
  useEffect(() => {
    if (audioRef.current) {
      // 브라우저 자동재생 정책 대응: 사용자 상호작용 시 오디오 활성화
      const enableAudio = () => {
        if (audioRef.current) {
          audioRef.current.load();
        }
      };
      
      // 첫 클릭 시 오디오 활성화
      document.addEventListener('click', enableAudio, { once: true });
      
      return () => {
        document.removeEventListener('click', enableAudio);
      };
    }
  }, []);

  // 실시간 출결 기록 추가 (프론트엔드에서만 관리)
  const addRecentRecord = (studentData: StudentData, status: 'on_time' | 'late' | 'error', method: 'qr' | 'rfid' = 'qr', errorMessage?: string) => {
    const now = new Date();
    const newRecord = {
      id: Date.now(), // 임시 ID
      user: {
        name: studentData.name,
        grade: studentData.grade,
        class: studentData.class,
        number: studentData.number
      },
      check_in_time: status === 'error' ? null : now.toTimeString().slice(0, 8),
      status: status,
      method: method,
      // classroom: `${studentData.grade}-${studentData.class}`, // 교실 구분 제거
      created_at: now.toISOString(),
      error_message: errorMessage
    };
    
    // 최신 기록을 맨 앞에 추가하고, 최대 20개까지만 유지
    setRecentRecords(prev => [newRecord, ...prev].slice(0, 20));
  };

  // 휴일 정보 체크 (하루에 한 번만)
  const checkHolidayInfo = async (date: string) => {
    try {
      const holidayResponse = await holidayApi.checkHoliday(date);
      const holidayData = {
        isHoliday: holidayResponse.is_holiday,
        holidayName: holidayResponse.holiday?.name,
        lastChecked: date
      };
      setHolidayInfo(holidayData);
      return holidayData;
    } catch (error) {
      console.error('휴일 체크 실패:', error);
      return { isHoliday: false, lastChecked: date };
    }
  };

  // 시간 업데이트 및 출결 상태 체크
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      checkAttendanceStatus(now);
    };

    updateTime();
    const timeInterval = setInterval(updateTime, 1000);
    return () => clearInterval(timeInterval);
  }, [holidayInfo, attendanceSettings]);

  // 출결 설정 가져오기
  const fetchAttendanceSettings = async () => {
    try {
      const response = await api.get('/attendance/settings');
      if (response.data.success) {
        setAttendanceSettings(response.data.data);
        console.log('출결 설정 로드됨:', response.data.data);
      } else {
        console.error('출결 설정 가져오기 실패:', response.data.message);
      }
    } catch (error) {
      console.error('출결 설정 API 호출 실패:', error);
      // 기본값 설정
      setAttendanceSettings({
        id: 0,
        start_time: '07:02:00',
        late_time: '08:00:00',
        end_time: '09:00:00',
        is_active: true,
        created_by: 0,
        updated_by: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  };

  // 카메라 목록 가져오기
  const getCameras = async () => {
    try {
      // 먼저 카메라 권한 요청
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (permissionError) {
        console.log('카메라 권한이 필요합니다:', permissionError);
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('발견된 카메라 목록:', videoDevices);
      setAvailableCameras(videoDevices);
      
      // 저장된 카메라 ID 불러오기 또는 첫 번째 카메라 선택
      const savedCameraId = localStorage.getItem('selectedCameraId');
      if (savedCameraId && videoDevices.some(device => device.deviceId === savedCameraId)) {
        setSelectedCameraId(savedCameraId);
      } else if (videoDevices.length > 0) {
        // 후면 카메라 우선 선택
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment')
        ) || videoDevices[0];
        setSelectedCameraId(backCamera.deviceId);
        localStorage.setItem('selectedCameraId', backCamera.deviceId);
      }
    } catch (error) {
      console.error('카메라 목록을 가져오는데 실패했습니다:', error);
      setMessage({ type: 'error', text: '카메라 목록을 가져올 수 없습니다. 카메라 권한을 확인해주세요.' });
    }
  };

  // Arduino 연결 상태 체크 (Web Serial API)
  const checkArduinoStatus = async () => {
    try {
      setCheckingArduino(true);
      const connected = webSerialManager.isConnected();
      setArduinoConnected(connected);
      
      if (connected) {
        setRfidStatus({
          connected: true,
          port: 'Web Serial Port',
          reader_info: { model: 'RC522', version: '1.0.0' }
        });
      } else {
        setRfidStatus(null);
      }
    } catch (error) {
      console.error('Arduino 상태 확인 실패:', error);
      setArduinoConnected(false);
      setRfidStatus(null);
    } finally {
      setCheckingArduino(false);
    }
  };

  // 사용 가능한 포트 목록 불러오기 (Web Serial API)
  const loadAvailablePorts = async () => {
    try {
      setIsLoadingPorts(true);
      setConnectionError(null);
      
      if (!webSerialManager.isSupported()) {
        setConnectionError('Web Serial API가 지원되지 않습니다. Chrome, Edge, Opera 브라우저를 사용해주세요.');
        return;
      }

      const ports = await webSerialManager.getPorts();
      setAvailablePorts(ports);
      
      // Arduino 포트 자동 감지
      const arduinoPort = ports.find(port => 
        port.manufacturer?.toLowerCase().includes('arduino') ||
        port.vendorId === 0x2341 || // Arduino Uno
        port.vendorId === 0x1a86    // CH340
      );
      if (arduinoPort) {
        setSelectedPort(arduinoPort.path);
      }
    } catch (error) {
      console.error('포트 목록 불러오기 실패:', error);
      setConnectionError('포트 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingPorts(false);
    }
  };

  // Arduino 연결 (Web Serial API)
  const connectToArduino = async () => {
    try {
      setConnecting(true);
      setConnectionError(null);
      
      await webSerialManager.connect(parseInt(selectedBaudRate));
      setArduinoConnected(true);
      
      // 연결된 포트 정보 업데이트
      const ports = await webSerialManager.getPorts();
      setAvailablePorts(ports);
      if (ports.length > 0) {
        setSelectedPort(ports[0].path);
      }
      
      // RFID 상태 업데이트
      setRfidStatus({
        connected: true,
        port: 'Web Serial Port',
        reader_info: { model: 'RC522', version: '1.0.0' }
      });
      
      alert('Arduino 연결 성공');
    } catch (error: unknown) {
      console.error('Arduino 연결 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      setConnectionError(errorMessage);
      setArduinoConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  // Arduino 연결 해제 (Web Serial API)
  const disconnectFromArduino = async () => {
    try {
      setDisconnecting(true);
      setConnectionError(null);
      
      await webSerialManager.disconnect();
      setArduinoConnected(false);
      setRfidStatus(null);
      
      alert('Arduino 연결이 해제되었습니다.');
    } catch (error: unknown) {
      console.error('Arduino 연결 해제 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      setConnectionError(errorMessage);
    } finally {
      setDisconnecting(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 초기화
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    checkHolidayInfo(today);
    getCameras();
    fetchAttendanceSettings();
    checkArduinoStatus();
    loadAvailablePorts();
    
    // 5초마다 Arduino 상태 체크 (Web Serial API는 빠르게 체크 가능)
    const statusInterval = setInterval(checkArduinoStatus, 5000);
    return () => clearInterval(statusInterval);
  }, []);

  // 초기화 시 빈 리스트로 시작 (새로고침하면 초기화)
  useEffect(() => {
    setRecentRecords([]);
  }, []);

  // 출결 상태 체크 함수
  const checkAttendanceStatus = async (currentTime: Date) => {
    try {
      const today = currentTime.toISOString().split('T')[0];
      
      // 날짜가 변경되었는지 확인하고, 변경되었다면 휴일 정보 다시 체크
      if (!holidayInfo || holidayInfo.lastChecked !== today) {
        await checkHolidayInfo(today);
        return; // 휴일 정보 업데이트 후 다음 호출에서 처리
      }
      
      // 캐시된 휴일 정보 사용
      if (holidayInfo.isHoliday && holidayInfo.holidayName) {
        setAttendanceStatus({
          isHoliday: true,
          holidayName: holidayInfo.holidayName,
          canAttend: false,
          timeStatus: 'after_close',
          statusMessage: `오늘은 ${holidayInfo.holidayName}입니다`
        });
        setMessage({
          type: 'holiday',
          text: `오늘은 ${holidayInfo.holidayName}입니다. 출결 체크를 하지 않습니다.`
        });
        return;
      }

      // 출결 설정이 없으면 기본값 사용
      if (!attendanceSettings) {
        setAttendanceStatus({
          isHoliday: false,
          canAttend: false,
          timeStatus: 'before_start',
          statusMessage: '출결 설정을 불러오는 중입니다...'
        });
        return;
      }

      // API에서 가져온 출결 시간 설정 사용
      const [startHour, startMinute] = attendanceSettings.start_time.split(':').map(Number);
      const [lateHour, lateMinute] = attendanceSettings.late_time.split(':').map(Number);
      
      const startTime = startHour * 60 + startMinute; // 시작 시간 (분 단위)
      const normalTime = lateHour * 60 + lateMinute; // 지각 기준 시간 (분 단위)
      
      // end_time이 있으면 사용, 없으면 기존 로직 (지각 시간 + 1시간)
      let endTime: number;
      if (attendanceSettings.end_time) {
        const [endHour, endMinute] = attendanceSettings.end_time.split(':').map(Number);
        endTime = endHour * 60 + endMinute;
      } else {
        endTime = normalTime + 60; // 기존 로직
      }
      
      const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      
      let timeStatus: 'before_start' | 'normal' | 'late' | 'after_close';
      let statusMessage: string;
      let canAttend: boolean;
      
      if (currentMinutes < startTime) {
        timeStatus = 'before_start';
        const remainingMinutes = startTime - currentMinutes;
        statusMessage = `출결 시작까지 ${remainingMinutes}분 남았습니다`;
        canAttend = false;
      } else if (currentMinutes < normalTime) {
        timeStatus = 'normal';
        const remainingMinutes = normalTime - currentMinutes;
        statusMessage = `정시 출결 가능 (지각까지 ${remainingMinutes}분)`;
        canAttend = true;
      } else if (currentMinutes < endTime) {
        timeStatus = 'late';
        const lateMinutes = currentMinutes - normalTime;
        statusMessage = `현재 ${lateMinutes}분 지각입니다`;
        canAttend = true;
      } else {
        timeStatus = 'after_close';
        statusMessage = `출결 시간이 종료되었습니다`;
        canAttend = false;
      }
      
      setAttendanceStatus({
        isHoliday: false,
        canAttend,
        timeStatus,
        statusMessage
      });

      // 메시지 설정
      if (!canAttend) {
        setMessage({
          type: timeStatus === 'before_start' ? 'info' : 'error',
          text: statusMessage
        });
      } else {
        setMessage({
          type: timeStatus === 'late' ? 'error' : 'info',
          text: statusMessage
        });
      }

    } catch (error) {
      console.error('출결 상태 체크 실패:', error);
      setAttendanceStatus({
        isHoliday: false,
        canAttend: true,
        timeStatus: 'normal',
        statusMessage: '출결 상태를 확인할 수 없습니다'
      });
    }
  };

  // QR 스캔 시작 (html5-qrcode 사용)
  const startCamera = async () => {
    try {
      setIsLoading(true);
      console.log('QR 스캔 시작 중...');
      
      // 먼저 스캔 상태를 true로 설정해서 QR 리더 엘리먼트가 렌더링되도록 함
      setIsScanning(true);
      
      // 엘리먼트가 렌더링될 때까지 잠시 기다림
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!qrReaderElementRef.current) {
        console.error('QR 리더 엘리먼트가 여전히 없습니다');
        setIsScanning(false);
        return;
      }
      
      // Html5Qrcode 인스턴스 생성
      const html5QrCode = new Html5Qrcode("qr-reader-element");
      qrReaderRef.current = html5QrCode;
      
      // 카메라 설정
      const config = {
        fps: 10,
        qrbox: { width: 400, height: 400 }
      };
      
      // 선택된 카메라 또는 기본 카메라 사용
      const cameraId = selectedCameraId || { facingMode: "environment" };
      
      // QR 스캔 시작
      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          // QR 코드 인식 성공
          console.log('🎉 QR 코드 인식 성공:', decodedText);
          
          // 처리 중이면 무시
          if (isProcessingQR.current) {
            console.log('QR 처리 중이므로 무시');
            return;
          }
          
          handleQRScanResult(decodedText);
        },
        () => {
          // QR 코드를 찾지 못할 때 (정상적인 상황)
          // console.log('QR 스캔 중...');
        }
      );
      
      setMessage({ type: 'info', text: 'QR코드를 카메라에 인식시켜 주세요' });
      
    } catch (error) {
      console.error('QR 스캔 시작 실패:', error);
      setIsScanning(false);
      
      let errorMessage = 'QR 스캔을 시작할 수 없습니다.';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '카메라를 찾을 수 없습니다.';
        }
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // QR 스캔 중지
  const stopCamera = async () => {
    try {
      setIsScanning(false);
      
      if (qrReaderRef.current) {
        await qrReaderRef.current.stop();
        qrReaderRef.current.clear();
        qrReaderRef.current = null;
      }
      
      setMessage(null);
    } catch (error) {
      console.error('QR 스캔 중지 실패:', error);
    }
  };

  // QR코드 스캔 결과 처리
  const handleQRScanResult = async (qrText: string) => {
    try {
      // 처리 중 플래그 설정
      isProcessingQR.current = true;
      
      // 연속 스캔 방지 (5초 쿨다운)
      const now = Date.now();
      if (now - lastScanTimeRef.current < 5000) {
        console.log('QR 스캔 쿨다운 중...');
        isProcessingQR.current = false;
        return;
      }
      lastScanTimeRef.current = now;

      // QR 코드 데이터 파싱
      // 학생 QR 코드 형식: JSON { student_id, name, grade, class, number, timestamp }
      let parsedData;
      
      try {
        // JSON 형태로 파싱 시도 (학생이 생성한 QR 코드)
        parsedData = JSON.parse(qrText);
        
        // 학생 QR 코드 형식 검증 (student_id 또는 name 중 하나라도 있으면 처리)
        if (parsedData.student_id || parsedData.name) {
          // student_id가 없는 경우 name으로 대체
          if (!parsedData.student_id && parsedData.name) {
            parsedData.student_id = parsedData.name; // 임시로 name을 student_id로 사용
          }
          // 학생이 보여주는 QR 코드인 경우
          await handleStudentQRScan(parsedData);
          
          // QR 처리 후 잠시 카메라 중지하여 RFID 리소스 확보
          if (isScanning) {
            await stopCamera();
            setTimeout(async () => {
              isProcessingQR.current = false;
              // 자동으로 카메라 재시작
              await startCamera();
            }, 2000); // 2초 후 재시작
          } else {
            setTimeout(() => {
              isProcessingQR.current = false;
            }, 3000);
          }
          return;
        }
      } catch {
        // JSON 파싱 실패 시 다른 형식 시도
      }
      
      // 교실 QR 코드 형식 처리 (현재는 사용되지 않음)
      // "1-1-token123" 형태를 파싱
      const parts = qrText.split('-');
      if (parts.length >= 3) {
        // 이 경우는 교실에 붙어있는 QR 코드를 학생이 스캔하는 용도
        // 현재 관리자 리더기에서는 사용하지 않음
        throw new Error('교실 QR 코드는 학생용 앱에서 스캔해주세요');
      } else {
        throw new Error('QR 코드 형식이 올바르지 않습니다');
      }
      
    } catch (error) {
      console.error('QR 스캔 결과 처리 실패:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'QR 코드 처리 중 오류가 발생했습니다.' 
      });
    } finally {
      // 항상 처리 플래그 해제
      setTimeout(() => {
        isProcessingQR.current = false;
      }, 3000);
    }
  };

  // 학생 QR 코드 스캔 처리
  const handleStudentQRScan = async (studentData: StudentData) => {
    try {
      setIsLoading(true);

      // 출결 가능 여부 체크
      if (!attendanceStatus.canAttend) {
        let errorMsg = '';
        if (attendanceStatus.isHoliday) {
          errorMsg = `오늘은 ${attendanceStatus.holidayName}입니다. 출결 체크를 할 수 없습니다.`;
          setMessage({ type: 'holiday', text: errorMsg });
        } else if (attendanceStatus.timeStatus === 'before_start') {
          const startTimeStr = attendanceSettings?.start_time ? 
            attendanceSettings.start_time.slice(0, 5) : '07:02';
          errorMsg = `아직 출결 시간이 아닙니다. ${startTimeStr}부터 출결 체크가 가능합니다.`;
          setMessage({ type: 'error', text: errorMsg });
        } else if (attendanceStatus.timeStatus === 'after_close') {
          const endTimeStr = attendanceSettings?.end_time ? 
            attendanceSettings.end_time.slice(0, 5) : '09:00';
          errorMsg = `출결 시간이 종료되었습니다. (${endTimeStr} 마감)`;
          setMessage({ type: 'error', text: errorMsg });
        }
        // 오류도 리스트에 추가
        addRecentRecord(studentData, 'error', 'qr', errorMsg);
        return;
      }

      // QR 코드 생성 시간 검증 (10분 이내)
      const qrAge = Date.now() - studentData.timestamp;
      const maxAge = 10 * 60 * 1000; // 10분
      
      if (qrAge > maxAge) {
        const errorMsg = 'QR 코드가 만료되었습니다. 새로운 QR 코드를 생성해주세요.';
        setMessage({ type: 'error', text: errorMsg });
        addRecentRecord(studentData, 'error', 'qr', errorMsg);
        return;
      }

      // 임시 QR 토큰 생성 (실제로는 백엔드에서 처리해야 함)
      const tempQrToken = `temp-${studentData.student_id}-${Date.now()}`;

      const response = await api.post('/attendance/qr-scan', {
        student_id: studentData.student_id,
        qr_token: tempQrToken,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        const statusText = response.data.status === 'on_time' ? '정시' : '지각';
        setMessage({ 
          type: 'success', 
          text: `${studentData.name} (${studentData.grade}학년 ${studentData.class}반 ${studentData.number}번) 출결 완료 (${statusText})` 
        });
        // 프론트엔드 리스트에 추가
        addRecentRecord(studentData, response.data.status);
        
        // 성공 사운드 재생
        playSuccessSound();
      } else {
        setMessage({ type: 'error', text: response.data.message });
        addRecentRecord(studentData, 'error', 'qr', response.data.message);
      }
    } catch (error: unknown) {
      console.error('학생 QR 스캔 처리 실패:', error);
      const errorMsg = (error as unknown as { response?: { data?: { message?: string } } }).response?.data?.message || '학생 QR코드 스캔 처리에 실패했습니다.';
      setMessage({ type: 'error', text: errorMsg });
      addRecentRecord(studentData, 'error', 'qr', errorMsg); 
    } finally {
      setIsLoading(false);
    }
  };

  // RFID 태그 처리 함수
  const handleRFIDTag = async (rfidCardId: string) => {
    console.log('[DEBUG] handleRFIDTag 시작 - rfidCardId:', rfidCardId);
    console.log('[DEBUG] attendanceStatus:', attendanceStatus);
    
    try {
      setIsLoading(true);

      // 출결 가능 여부 체크
      if (!attendanceStatus.canAttend) {
        console.log('[DEBUG] 출결 불가능 - canAttend:', attendanceStatus.canAttend);
        let errorMsg = '';
        if (attendanceStatus.isHoliday) {
          errorMsg = `오늘은 ${attendanceStatus.holidayName}입니다. 출결 체크를 할 수 없습니다.`;
          setMessage({ type: 'holiday', text: errorMsg });
        } else if (attendanceStatus.timeStatus === 'before_start') {
          const startTimeStr = attendanceSettings?.start_time ? 
            attendanceSettings.start_time.slice(0, 5) : '07:02';
          errorMsg = `아직 출결 시간이 아닙니다. ${startTimeStr}부터 출결 체크가 가능합니다.`;
          setMessage({ type: 'error', text: errorMsg });
        } else if (attendanceStatus.timeStatus === 'after_close') {
          const endTimeStr = attendanceSettings?.end_time ? 
            attendanceSettings.end_time.slice(0, 5) : '09:00';
          errorMsg = `출결 시간이 종료되었습니다. (${endTimeStr} 마감)`;
          setMessage({ type: 'error', text: errorMsg });
        }
        
        // 학생 정보를 찾아서 오류 기록에 추가 (API를 통해)
        try {
          const userResponse = await api.get(`/rfid/card-info/${rfidCardId}`);
          if (userResponse.data.success && userResponse.data.data.user) {
            const user = userResponse.data.data.user;
            const studentData = {
              student_id: user.student_id,
              name: user.name,
              grade: user.grade,
              class: user.class,
              number: user.number,
              timestamp: Date.now()
            };
            addRecentRecord(studentData, 'error', 'rfid', errorMsg);
          }
        } catch (findError) {
          console.warn('RFID 오류 기록 추가 실패:', findError);
        }
        return;
      }

      // RFID 출결 처리 API 호출
      console.log('[DEBUG] API 호출 시작 - rfidCardId:', rfidCardId);
      const response = await api.post('/attendance/rfid-tag', {
        rfid_uid: rfidCardId,
        reader_location: 'admin-reader',
        timestamp: new Date().toISOString()
      });
      
      console.log('[DEBUG] API 응답:', response.data);

      if (response.data.success) {
        console.log('[DEBUG] API 성공 - 학생 정보:', response.data.student);
        const statusText = response.data.status === 'on_time' ? '정시' : '지각';
        const student = response.data.student;
        
        setMessage({ 
          type: 'success', 
          text: `${student.name} (${student.grade}학년 ${student.class}반 ${student.number}번) RFID 출결 완료 (${statusText})` 
        });
        
        // 실시간 리스트에 추가
        const studentData = {
          student_id: student.student_id,
          name: student.name,
          grade: student.grade,
          class: student.class,
          number: student.number,
          timestamp: Date.now()
        };
        console.log('[DEBUG] addRecentRecord 호출 - studentData:', studentData, 'status:', response.data.status);
        addRecentRecord(studentData, response.data.status, 'rfid');
        console.log('[DEBUG] addRecentRecord 완료');
        
        // 성공 사운드 재생
        playSuccessSound();
      } else {
        console.log('[DEBUG] API 실패 - 메시지:', response.data.message);
        setMessage({ type: 'error', text: response.data.message });
        
        // 오류 발생 시에도 가능하면 학생 정보를 찾아서 기록에 추가
        if (response.data.student) {
          const student = response.data.student;
          const studentData = {
            student_id: student.student_id || 'unknown',
            name: student.name || 'Unknown',
            grade: student.grade || 0,
            class: student.class || 0,
            number: student.number || 0,
            timestamp: Date.now()
          };
          console.log('[DEBUG] API 실패 시 addRecentRecord 호출 - studentData:', studentData);
          addRecentRecord(studentData, 'error', 'rfid', response.data.message);
          console.log('[DEBUG] API 실패 시 addRecentRecord 완료');
        } else {
          // 학생 정보가 없으면 RFID로 학생 찾기 시도
          console.log('[DEBUG] 학생 정보 없음, RFID로 학생 찾기 시도');
          try {
            const userResponse = await api.get(`/rfid/card-info/${rfidCardId}`);
            if (userResponse.data.success && userResponse.data.data.user) {
              const user = userResponse.data.data.user;
              const studentData = {
                student_id: user.student_id,
                name: user.name,
                grade: user.grade,
                class: user.class,
                number: user.number,
                timestamp: Date.now()
              };
              console.log('[DEBUG] RFID로 찾은 학생 정보로 addRecentRecord 호출:', studentData);
              addRecentRecord(studentData, 'error', 'rfid', response.data.message);
              console.log('[DEBUG] RFID로 찾은 학생 정보 addRecentRecord 완료');
            } else {
              console.log('[DEBUG] RFID로 학생을 찾을 수 없음');
              // 그래도 RFID ID로라도 기록 추가
              const unknownStudentData = {
                student_id: 'unknown',
                name: `RFID: ${rfidCardId}`,
                grade: 0,
                class: 0,
                number: 0,
                timestamp: Date.now()
              };
              addRecentRecord(unknownStudentData, 'error', 'rfid', response.data.message);
            }
          } catch (findError) {
            console.warn('[DEBUG] RFID로 학생 찾기 실패:', findError);
            // 그래도 RFID ID로라도 기록 추가
            const unknownStudentData = {
              student_id: 'unknown',
              name: `RFID: ${rfidCardId}`,
              grade: 0,
              class: 0,
              number: 0,
              timestamp: Date.now()
            };
            addRecentRecord(unknownStudentData, 'error', 'rfid', response.data.message);
          }
        }
      }
    } catch (error: unknown) {
      console.error('[DEBUG] RFID 태그 처리 실패:', error);
      const errorMsg = (error as unknown as { response?: { data?: { message?: string } } }).response?.data?.message || 'RFID 태그 처리에 실패했습니다.';
      console.log('[DEBUG] 오류 메시지:', errorMsg);
      setMessage({ type: 'error', text: errorMsg });
      
      // 일반적인 오류 정보로 기록 추가
      const unknownStudentData = {
        student_id: 'unknown',
        name: `RFID: ${rfidCardId}`,
        grade: 0,
        class: 0,
        number: 0,
        timestamp: Date.now()
      };
      addRecentRecord(unknownStudentData, 'error', 'rfid', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // QR코드 스캔 처리 (레거시 - 교실 QR 코드용) - 현재 사용되지 않음
  /*
  const handleQRScan = async (qrToken: string) => {
    try {
      setIsLoading(true);

      // 출결 가능 여부 체크
      if (!attendanceStatus.canAttend) {
        if (attendanceStatus.isHoliday) {
          setMessage({ 
            type: 'holiday', 
            text: `오늘은 ${attendanceStatus.holidayName}입니다. 출결 체크를 할 수 없습니다.` 
          });
        } else if (attendanceStatus.timeStatus === 'before_start') {
          setMessage({ 
            type: 'error', 
            text: '아직 출결 시간이 아닙니다. 07:02부터 출결 체크가 가능합니다.' 
          });
        } else if (attendanceStatus.timeStatus === 'after_close') {
          setMessage({ 
            type: 'error', 
            text: '출결 시간이 종료되었습니다. (09:00 마감)' 
          });
        }
        return;
      }

      const response = await api.post('/attendance/qr-scan', {
        qr_token: qrToken,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        const statusText = response.data.status === 'on_time' ? '정시' : '지각';
        setMessage({ 
          type: 'success', 
          text: `${response.data.student.name} 학생 출결 완료 (${statusText})` 
        });
        // 프론트엔드 리스트에 추가
        addRecentRecord(response.data.student, response.data.status);
      } else {
        setMessage({ type: 'error', text: response.data.message });
      }
    } catch (error: unknown) {
      console.error('QR 스캔 처리 실패:', error);
      setMessage({ 
        type: 'error', 
        text: (error as unknown as { response?: { data?: { message?: string } } }).response?.data?.message || 'QR코드 스캔 처리에 실패했습니다.' 
      }); 
    } finally {
      setIsLoading(false);
    }
  };
  */

  // RFID 태그 시뮬레이션 - 현재 사용되지 않음
  /*
  const handleRFIDTag = async (rfidData: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/attendance/rfid-tag', {
        rfid_card_id: rfidData,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        const statusText = response.data.status === 'on_time' ? '정시' : '지각';
        setMessage({ 
          type: 'success', 
          text: `${response.data.student.name} 학생 출결 완료 (${statusText})` 
        });
        // 프론트엔드 리스트에 추가
        addRecentRecord(response.data.student, response.data.status);
      } else {
        setMessage({ type: 'error', text: response.data.message });
      }
    } catch (error: unknown) {
      console.error('RFID 태그 처리 실패:', error);
      setMessage({ 
        type: 'error', 
        text: (error as unknown as { response?: { data?: { message?: string } } }).response?.data?.message || 'RFID 태그 처리에 실패했습니다.' 
      });
    } finally {
      setIsLoading(false);
    }
  };
  */

  // RFID 이벤트 리스너 시작
  const startRfidListener = () => {
    console.log('[DEBUG] startRfidListener 호출 - arduinoConnected:', arduinoConnected, 'isRfidListening:', isRfidListening);
    
    if (!arduinoConnected) {
      console.log('[DEBUG] Arduino 연결되지 않음');
      setMessage({ type: 'error', text: 'Arduino가 연결되지 않았습니다. 먼저 Arduino를 연결해주세요.' });
      return;
    }

    if (isRfidListening) {
      console.log('[DEBUG] 이미 리스닝 중');
      return; // 이미 리스닝 중
    }

    // RFID 이벤트 핸들러 생성
    const rfidEventHandler = async (data: any) => {
      try {
        if (data.type === 'RFID_TAG' && data.card_id) {
          console.log(`[이벤트] ✅ RFID 태그 감지: ${data.card_id}`);
          await handleRFIDTag(data.card_id);
        }
      } catch (error) {
        console.error('[이벤트] RFID 처리 오류:', error);
      }
    };

    // 리스너 등록
    rfidListenerRef.current = rfidEventHandler;
    webSerialManager.addDataListener(rfidEventHandler);
    setIsRfidListening(true);
    console.log('[RFID] 이벤트 리스너 시작');
  };

  // RFID 이벤트 리스너 중지
  const stopRfidListener = () => {
    if (rfidListenerRef.current) {
      webSerialManager.removeDataListener(rfidListenerRef.current);
      rfidListenerRef.current = null;
    }
    setIsRfidListening(false);
    console.log('[RFID] 이벤트 리스너 중지');
  };

  // Arduino 연결 상태 변경 시 RFID 이벤트 리스너 자동 시작/중지
  useEffect(() => {
    console.log('[DEBUG] useEffect 트리거 - arduinoConnected:', arduinoConnected, 'isRfidListening:', isRfidListening);
    
    if (arduinoConnected && !isRfidListening && (readerMode === 'both' || readerMode === 'rfid')) {
      // Arduino 연결되고 RFID 모드가 활성화되면 자동으로 RFID 이벤트 리스너 시작
      console.log('[DEBUG] Arduino 연결됨, 1초 후 이벤트 리스너 시작 예약');
      const timer = setTimeout(() => {
        console.log('[DEBUG] 이벤트 리스너 시작 타이머 실행');
        startRfidListener();
      }, 1000); // 1초 후 시작 (webSerial에서 이미 리스너가 시작되었을 것)
      
      return () => {
        console.log('[DEBUG] useEffect cleanup - 타이머 해제');
        clearTimeout(timer);
      };
    } else if (!arduinoConnected && isRfidListening) {
      // Arduino 연결 해제되면 이벤트 리스너 중지
      console.log('[DEBUG] Arduino 연결 해제됨, 이벤트 리스너 중지');
      stopRfidListener();
    }
  }, [arduinoConnected, isRfidListening]); // readerMode 의존성 제거
  
  // 리더 모드 변경 시 별도 처리
  useEffect(() => {
    if (readerMode === 'qr' && isRfidListening) {
      // QR 전용 모드로 변경되면 RFID 리스너 중지
      console.log('[DEBUG] QR 전용 모드로 변경, RFID 리스너 중지');
      stopRfidListener();
    }
  }, [readerMode]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopCamera();
      stopRfidListener();
      // Arduino 연결이 있으면 해제
      if (arduinoConnected) {
        webSerialManager.disconnect().catch(error => {
          console.error('컴포넌트 언마운트 시 Arduino 연결 해제 실패:', error);
        });
      }
    };
  }, [arduinoConnected]);


  // 현재 시간 포맷
  const getCurrentTime = () => {
    return currentTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 상태별 색상 클래스
  const getStatusColor = () => {
    if (attendanceStatus.isHoliday) {
      return 'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800';
    }
    
    switch (attendanceStatus.timeStatus) {
      case 'before_start':
        return 'bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
      case 'normal':
        return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'late':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'after_close':
        return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <>
      <style>{qrReaderStyles}</style>
      {/* 출결 완료 사운드 */}
      <audio 
        ref={audioRef} 
        src={checkedSound}
        preload="auto"
        style={{ display: 'none' }}
      />
      <div className="space-y-4 sm:space-y-6">
      {/* 상태 정보 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl sm:rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">실시간 출결 상태</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                현재 시간: {getCurrentTime()}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg border text-center ${getStatusColor()}`}>
              <div className="text-sm font-medium">
                {attendanceStatus.isHoliday ? '휴일' : 
                 attendanceStatus.timeStatus === 'before_start' ? '출결 대기' :
                 attendanceStatus.timeStatus === 'normal' ? '정시 출결' :
                 attendanceStatus.timeStatus === 'late' ? '지각 처리' : '출결 종료'}
              </div>
              <div className="text-xs mt-1">
                {attendanceStatus.statusMessage}
              </div>
            </div>
          </div>
        </div>
        
        {/* 출결 시간 정보 */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-900/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">출결 시작</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {attendanceSettings ? attendanceSettings.start_time.slice(0, 5) : '--:--'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">지각 기준</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {attendanceSettings ? attendanceSettings.late_time.slice(0, 5) : '--:--'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">출결 마감</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {attendanceSettings ? 
                  (attendanceSettings.end_time ? 
                    attendanceSettings.end_time.slice(0, 5) :
                    (() => {
                      const [hour, minute] = attendanceSettings.late_time.split(':').map(Number);
                      const endHour = hour + 1;
                      return `${String(endHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                    })()
                  ) : '--:--'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 리더 모드 선택 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl sm:rounded-lg">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">리더 모드</h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setReaderMode('both');
                // RFID 모드에서 both로 변경 시 RFID 리스너 다시 시작
                if (readerMode === 'qr' && arduinoConnected && !isRfidListening) {
                  setTimeout(() => startRfidListener(), 500);
                }
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                readerMode === 'both'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              QR + RFID 동시
            </button>
            <button
              onClick={() => {
                setReaderMode('qr');
                // QR 전용 모드로 변경 시 RFID 리스너만 중지, 카메라는 유지
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                readerMode === 'qr'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              QR만
            </button>
            <button
              onClick={() => {
                setReaderMode('rfid');
                // RFID 전용 모드로 변경 시 카메라만 중지, RFID는 유지
                if (isScanning) {
                  stopCamera();
                }
                if (arduinoConnected && !isRfidListening) {
                  setTimeout(() => startRfidListener(), 500);
                }
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                readerMode === 'rfid'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              RFID만
            </button>
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              리소스 충돌 시 개별 모드를 사용하세요
            </p>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                soundEnabled
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {soundEnabled ? '🔊' : '🔇'}
              <span>{soundEnabled ? '사운드 ON' : '사운드 OFF'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* 왼쪽: 카메라 및 리더기 */}
      <div className="space-y-4 sm:space-y-6">
        {/* 웹캠 카메라 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl sm:rounded-lg">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">QR코드 스캔</h3>
              {readerMode === 'rfid' && (
                <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 px-2 py-1 rounded">
                  RFID 전용 모드
                </span>
              )}
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {/* 카메라 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                카메라 선택 ({availableCameras.length}개 발견)
              </label>
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  localStorage.setItem('selectedCameraId', e.target.value);
                  // 스캔 중이면 재시작
                  if (isScanning) {
                    stopCamera();
                    setTimeout(() => startCamera(), 100);
                  }
                }}
                disabled={isScanning}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
              >
                <option value="">{availableCameras.length === 0 ? '카메라를 찾을 수 없습니다' : '카메라 선택'}</option>
                {availableCameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `카메라 ${camera.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
              <div className="flex justify-between items-center mt-2">
                {availableCameras.length === 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    카메라를 찾을 수 없습니다. 카메라가 연결되어 있고 권한이 허용되었는지 확인해주세요.
                  </p>
                )}
                <button
                  onClick={getCameras}
                  disabled={isScanning}
                  className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
                >
                  🔄 새로고침
                </button>
              </div>
            </div>

            <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              {isScanning ? (
                <div 
                  id="qr-reader-element" 
                  ref={qrReaderElementRef}
                  className="w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">카메라를 시작하세요</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-3 sm:mt-4 flex space-x-2 sm:space-x-3">
              {!isScanning ? (
                <button
                  onClick={startCamera}
                  disabled={isLoading || !selectedCameraId}
                  className="flex-1 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
                >
                  {isLoading ? '카메라 시작 중...' : '카메라 시작'}
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex-1 bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
                >
                  카메라 중지
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RFID 리더기 상태 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl sm:rounded-lg">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">RFID 리더기</h3>
                {readerMode === 'qr' && (
                  <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded">
                    QR 전용 모드
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConnection(!showConnection)}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                >
                  ⚙️ 연결 설정
                </button>
                <button
                  onClick={checkArduinoStatus}
                  disabled={checkingArduino}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
                >
                  {checkingArduino ? '확인 중...' : '🔄 상태 확인'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Arduino 연결 설정 패널 */}
          {showConnection && (
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              {connectionError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <p className="text-red-600 dark:text-red-400 text-sm">{connectionError}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Arduino 연결 설정</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      시리얼 포트
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={selectedPort}
                        onChange={(e) => setSelectedPort(e.target.value)}
                        disabled={isLoadingPorts || connecting || disconnecting}
                        className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="">포트 선택...</option>
                        {availablePorts.map((port) => (
                          <option key={port.path} value={port.path}>
                            {port.path} {port.manufacturer && `(${port.manufacturer})`}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (webSerialManager.isSupported()) {
                            try {
                              await webSerialManager.requestPort();
                              await loadAvailablePorts();
                            } catch (err) {
                              console.error('포트 요청 실패:', err);
                            }
                          } else {
                            setConnectionError('Web Serial API가 지원되지 않습니다.');
                          }
                        }}
                        disabled={isLoadingPorts || connecting || disconnecting}
                        className="px-2 py-1.5 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded text-xs disabled:cursor-not-allowed"
                      >
                        {isLoadingPorts ? '...' : '🔄'}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      통신 속도
                    </label>
                    <select
                      value={selectedBaudRate}
                      onChange={(e) => setSelectedBaudRate(e.target.value)}
                      disabled={connecting || disconnecting}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="9600">9600</option>
                      <option value="115200">115200</option>
                      <option value="57600">57600</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!arduinoConnected ? (
                    <button
                      onClick={connectToArduino}
                      disabled={!selectedPort || connecting || disconnecting}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-xs transition-colors disabled:cursor-not-allowed"
                    >
                      {connecting ? '연결 중...' : '연결'}
                    </button>
                  ) : (
                    <button
                      onClick={disconnectFromArduino}
                      disabled={disconnecting}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded text-xs transition-colors disabled:cursor-not-allowed"
                    >
                      연결 해제
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                  arduinoConnected ? (isRfidListening ? 'bg-green-400 animate-pulse' : 'bg-yellow-400') : 'bg-red-400'
                }`}></div>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {arduinoConnected ? 
                    (isRfidListening ? 'RFID 태그 감지 중' : '리더기 연결됨') : 
                    '리더기 연결 안됨'
                  }
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                Arduino {arduinoConnected ? '연결됨' : '연결 안됨'}
                {isRfidListening && ' (이벤트 수신 중)'}
              </span>
            </div>
            
            {rfidStatus && arduinoConnected && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  <div className="text-gray-500 dark:text-gray-400">포트</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{rfidStatus.port}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  <div className="text-gray-500 dark:text-gray-400">모델</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{rfidStatus.reader_info?.model}</div>
                </div>
              </div>
            )}
            
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
              {arduinoConnected 
                ? (isRfidListening 
                   ? 'RFID 카드를 리더기에 태그하면 자동으로 출결 처리됩니다' 
                   : 'RFID 이벤트 리스너가 시작되지 않았습니다')
                : '위 설정에서 Arduino를 연결해주세요'
              }
            </p>
          </div>
        </div>


        {/* 메시지 표시 */}
        {message && (
          <div className={`p-3 sm:p-4 rounded-lg sm:rounded-md ${
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
            message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
            message.type === 'holiday' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200' :
            'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' && (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {message.type === 'error' && (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {message.type === 'info' && (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
                {message.type === 'holiday' && (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-xs sm:text-sm font-medium">{message.text}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 오른쪽: 실시간 출결 목록 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl sm:rounded-lg">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">실시간 출결 현황</h3>
            <button
              onClick={() => setRecentRecords([])}
              className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 self-start sm:self-auto"
            >
              초기화
            </button>
          </div>
        </div>
        <div className="max-h-80 sm:max-h-96 overflow-y-auto">
          {recentRecords.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentRecords.map((record) => (
                <div key={record.id} className="px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        record.status === 'on_time' ? 'bg-green-400' : 
                        record.status === 'late' ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {record.user.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {record.user.grade}학년 {record.user.class}반 {record.user.number}번
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.method === 'qr' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' :
                          'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200'
                        }`}>
                          {record.method === 'qr' ? 'QR' : 'RFID'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'on_time' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                            : record.status === 'late'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                        }`}>
                          {record.status === 'on_time' ? '정시' : 
                           record.status === 'late' ? '지각' : '오류'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {record.status === 'error' ? record.error_message : record.check_in_time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 sm:px-6 py-6 sm:py-8 text-center">
              <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                아직 출결 기록이 없습니다
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
      </div>
    </>
  );
};

export default QRRFIDReader;