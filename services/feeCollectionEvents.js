// Real-time fee collection updates using Server-Sent Events
const EventEmitter = require('events');

class FeeCollectionEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.clients = new Set();
    }

    addClient(res) {
        this.clients.add(res);
        console.log(`📡 SSE client connected. Total clients: ${this.clients.size}`);
        
        // Remove client when connection closes
        res.on('close', () => {
            this.clients.delete(res);
            console.log(`📡 SSE client disconnected. Total clients: ${this.clients.size}`);
        });
    }

    broadcast(event, data) {
        console.log(`📡 Broadcasting ${event} to ${this.clients.size} clients`);
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        
        // Send to all connected clients
        this.clients.forEach(client => {
            try {
                client.write(message);
            } catch (error) {
                console.error('Error sending SSE message:', error);
                this.clients.delete(client);
            }
        });
    }

    notifyPaymentUpdate(paymentData) {
        this.broadcast('payment-update', {
            timestamp: new Date().toISOString(),
            userId: paymentData.userId,
            month: paymentData.month,
            quarter: paymentData.quarter,
            isQuarterly: paymentData.isQuarterly,
            year: paymentData.year,
            message: 'Payment status updated - fee collection data may have changed'
        });
    }

    notifyFeeCollectionRefresh() {
        this.broadcast('fee-collection-refresh', {
            timestamp: new Date().toISOString(),
            message: 'Fee collection data has been updated'
        });
    }
}

// Create a global instance
const feeCollectionEvents = new FeeCollectionEventEmitter();

module.exports = feeCollectionEvents;