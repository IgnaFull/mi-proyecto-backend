const express = require('express');
const router = express.Router();

// Ruta básica de API
router.get('/', (req, res) => {
  res.json({ 
    message: '✅ API routes funcionando correctamente',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// Exportar el router CORRECTAMENTE
module.exports = router;