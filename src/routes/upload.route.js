const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment');
const https = require('https');
const axios = require('axios');

const log = require('../services/logger.service');
const router = new express.Router();
const upload = multer({dest: 'uploads/'});
const httpsAgent = new https.Agent({
    cert: fs.readFileSync('cristian.zuniga.crt'),
    key: fs.readFileSync('cristian.zuniga.key')
});

router.post('/:environment', upload.single('file'), (req, res) => {
    const environment = req.params.environment;
    const results = [];
    const grouped = {};
    const errors = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            let url;

            for (const row of results) {
                const {frequency, start_date} = row;
                const group_id = Number(row.group_id);
                const store_id = Number(row.store_id);
                let country;

                switch (environment) {
                    case 'production':
                        country = `-${row.country.toLowerCase()}` === '-co' ? '' : `-${row.country.toLowerCase()}`;
                        url = `https://cns-stores-ms{country}.security.rappi.com:4443/api/cns-stores-ms/auto-check-in-code`;
                        break;
                    case 'development':
                        country = 'development';
                        url = 'http://internal-microservices.dev.rappi.com/api/cns-stores-ms/auto-check-in-code';
                        break;
                    case 'localhost':
                        country = 'localhost';
                        url = 'http://localhost:8080/api/cns-stores-ms/auto-check-in-code';
                        break;
                    default:
                        res.status(400).json({error: 'Invalid environment'});
                        return;
                }

                if (!grouped[group_id]) {
                    grouped[group_id] = {
                        group_id,
                        country,
                        store_ids: [],
                        frequency,
                        start_date: moment(start_date, 'DD/MM/YYYY').format('YYYY-MM-DD'),
                    };
                }

                if (!grouped[group_id].store_ids.includes(store_id)) {
                    grouped[group_id].store_ids.push(store_id);
                }
            }

            const stores = Object.values(grouped);

            for (const store of stores) {
                try {
                    await axios.post(url.replace('{country}', store.country), store, {httpsAgent});
                    log.info(`Stores ${store.store_ids} successfully created`)
                } catch (error) {
                    log.error(error.message)
                    log.error(`Error creating stores ${store.store_ids}`);
                    errors.push(store);
                }
            }

            if (errors.length > 0) {
                res.status(400).json(errors);
            } else {
                res.send().status(200);
            }
        });
});

router.delete('/delete', upload.single('file'), (req, res) => {
    const environment = 'production';
    const results = [];
    const grouped = {};
    const errors = [];
    const deletedGroupIds = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            let url;

            for (const row of results) {
                const {frequency, start_date} = row;
                const group_id = Number(row.group_id);
                const store_id = Number(row.store_id);
                let country;

                switch (environment) {
                    case 'production':
                        country = `-${row.country.toLowerCase()}` === '-co' ? '' : `-${row.country.toLowerCase()}`;
                        url = `https://cns-stores-ms{country}.security.rappi.com:4443/api/cns-stores-ms/auto-check-in-code/group-id/`;
                        break;
                    case 'development':
                        country = 'development';
                        url = 'http://internal-microservices.dev.rappi.com/api/cns-stores-ms/auto-check-in-code';
                        break;
                    case 'localhost':
                        country = 'localhost';
                        url = 'http://localhost:8080/api/cns-stores-ms/auto-check-in-code';
                        break;
                    default:
                        res.status(400).json({error: 'Invalid environment'});
                        return;
                }

                if (!grouped[group_id]) {
                    grouped[group_id] = {
                        group_id,
                        country,
                        store_ids: [],
                        frequency,
                        start_date: moment(start_date, 'DD/MM/YYYY').format('YYYY-MM-DD'),
                    };
                }

                if (!grouped[group_id].store_ids.includes(store_id)) {
                    grouped[group_id].store_ids.push(store_id);
                }
            }

            const stores = Object.values(grouped);

            for (const store of stores) {
                try {
                    if (!deletedGroupIds.includes(store.group_id)) {
                        await axios.delete(url.replace('{country}', store.country) + store.group_id, {httpsAgent});
                        deletedGroupIds.push(store.group_id);
                        log.info(`Deleted group id ${store.group_id} for country ${store.country}`)
                    }
                } catch (error) {
                    errors.push(store);
                }
            }

            if (errors.length > 0) {
                res.status(400).json(errors);
            } else {
                res.send().status(200);
            }
        });
});

module.exports = router;
