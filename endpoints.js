const express = require('express');
const mqttHandler = require('./mqtt_handler');
const router = express.Router();

// Obtener todas las etiquetas simuladas
router.get('/etiquetas', (req, res) => {
    try {
        const etiquetas = mqttHandler.getAllEtiquetas();
        res.json({
            success: true,
            count: etiquetas.length,
            etiquetas: etiquetas,
            mode: mqttHandler.simulateHardware ? 'simulation' : 'production'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener estadísticas del sistema
router.get('/stats', (req, res) => {
    try {
        const stats = mqttHandler.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Enviar comando de prueba a etiqueta
router.post('/test', (req, res) => {
    try {
        const { etiquetaId, price, name, promo } = req.body;
        
        mqttHandler.publishToEtiqueta(etiquetaId, {
            type: 'TEST_UPDATE',
            name: name || 'Producto de Prueba',
            price: price || 999,
            promo: promo || 'OFERTA TEST',
            action: 'UPDATE'
        }).then(result => {
            res.json(result);
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear nueva etiqueta simulada
router.post('/etiqueta', (req, res) => {
    try {
        const { id, name, price, promo } = req.body;
        
        if (!id) {
            return res.status(400).json({ success: false, error: 'Se requiere ID de etiqueta' });
        }

        mqttHandler.publishToEtiqueta(id, {
            type: 'INIT',
            name: name || 'Nueva Etiqueta',
            price: price || 0,
            promo: promo || '',
            action: 'CREATE'
        }).then(result => {
            res.json(result);
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cambiar modo (simulación/producción)
router.post('/mode', (req, res) => {
    try {
        const { mode } = req.body;
        
        if (mode !== 'simulation' && mode !== 'production') {
            return res.status(400).json({ 
                success: false, 
                error: 'Modo debe ser "simulation" o "production"' 
            });
        }

        mqttHandler.setMode(mode);
        res.json({ 
            success: true, 
            message: `Modo cambiado a ${mode}`,
            currentMode: mode
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;