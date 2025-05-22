const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const port = 3000;


const mediaDirectory = path.join(__dirname, 'media');

app.get('/media/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(mediaDirectory, filename);

    
    fs.access(filePath, fs.constants.R_OK, (err) => {
        if (err) {
            return res.status(404).send('File not found');
        }

        
        fs.stat(filePath, (err, stat) => {
            if (err) {
                return res.status(404).send('Could not get file metadata');
            }

            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                
                const parts = range.replace(/bytes=/, '').split('-');
                const stat = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

                if (start >= fileSize || end < 0 || start > end) {
                    res.setHeader('Content-Range', bytes );
                    return res.status(416).send('Range Not Satisfiable');
                }

                const chunksize = (end - start) + 1;
                const fileStream = fs.createReadStream(filePath, { start, end });

                const head = {
                    'Content-Range': bytes,
                    'Content-Length': chunksize,
                    'Content-Type': getContentType(filename),
                };

                res.writeHead(206, head);
                fileStream.pipe(res);
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': getContentType(filename),
                };
                res.writeHead(200, head)
                fs.createReadStream(filePath).pipe(res)
            }
        });
    });
}); 

                
function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.mp3':
            return 'audio/mpeg';
        case '.wav':
            return 'audio/wav';
        case '.ogg':
            return 'audio/ogg';
        case '.mp4':
            return 'video/mp4';
        case '.webm':
            return 'video/webm';
        
        default:
            return 'application/octet-stream'; 
    }
}

app.listen(port, () => {
    console.log('Server listening at http://localhost:${port}');
    });
