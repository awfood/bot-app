const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');

const express = require('express')
const cors = require('cors')
const app = express()
const port = 54000;

const axios = require('axios');
const bodyParser = require('body-parser');

var { exec, execSync } = require('child_process');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
    origin: '*'
}));

app.get('/disconnect/:id', (req, res) => {
    try { fs.unlinkSync(`./sessions/${req.params.id}`, { recursive: true, force: true }) } catch (e) { }
    try { fs.rmSync(`./bots/${req.params.id}`, { recursive: true, force: true }) } catch (e) { }
    try { execSync(`pm2 delete ${req.params.id}`) } catch (e) { }

    res.send('DISCONNECTED');
})

app.get('/init/:id', (req, res) => {
    var id = req.params.id;

    try { fs.mkdirSync(`./bots`) } catch (e) {}
    try { fs.writeFileSync(`./sessions/${id}`, '') } catch (e) {}

    fsExtra.copy('./bot-template', `./bots/${id}`, { overwrite: true }, err => {
        exec(`pm2 start /root/app/bots/${id}/bot.js -n ${id}`, { cwd: `/root/app/bots/${id}` }, (err) => {
            if (err) {
                console.log('BOT ALREADY STARTED (RESTARTING)')
                execSync(`pm2 restart ${id}`, { cwd : `/root/app/bots/${id}` })
            }
            res.send('');
        });
    })
});

app.get('/status/:id', (req, res) => {
    var id = req.params.id;

    if (fs.existsSync(`./bots/${id}/bot.js`)) {
        if (fs.existsSync(`./bots/${id}/.wwebjs_auth/session`)) {
            res.send('CONNECTED');
        } else {
            res.send('DISCONNECTED');
        }
    } else {
        res.send('DISCONNECTED');
    }
});

app.post('/send-message/:id', (req, res) => {
    console.log('SEND MESSAGE');
    
    try { fs.mkdirSync(`./bots/${req.params.id}/messages`) } catch (e) {}
    fs.writeFileSync(`./bots/${req.params.id}/messages/${new Date().getTime()}.json`, JSON.stringify({ to: req.body.to, content: req.body.message }))

    res.send('');
});

try { fs.mkdirSync(`./sessions`) } catch (e) {}

fs.readdir('./sessions', (err, files) => {
    if (err) {
        console.log(err);
    } else {
        files.forEach((file) => {
            let id = file;

            if (fs.existsSync(`./bots/${id}/bot.js`)) {
                fs.readFile(`./bots/${id}/bot.js`, 'utf8' , (err, data) => {
                    if (err) {
                        exec(`pm2 start /root/app/bots/${id}/bot.js -n ${id}`, { cwd: `/root/app/bots/${id}` }, (err) => {
                            if (err) {
                                console.log('BOT ALREADY STARTED (RESTARTING)')
                                execSync(`pm2 restart ${id}`, { cwd : `/root/app/bots/${id}` })
                            }
                        });
                    } else {
                        fs.writeFile(`./bots/${id}/bot.js`, data, err => {
                            if (err) {
                                console.log(`ERROR UPDATING ${id} BOT SCRIPT`);
                            } else {
                                console.log(`UPDATED ${id} BOT SCRIPT`);
                            }
                            exec(`pm2 start /root/app/bots/${id}/bot.js -n ${id}`, { cwd: `/root/app/bots/${id}` }, (err) => {
                                if (err) {
                                    console.log('BOT ALREADY STARTED (RESTARTING)')
                                    execSync(`pm2 restart ${id}`, { cwd : `/root/app/bots/${id}` })
                                }
                            });
                        });
                    }
                })
            } else {
                try { fs.mkdirSync(`./bots`) } catch (e) {}
                // try { fs.mkdirSync(`./bots/${id}`) } catch (e) {}

                fsExtra.copy('./bot-template', `./bots/${id}`, { overwrite: true }, err => {
                    exec(`pm2 start /root/app/bots/${id}/bot.js -n ${id}`, { cwd: `/root/app/bots/${id}` }, (err) => {
                        if (err) {
                            console.log('BOT ALREADY STARTED (RESTARTING)')
                            execSync(`pm2 restart ${id}`, { cwd : `/root/app/bots/${id}` })
                        }
                        res.send('');
                    });
                })
        
                // fs.copyFile('bot-template.js', `./bots/${id}/bot.js`, (success) => {
                //     fs.copyFile('bot-package.json', `./bots/${id}/package.json`, (success) => {
                //         exec('npm install', {
                //             cwd: `./bots/${id}`
                //         }, (error, stdout, stderr) => {
                //             console.log('NPM INSTALLED');
                //             exec(`pm2 start /root/app/bots/${id}/bot.js -n ${id}`, { cwd: `/root/app/bots/${id}` }, (err) => {
                //                 if (err) {
                //                     console.log('BOT ALREADY STARTED (RESTARTING)')
                //                     execSync(`pm2 restart ${id}`, { cwd : `/root/app/bots/${id}` })
                //                 }
                //             });
                //         });
                //     });
                // })
            }
        })
    }
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})