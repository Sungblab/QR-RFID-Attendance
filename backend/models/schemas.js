/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - name
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *           description: 사용자 고유 ID
 *         username:
 *           type: string
 *           description: 사용자명 (학번 또는 ID)
 *           example: "2024001"
 *         name:
 *           type: string
 *           description: 실명
 *           example: "김학생"
 *         role:
 *           type: string
 *           enum: [student, teacher, admin, reader]
 *           description: 사용자 역할
 *           example: "student"
 *         grade:
 *           type: integer
 *           description: 학년 (학생만)
 *           example: 2
 *         class:
 *           type: integer
 *           description: 반 (학생만)
 *           example: 3
 *         number:
 *           type: integer
 *           description: 번호 (학생만)
 *           example: 15
 *         studentId:
 *           type: string
 *           description: 학번 (학생만)
 *           example: "2024001"
 *         rfidCardId:
 *           type: string
 *           description: RFID 카드 ID (학생만)
 *           example: "RFID123456"
 *         isApproved:
 *           type: boolean
 *           description: 승인 여부
 *           example: true
 *         isActive:
 *           type: boolean
 *           description: 활성 상태
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성일시
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 수정일시
 * 
 *     AttendanceRecord:
 *       type: object
 *       required:
 *         - userId
 *         - date
 *         - status
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *           description: 출결 기록 고유 ID
 *         userId:
 *           type: string
 *           format: objectId
 *           description: 학생 ID
 *         date:
 *           type: string
 *           format: date
 *           description: 출결 날짜
 *           example: "2024-01-15"
 *         checkInTime:
 *           type: string
 *           format: time
 *           description: 체크인 시간
 *           example: "08:30:00"
 *         status:
 *           type: string
 *           enum: [present, late, absent, excused]
 *           description: 출결 상태
 *           example: "present"
 *         method:
 *           type: string
 *           enum: [rfid, qr, manual]
 *           description: 출결 방법
 *           example: "rfid"
 *         isExcused:
 *           type: boolean
 *           description: 면제 여부
 *           example: false
 *         excusedBy:
 *           type: string
 *           format: objectId
 *           description: 면제 처리자 ID
 *         excusedAt:
 *           type: string
 *           format: date-time
 *           description: 면제 처리 시간
 *         excusedReason:
 *           type: string
 *           description: 면제 사유
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성일시
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 수정일시
 * 
 *     AttendanceReport:
 *       type: object
 *       required:
 *         - userId
 *         - date
 *         - reason
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *           description: 출결 신고 고유 ID
 *         userId:
 *           type: string
 *           format: objectId
 *           description: 신고자 ID
 *         date:
 *           type: string
 *           format: date
 *           description: 신고 날짜
 *           example: "2024-01-15"
 *         reason:
 *           type: string
 *           description: 신고 사유
 *           example: "병원 진료로 인한 지각"
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           description: 처리 상태
 *           example: "pending"
 *         reportType:
 *           type: string
 *           enum: [late, absent, early_leave]
 *           description: 신고 유형
 *           example: "late"
 *         processedBy:
 *           type: string
 *           format: objectId
 *           description: 처리자 ID
 *         processedAt:
 *           type: string
 *           format: date-time
 *           description: 처리 시간
 *         adminNote:
 *           type: string
 *           description: 관리자 메모
 *         evidence:
 *           type: string
 *           description: 증빙 자료 URL 또는 설명
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성일시
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 수정일시
 * 
 *     AttendanceStats:
 *       type: object
 *       properties:
 *         totalDays:
 *           type: integer
 *           description: 총 등교일수
 *           example: 100
 *         presentDays:
 *           type: integer
 *           description: 출석일수
 *           example: 85
 *         lateDays:
 *           type: integer
 *           description: 지각일수
 *           example: 10
 *         absentDays:
 *           type: integer
 *           description: 결석일수
 *           example: 5
 *         excusedDays:
 *           type: integer
 *           description: 면제일수
 *           example: 3
 *         attendanceRate:
 *           type: number
 *           format: float
 *           description: 출석률 (%)
 *           example: 95.0
 *         lateRate:
 *           type: number
 *           format: float
 *           description: 지각률 (%)
 *           example: 10.0
 * 
 *     QRCode:
 *       type: object
 *       required:
 *         - qrToken
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *           description: QR코드 고유 ID
 *         qrToken:
 *           type: string
 *           description: QR코드 토큰
 *         isActive:
 *           type: boolean
 *           description: 활성 상태
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성일시
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 수정일시
 * 
 *     Holiday:
 *       type: object
 *       required:
 *         - date
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *           description: 공휴일 고유 ID
 *         date:
 *           type: string
 *           format: date
 *           description: 공휴일 날짜
 *           example: "2024-01-01"
 *         name:
 *           type: string
 *           description: 공휴일 이름
 *           example: "신정"
 *         type:
 *           type: string
 *           enum: [national, school, custom]
 *           description: 공휴일 유형
 *           example: "national"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성일시
 * 
 *     AttendanceSettings:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 설정 고유 ID
 *         start_time:
 *           type: string
 *           format: time
 *           description: 출결 시작 시간
 *           example: "07:00:00"
 *         late_time:
 *           type: string
 *           format: time
 *           description: 지각 처리 시작 시간
 *           example: "08:00:00"
 *         end_time:
 *           type: string
 *           format: time
 *           description: 출결 마감 시간
 *           example: "09:00:00"
 *         is_active:
 *           type: boolean
 *           description: 설정 활성 상태
 *           example: true
 *         created_by:
 *           type: integer
 *           description: 생성자 ID
 *         updated_by:
 *           type: integer
 *           description: 수정자 ID
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 생성일시
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 수정일시
 * 
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 성공 여부
 *           example: true
 *         message:
 *           type: string
 *           description: 응답 메시지
 *           example: "성공적으로 처리되었습니다"
 *         data:
 *           type: object
 *           description: 응답 데이터
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 성공 여부
 *           example: false
 *         message:
 *           type: string
 *           description: 오류 메시지
 *           example: "잘못된 요청입니다"
 *         error:
 *           type: string
 *           description: 상세 오류 정보
 *           example: "Validation failed"
 * 
 *   responses:
 *     UnauthorizedError:
 *       description: 인증 실패
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "인증이 필요합니다"
 *             error: "No token provided"
 * 
 *     ForbiddenError:
 *       description: 권한 부족
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "권한이 부족합니다"
 *             error: "Insufficient permissions"
 * 
 *     NotFoundError:
 *       description: 리소스를 찾을 수 없음
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "요청한 리소스를 찾을 수 없습니다"
 *             error: "Resource not found"
 * 
 *     ValidationError:
 *       description: 입력 데이터 검증 실패
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "입력 데이터가 올바르지 않습니다"
 *             error: "Validation failed"
 * 
 *     ServerError:
 *       description: 서버 내부 오류
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: "서버 내부 오류가 발생했습니다"
 *             error: "Internal server error"
 */