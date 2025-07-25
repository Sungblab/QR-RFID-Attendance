/*
 * 아침 등교 체크 시스템 - RFID 리더기
 * RC522 RFID 모듈을 사용한 Arduino 출결 리더기
 * 
 * 하드웨어 연결:
 * RC522     Arduino Uno
 * -------   -----------
 * SDA       Pin 10
 * SCK       Pin 13
 * MOSI      Pin 11
 * MISO      Pin 12
 * IRQ       (사용 안함)
 * GND       GND
 * RST       Pin 9
 * 3.3V      3.3V
 * 
 * LED 연결:
 * GREEN LED -> Pin 6 (성공)
 * RED LED   -> Pin 7 (실패)
 * BLUE LED  -> Pin 8 (대기)
 * 
 * BUZZER    -> Pin 5
 */

 #include <SPI.h>
 #include <MFRC522.h>
 #include <ArduinoJson.h>
 
 // RFID RC522 핀 설정
 #define RST_PIN         9
 #define SS_PIN          10
 
 // LED 및 부저 핀 설정
 #define GREEN_LED       6
 #define RED_LED         7
 #define BLUE_LED        8
 #define BUZZER          5
 
 // RFID 객체 생성
 MFRC522 mfrc522(SS_PIN, RST_PIN);
 
 // 시스템 상태
 enum SystemState {
   IDLE,           // 대기 상태
   CARD_DETECTED,  // 카드 감지됨
   PROCESSING,     // 처리 중
   SUCCESS,        // 성공
   ERROR           // 오류
 };
 
 SystemState currentState = IDLE;
 unsigned long lastCardTime = 0;
 unsigned long stateChangeTime = 0;
 String lastCardId = "";
 bool isReaderConnected = true;
 unsigned long lastHeartbeat = 0;
 
 // 설정
 const unsigned long CARD_READ_INTERVAL = 1000;    // 카드 재읽기 방지 간격 (ms)
 const unsigned long STATE_DISPLAY_TIME = 2000;    // 상태 표시 시간 (ms)
 const unsigned long HEARTBEAT_INTERVAL = 5000;    // 하트비트 간격 (ms)
 
 void setup() {
   // 시리얼 통신 초기화
   Serial.begin(9600);
   while (!Serial);
   
   // SPI 버스 초기화
   SPI.begin();
   
   // RFID 리더기 초기화
   mfrc522.PCD_Init();
   
   // 핀 모드 설정
   pinMode(GREEN_LED, OUTPUT);
   pinMode(RED_LED, OUTPUT);
   pinMode(BLUE_LED, OUTPUT);
   pinMode(BUZZER, OUTPUT);
   
   // 초기 상태 설정
   setSystemState(IDLE);
   
   // 시작 신호음
   playStartupSound();
   
   // 시작 메시지 전송
   sendSystemMessage("READER_READY", "RFID 리더기가 준비되었습니다.");
   
   delay(1000);
 }
 
 void loop() {
   // 하트비트 전송
   sendHeartbeat();
   
   // 시리얼 명령어 처리
   processSerialCommands();
   
   // 상태별 처리
   switch (currentState) {
     case IDLE:
       handleIdleState();
       break;
       
     case CARD_DETECTED:
       handleCardDetected();
       break;
       
     case PROCESSING:
       handleProcessing();
       break;
       
     case SUCCESS:
     case ERROR:
       handleResultState();
       break;
   }
   
   delay(50); // 메인 루프 딜레이
 }
 
 // IDLE 상태 처리
 void handleIdleState() {
   // RFID 카드 감지 확인
   if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
     String cardId = getCardId();
     
     // 동일한 카드의 연속 읽기 방지
     if (cardId != lastCardId || (millis() - lastCardTime) > CARD_READ_INTERVAL) {
       lastCardId = cardId;
       lastCardTime = millis();
       
       // 카드 감지 상태로 전환
       setSystemState(CARD_DETECTED);
       
       // 카드 정보 전송
       sendCardData(cardId);
     }
     
     // 카드 읽기 종료
     mfrc522.PICC_HaltA();
     mfrc522.PCD_StopCrypto1();
   }
 }
 
 // 카드 감지 상태 처리
 void handleCardDetected() {
   // 처리 중 상태로 전환
   setSystemState(PROCESSING);
 }
 
 // 처리 중 상태 처리
 void handleProcessing() {
   // 서버 응답 대기 (타임아웃 후 IDLE로 복귀)
   if (millis() - stateChangeTime > 10000) { // 10초 타임아웃
     sendSystemMessage("TIMEOUT", "서버 응답 타임아웃");
     setSystemState(ERROR);
   }
 }
 
 // 결과 상태 처리
 void handleResultState() {
   // 일정 시간 후 IDLE 상태로 복귀
   if (millis() - stateChangeTime > STATE_DISPLAY_TIME) {
     setSystemState(IDLE);
   }
 }
 
 // 시스템 상태 변경
 void setSystemState(SystemState newState) {
   currentState = newState;
   stateChangeTime = millis();
   
   // LED 상태 업데이트
   updateLEDs();
   
   // 상태별 사운드
   playStateSound(newState);
 }
 
 // LED 상태 업데이트
 void updateLEDs() {
   // 모든 LED 끄기
   digitalWrite(GREEN_LED, LOW);
   digitalWrite(RED_LED, LOW);
   digitalWrite(BLUE_LED, LOW);
   
   // 상태별 LED 설정
   switch (currentState) {
     case IDLE:
       digitalWrite(BLUE_LED, HIGH);
       break;
       
     case CARD_DETECTED:
     case PROCESSING:
       // 처리 중 LED 깜빡임
       if ((millis() / 250) % 2) {
         digitalWrite(BLUE_LED, HIGH);
       }
       break;
       
     case SUCCESS:
       digitalWrite(GREEN_LED, HIGH);
       break;
       
     case ERROR:
       digitalWrite(RED_LED, HIGH);
       break;
   }
 }
 
 // 상태별 사운드 재생
 void playStateSound(SystemState state) {
   switch (state) {
     case CARD_DETECTED:
       tone(BUZZER, 1000, 100); // 짧은 비프음
       break;
       
     case SUCCESS:
       // 성공 멜로디
       tone(BUZZER, 523, 200); // C5
       delay(200);
       tone(BUZZER, 659, 200); // E5
       break;
       
     case ERROR:
       // 오류 사운드
       tone(BUZZER, 200, 500); // 낮은 부저음
       break;
   }
 }
 
 // 시작 사운드
 void playStartupSound() {
   tone(BUZZER, 523, 150); // C5
   delay(150);
   tone(BUZZER, 659, 150); // E5
   delay(150);
   tone(BUZZER, 784, 150); // G5
 }
 
 // RFID 카드 ID 추출
 String getCardId() {
   String cardId = "";
   for (byte i = 0; i < mfrc522.uid.size; i++) {
     if (mfrc522.uid.uidByte[i] < 0x10) {
       cardId += "0";
     }
     cardId += String(mfrc522.uid.uidByte[i], HEX);
   }
   cardId.toUpperCase();
   return cardId;
 }
 
 // 카드 데이터 전송
 void sendCardData(String cardId) {
   StaticJsonDocument<200> doc;
   doc["type"] = "RFID_TAG";
   doc["card_id"] = cardId;
   doc["timestamp"] = millis();
   doc["reader_id"] = "ARDUINO_001";
   doc["source"] = "reader"; // QR/RFID 리더기용
   
   String jsonString;
   serializeJson(doc, jsonString);
   Serial.println(jsonString);
 }
 
 // 시스템 메시지 전송
 void sendSystemMessage(String messageType, String message) {
   StaticJsonDocument<200> doc;
   doc["type"] = "SYSTEM_MESSAGE";
   doc["message_type"] = messageType;
   doc["message"] = message;
   doc["timestamp"] = millis();
   doc["reader_id"] = "ARDUINO_001";
   doc["source"] = "reader"; // QR/RFID 리더기용
   
   String jsonString;
   serializeJson(doc, jsonString);
   Serial.println(jsonString);
 }
 
 // 하트비트 전송
 void sendHeartbeat() {
   if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
     StaticJsonDocument<200> doc;
     doc["type"] = "HEARTBEAT";
     doc["timestamp"] = millis();
     doc["reader_id"] = "ARDUINO_001";
     doc["state"] = getStateString(currentState);
     doc["version"] = "1.0.0";
     doc["source"] = "reader"; // QR/RFID 리더기용
     
     String jsonString;
     serializeJson(doc, jsonString);
     Serial.println(jsonString);
     
     lastHeartbeat = millis();
   }
 }
 
 // 상태 문자열 반환
 String getStateString(SystemState state) {
   switch (state) {
     case IDLE: return "IDLE";
     case CARD_DETECTED: return "CARD_DETECTED";
     case PROCESSING: return "PROCESSING";
     case SUCCESS: return "SUCCESS";
     case ERROR: return "ERROR";
     default: return "UNKNOWN";
   }
 }
 
 // 시리얼 명령어 처리
 void processSerialCommands() {
   if (Serial.available()) {
     String command = Serial.readStringUntil('\n');
     command.trim();
     
     // JSON 파싱 시도
     StaticJsonDocument<200> doc;
     DeserializationError error = deserializeJson(doc, command);
     
     if (error) {
       // 단순 명령어 처리
       handleSimpleCommand(command);
     } else {
       // JSON 명령어 처리
       handleJsonCommand(doc);
     }
   }
 }
 
 // 단순 명령어 처리
 void handleSimpleCommand(String command) {
   command.toUpperCase();
   
   if (command == "STATUS") {
     sendSystemStatus();
   } else if (command == "RESET") {
     setSystemState(IDLE);
     sendSystemMessage("RESET", "시스템이 초기화되었습니다.");
   } else if (command == "TEST") {
     testAllComponents();
   }
 }
 
 // JSON 명령어 처리
 void handleJsonCommand(StaticJsonDocument<200> doc) {
   String command = doc["command"];
   
   if (command == "ATTENDANCE_RESULT") {
     handleAttendanceResult(doc);
   } else if (command == "WRITE_CARD") {
     handleCardWrite(doc);
   }
 }
 
 // 출석 처리 결과 처리
 void handleAttendanceResult(StaticJsonDocument<200> doc) {
   bool success = doc["success"];
   String message = doc["message"];
   
   if (success) {
     setSystemState(SUCCESS);
   } else {
     setSystemState(ERROR);
   }
   
   sendSystemMessage("ATTENDANCE_PROCESSED", message);
 }
 
 // 카드 쓰기 처리 (RFID 카드에 데이터 쓰기)
 void handleCardWrite(StaticJsonDocument<200> doc) {
   String studentId = doc["student_id"];
   String studentName = doc["student_name"];
   
   sendSystemMessage("CARD_WRITE_REQUEST", "카드를 리더기에 올려주세요.");
   
   // 카드 대기
   unsigned long waitStart = millis();
   while (millis() - waitStart < 30000) { // 30초 대기
     if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
       // 카드 쓰기 시도
       if (writeDataToCard(studentId, studentName)) {
         setSystemState(SUCCESS);
         sendSystemMessage("CARD_WRITE_SUCCESS", "카드 쓰기 완료: " + studentName);
       } else {
         setSystemState(ERROR);
         sendSystemMessage("CARD_WRITE_ERROR", "카드 쓰기 실패");
       }
       
       mfrc522.PICC_HaltA();
       mfrc522.PCD_StopCrypto1();
       return;
     }
     delay(100);
   }
   
   setSystemState(ERROR);
   sendSystemMessage("CARD_WRITE_TIMEOUT", "카드 쓰기 타임아웃");
 }
 
 // RFID 카드에 데이터 쓰기
 bool writeDataToCard(String studentId, String studentName) {
   // MIFARE Classic 1K 카드의 블록 4에 학생 정보 저장
   byte blockAddr = 4;
   byte buffer[16];
   
   // 버퍼 초기화
   memset(buffer, 0, sizeof(buffer));
   
   // 학생 ID를 버퍼에 복사 (최대 16바이트)
   studentId.getBytes(buffer, min(studentId.length() + 1, 16));
   
   // 기본 키로 인증 시도
   MFRC522::MIFARE_Key key;
   for (byte i = 0; i < 6; i++) {
     key.keyByte[i] = 0xFF; // 기본 키
   }
   
   // 인증
   MFRC522::StatusCode status = mfrc522.PCD_Authenticate(
     MFRC522::PICC_CMD_MF_AUTH_KEY_A, blockAddr, &key, &(mfrc522.uid)
   );
   
   if (status != MFRC522::STATUS_OK) {
     return false;
   }
   
   // 데이터 쓰기
   status = mfrc522.MIFARE_Write(blockAddr, buffer, 16);
   
   return (status == MFRC522::STATUS_OK);
 }
 
 // 시스템 상태 전송
 void sendSystemStatus() {
   StaticJsonDocument<300> doc;
   doc["type"] = "SYSTEM_STATUS";
   doc["timestamp"] = millis();
   doc["reader_id"] = "ARDUINO_001";
   doc["state"] = getStateString(currentState);
   doc["version"] = "1.0.0";
   doc["uptime"] = millis();
   doc["last_card_time"] = lastCardTime;
   doc["last_card_id"] = lastCardId;
   
   String jsonString;
   serializeJson(doc, jsonString);
   Serial.println(jsonString);
 }
 
 // 전체 컴포넌트 테스트
 void testAllComponents() {
   sendSystemMessage("TEST_START", "컴포넌트 테스트 시작");
   
   // LED 테스트
   digitalWrite(RED_LED, HIGH);
   delay(500);
   digitalWrite(RED_LED, LOW);
   digitalWrite(GREEN_LED, HIGH);
   delay(500);
   digitalWrite(GREEN_LED, LOW);
   digitalWrite(BLUE_LED, HIGH);
   delay(500);
   digitalWrite(BLUE_LED, LOW);
   
   // 부저 테스트
   tone(BUZZER, 1000, 200);
   delay(300);
   tone(BUZZER, 1500, 200);
   delay(300);
   
   // RFID 테스트
   bool rfidWorking = mfrc522.PCD_PerformSelfTest();
   
   if (rfidWorking) {
     sendSystemMessage("TEST_COMPLETE", "모든 컴포넌트 정상");
     setSystemState(SUCCESS);
   } else {
     sendSystemMessage("TEST_ERROR", "RFID 리더기 오류 감지");
     setSystemState(ERROR);
   }
   
   // RFID 리더기 재초기화
   mfrc522.PCD_Init();
 }