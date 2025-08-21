const mqtt = require('mqtt');

class MQTTHandler {
    constructor() {
        this.client = null;
        this.etiquetasSimuladas = new Map();
        this.connectionStatus = 'disconnected';
        this.simulateHardware = true; // Cambiar a false cuando tengas hardware real
        
        this.init();
    }

    init() {
        if (this.simulateHardware) {
            console.log('🔄 Iniciando modo SIMULACIÓN - Sin hardware requerido');
            this.simularEtiquetas();
            this.simularConexionBroker();
        } else {
            console.log('🔌 Iniciando modo PRODUCCIÓN - Conectando a broker real');
            this.connectToRealBroker();
        }
    }

    simularConexionBroker() {
        // Simular conexión exitosa después de 2 segundos
        setTimeout(() => {
            this.connectionStatus = 'connected';
            console.log('✅ [SIM] Conectado al broker MQTT simulado');
            this.simularComportamientoEtiquetas();
        }, 2000);
    }

    connectToRealBroker() {
        // Conexión real a broker MQTT (para producción)
        try {
            this.client = mqtt.connect('mqtt://test.mosquitto.org', {
                clientId: 'etag_prod_' + Math.random().toString(16).substr(2, 8),
                reconnectPeriod: 5000
            });

            this.client.on('connect', () => {
                this.connectionStatus = 'connected';
                console.log('✅ Conectado al Broker MQTT real');
            });

            this.client.on('error', (error) => {
                console.error('❌ Error MQTT:', error);
                this.connectionStatus = 'error';
            });

            this.client.on('offline', () => {
                this.connectionStatus = 'offline';
                console.log('⚠️ Broker MQTT offline');
            });

        } catch (error) {
            console.error('❌ Error al conectar con broker real:', error);
            // Fallback a simulación si la conexión real falla
            this.simulateHardware = true;
            this.simularConexionBroker();
        }
    }

    simularEtiquetas() {
        // Crear etiquetas de ejemplo más realistas
        const etiquetasEjemplo = [
            { 
                id: 'etiq_001', 
                name: 'LECHE 1L', 
                price: 1300, 
                promo: '10% hoy',
                battery: 85,
                lastSeen: new Date(),
                status: 'online'
            },
            { 
                id: 'etiq_002', 
                name: 'PAN BLANCO', 
                price: 800, 
                promo: '',
                battery: 92,
                lastSeen: new Date(),
                status: 'online'
            },
            { 
                id: 'etiq_003', 
                name: 'AZUCAR 1KG', 
                price: 600, 
                promo: '2x1',
                battery: 78,
                lastSeen: new Date(),
                status: 'online'
            },
            { 
                id: 'etiq_004', 
                name: 'ACEITE GIRASOL', 
                price: 2500, 
                promo: '3x2',
                battery: 45, // Batería baja para probar alerts
                lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas offline
                status: 'low_battery'
            }
        ];

        etiquetasEjemplo.forEach(etiq => {
            this.etiquetasSimuladas.set(etiq.id, etiq);
        });

        console.log(`📋 [SIM] ${etiquetasEjemplo.length} etiquetas simuladas creadas`);
    }

    simularComportamientoEtiquetas() {
        if (!this.simulateHardware) return;

        // Simular updates periódicos de estado (cada 30 segundos)
        setInterval(() => {
            this.etiquetasSimuladas.forEach((etiq, id) => {
                // Simular consumo de batería
                const newBattery = Math.max(0, etiq.battery - (Math.random() * 2));
                
                // Actualizar estado
                this.etiquetasSimuladas.set(id, {
                    ...etiq,
                    battery: newBattery,
                    lastSeen: new Date(),
                    status: newBattery < 20 ? 'low_battery' : 'online'
                });

                // Publicar update de estado (solo si estamos en modo real)
                if (this.client && this.connectionStatus === 'connected') {
                    this.client.publish(`etiquetas/${id}/status`, JSON.stringify({
                        battery: newBattery,
                        status: newBattery < 20 ? 'low_battery' : 'online',
                        lastSeen: new Date().toISOString(),
                        simulated: true
                    }));
                }
            });
        }, 30000);

        console.log('🔄 [SIM] Comportamiento de etiquetas simulado iniciado');
    }

    async publishToEtiqueta(etiquetaId, message) {
        // Validar conexión
        if (this.connectionStatus !== 'connected') {
            console.warn('⚠️ [SIM] Broker no conectado, simulando envío');
            return this.simularEnvio(etiquetaId, message);
        }

        // Verificar si la etiqueta existe
        if (!this.etiquetasSimuladas.has(etiquetaId) && this.simulateHardware) {
            console.log(`🆕 [SIM] Creando nueva etiqueta simulada: ${etiquetaId}`);
            this.etiquetasSimuladas.set(etiquetaId, {
                id: etiquetaId,
                name: message.name || 'Nuevo Producto',
                price: message.price || 0,
                promo: message.promo || '',
                battery: 100,
                lastSeen: new Date(),
                status: 'online'
            });
        }

        const topic = `etiquetas/${etiquetaId}/update`;
        const payload = JSON.stringify({
            ...message,
            timestamp: new Date().toISOString(),
            simulated: this.simulateHardware
        });

        try {
            if (this.simulateHardware) {
                // Modo simulación - no enviar realmente, solo log
                console.log(`📤 [SIM] Publicando a ${topic}:`, payload);
                this.simularRecepcion(etiquetaId, message);
                
            } else {
                // Modo producción - enviar realmente
                this.client.publish(topic, payload, { qos: 1 }, (err) => {
                    if (err) {
                        console.error('❌ Error publicando mensaje real:', err);
                    } else {
                        console.log(`✅ Publicado a ${topic}`, payload);
                    }
                });
            }

            return { success: true, etiquetaId, simulated: this.simulateHardware };

        } catch (error) {
            console.error('❌ Error en publishToEtiqueta:', error);
            return { success: false, error: error.message };
        }
    }

    simularEnvio(etiquetaId, message) {
        // Simular el proceso de envío con delay
        console.log(`⏳ [SIM] Simulando envío a ${etiquetaId}...`);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                this.simularRecepcion(etiquetaId, message);
                resolve({ success: true, simulated: true, etiquetaId });
            }, 500 + Math.random() * 1000); // Delay aleatorio entre 0.5-1.5s
        });
    }

    simularRecepcion(etiquetaId, message) {
        // Simular la recepción en la etiqueta
        const etiqueta = this.etiquetasSimuladas.get(etiquetaId) || {
            id: etiquetaId,
            battery: 100,
            lastSeen: new Date(),
            status: 'online'
        };

        // Actualizar datos de la etiqueta
        if (message.name) etiqueta.name = message.name;
        if (message.price) etiqueta.price = message.price;
        if (message.promo !== undefined) etiqueta.promo = message.promo;
        
        etiqueta.lastSeen = new Date();
        etiqueta.lastUpdate = new Date();

        this.etiquetasSimuladas.set(etiquetaId, etiqueta);

        console.log(`✅ [SIM] Etiqueta ${etiquetaId} actualizada:`, {
            name: etiqueta.name,
            price: etiqueta.price,
            promo: etiqueta.promo
        });
    }

    // === MÉTODOS PARA EL FRONTEND ===

    getEtiquetaStatus(etiquetaId) {
        const etiqueta = this.etiquetasSimuladas.get(etiquetaId);
        if (!etiqueta) return null;

        return {
            ...etiqueta,
            online: etiqueta.status === 'online',
            batteryLevel: etiqueta.battery,
            lastSeen: etiqueta.lastSeen,
            simulated: true
        };
    }

    getAllEtiquetas() {
        return Array.from(this.etiquetasSimuladas.values()).map(etiq => ({
            id: etiq.id,
            name: etiq.name,
            price: etiq.price,
            promo: etiq.promo,
            battery: etiq.battery,
            status: etiq.status,
            lastSeen: etiq.lastSeen,
            online: etiq.status === 'online',
            simulated: true
        }));
    }

    getStats() {
        const etiquetas = this.getAllEtiquetas();
        return {
            total: etiquetas.length,
            online: etiquetas.filter(e => e.online).length,
            offline: etiquetas.filter(e => !e.online).length,
            lowBattery: etiquetas.filter(e => e.battery < 20).length,
            connectionStatus: this.connectionStatus,
            mode: this.simulateHardware ? 'simulation' : 'production'
        };
    }

    // Para cambiar entre modo simulación y producción
    setMode(mode) {
        this.simulateHardware = mode === 'simulation';
        console.log(`🔧 Modo cambiado a: ${this.simulateHardware ? 'SIMULACIÓN' : 'PRODUCCIÓN'}`);
        
        if (!this.simulateHardware && !this.client) {
            this.connectToRealBroker();
        }
    }
}

module.exports = new MQTTHandler();