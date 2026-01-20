// Utilidad para generar tokens encriptados para guacamole-lite
const crypto = require('crypto');

function encryptToken(connectionConfig, encryptionKey) {
    const CIPHER = 'aes-256-cbc';
    
    const tokenObject = {
        connection: {
            type: connectionConfig.protocol,
            settings: connectionConfig.params
        }
    };
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(CIPHER, Buffer.from(encryptionKey), iv);
    
    let encrypted = cipher.update(JSON.stringify(tokenObject), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const data = {
        iv: iv.toString('base64'),
        value: encrypted
    };
    
    const json = JSON.stringify(data);
    return Buffer.from(json).toString('base64');
}

module.exports = { encryptToken };
