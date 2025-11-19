// DOM Elemek

const player = document.querySelector("#player");
const savedName = localStorage.getItem("playerName");
const timerElement = document.querySelector("#timer");
const stopBtn = document.querySelector("#stopBtn");

// Kezdeti állapot
stopBtn.classList.add("running");

// Globális változók
window.running = true; 
window.intervalId = null;

let seconds = 0;

// Idő formázása (MM:SS)
const formatTime = (s) => {
    let m = Math.floor(s / 60);
    let sec = s % 60;
    if (m < 10) m = "0" + m;
    if (sec < 10) sec = "0" + sec;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Időzítő indítása
function startGlobalTimer() {
    window.intervalId = setInterval(() => {
        seconds++;
        timerElement.textContent = formatTime(seconds);
    }, 1000);
}

// Első indítás
startGlobalTimer();

// Játékos név beállítása
if (savedName) {
    player.textContent = savedName;
} else {
    player.textContent = "Játékos";
}

// Gomb stílus váltó
function buttonChange(isRunning){
    if (isRunning){
        stopBtn.classList.remove("running");
        stopBtn.classList.add("stopped");
    } else {
        stopBtn.classList.remove("stopped");
        stopBtn.classList.add("running");
    }
}

// Eseménykezelő
stopBtn.addEventListener("click", () => {
    if (window.running) {
        // MEGÁLLÍTÁS
        clearInterval(window.intervalId);
        stopBtn.textContent = "Folytatás";
        buttonChange(window.running);
        window.running = false;
    } else {
        buttonChange(window.running);
        window.running = true;
        startGlobalTimer();
        stopBtn.textContent = "Megállítás";
    }
});