import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';

const app = express();
const log = console.log;

const __dirname = dirname(fileURLToPath(import.meta.url));

// Establece la ruta de ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// Middleware para analizar datos del formulario
app.use(express.urlencoded({ extended: true }));

// Directorio estático para archivos públicos y assets
app.use(express.static("public"));
app.use("/assets", express.static("assets"));

app.post('/convertir', async (req, res) => {
    try {
        const nombreCancion = req.body.nombre;
        const videoUrl = req.body.url;
        // rutas de los archivos temporales y de salida
        const tempVideoPath = join(__dirname, 'tempVideo.mp4');
        const outputPath = join(__dirname, 'public', 'downloads', `${nombreCancion}.mp3`);
        
        // Asegurar que la carpeta de descarga exista
        const carpetaDescargas = join(__dirname, 'public', 'downloads');
        if (!fs.existsSync(carpetaDescargas)) {
            fs.mkdirSync(carpetaDescargas, { recursive: true });
        }
        // Función asincrónica para descargar y convertir el audio
        const descargarYConvertir = async () => {
            ytdl(videoUrl, { quality: 'highestaudio' })
                .pipe(fs.createWriteStream(tempVideoPath))
                .on('finish', () => {
                    log('Video descargado, comenzando la extracción de audio...');
                    // Extraer el audio con ffmpeg
                    ffmpeg(tempVideoPath)
                        .audioBitrate(128)
                        .format('mp3')
                        .on('end', () => {
                            log('Extracción de audio completada.');
                            fs.unlinkSync(tempVideoPath);
                            // Envía una respuesta al cliente si es necesario
                            log('Conversión completada correctamente.');
                            res.write('<script>window.history.back();</script>');
                            res.end();
                            //res.status(200).json({ mensaje: 'Conversión completada correctamente' });
                        }) 
                        .on('error', (err) => {
                            console.error('Error:', err);
                            // Eliminar archivo temporal en caso de error
                            fs.unlinkSync(tempVideoPath);
                            res.status(500).json({ error: 'Hubo un error en la extracción de audio' });
                        })
                        .save(outputPath);
                });
        };
        await descargarYConvertir();
    } catch (error) {
        console.error('Error en la ruta /convertir:', error);
        res.status(500).json({ error: 'Hubo un error en la conversión del video' });
    }
});

app.listen(3000, () => {
    console.log('Servidor iniciado en el puerto 3000.')
});