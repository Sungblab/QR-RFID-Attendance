const express = require('express');
const router = express.Router();
const { QRCode } = require('../../models');
const { authenticateToken: requireAuth, requireRole } = require('../middleware/auth');
const crypto = require('crypto');

/**
 * @swagger
 * /api/v1/qr/active:
 *   get:
 *     summary: Get active QR code info
 *     description: Retrieve currently active QR code information
 *     tags:
 *       - QR
 *     responses:
 *       200:
 *         description: QR code info retrieved successfully
 *       404:
 *         description: Active QR code not found
 */
// 현재 활성 QR코드 조회
router.get('/active', async (req, res) => {
  try {
    const qrCode = await QRCode.findOne({
      where: { 
        is_active: true 
      },
      order: [['created_at', 'DESC']]
    });
    
    if (!qrCode) {
      return res.status(404).json({ 
        error: '활성 QR코드를 찾을 수 없습니다' 
      });
    }
    
    return res.json({
      success: true,
      data: {
        qr_token: qrCode.qr_token,
        qr_url: `${req.protocol}://${req.get('host')}/qr-scan?token=${qrCode.qr_token}`,
        created_at: qrCode.created_at
      }
    });
  } catch (error) {
    console.error('QR코드 조회 오류:', error);
    return res.status(500).json({ error: 'QR코드 조회 중 오류가 발생했습니다' });
  }
});

/**
 * @swagger
 * /api/v1/qr/generate:
 *   post:
 *     summary: Generate new QR code
 *     description: Generate new QR code for attendance (admin only)
 *     tags:
 *       - QR
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: QR code generated successfully
 *       400:
 *         description: Bad request
 */
// QR코드 생성 (관리자용)
router.post('/generate', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    // 기존 활성 QR코드들 비활성화
    await QRCode.update(
      { is_active: false },
      { where: { is_active: true } }
    );
    
    // 고유한 QR 토큰 생성
    const qr_token = crypto.randomBytes(32).toString('hex');
    
    const qrCode = await QRCode.create({
      qr_token,
      is_active: true
    });
    
    return res.status(201).json({
      success: true,
      data: {
        id: qrCode.id,
        qr_token: qrCode.qr_token,
        qr_url: `${req.protocol}://${req.get('host')}/qr-scan?token=${qr_token}`,
        is_active: qrCode.is_active,
        created_at: qrCode.created_at
      }
    });
  } catch (error) {
    console.error('QR코드 생성 오류:', error);
    return res.status(500).json({ error: 'QR코드 생성 중 오류가 발생했습니다' });
  }
});

// 모든 QR코드 목록 조회 (관리자용)
router.get('/all', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { is_active } = req.query;
    
    const whereClause = {};
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }
    
    const qrCodes = await QRCode.findAll({
      where: whereClause,
      order: [['classroom', 'ASC']]
    });
    
    const formattedQRCodes = qrCodes.map(qr => ({
      id: qr.id,
      classroom: qr.classroom,
      qr_token: qr.qr_token,
      qr_url: `${req.protocol}://${req.get('host')}/qr-scan?token=${qr.qr_token}&classroom=${qr.classroom}`,
      is_active: qr.is_active,
      created_at: qr.created_at
    }));
    
    return res.json({
      success: true,
      data: formattedQRCodes
    });
  } catch (error) {
    console.error('QR코드 목록 조회 오류:', error);
    return res.status(500).json({ error: 'QR코드 목록 조회 중 오류가 발생했습니다' });
  }
});

/**
 * @swagger
 * /api/v1/qr/{qrId}/toggle:
 *   put:
 *     summary: QR코드 활성화/비활성화 토글
 *     description: 관리자가 QR코드의 활성 상태를 토글합니다
 *     tags:
 *       - QR
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR코드 ID
 *     responses:
 *       200:
 *         description: QR코드 상태 토글 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "QR코드가 활성화되었습니다"
 *                 data:
 *                   $ref: '#/components/schemas/QRCode'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// QR코드 활성화/비활성화 (관리자용)
router.put('/:qrId/toggle', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { qrId } = req.params;
    
    const qrCode = await QRCode.findByPk(qrId);
    if (!qrCode) {
      return res.status(404).json({ error: 'QR코드를 찾을 수 없습니다' });
    }
    
    await qrCode.update({ is_active: !qrCode.is_active });
    
    return res.json({
      success: true,
      data: {
        id: qrCode.id,
        classroom: qrCode.classroom,
        is_active: qrCode.is_active,
        message: qrCode.is_active ? 'QR코드가 활성화되었습니다' : 'QR코드가 비활성화되었습니다'
      }
    });
  } catch (error) {
    console.error('QR코드 상태 변경 오류:', error);
    return res.status(500).json({ error: 'QR코드 상태 변경 중 오류가 발생했습니다' });
  }
});

// QR코드 삭제 (관리자용)
router.delete('/:qrId', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { qrId } = req.params;
    
    const qrCode = await QRCode.findByPk(qrId);
    if (!qrCode) {
      return res.status(404).json({ error: 'QR코드를 찾을 수 없습니다' });
    }
    
    await qrCode.destroy();
    
    return res.json({
      success: true,
      message: 'QR코드가 삭제되었습니다'
    });
  } catch (error) {
    console.error('QR코드 삭제 오류:', error);
    return res.status(500).json({ error: 'QR코드 삭제 중 오류가 발생했습니다' });
  }
});

module.exports = router;