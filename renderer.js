// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
// start cappin
const fs = require('fs');
const { desktopCapturer } = require('electron');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

console.log(ffmpegPath);

const videoWidth = 1280;
const videoHeight = 720;

const tmpDir = ".tmp";
if (!fs.existsSync(tmpDir)){
    fs.mkdirSync(tmpDir);
}

desktopCapturer.getSources({
    types: ['window', 'screen']
}).then(async sources => {
    for (const source of sources) {
        console.log(source);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: source.id,
                            minWidth: videoWidth,
                            maxWidth: videoWidth,
                            minHeight: videoHeight,
                            maxHeight: videoHeight,
                        }
                    }
                })
                handleStream(stream)
            } catch (e) {
                handleError(e)
            }
            return
    }
})

function handleStream(stream) {
    console.log('handle')
    const video = document.querySelector('video');
    video.srcObject = stream;
    video.onloadedmetadata = (e) => video.play();
    videoStream = stream;
}

function handleError(e) {
    console.log(e, e.stack)
    console.trace();
}

function wait(delayInMS) {
    return new Promise(resolve => setTimeout(resolve, delayInMS));
}

let blobs = [];

function startRecording() {
    let lengthInMS = 1000;
    let recorder = new MediaRecorder(videoStream, { mimeType: "video/webm" });
    let data = [];

    recorder.ondataavailable = event => data.push(event.data);
    recorder.start();
    // console.log(recorder.state + " for " + (lengthInMS / 1000) + " seconds...");

    let stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (event) => {
            reject(event.name);
        };
    });

    let recorded = wait(lengthInMS).then(() => {
        if(recorder.state == "recording"){
            recorder.stop()
            startRecording();
        }
    });

    return Promise.all([ stopped, recorded ]).then(() => {
        blobs.push(data[0]);
        if(blobs.length > 15){
            blobs.shift();
        }
    });
}

function saveBlob(timestamp, blob, index){
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = function(){
            let buffer = new Buffer(reader.result);
            let filename = tmpDir + "/" + timestamp + "_" + index + ".webm";
            fs.writeFile(filename, buffer, {}, (err, res) => {
                if(err){
                    console.error(err);
                    reject(err);
                } else {
                    console.log('video saved');
                    resolve(filename);
                }
            });
        }
        reader.readAsArrayBuffer(blob);
    });
}

let save = async function () {
    const blobsCopy = [...blobs];
    let timestamp = Date.now();
    let outputName = tmpDir + "/" + timestamp + ".webm";
    let promises = [];
    blobsCopy.forEach((webm, index) => {
        console.log("=================", webm);
        promises.push(saveBlob(timestamp, webm, index));
    });
    var filenames = await Promise.all(promises);

    let cmdStart;
    filenames.forEach((filename, i) => {
        if(i === 0){
            cmdStart = ffmpeg(filename);
        } else {
            cmdStart.input(filename);
        }
    });
    cmdStart.on('error', function(err) {
        console.log('An error occurred: ' + err.message);
    }).on('progress', function(a,b,c) {
        console.log('Progress', a, b, c);
    }).on('end', function() {
        console.log('Merging finished!');
    }).mergeToFile(outputName, tmpDir);
}

const recordButton = document.querySelector('#record');
recordButton.onclick = startRecording;

const saveButton = document.querySelector('#save');
saveButton.onclick = save;
