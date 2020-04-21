// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
// start cappin
const { desktopCapturer } = require('electron')
const videoWidth = 1280;
const videoWHeight = 720;

console.log('1');
desktopCapturer.getSources({
    types: ['window', 'screen']
}).then(async sources => {
    console.log('2');
    for (const source of sources) {
        console.log(source);
        // if (source.name === 'Electron') {
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
        // }
    }
})

function handleStream(stream) {
    console.log('handleStream');
    const video = document.querySelector('video');
    video.srcObject = stream;
    video.onloadedmetadata = (e) => video.play();
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
        console.log('stopping crcording');
        recorder.state == "recording" && recorder.stop();
        startRecording();
    });

    return Promise.all([ stopped, recorded ]).then(() => {
        blobs.push(data);
        if(blobs.length > 15){
            blobs.shift();
        }
        console.log(blobs);
    });
}

function save() {
    const webm = blobs.reduce((a, b)=> new Blob([a, b], { type: "video/webm" }));
    console.log(webm);
    var blobUrl = URL.createObjectURL(webm);
    // window.location.replace(blobUrl);

    const { BrowserWindow } = require('electron').remote;
    const saveFile = BrowserWindow.require('electron-save-file');
    saveFile(blobUrl) // should begins with 'http' or 'file://' or '/'
      .then(() => console.log('saved'))
      .catch(err => console.error(err.stack));
}

const recordButton = document.querySelector('#record');
recordButton.onclick = startRecording;

const saveButton = document.querySelector('#save');
saveButton.onclick = save;
