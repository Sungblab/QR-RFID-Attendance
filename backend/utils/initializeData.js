const logger = require('../config/logger');

// 모델들을 동적으로 import (순환 참조 방지)
const getModels = () => {
  const { ClassPeriod, Classroom } = require('../models');
  return { ClassPeriod, Classroom };
};

// 교시별 시간 정보 초기화
const initializeClassPeriods = async () => {
  try {
    const { ClassPeriod } = getModels();
    
    // 이미 데이터가 있으면 스킵
    const existingPeriods = await ClassPeriod.count();
    if (existingPeriods > 0) {
      logger.info('교시 정보가 이미 존재합니다. 초기화를 건너뜁니다.');
      return;
    }

    // 월화수금 시간표
    const weekdayPeriods = [
      { day_type: 'weekday', period_number: 0, period_type: 'morning', start_time: '08:00', end_time: '09:00' },
      { day_type: 'weekday', period_number: 1, period_type: 'class', start_time: '09:00', end_time: '09:50' },
      { day_type: 'weekday', period_number: null, period_type: 'break', start_time: '09:50', end_time: '10:00' },
      { day_type: 'weekday', period_number: 2, period_type: 'class', start_time: '10:00', end_time: '10:50' },
      { day_type: 'weekday', period_number: null, period_type: 'break', start_time: '10:50', end_time: '11:00' },
      { day_type: 'weekday', period_number: 3, period_type: 'class', start_time: '11:00', end_time: '11:50' },
      { day_type: 'weekday', period_number: null, period_type: 'lunch', start_time: '11:50', end_time: '13:00' },
      { day_type: 'weekday', period_number: 4, period_type: 'class', start_time: '13:00', end_time: '13:50' },
      { day_type: 'weekday', period_number: null, period_type: 'break', start_time: '13:50', end_time: '14:00' },
      { day_type: 'weekday', period_number: 5, period_type: 'class', start_time: '14:00', end_time: '14:50' },
      { day_type: 'weekday', period_number: null, period_type: 'break', start_time: '14:50', end_time: '15:00' },
      { day_type: 'weekday', period_number: 6, period_type: 'class', start_time: '15:00', end_time: '15:50' },
      { day_type: 'weekday', period_number: null, period_type: 'cleaning', start_time: '15:50', end_time: '16:10' },
      { day_type: 'weekday', period_number: 7, period_type: 'class', start_time: '16:10', end_time: '17:00' }
    ];

    // 목요일 시간표
    const thursdayPeriods = [
      { day_type: 'thursday', period_number: 0, period_type: 'morning', start_time: '08:00', end_time: '09:00' },
      { day_type: 'thursday', period_number: 1, period_type: 'class', start_time: '09:00', end_time: '09:50' },
      { day_type: 'thursday', period_number: null, period_type: 'break', start_time: '09:50', end_time: '10:00' },
      { day_type: 'thursday', period_number: 2, period_type: 'class', start_time: '10:00', end_time: '10:50' },
      { day_type: 'thursday', period_number: null, period_type: 'break', start_time: '10:50', end_time: '11:00' },
      { day_type: 'thursday', period_number: 3, period_type: 'class', start_time: '11:00', end_time: '11:50' },
      { day_type: 'thursday', period_number: null, period_type: 'lunch', start_time: '11:50', end_time: '13:00' },
      { day_type: 'thursday', period_number: 4, period_type: 'class', start_time: '13:00', end_time: '13:50' },
      { day_type: 'thursday', period_number: null, period_type: 'break', start_time: '13:50', end_time: '14:00' },
      { day_type: 'thursday', period_number: 5, period_type: 'class', start_time: '14:00', end_time: '14:50' },
      { day_type: 'thursday', period_number: null, period_type: 'break', start_time: '14:50', end_time: '15:00' },
      { day_type: 'thursday', period_number: 6, period_type: 'class', start_time: '15:00', end_time: '15:50' },
      { day_type: 'thursday', period_number: null, period_type: 'break', start_time: '15:50', end_time: '16:00' },
      { day_type: 'thursday', period_number: 7, period_type: 'class', start_time: '16:00', end_time: '16:50' }
    ];

    // 모든 교시 데이터 삽입
    const allPeriods = [...weekdayPeriods, ...thursdayPeriods];
    await ClassPeriod.bulkCreate(allPeriods);
    
    logger.info(`교시 정보 ${allPeriods.length}개가 초기화되었습니다.`);
  } catch (error) {
    logger.error('교시 정보 초기화 실패:', error);
    throw error;
  }
};

// 교실 정보 초기화
const initializeClassrooms = async () => {
  try {
    const { Classroom } = getModels();
    
    // 이미 데이터가 있으면 스킵
    const existingClassrooms = await Classroom.count();
    if (existingClassrooms > 0) {
      logger.info('교실 정보가 이미 존재합니다. 초기화를 건너뜁니다.');
      return;
    }

    // 기본 교실 목록
    const locations = [
      // 홈룸
      { name: '1학년 1반', type: 'regular', floor: 2, building: '본관' },
      { name: '1학년 2반', type: 'regular', floor: 2, building: '본관' },
      { name: '1학년 3반', type: 'regular', floor: 2, building: '본관' },
      { name: '1학년 4반', type: 'regular', floor: 2, building: '본관' },
      { name: '1학년 5반', type: 'regular', floor: 2, building: '본관' },
      { name: '1학년 6반', type: 'regular', floor: 2, building: '본관' },
      { name: '2학년 1반', type: 'regular', floor: 3, building: '본관' },
      { name: '2학년 2반', type: 'regular', floor: 3, building: '본관' },
      { name: '2학년 3반', type: 'regular', floor: 3, building: '본관' },
      { name: '2학년 4반', type: 'regular', floor: 3, building: '본관' },
      { name: '2학년 5반', type: 'regular', floor: 3, building: '본관' },
      { name: '2학년 6반', type: 'regular', floor: 3, building: '본관' },
      { name: '3학년 1반', type: 'regular', floor: 4, building: '본관' },
      { name: '3학년 2반', type: 'regular', floor: 4, building: '본관' },
      { name: '3학년 3반', type: 'regular', floor: 4, building: '본관' },
      { name: '3학년 4반', type: 'regular', floor: 4, building: '본관' },
      { name: '3학년 5반', type: 'regular', floor: 4, building: '본관' },
      { name: '3학년 6반', type: 'regular', floor: 4, building: '본관' },
      
      // 전용교실
      { name: '국어교과교실', type: 'special', floor: 1, building: '본관' },
      { name: '영어교과교실', type: 'special', floor: 1, building: '본관' },
      { name: '수학교과교실', type: 'special', floor: 1, building: '본관' },
      { name: '사회교과교실', type: 'special', floor: 1, building: '본관' },
      { name: '과학(화학/생명과학,지구과학)실', type: 'special', floor: 1, building: '과학관' },
      { name: '과학(물리)실', type: 'special', floor: 1, building: '과학관' },
      { name: '음악실', type: 'special', floor: 3, building: '예술관' },
      { name: '미술실', type: 'special', floor: 3, building: '예술관' },
      { name: 'AI교육실', type: 'special', floor: 2, building: '정보관' },
      { name: '보건교육실', type: 'special', floor: 1, building: '본관' },
      { name: '온라인학습카페/동백실', type: 'special', floor: 1, building: '도서관' },
      { name: '컴퓨터실', type: 'special', floor: 2, building: '정보관' },
      { name: '체육관', type: 'special', floor: 1, building: '체육관' },
      { name: '운동장', type: 'special', floor: null, building: '야외' }
    ];

    await Classroom.bulkCreate(locations);
    logger.info(`교실 정보 ${locations.length}개가 초기화되었습니다.`);
  } catch (error) {
    logger.error('교실 정보 초기화 실패:', error);
    throw error;
  }
};

// 모든 기초 데이터 초기화
const initializeAllData = async () => {
  try {
    await initializeClassPeriods();
    await initializeClassrooms();
    logger.info('모든 기초 데이터 초기화가 완료되었습니다.');
  } catch (error) {
    logger.error('기초 데이터 초기화 실패:', error);
    throw error;
  }
};

module.exports = {
  initializeClassPeriods,
  initializeClassrooms,
  initializeAllData
};