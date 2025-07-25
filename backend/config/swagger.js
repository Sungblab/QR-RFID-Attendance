const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '디지털 출결 관리 시스템 API',
      version: '1.0.0',
      description: '지능형 RFID/NFC 자동 출결 관리 시스템의 REST API 문서',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8000}/api/v1`,
        description: '개발 서버'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './models/*.js'
  ]
};

const specs = swaggerJSDoc(options);

module.exports = specs;