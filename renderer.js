// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
// start cappin
const fs = require('fs');
const { desktopCapturer } = require('electron')
const videoWidth = 1280;
const videoWHeight = 720;

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
                            minHeight: videoWHeight,
                            maxHeight: videoWHeight
                        }
                    }
                })
                handleStream(stream)
            } catch (e) {
                handleError(e)
            }
            console.log('return');
            return
    }
})

function handleStream(stream) {
    console.log('handleStream');
    // const video = document.querySelector('video');
    // video.srcObject = stream;
    // video.onloadedmetadata = (e) => video.play();
    videoStream = stream;
}

function handleError(e) {
    console.log('handleError');
    console.log(e)
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
    console.log(recorder.state + " for " + (lengthInMS / 1000) + " seconds...");

    let stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (event) => {
            reject(event.name);
        };
    });

    let recorded = wait(lengthInMS).then(() => {
        console.log('stopping recording');
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
        console.log(blobs);
    });
}

function saveBase64Array(base64Array){
    const fileStream = fs.createWriteStream(tmpDir + "/" + Date.now() + ".webm", { flags: 'a' });
    // base64Array.forEach((base64Data, i) => {
    //     const dataBuffer = new Buffer(base64Data, 'base64');
    //     fileStream.write(dataBuffer);
    // });

    const dataBuffer = new Buffer(base64Array.join(''), 'base64');
    fileStream.write(dataBuffer);

    // var reader = new FileReader()
    // reader.onload = function(){
    //     var buffer = new Buffer(reader.result);
    //     console.log('6666666666666666666result', reader.result);
    //     fs.writeFile(tmpDir + "/" + Date.now() + ".webm", buffer, {}, (err, res) => {
    //         if(err){
    //             console.error(err)
    //             return
    //         }
    //         console.log('video saved')
    //     });
    // }
    // reader.readAsArrayBuffer(blob)
}

function getBase64(blob, index){
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            const dataUrl = reader.result;
            const base64EncodedData = dataUrl.split(',')[1];
            resolve(base64EncodedData);
        });
        reader.readAsDataURL(blob);
    });
}

let save = async function () {
    const blobsCopy = [...blobs];
    // const webm = blobsCopy.reduce((a, b)=> new Blob([a, b], { type: "video/webm" }));
    // saveBlob(webm, 0);
    let promises = [];
    blobsCopy.forEach((webm, index) => {
        console.log("=================", webm);
        // var blobUrl = URL.createObjectURL(webm);
        // window.open(blobUrl);
        promises.push(getBase64(webm, index));
    });
    var base64Array = await Promise.all(promises);
    saveBase64Array(base64Array);


    // const { BrowserWindow } = require('electron').remote;
    // const saveFile = BrowserWindow.require('electron-save-file');
    // saveFile(blobUrl) // should begins with 'http' or 'file://' or '/'
    //   .then(() => console.log('saved'))
    //   .catch(err => console.error(err.stack));
}

const recordButton = document.querySelector('#record');
recordButton.onclick = startRecording;

const saveButton = document.querySelector('#save');
saveButton.onclick = save;
