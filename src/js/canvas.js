// DOM Elemek
const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;

const linePar = document.querySelector("#linePar");
const statusBar = document.querySelector("#statusBar");
const drawnCard = document.querySelector("#drawnCard");
const drawCardBtn = document.querySelector("#drawCard");
// A timerDisplay és stopBtn itt már nem kell, a game.js kezeli őket

// Változók
let rect;
let mainCellWidth, mainCellHeight, stationSize;
const mainRows = 10;
const mainCols = 10;

let stations = [];
let lines_data = [];
let gridPoints = [];

// Játék állapot
let currentRound = 0;
let drawnLines = [];
let visitedStations = { M1: new Set(), M2: new Set(), M3: new Set(), M4: new Set() };
let currentLine = null;
let options = ["M1", "M2", "M3", "M4"];
let colors = {};

let drawnCards = 0;
let cards = [];
let currentCardValue = null;

// Interakció
let lineFirst = null;
let highlightedPoint = null;

// Pontozás
let roundScores = {};
let connectedTrains = [];
let trainScoreIndex = -1;
const trainPoints = [0, 1, 2, 4, 6, 8, 11, 14, 17, 21, 25];


// Betöltés és Setup

async function loadData() {
    try {
        const stResp = await fetch("../JSON/stations.json");
        stations = await stResp.json();
        
        const lnResp = await fetch("../JSON/lines.json");
        lines_data = await lnResp.json();
        
        for (const line of lines_data) {
            colors[line.name] = line.color;
        }
        
        initTrainTrack();
        updateCanvasSize();
        shuffle(options);
        roundSystem();
        
    } catch (err) {
        console.error("Hiba a betöltésnél:", err);
        statusBar.textContent = "Hiba: JSON fájlok nem találhatók!";
    }
}

// Vasúti sáv HTML generálása
function initTrainTrack() {
    const trackContainer = document.querySelector("#trainTrack");
    if(!trackContainer) return;
    
    trackContainer.innerHTML = "";
    trainPoints.forEach((val, idx) => {
        const step = document.createElement("div");
        step.className = "track-step";
        step.innerHTML = `
            <div class="track-box" id="train-box-${idx}"></div>
            <div class="track-val">${val}</div>
        `;
        trackContainer.appendChild(step);
    });
    updateTrainScoreUI();
}

window.addEventListener("resize", updateCanvasSize);

function updateCanvasSize() {
    const cell = document.querySelector("#canvas-cell");
    if (!cell || !canvas) return;
    const cellRect = cell.getBoundingClientRect();
    const size = Math.min(cellRect.width, cellRect.height) * 0.95;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    setupCanvas();
    redrawAll();
}

function setupCanvas() {
    rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    mainCellWidth = width / mainCols;
    mainCellHeight = height / mainRows;
    stationSize = Math.min(mainCellWidth, mainCellHeight) * 0.25;
}


// Segédfüggvények

function shuffle(array) {
    let currentIndex = array.length;
    while (currentIndex !== 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
}

function getGridPoints() {
    gridPoints = [];
    for (let x = 0; x < 10; x++) {
        gridPoints[x] = [];
        for (let y = 0; y < 10; y++) {
            gridPoints[x].push({
                px: x * mainCellWidth + mainCellWidth / 2,
                py: y * mainCellHeight + mainCellHeight / 2,
                x: x, y: y
            });
        }
    }
}


// Rajzolás

function isStartingStation(station) {
    const startingLine = lines_data.find(l => l.start == station.id);
    return startingLine ? colors[startingLine.name] : "white";
}

function drawStation(station) {
    if (!gridPoints[station.x]) return;
    let pt = gridPoints[station.x][station.y];
    ctx.lineWidth = 2; ctx.strokeStyle = "black"; ctx.fillStyle = isStartingStation(station);
    switch (station.type) {
        case "A": ctx.beginPath(); ctx.arc(pt.px, pt.py, stationSize, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); break;
        case "B": ctx.beginPath(); ctx.rect(pt.px - stationSize, pt.py - stationSize, stationSize * 2, stationSize * 2); ctx.fill(); ctx.stroke(); break;
        case "C": ctx.save(); ctx.translate(pt.px, pt.py); ctx.rotate(45 * Math.PI / 180); ctx.beginPath(); ctx.rect(-stationSize, -stationSize, stationSize * 2, stationSize * 2); ctx.fill(); ctx.stroke(); ctx.restore(); break;
        case "D": ctx.beginPath(); ctx.moveTo(pt.px, pt.py - stationSize * 1.2); ctx.lineTo(pt.px + stationSize, pt.py + stationSize * 0.8); ctx.lineTo(pt.px - stationSize, pt.py + stationSize * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
        case "?": drawStar(pt.px, pt.py, stationSize * 1.2, 5); break;
    }
}

function drawStar(cx, cy, radius, spikes) {
    let rot = Math.PI / 2 * 3; let step = Math.PI / spikes;
    ctx.beginPath(); ctx.moveTo(cx, cy - radius);
    for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * radius; let y = cy + Math.sin(rot) * radius; ctx.lineTo(x, y); rot += step;
        x = cx + Math.cos(rot) * (radius / 2.5); y = cy + Math.sin(rot) * (radius / 2.5); ctx.lineTo(x, y); rot += step;
    }
    ctx.closePath(); ctx.lineWidth = 2; ctx.strokeStyle = "black"; ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();
}

function drawSavedLine(ln) {
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); ctx.strokeStyle = "black"; ctx.lineWidth = 8; ctx.moveTo(ln.from.px, ln.from.py); ctx.lineTo(ln.to.px, ln.to.py); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = colors[ln.line] || "gray"; ctx.lineWidth = 4; ctx.moveTo(ln.from.px, ln.from.py); ctx.lineTo(ln.to.px, ln.to.py); ctx.stroke();
}

function drawTrainConnection(station) {
    if (station.train) {
        const pt = gridPoints[station.x][station.y];
        ctx.beginPath(); ctx.fillStyle = "black"; ctx.arc(pt.px, pt.py, stationSize / 4, 0, 2 * Math.PI); ctx.fill();
    }
}

function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    getGridPoints();
    drawnLines.forEach(drawSavedLine);
    if (stations) stations.forEach(drawStation);
    if (stations) stations.forEach(drawTrainConnection);
    if (highlightedPoint) {
        ctx.beginPath(); ctx.strokeStyle = colors[currentLine] || "red"; ctx.lineWidth = 3;
        ctx.arc(highlightedPoint.px, highlightedPoint.py, stationSize * 1.5, 0, Math.PI * 2); ctx.stroke();
    }
}


// Játék Logika

function findNearestGridPoint(mouseX, mouseY) {
    let best = null; let bestDist = Infinity;
    for (const st of stations) {
        const gp = gridPoints[st.x][st.y];
        const dx = mouseX - gp.px; const dy = mouseY - gp.py; const dist = dx * dx + dy * dy;
        if (dist < (stationSize * 3) ** 2) {
            if (dist < bestDist) { bestDist = dist; best = { ...st, px: gp.px, py: gp.py }; }
        }
    }
    return best;
}

function isLineEndpoint(station) {
    const lineSegments = drawnLines.filter(l => l.line === currentLine);
    if (lineSegments.length === 0) {
        const key = `${station.x},${station.y}`;
        return visitedStations[currentLine].has(key);
    }
    let connectionCount = 0;
    for (const seg of lineSegments) {
        if ((seg.from.x === station.x && seg.from.y === station.y) || (seg.to.x === station.x && seg.to.y === station.y)) connectionCount++;
    }
    return connectionCount === 1;
}

function validateMove(from, to, cardValue) {
    if (from.x === to.x && from.y === to.y) return { valid: false, msg: "Ugyanaz az állomás." };
    const dx = Math.abs(to.x - from.x); const dy = Math.abs(to.y - from.y);
    if (!((dx === 0 && dy > 0) || (dy === 0 && dx > 0) || (dx === dy))) return { valid: false, msg: "Csak vízszintesen, függőlegesen vagy 45°-ban." };
    
    const stepX = (to.x - from.x) === 0 ? 0 : (to.x - from.x) / dx;
    const stepY = (to.y - from.y) === 0 ? 0 : (to.y - from.y) / dy;
    let checkX = from.x + stepX; let checkY = from.y + stepY;
    while (checkX !== to.x || checkY !== to.y) {
        if (stations.find(s => s.x === checkX && s.y === checkY)) return { valid: false, msg: "Nem haladhatsz át állomáson!" };
        checkX += stepX; checkY += stepY;
    }

    let cardType = cardValue.startsWith("J") ? "JOKER" : cardValue[0];
    if (cardType !== "JOKER" && to.type !== "?" && to.type !== cardType) {
        return { valid: false, msg: `A kártya (${cardValue[5]}) nem illik ide.` };
    }
    if (visitedStations[currentLine].has(`${to.x},${to.y}`)) return { valid: false, msg: "Hurok tilos!" };
    const existsParallel = drawnLines.some(ln =>
        (ln.from.x === from.x && ln.from.y === from.y && ln.to.x === to.x && ln.to.y === to.y) ||
        (ln.from.x === to.x && ln.from.y === to.y && ln.to.x === from.x && ln.to.y === from.y));
    if (existsParallel) return { valid: false, msg: "Már létezik ez a szakasz." };

    for (const ln of drawnLines) {
        if (segmentsIntersect(from, to, ln.from, ln.to)) return { valid: false, msg: "Keresztezés tilos!" };
    }
    return { valid: true, msg: "OK" };
}

function segmentsIntersect(a, b, c, d) {
    function ccw(p1, p2, p3) { return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x); }
    if ((a.x === c.x && a.y === c.y) || (a.x === d.x && a.y === d.y) || (b.x === c.x && b.y === c.y) || (b.x === d.x && b.y === d.y)) return false;
    return (ccw(a, c, d) !== ccw(b, c, d)) && (ccw(a, b, c) !== ccw(a, b, d));
}

function addSegment(from, to) {
    drawnLines.push({ line: currentLine, from: { ...from }, to: { ...to } });
    visitedStations[currentLine].add(`${to.x},${to.y}`);
    updateTrainScore(to);
}


// Pontozás

function updateTrainScore(newStation) {
    if (newStation.train) {
        connectedTrains.push(newStation.id);
        trainScoreIndex = Math.min(trainScoreIndex + 1, trainPoints.length - 1);
        updateTrainScoreUI();
    }
}

function updateTrainScoreUI() {
    for (let i = 0; i < trainPoints.length; i++) {
        const box = document.querySelector(`#train-box-${i}`);
        if (box) {
            if (i <= trainScoreIndex) box.style.backgroundColor = "#4CAF50";
            else box.style.backgroundColor = "white";
            
            if (i === trainScoreIndex) box.style.border = "2px solid yellow";
            else box.style.border = "none";
        }
    }
}

function calculateRoundStats(line) {
    const segments = drawnLines.filter(l => l.line === line);
    const visitedCoords = Array.from(visitedStations[line]);
    const lineStations = [];
    visitedCoords.forEach(coord => {
        const [cx, cy] = coord.split(",").map(Number);
        const st = stations.find(s => s.x === cx && s.y === cy);
        if (st) lineStations.push(st);
    });

    const districts = new Set(lineStations.map(s => s.district));
    const PK = districts.size;

    const stationCountsPerDistrict = {};
    lineStations.forEach(s => {
        stationCountsPerDistrict[s.district] = (stationCountsPerDistrict[s.district] || 0) + 1;
    });
    const PM = lineStations.length > 0 ? Math.max(0, ...Object.values(stationCountsPerDistrict)) : 0;

    let PD = 0;
    segments.forEach(seg => {
        const s1 = stations.find(s => s.x === seg.from.x && s.y === seg.from.y);
        const s2 = stations.find(s => s.x === seg.to.x && s.y === seg.to.y);
        if (s1 && s2 && s1.side !== s2.side) PD++;
    });

    const FP = (PK * PM) + PD;

    const lineId = line.toLowerCase();
    const pkBox = document.querySelector(`#${lineId}-pk`);
    const pmBox = document.querySelector(`#${lineId}-pm`);
    const pdBox = document.querySelector(`#${lineId}-pd`);
    const fpBox = document.querySelector(`#${lineId}-fp`);

    if(pkBox) pkBox.textContent = PK;
    if(pmBox) pmBox.textContent = PM;
    if(pdBox) pdBox.textContent = PD;
    if(fpBox) fpBox.textContent = FP;

    return FP;
}

function calculateFinalScore() {
    let P2 = 0, P3 = 0, P4 = 0;
    stations.forEach(s => {
        let linesTouching = 0;
        const key = `${s.x},${s.y}`;
        for (const ln of options) {
            if (visitedStations[ln].has(key)) linesTouching++;
        }
        if (linesTouching === 2) P2++;
        if (linesTouching === 3) P3++;
        if (linesTouching === 4) P4++;
    });

    // Bónuszok részletezése
    document.querySelector('#p2-count').textContent = P2;
    document.querySelector('#p2-score').textContent = P2 * 2;
    document.querySelector('#p3-count').textContent = P3;
    document.querySelector('#p3-score').textContent = P3 * 5;
    document.querySelector('#p4-count').textContent = P4;
    document.querySelector('#p4-score').textContent = P4 * 9;

    // Vonalak összege
    let sumFP = 0;
    Object.values(roundScores).forEach(score => sumFP += score);
    
    // Vasút pontszám
    const trainPointsTotal = trainScoreIndex >= 0 ? trainPoints[trainScoreIndex] : 0;
    
    // Bónusz pontszám
    const bonusTotal = (P2 * 2) + (P3 * 5) + (P4 * 9);

    document.querySelector('#sum-lines-box').textContent = sumFP;

    document.querySelector('#calc-lines').textContent = sumFP;
    document.querySelector('#calc-trains').textContent = trainPointsTotal;
    document.querySelector('#calc-bonus').textContent = bonusTotal;

    const totalScore = sumFP + trainPointsTotal + bonusTotal;
    document.querySelector('#finalTotal').textContent = totalScore;
}


// Eseménykezelők

canvas.addEventListener("click", (event) => {
    if (currentRound === "ENDED" || !currentCardValue || !window.running) {
        if(!window.running && currentRound !== "ENDED") {
            statusBar.textContent = "A játék szünetel. Nyomj a Folytatásra!";
        }
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const clickedStation = findNearestGridPoint(event.clientX - rect.left, event.clientY - rect.top);
    if (!clickedStation) return;

    if (!lineFirst) {
        if (isLineEndpoint(clickedStation)) {
            lineFirst = clickedStation; highlightedPoint = clickedStation; redrawAll();
            statusBar.textContent = "Válassz célállomást!";
        } else {
            statusBar.textContent = "Csak a végpontról folytathatod!";
        }
        return;
    }
    if (lineFirst.x === clickedStation.x && lineFirst.y === clickedStation.y) {
        lineFirst = null; highlightedPoint = null; redrawAll(); 
        statusBar.textContent = "Kijelölés visszavonva.";
        return;
    }
    const check = validateMove(lineFirst, clickedStation, currentCardValue);
    if (!check.valid) {
        statusBar.textContent = check.msg;
        showInvalidLine(lineFirst, clickedStation);
        lineFirst = null; highlightedPoint = null;
        return;
    }
    addSegment(lineFirst, clickedStation);
    statusBar.textContent = "Szakasz OK. Húzz új kártyát.";
    lineFirst = null; highlightedPoint = null; currentCardValue = null;
    drawnCard.textContent = "-";
    redrawAll();
});

function showInvalidLine(from, to) {
    ctx.save(); ctx.strokeStyle = "red"; ctx.lineWidth = 4; ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(from.px, from.py); ctx.lineTo(to.px, to.py); ctx.stroke(); ctx.restore();
    setTimeout(redrawAll, 800);
}

drawCardBtn.addEventListener("click", () => {
    if (currentRound === "ENDED" || currentRound === 0 || !window.running) {
         if(!window.running && currentRound !== "ENDED") {
            statusBar.textContent = "A játék szünetel. Nyomj a Folytatásra!";
        }
        return;
    }

    if (drawnCards >= 8) {
        const fp = calculateRoundStats(currentLine);
        roundScores[currentLine] = fp;
        endRound();
        return;
    }
    let card = cards[drawnCards];
    currentCardValue = card; drawnCard.textContent = card[5]; drawnCards++;
    lineFirst = null; highlightedPoint = null; redrawAll();
    statusBar.textContent = `Kártya: ${card[5]}. Rajzolj!`;
});

function endRound() {
    currentCardValue = null; drawnCard.textContent = "Kör vége!"; drawnCards = 0;
    roundSystem();
}

function roundSystem() {
    if (currentRound >= options.length) {
        currentRound = "ENDED";
        
        clearInterval(window.intervalId);
        window.running = false;
        document.querySelector("#stopBtn").classList.remove("running");
        document.querySelector("#stopBtn").classList.add("stopped");
        document.querySelector("#stopBtn").textContent = "Vége";
        document.querySelector("#stopBtn").disabled = true;

        calculateFinalScore(); 
        linePar.textContent = "JÁTÉK VÉGE";
        statusBar.textContent = "Gratulálok!";
        drawCardBtn.disabled = true;

        setTimeout(() => {
            window.location.href = "../../index.html";
        }, 10000);

        return;
    }
    currentLine = options[currentRound];
    cards = ["A SZ ○", "B SZ □", "C SZ ◇", "D SZ △", "J SZ ☆", "A K  ○", "B K  □", "C K  ◇", "D K  △", "J K  ☆"];
    shuffle(cards);
    drawnCard.textContent = "Húzz!";
    statusBar.textContent = `${currentLine} vonal következik.`;
    updateLinePar();
    initStartStation();
    currentRound++;
}

function initStartStation() {
    const lineInfo = lines_data.find(l => l.name === currentLine);
    if (lineInfo && lineInfo.start) {
        const startSt = stations.find(s => s.id === lineInfo.start);
        if (startSt) {
            visitedStations[currentLine].add(`${startSt.x},${startSt.y}`);
            updateTrainScore(startSt);
        }
    }
}

function updateLinePar() {
    linePar.innerHTML = options.map(line => {
        return line === currentLine 
            ? `<span style="color: ${colors[line]}; font-weight: bold; border-bottom: 3px solid ${colors[line]}">${line}</span>` 
            : `<span style="color: #ccc">${line}</span>`;
    }).join(" → ");
}

loadData();