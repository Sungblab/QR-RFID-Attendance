// Web Serial API types
interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: number;
  productId?: number;
}

interface WebSerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}

interface NavigatorSerial {
  getPorts(): Promise<WebSerialPort[]>;
  requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<WebSerialPort>;
}

declare global {
  interface Navigator {
    serial?: NavigatorSerial;
  }
}

class WebSerialManager {
  private port: WebSerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private readBuffer = '';
  private isListening = false;
  private dataListeners: Array<(data: any) => void> = [];

  // Web Serial API 지원 여부 확인
  isSupported(): boolean {
    return 'serial' in navigator && navigator.serial !== undefined;
  }

  // 포트 목록 가져오기 (Web Serial API는 연결된 포트만 반환)
  async getPorts(): Promise<SerialPortInfo[]> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API가 지원되지 않습니다. Chrome, Edge, Opera에서만 지원됩니다.');
    }

    try {
      const ports = await navigator.serial!.getPorts();
      const portInfos: SerialPortInfo[] = [];

      for (const port of ports) {
        const info = port.getInfo();
        portInfos.push({
          path: `COM${portInfos.length + 1}`, // Web Serial API는 실제 포트명을 제공하지 않음
          manufacturer: 'Unknown',
          vendorId: info.usbVendorId,
          productId: info.usbProductId
        });
      }

      return portInfos;
    } catch (error) {
      console.error('포트 목록 조회 실패:', error);
      throw new Error('포트 목록을 가져올 수 없습니다.');
    }
  }

  // 포트 요청 (사용자가 포트를 선택하는 팝업 표시)
  async requestPort(): Promise<SerialPortInfo> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API가 지원되지 않습니다.');
    }

    try {
      const port = await navigator.serial!.requestPort({
        filters: [
          { usbVendorId: 0x2341 }, // Arduino Uno
          { usbVendorId: 0x1a86 }, // CH340 (일반적인 Arduino 클론)
          { usbVendorId: 0x0403 }, // FTDI
        ]
      });

      const info = port.getInfo();
      return {
        path: 'Selected Port',
        manufacturer: 'Arduino',
        vendorId: info.usbVendorId,
        productId: info.usbProductId
      };
    } catch (error) {
      console.error('포트 요청 실패:', error);
      throw new Error('포트 선택이 취소되었습니다.');
    }
  }

  // Arduino 연결
  async connect(baudRate: number = 9600): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API가 지원되지 않습니다.');
    }

    try {
      // 기존 연결이 있으면 먼저 해제
      if (this.port) {
        try {
          await this.disconnect();
          // 해제 후 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (disconnectError) {
          console.warn('기존 연결 해제 중 오류:', disconnectError);
        }
      }

      // 새 포트 요청
      this.port = await navigator.serial!.requestPort({
        filters: [
          { usbVendorId: 0x2341 }, // Arduino Uno
          { usbVendorId: 0x1a86 }, // CH340
          { usbVendorId: 0x0403 }, // FTDI
        ]
      });

      // 포트 열기 시도
      try {
        await this.port.open({ baudRate });
      } catch (openError) {
        // 포트 열기 실패 시 상세한 오류 정보 제공
        console.error('포트 열기 실패:', openError);
        
        if (openError instanceof Error) {
          if (openError.message.includes('already open')) {
            throw new Error('포트가 이미 사용 중입니다. 다른 프로그램에서 포트를 사용하고 있는지 확인하세요.');
          } else if (openError.message.includes('access denied') || openError.message.includes('permission')) {
            throw new Error('포트 접근 권한이 없습니다. 관리자 권한으로 실행하거나 포트 권한을 확인하세요.');
          } else if (openError.message.includes('device not found')) {
            throw new Error('Arduino를 찾을 수 없습니다. USB 연결을 확인하세요.');
          }
        }
        
        throw new Error(`포트 연결 실패: ${openError instanceof Error ? openError.message : '알 수 없는 오류'}`);
      }

      // Reader와 Writer 설정
      if (this.port.readable) {
        this.reader = this.port.readable.getReader();
      } else {
        throw new Error('포트 읽기 스트림을 사용할 수 없습니다.');
      }
      
      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      } else {
        throw new Error('포트 쓰기 스트림을 사용할 수 없습니다.');
      }

      console.log('Arduino 연결 성공');
      
      // 연결 후 Arduino 초기화 대기
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 연결 후 자동으로 데이터 리스너 시작
      this.startDataListener();
      
    } catch (error) {
      console.error('Arduino 연결 실패:', error);
      
      // 연결 실패 시 정리
      this.port = null;
      this.reader = null;
      this.writer = null;
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Arduino 연결에 실패했습니다. USB 연결과 드라이버를 확인하세요.');
      }
    }
  }

  // Arduino 연결 해제
  async disconnect(): Promise<void> {
    try {
      // 데이터 리스너 중지
      this.stopDataListener();
      
      // Reader 해제
      if (this.reader) {
        try {
          await this.reader.cancel();
          this.reader.releaseLock();
        } catch (error) {
          console.warn('Reader 해제 중 오류:', error);
        }
        this.reader = null;
      }

      // Writer 해제
      if (this.writer) {
        try {
          this.writer.releaseLock();
        } catch (error) {
          console.warn('Writer 해제 중 오류:', error);
        }
        this.writer = null;
      }

      // 포트 닫기
      if (this.port) {
        try {
          await this.port.close();
        } catch (error) {
          console.warn('포트 닫기 중 오류:', error);
        }
        this.port = null;
      }

      console.log('Arduino 연결 해제 완료');
    } catch (error) {
      console.error('연결 해제 중 오류:', error);
      // 오류가 발생해도 상태는 초기화
      this.reader = null;
      this.writer = null;
      this.port = null;
    }
  }

  // 연결 상태 확인
  isConnected(): boolean {
    return this.port !== null && this.port.readable !== null;
  }

  // 데이터 읽기
  async readLine(): Promise<string | null> {
    if (!this.reader) {
      throw new Error('포트가 연결되지 않았습니다.');
    }

    try {
      // 여러 번 읽기를 시도해서 완전한 라인을 얻기
      for (let attempts = 0; attempts < 5; attempts++) {
        const { value, done } = await this.reader.read();
        if (done) {
          return null;
        }

        const text = this.decoder.decode(value);
        this.readBuffer += text;
        console.log(`[DEBUG] 읽은 데이터 (시도 ${attempts + 1}): "${text}"`);
        console.log(`[DEBUG] 현재 버퍼: "${this.readBuffer}"`);

        // 줄바꿈 문자로 분리
        const lines = this.readBuffer.split('\n');
        if (lines.length > 1) {
          this.readBuffer = lines[lines.length - 1];
          const line = lines[0].trim();
          
          console.log(`[DEBUG] 처리할 라인: "${line}"`);
          
          // 빈 줄은 무시
          if (line === '') {
            continue;
          }
          
          // JSON인 경우 완전한지 확인
          if (line.startsWith('{')) {
            // JSON이 완전한지 확인 (중괄호 개수가 맞는지)
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;
            
            console.log(`[DEBUG] JSON 검증 - 시작괄호: ${openBraces}, 끝괄호: ${closeBraces}`);
            
            if (openBraces === closeBraces && line.endsWith('}')) {
              console.log(`[DEBUG] ✅ 완전한 JSON 발견: "${line}"`);
              return line; // 완전한 JSON
            } else {
              console.log(`[DEBUG] ❌ 불완전한 JSON, 더 읽기 시도`);
              // 불완전한 JSON은 다시 시도
              continue;
            }
          } else {
            // JSON이 아닌 일반 텍스트
            console.log(`[DEBUG] ✅ 일반 텍스트: "${line}"`);
            return line;
          }
        }
      }

      console.log(`[DEBUG] 5번 시도 후에도 완전한 라인을 읽지 못함`);
      return null;
    } catch (error) {
      console.error('[DEBUG] 데이터 읽기 실패:', error);
      return null;
    }
  }

  // 데이터 쓰기
  async write(data: string): Promise<void> {
    if (!this.writer) {
      throw new Error('포트가 연결되지 않았습니다.');
    }

    try {
      const encoded = this.encoder.encode(data + '\n');
      await this.writer.write(encoded);
    } catch (error) {
      console.error('데이터 쓰기 실패:', error);
      throw new Error('데이터 전송에 실패했습니다.');
    }
  }


  // 데이터 리스너 추가
  addDataListener(callback: (data: any) => void): void {
    this.dataListeners.push(callback);
  }

  // 데이터 리스너 제거
  removeDataListener(callback: (data: any) => void): void {
    const index = this.dataListeners.indexOf(callback);
    if (index > -1) {
      this.dataListeners.splice(index, 1);
    }
  }

  // 지속적 데이터 수신 시작
  private startDataListener(): void {
    if (this.isListening) {
      return;
    }
    
    this.isListening = true;
    console.log('[이벤트] 지속적 데이터 리스너 시작');
    
    const listenContinuously = async () => {
      while (this.isListening && this.isConnected()) {
        try {
          const data = await this.readLine();
          if (data && data.trim()) {
            console.log('[이벤트] 데이터 수신:', data);
            
            // JSON 형태인지 확인
            if (data.startsWith('{') && data.endsWith('}')) {
              try {
                const jsonData = JSON.parse(data);
                
                // RFID_TAG 타입인 경우 모든 리스너에게 알림
                if (jsonData.type === 'RFID_TAG' && jsonData.card_id) {
                  console.log('[이벤트] RFID 태그 감지:', jsonData.card_id);
                  this.dataListeners.forEach(callback => {
                    try {
                      callback(jsonData);
                    } catch (error) {
                      console.error('[이벤트] 리스너 호출 오류:', error);
                    }
                  });
                }
              } catch (parseError) {
                console.warn('[이벤트] JSON 파싱 실패:', data);
              }
            }
          }
          
          // 짧은 딜레이로 CPU 부담 줄이기
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.error('[이벤트] 데이터 수신 오류:', error);
          // 오류 시 잠시 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('[이벤트] 데이터 리스너 종료');
    };
    
    listenContinuously();
  }

  // 지속적 데이터 수신 중지
  private stopDataListener(): void {
    this.isListening = false;
    this.dataListeners = [];
    console.log('[이벤트] 데이터 리스너 중지');
  }

  // 기존 checkRFIDTag은 호환성을 위해 유지 (사용하지 않을 예정)
  async checkRFIDTag(): Promise<{ hasNewTag: boolean; uid?: string }> {
    console.warn('[경고] checkRFIDTag는 폴링 방식입니다. 이벤트 리스너를 사용하세요.');
    
    if (!this.isConnected()) {
      throw new Error('Arduino가 연결되지 않았습니다.');
    }

    try {
      const timeout = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 100) // 매우 짧은 타임아웃
      );
      
      const response = await Promise.race([this.readLine(), timeout]);
      
      if (response && response.trim()) {
        const trimmedResponse = response.trim();
        
        if (trimmedResponse.startsWith('{') && trimmedResponse.endsWith('}')) {
          try {
            const jsonData = JSON.parse(trimmedResponse);
            
            if (jsonData.type === 'RFID_TAG' && jsonData.card_id) {
              console.log('[폴링] RFID 태그 발견:', jsonData.card_id);
              return { hasNewTag: true, uid: jsonData.card_id };
            }
            
            return { hasNewTag: false };
            
          } catch (parseError) {
            console.warn('[폴링] JSON 파싱 실패:', trimmedResponse);
            return { hasNewTag: false };
          }
        }
      }
      
      return { hasNewTag: false };
    } catch (error) {
      console.error('[폴링] RFID 태그 확인 실패:', error);
      return { hasNewTag: false };
    }
  }

  // RFID 카드에 데이터 쓰기
  async writeRFIDCard(studentId: string, studentName: string): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error('Arduino가 연결되지 않았습니다.');
    }

    try {
      // Arduino에 쓰기 명령 전송
      const command = `WRITE_CARD:${studentId}:${studentName}`;
      await this.write(command);
      
      // 응답 대기 (최대 5초)
      const timeout = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 5000)
      );
      
      const response = await Promise.race([this.readLine(), timeout]);
      
      return response === 'WRITE_SUCCESS';
    } catch (error) {
      console.error('RFID 카드 쓰기 실패:', error);
      return false;
    }
  }
}

export const webSerialManager = new WebSerialManager();
export default webSerialManager;