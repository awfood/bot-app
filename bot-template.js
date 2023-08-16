const fs = require('fs');
const path = require('path');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const endpoint = 'https://bot-api.awfood.com.br';
const { Client, LocalAuth } = require('whatsapp-web.js');


var { execSync } = require('child_process');
var chokidar = require('chokidar');
var id = path.basename(__dirname);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = {
    init: function() {
        const client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args:['--no-sandbox']
            }
        });

        try { fs.mkdirSync(`./messages`) } catch (e) { }

        console.log('INIT CLIENT');

        client.initialize();

        client.on('qr', (qr) => {
            // qrcode.generate(qr, { small: true })
            axios.post(`${endpoint}/chatbot/${id}/qrcode`, { data: qr })
            .then((res) => {})
            .catch((err) => {});
        })

        client.on('ready', () => {
            axios.post(`${endpoint}/chatbot/${id}/set-status`, { status: 'CONNECTED' })
            .then((res) => {})
            .catch((err) => {});

            console.log('CLIENT READY');

            var watcher = chokidar.watch('messages', {
                ignored: /(^|[\/\\])\../,
                persistent: true,
                // usePolling: false,
                awaitWriteFinish: {
                    stabilityThreshold: 2000,
                    pollInterval: 100
                }
            });

            watcher.on('ready', function(path) {
                fs.readdir('./messages', (err, files) => {
                    if (err) {
                        console.log(err);
                    } else {
                        files.forEach((file) => {
                            try {
                                let message = require(`./messages/${file}`);
                                
                                if (message.to.substr(-5) != '@c.us') {
                                    message.to = message.to += '@c.us';
                                    client.sendMessage(message.to, message.content);
                                } else {
                                    client.sendMessage(message.to, message.content);
                                }
                        
                                fs.unlinkSync(`./${path}`);
                            } catch (e) {}
                        });
                    }
                });
            })

            watcher.on('add', function(path) {
                try {
                    let message = require(`./${path}`);                    
                    if (typeof message.to != 'undefined' && typeof message.content != 'undefined') {
                        if (message.to.substr(-5) != '@c.us') {
                            message.to = message.to += '@c.us';
                            client.sendMessage(message.to, message.content);
                        } else {
                            client.sendMessage(message.to, message.content);
                        }
                    }
                    fs.unlinkSync(`./${path}`);
                } catch (e) {}
            });
        })

        client.on('authenticated', () => {
            axios.post(`${endpoint}/chatbot/${id}/set-status`, { status: 'CONNECTED' })
            .then((res) => {})
            .catch((err) => {});
        })

        client.on('change_state', state => {
            axios.post(`${endpoint}/chatbot/${id}/event`, { 
                type: 'change-state',
                description: state
             })
            .then((res) => {})
            .catch((err) => {});
        });
        
        client.on('disconnected', (reason) => {
            if (reason == 'NAVIGATION') {
                axios.post(`${endpoint}/chatbot/${id}/set-status`, { status: 'DISCONNECTED (LOGGED OUT)' })
                .then((res) => {})
                .catch((err) => {});

                axios.post(`https://wbot.xstecnologia.com.br/disconnect/${id}`)
                .then((res) => {})
                .catch((err) => {});

                // fs.rmSync('.wwebjs_auth', { recursive: true, force: true });
            } else {
                axios.post(`${endpoint}/chatbot/${id}/set-status`, { status: 'DISCONNECTED' })
                .then((res) => {})
                .catch((err) => {});

                client.initialize();
            }
        });     
        
        client.on('message_create', async (msg) => {
            if (msg.from.substr(-5) != '@g.us' && msg.fromMe == true && msg.isStatus != true) {
                let from = msg.from.split('@')[0];
                let wid = msg.from;

                let data = {};
                data.WID = wid;
                data.To = msg.to.split('@')[0];
                data.From = from;
                data.Type = msg.type;
                data.FromMe = true;

                if (wid != 'status@broadcast') {
                    if (msg.type == 'location') {
                        data.Latitude = msg.location.latitude;
                        data.Longitude = msg.location.longitude;
                        data.Body = '';
                    } else {
                        data.Body = msg.body;
                    }

                    axios.post(`${endpoint}/chatbot/${id}/webhook`, data)
                    .then((res) => {
                    }).catch((err) => {
                        return 'MANUAL MESSAGE ERROR';
                    })
                }
            }
        })

        client.on('message', async (msg) => {
            if (msg.from.substr(-5) != '@g.us' && msg.fromMe != true && msg.isStatus != true) {
                let from = msg.from.split('@')[0];
                let wid = msg.from;

                let data = {};
                data.WID = wid;
                data.To = '';
                data.From = from;
                data.Type = msg.type;

                if (wid != 'status@broadcast') {
                    if (msg.type == 'location') {
                        data.Latitude = msg.location.latitude;
                        data.Longitude = msg.location.longitude;
                        data.Body = '';
                    } else {
                        data.Body = msg.body;
                    }

                    axios.post(`${endpoint}/chatbot/${id}/webhook`, data)
                    .then(async (res) => {
                        if (res.data.message) {
                            const chat = await msg.getChat();
                            chat.sendStateTyping();

                            client.sendMessage(msg.from, res.data.message);
                        }
                    }).catch((err) => {
                        console.log('ERROR SENDING MESSAGE');
                    })
                }
            }
        })
    }
}

module.exports.init();