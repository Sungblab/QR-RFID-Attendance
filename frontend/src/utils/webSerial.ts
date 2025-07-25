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
      // 포트가 없으면 새로 요청
      if (!this.port) {
        this.port = await navigator.serial!.requestPort({
          filters: [
            { usbVendorId: 0x2341 }, // Arduino Uno
            { usbVendorId: 0x1a86 }, // CH340
            { usbVendorId: 0x0403 }, // FTDI
          ]
        });
      }

      // 포트 열기
      await this.port.open({ baudRate });

      // Reader와 Writer 설정
      if (this.port.readable) {
        this.reader = this.port.readable.getReader();
      }
      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }

      console.log('Arduino 연결 성공');
    } catch (error) {
      console.error('Arduino 연결 실패:', error);
      throw new Error('Arduino 연결에 실패했습니다.');
    }
  }

  // Arduino 연결 해제
  async disconnect(): Promise<void> {

    if (this.reader) {
      await this.reader.cancel();
      this.reader.releaseLock();
      this.reader = null;
    }

    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }

    if (this.port) {
      await this.port.close();
      this.port = null;
    }

    console.log('Arduino 연결 해제');
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
      const { value, done } = await this.reader.read();
      if (done) {
        return null;
      }

      const text = this.decoder.decode(value);
      this.readBuffer += text;

      // 줄바꿈 문자로 분리
      const lines = this.readBuffer.split('\n');
      if (lines.length > 1) {
        this.readBuffer = lines[lines.length - 1];
        return lines[0].trim();
      }

      return null;
    } catch (error) {
      console.error('데이터 읽기 실패:', error);
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

  // RFID 태그 확인
  async checkRFIDTag(): Promise<{ hasNewTag: boolean; uid?: string }> {
    if (!this.isConnected()) {
      throw new Error('Arduino가 연결되지 않았습니다.');
    }

    try {
      // Arduino는 자동으로 RFID 태그를 감지하므로 명령 전송 없이 응답만 읽기
      const timeout = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 500)
      );
      
      const response = await Promise.race([this.readLine(), timeout]);
      
      if (response) {
        try {
          // JSON 파싱 시도
          const jsonData = JSON.parse(response);
          
          // RFID_TAG 타입이고 card_id가 있으면 새 태그
          if (jsonData.type === 'RFID_TAG' && jsonData.card_id) {
            return { hasNewTag: true, uid: jsonData.card_id };
          }
          
          // 다른 타입의 메시지는 무시
          return { hasNewTag: false };
          
        } catch (parseError) {
          console.error('JSON 파싱 실패:', parseError);
          // 기존 RFID: 형식도 지원
          if (response.startsWith('RFID:')) {
            const uid = response.replace('RFID:', '').trim();
            return { hasNewTag: true, uid };
          }
        }
      }
      
      return { hasNewTag: false };
    } catch (error) {
      console.error('RFID 태그 확인 실패:', error);
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