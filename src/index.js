const fs = require('fs')
const tts = require('google-tts-api');
const https = require('https')
const ffmpeg = require('fluent-ffmpeg')

const cleanTmpDir = () => {
    fs.rmSync('./assets/tmp', { recursive: true, force: true })
    fs.mkdirSync('./assets/tmp')
}

const makeRoteiro = () => {
    const fileName = './roteiro.txt'
    const roteiro = fs.readFileSync(fileName)
    return roteiro.toString()
}

const makeAudio = async (roteiro = '') => {
    const path = './assets/tmp'

    const audios = tts.getAllAudioUrls(roteiro, {
      lang: 'pt-BR',
      slow: false,
      host: 'https://translate.google.com',
    });

    const files = []
    for (const audio of audios) {
        const filePath = `${path}/audio${files.length}.mp3`
        const file = fs.createWriteStream(filePath);
        const response = await httpGet(audio.url)
        response.pipe(file)
        files.push(filePath)
    }
    const pathFinal = './assets/tmp/final_audio.mp3'
    await joinMp3Files(pathFinal, files)
    return pathFinal
}

const httpGet = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (response, error) => {
            if (error) reject(error)
            resolve(response);
        });
    })
}

const joinMp3Files = (outputFile, inputFiles) => {
    const command = ffmpeg();
  
    // Loop through each input file
    inputFiles.forEach((file) => {
      // Add input file to the ffmpeg command
      command.input(file);
    });

    return new Promise((resolve, reject) => {
        // Concatenate the input files
        command.concat(outputFile, { end: true })
            .on('end', () => {
                resolve()
            })
            .on('error', (err) => {
                reject(err)
            })
    })
  }

  function getMp3Length(mp3FilePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(mp3FilePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
  
        const durationInSeconds = metadata.format.duration;
        resolve(durationInSeconds);
      });
    });
  }


  function cutVideo(inputFilePath, outputFilePath, startSeconds, durationSeconds) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputFilePath)
        .setStartTime(startSeconds)
        .setDuration(durationSeconds)
        .output(outputFilePath)
        .on('end', () => {
          console.log('Video cutting complete');
          resolve();
        })
        .on('error', (err) => {
          console.log('Error during video cutting:', err);
          reject(err);
        })
        .on('progress', (progress) => {
          const percent = Math.round(progress.percent);
          console.log(`Processing: ${percent}%`);
        });
  
      command.run();
    });
  }
  
const main = async () => {
    cleanTmpDir()
    const roteiro = makeRoteiro()
    const audioPath = await makeAudio(roteiro)
    const length = await getMp3Length(audioPath)
    await cutVideo('./assets/default/parkour.mp4', './assets/tmp/parkour.mp4', 0, length)
}

main()