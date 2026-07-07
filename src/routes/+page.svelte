<script>
	import { onMount, onDestroy } from 'svelte';

	/** @type {HTMLCanvasElement} */
	let canvas;
	/** @type {CanvasRenderingContext2D} */
	let ctx;

	// --- Sabitler -------------------------------------------------------
	const W = 480;
	const H = 720;
	const LANES = 4;
	const ROAD_MARGIN = 60;
	const ROAD_W = W - ROAD_MARGIN * 2;
	const LANE_W = ROAD_W / LANES;
	const PLAYER_W = LANE_W * 0.62;
	const PLAYER_H = 92;
	const ENEMY_W = LANE_W * 0.62;
	const ENEMY_H = 84;

	const CAR_COLORS = ['#c0392b', '#2e8b57', '#2f6db3', '#2b2b2b', '#d98a2b'];

	const WEATHERS = ['clear', 'rain', 'night'];
	const WEATHER_ICON = { clear: '☀️', rain: '🌧️', night: '🌙' };

	// --- Dil ---------------------------------------------------------------
	const STR = {
		tr: {
			title: 'Otobüs Oyunu',
			score: 'Skor',
			highscore: 'Rekor',
			start: 'Başla',
			menuDesc: 'Şeritler arasında geçiş yap, trafikten ve engellerden kaç, parayı topla, benzini bitirme.',
			hint: '← → veya A/D · Shift = hızlan',
			crashed: 'Çarptın!',
			outOfFuel: 'Benzin bitti!',
			restart: 'Tekrar Oyna',
			coins: 'Para',
			fuel: 'Benzin'
		},
		en: {
			title: 'Bus Game',
			score: 'Score',
			highscore: 'Best',
			start: 'Start',
			menuDesc: 'Switch lanes, dodge traffic and obstacles, collect coins, don\u2019t run out of fuel.',
			hint: '← → or A/D · Shift = boost',
			crashed: 'Crashed!',
			outOfFuel: 'Out of fuel!',
			restart: 'Play Again',
			coins: 'Coins',
			fuel: 'Fuel'
		}
	};
	let lang = 'tr';
	$: t = STR[lang];

	function toggleLang() {
		lang = lang === 'tr' ? 'en' : 'tr';
		try {
			localStorage.setItem('otobusOyunuLang', lang);
		} catch (e) {}
	}

	// --- Ses -----------------------------------------------------------
	let audioCtx = null;
	let engineOsc = null;
	let engineGain = null;
	let muted = false;

	function ensureAudio() {
		if (!audioCtx) {
			const Ctx = window.AudioContext || window.webkitAudioContext;
			audioCtx = new Ctx();
		}
		if (audioCtx.state === 'suspended') audioCtx.resume();
	}

	function startEngineSound() {
		ensureAudio();
		stopEngineSound();
		engineOsc = audioCtx.createOscillator();
		engineOsc.type = 'sawtooth';
		const filter = audioCtx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = 350;
		engineGain = audioCtx.createGain();
		engineGain.gain.value = muted ? 0 : 0.05;
		engineOsc.connect(filter);
		filter.connect(engineGain);
		engineGain.connect(audioCtx.destination);
		engineOsc.frequency.value = 60;
		engineOsc.start();
	}

	function stopEngineSound() {
		if (engineOsc) {
			try {
				engineOsc.stop();
			} catch (e) {}
			engineOsc.disconnect();
			engineOsc = null;
		}
	}

	function updateEngineSound(curSpeed) {
		if (engineOsc && audioCtx) {
			engineOsc.frequency.setTargetAtTime(50 + curSpeed * 11, audioCtx.currentTime, 0.06);
		}
	}

	function playCrash() {
		if (!audioCtx || muted) return;
		const bufferSize = Math.floor(audioCtx.sampleRate * 0.35);
		const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
		}
		const noise = audioCtx.createBufferSource();
		noise.buffer = buffer;
		const gain = audioCtx.createGain();
		gain.gain.value = 0.5;
		const filter = audioCtx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = 900;
		noise.connect(filter);
		filter.connect(gain);
		gain.connect(audioCtx.destination);
		noise.start();
	}

	function playCoin() {
		if (!audioCtx || muted) return;
		const t0 = audioCtx.currentTime;
		const osc = audioCtx.createOscillator();
		const gain = audioCtx.createGain();
		osc.type = 'square';
		osc.frequency.setValueAtTime(880, t0);
		osc.frequency.exponentialRampToValueAtTime(1760, t0 + 0.1);
		gain.gain.setValueAtTime(0.22, t0);
		gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
		osc.connect(gain);
		gain.connect(audioCtx.destination);
		osc.start(t0);
		osc.stop(t0 + 0.16);
	}

	function playThunder() {
		if (!audioCtx || muted) return;
		const bufferSize = Math.floor(audioCtx.sampleRate * 0.9);
		const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
		}
		const noise = audioCtx.createBufferSource();
		noise.buffer = buffer;
		const gain = audioCtx.createGain();
		gain.gain.value = 0.32;
		const filter = audioCtx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = 220;
		noise.connect(filter);
		filter.connect(gain);
		gain.connect(audioCtx.destination);
		noise.start();
	}

	function playFuel() {
		if (!audioCtx || muted) return;
		const t0 = audioCtx.currentTime;
		const osc = audioCtx.createOscillator();
		const gain = audioCtx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(240, t0);
		osc.frequency.linearRampToValueAtTime(420, t0 + 0.18);
		gain.gain.setValueAtTime(0.22, t0);
		gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
		osc.connect(gain);
		gain.connect(audioCtx.destination);
		osc.start(t0);
		osc.stop(t0 + 0.24);
	}

	function playOutOfFuel() {
		if (!audioCtx || muted) return;
		const t0 = audioCtx.currentTime;
		for (let i = 0; i < 3; i++) {
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.type = 'square';
			osc.frequency.value = 180 - i * 40;
			gain.gain.setValueAtTime(0.18, t0 + i * 0.12);
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.12 + 0.1);
			osc.connect(gain);
			gain.connect(audioCtx.destination);
			osc.start(t0 + i * 0.12);
			osc.stop(t0 + i * 0.12 + 0.12);
		}
	}

	function toggleMute() {
		muted = !muted;
		if (engineGain) engineGain.gain.value = muted ? 0 : 0.05;
		try {
			localStorage.setItem('otobusOyunuMuted', muted ? '1' : '0');
		} catch (e) {}
	}

	// --- Oyun durumu -----------------------------------------------------
	let player = { lane: 1, y: H - PLAYER_H - 30 };
	/** entities: {type:'car'|'barrier'|'coin', lane, y, color, spin} */
	let entities = [];
	let roadOffset = 0;
	let speed = 4.2;
	let carSpawnTimer = 0;
	let carSpawnEvery = 70;
	let barrierSpawnTimer = 0;
	let barrierSpawnEvery = 260;
	let coinSpawnTimer = 0;
	let coinSpawnEvery = 95;
	let elapsedFrames = 0;
	let boosting = false;
	let rafId;
	let lastLane = 1;
	let laneChangeT = 1;

	let score = 0;
	let highScore = 0;
	let coinsCollected = 0;
	let gameState = 'menu'; // 'menu' | 'playing' | 'over'
	let gameOverReason = 'crash'; // 'crash' | 'fuel'

	const FUEL_MAX = 100;
	let fuel = FUEL_MAX;
	let fuelSpawnTimer = 0;
	let fuelSpawnEvery = 150;
	$: fuelPct = Math.max(0, Math.min(100, (fuel / FUEL_MAX) * 100));
	$: fuelColor = fuelPct > 50 ? '#3fae5c' : fuelPct > 20 ? '#e8a33d' : '#c0392b';
	$: fuelLow = fuelPct <= 20;

	// --- Hava durumu ---------------------------------------------------
	let weather = 'clear';
	let weatherTimer = 0;
	let weatherEvery = 1100; // ~18 saniye
	let weatherTransitionT = 1;
	let raindrops = [];
	let stars = [];
	let lightningTimer = 0;
	let lightningFlash = 0;

	function initWeatherEntities() {
		raindrops = [];
		for (let i = 0; i < 70; i++) {
			raindrops.push({
				x: Math.random() * W,
				y: Math.random() * H,
				len: 10 + Math.random() * 14,
				spd: 6 + Math.random() * 6
			});
		}
		stars = [];
		for (let i = 0; i < 40; i++) {
			stars.push({
				x: Math.random() * W,
				y: Math.random() * (H * 0.45),
				r: 0.6 + Math.random() * 1.4,
				phase: Math.random() * Math.PI * 2
			});
		}
	}

	function updateWeather() {
		weatherTimer++;
		if (weatherTimer >= weatherEvery) {
			weatherTimer = 0;
			let next = weather;
			while (next === weather) next = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
			weather = next;
			weatherTransitionT = 0;
		}
		weatherTransitionT = Math.min(1, weatherTransitionT + 1 / 60);

		if (weather === 'rain') {
			for (const d of raindrops) {
				d.y += d.spd + (gameState === 'playing' ? speed * 0.25 : 0);
				d.x -= 1.2;
				if (d.y > H) {
					d.y = -20;
					d.x = Math.random() * W;
				}
				if (d.x < -10) d.x = W + 10;
			}
			lightningTimer++;
			if (lightningTimer > 200 && Math.random() < 0.012) {
				lightningTimer = 0;
				lightningFlash = 1;
				playThunder();
			}
		}
		if (lightningFlash > 0) lightningFlash = Math.max(0, lightningFlash - 0.045);
	}

	function laneToX(lane) {
		return ROAD_MARGIN + lane * LANE_W + LANE_W / 2;
	}

	function resetGame() {
		player.lane = 1;
		lastLane = 1;
		laneChangeT = 1;
		entities = [];
		roadOffset = 0;
		speed = 4.2;
		carSpawnTimer = 0;
		carSpawnEvery = 70;
		barrierSpawnTimer = 0;
		barrierSpawnEvery = 260;
		coinSpawnTimer = 0;
		coinSpawnEvery = 95;
		fuelSpawnTimer = 0;
		fuelSpawnEvery = 150;
		fuel = FUEL_MAX;
		elapsedFrames = 0;
		score = 0;
		coinsCollected = 0;
		boosting = false;
	}

	function startGame() {
		resetGame();
		gameState = 'playing';
		ensureAudio();
		startEngineSound();
	}

	function endGame(reason = 'crash') {
		gameOverReason = reason;
		gameState = 'over';
		stopEngineSound();
		if (reason === 'fuel') playOutOfFuel();
		else playCrash();
		if (score > highScore) {
			highScore = score;
			try {
				localStorage.setItem('otobusOyunuHighScore', String(Math.floor(highScore)));
			} catch (e) {}
		}
	}

	function moveLane(dir) {
		if (gameState !== 'playing') return;
		const target = player.lane + dir;
		if (target < 0 || target >= LANES) return;
		lastLane = player.lane;
		player.lane = target;
		laneChangeT = 0;
	}

	function setBoost(v) {
		boosting = v;
	}

	// --- Girdi: klavye ----------------------------------------------------
	function onKeyDown(e) {
		if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLane(-1);
		else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveLane(1);
		else if (e.key === 'Shift') setBoost(true);
		else if (e.key === ' ' || e.key === 'Enter') {
			if (gameState !== 'playing') startGame();
		}
	}
	function onKeyUp(e) {
		if (e.key === 'Shift') setBoost(false);
	}

	// --- Üretim yardımcıları ------------------------------------------------
	function laneFree(lane, minGap) {
		return !entities.some((en) => en.lane === lane && en.y < minGap);
	}

	function spawnCar() {
		const lane = Math.floor(Math.random() * LANES);
		if (!laneFree(lane, ENEMY_H * 1.6)) return;
		entities.push({
			type: 'car',
			lane,
			y: -ENEMY_H - Math.random() * 40,
			color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
		});
	}

	function spawnBarrier() {
		const lane = Math.floor(Math.random() * LANES);
		if (!laneFree(lane, ENEMY_H * 2)) return;
		entities.push({ type: 'barrier', lane, y: -60 });
	}

	function spawnCoin() {
		const lane = Math.floor(Math.random() * LANES);
		if (!laneFree(lane, ENEMY_H * 0.9)) return;
		entities.push({ type: 'coin', lane, y: -30, spin: Math.random() * Math.PI * 2 });
	}

	function spawnFuel() {
		const lane = Math.floor(Math.random() * LANES);
		if (!laneFree(lane, ENEMY_H * 1.2)) return;
		entities.push({ type: 'fuel', lane, y: -40 });
	}

	// --- Çizim yardımcıları -------------------------------------------------
	function drawScenery() {
		const sky = ctx.createLinearGradient(0, 0, 0, H);
		sky.addColorStop(0, '#bfe9ef');
		sky.addColorStop(1, '#eef6e9');
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, W, H);

		ctx.fillStyle = '#e7ddc2';
		ctx.fillRect(0, 0, ROAD_MARGIN, H);
		ctx.fillRect(W - ROAD_MARGIN, 0, ROAD_MARGIN, H);

		ctx.fillStyle = '#8a4b34';
		for (let i = 0; i < 3; i++) {
			const bx = 6 + i * 18;
			ctx.fillRect(bx, 40, 14, 90);
		}
		ctx.fillStyle = '#5f8f6b';
		for (let i = 0; i < 6; i++) {
			const ty = ((i * 140 + roadOffset * 0.4) % (H + 80)) - 40;
			ctx.beginPath();
			ctx.arc(W - ROAD_MARGIN / 2, ty, 16, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillRect(W - ROAD_MARGIN / 2 - 3, ty, 6, 22);
		}
	}

	function drawWeatherBack() {
		if (weather === 'night') {
			ctx.fillStyle = `rgba(8,14,30,${0.55 * weatherTransitionT})`;
			ctx.fillRect(0, 0, W, H);
			for (const s of stars) {
				const tw = 0.5 + 0.5 * Math.sin(elapsedFrames * 0.05 + s.phase);
				ctx.fillStyle = `rgba(255,255,255,${tw * weatherTransitionT})`;
				ctx.beginPath();
				ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
				ctx.fill();
			}
		} else if (weather === 'rain') {
			ctx.fillStyle = `rgba(40,55,70,${0.28 * weatherTransitionT})`;
			ctx.fillRect(0, 0, W, H);
		}
	}

	function drawWeatherFront(px, py) {
		if (weather === 'rain') {
			ctx.strokeStyle = `rgba(210,230,255,${0.55 * weatherTransitionT})`;
			ctx.lineWidth = 2;
			for (const d of raindrops) {
				ctx.beginPath();
				ctx.moveTo(d.x, d.y);
				ctx.lineTo(d.x - 5, d.y + d.len);
				ctx.stroke();
			}
		} else if (weather === 'night') {
			const grad = ctx.createRadialGradient(px, py - 40, 10, px, py - 40, 220);
			grad.addColorStop(0, `rgba(255,240,180,${0.35 * weatherTransitionT})`);
			grad.addColorStop(1, 'rgba(255,240,180,0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.ellipse(px, py - 120, 140, 260, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		if (lightningFlash > 0) {
			ctx.fillStyle = `rgba(255,255,255,${lightningFlash * 0.8})`;
			ctx.fillRect(0, 0, W, H);
		}
	}

	function drawRoad() {
		ctx.fillStyle = '#33403f';
		ctx.fillRect(ROAD_MARGIN, 0, ROAD_W, H);

		ctx.strokeStyle = 'rgba(255,255,255,0.75)';
		ctx.lineWidth = 4;
		ctx.setLineDash([26, 22]);
		for (let l = 1; l < LANES; l++) {
			const x = ROAD_MARGIN + l * LANE_W;
			ctx.beginPath();
			ctx.moveTo(x, (roadOffset % 48) - 48);
			ctx.lineTo(x, H);
			ctx.stroke();
		}
		ctx.setLineDash([]);

		const stripe = 22;
		for (let side = 0; side < 2; side++) {
			const bx = side === 0 ? ROAD_MARGIN - 10 : W - ROAD_MARGIN;
			for (let y = -stripe; y < H + stripe; y += stripe) {
				const yy = ((y + roadOffset) % (stripe * 2)) - stripe;
				ctx.fillStyle = Math.floor((y + roadOffset) / stripe) % 2 === 0 ? '#c0392b' : '#f4f4f4';
				ctx.fillRect(bx, yy, 10, stripe);
			}
		}
	}

	function roundRect(x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	}

	function drawCar(cx, cy, w, h, color, isPlayer) {
		ctx.save();
		ctx.translate(cx, cy);
		ctx.fillStyle = 'rgba(0,0,0,0.18)';
		ctx.beginPath();
		ctx.ellipse(0, h / 2 + 4, w / 2, 8, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = color;
		roundRect(-w / 2, -h / 2, w, h, 10);
		ctx.fill();

		ctx.fillStyle = 'rgba(210,235,240,0.9)';
		roundRect(-w / 2 + 6, -h / 2 + (isPlayer ? 10 : 8), w - 12, h * (isPlayer ? 0.32 : 0.38), 6);
		ctx.fill();

		if (isPlayer) {
			ctx.fillStyle = '#7a3d10';
			roundRect(-w / 2 + 4, h / 2 - 20, w - 8, 12, 4);
			ctx.fill();
		}

		ctx.fillStyle = '#141414';
		const wheelW = 6;
		const wheelH = 16;
		ctx.fillRect(-w / 2 - 2, -h / 2 + 8, wheelW, wheelH);
		ctx.fillRect(-w / 2 - 2, h / 2 - 8 - wheelH, wheelW, wheelH);
		ctx.fillRect(w / 2 - wheelW + 2, -h / 2 + 8, wheelW, wheelH);
		ctx.fillRect(w / 2 - wheelW + 2, h / 2 - 8 - wheelH, wheelW, wheelH);

		ctx.restore();
	}

	function drawBarrier(cx, cy) {
		const w = ENEMY_W * 0.8;
		const h = 66;
		ctx.save();
		ctx.translate(cx, cy);
		ctx.fillStyle = 'rgba(0,0,0,0.18)';
		ctx.beginPath();
		ctx.ellipse(0, h / 2 + 4, w / 2, 8, 0, 0, Math.PI * 2);
		ctx.fill();

		// koni gövdesi
		ctx.fillStyle = '#e8792b';
		ctx.beginPath();
		ctx.moveTo(0, -h / 2);
		ctx.lineTo(w / 2, h / 2);
		ctx.lineTo(-w / 2, h / 2);
		ctx.closePath();
		ctx.fill();

		// beyaz şeritler
		ctx.fillStyle = '#f4f4f4';
		ctx.beginPath();
		ctx.moveTo(-w * 0.28, h * 0.08);
		ctx.lineTo(w * 0.28, h * 0.08);
		ctx.lineTo(w * 0.36, h * 0.32);
		ctx.lineTo(-w * 0.36, h * 0.32);
		ctx.closePath();
		ctx.fill();

		// taban
		ctx.fillStyle = '#c1451b';
		roundRect(-w / 2 - 4, h / 2 - 6, w + 8, 12, 3);
		ctx.fill();

		ctx.restore();
	}

	function drawCoin(cx, cy, spin) {
		const r = 17;
		const squish = Math.abs(Math.cos(spin));
		ctx.save();
		ctx.translate(cx, cy);
		ctx.fillStyle = 'rgba(0,0,0,0.15)';
		ctx.beginPath();
		ctx.ellipse(0, r * 0.7, r * 0.8, 6, 0, 0, Math.PI * 2);
		ctx.fill();

		const grad = ctx.createLinearGradient(-r, -r, r, r);
		grad.addColorStop(0, '#fff3c4');
		grad.addColorStop(1, '#e8a33d');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.ellipse(0, 0, r * squish + 3, r, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = '#a5680f';
		ctx.lineWidth = 2;
		ctx.stroke();

		ctx.fillStyle = '#a5680f';
		ctx.font = 'bold 16px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('₺', 0, 1);
		ctx.restore();
	}

	function drawFuelCan(cx, cy) {
		const w = 30;
		const h = 38;
		ctx.save();
		ctx.translate(cx, cy);
		ctx.fillStyle = 'rgba(0,0,0,0.18)';
		ctx.beginPath();
		ctx.ellipse(0, h / 2 + 4, w / 2, 7, 0, 0, Math.PI * 2);
		ctx.fill();

		// bidon gövdesi
		ctx.fillStyle = '#c0392b';
		roundRect(-w / 2, -h / 2 + 6, w, h - 6, 5);
		ctx.fill();

		// sarı etiket şeridi
		ctx.fillStyle = '#f2c14e';
		ctx.fillRect(-w / 2 + 4, -h / 2 + 16, w - 8, 10);
		ctx.fillStyle = '#8a2a1a';
		ctx.font = 'bold 8px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('⛽', 0, 21 - h / 2);

		// tutamak
		ctx.strokeStyle = '#8a2a1a';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(-w / 2 + 6, -h / 2 + 6);
		ctx.lineTo(-w / 2 + 6, -h / 2 - 6);
		ctx.lineTo(w / 2 - 6, -h / 2 - 6);
		ctx.lineTo(w / 2 - 6, -h / 2 + 6);
		ctx.stroke();

		// ağızlık
		ctx.fillStyle = '#8a2a1a';
		ctx.fillRect(-4, -h / 2 - 2, 8, 6);

		ctx.restore();
	}

	// --- Ana döngü -----------------------------------------------------
	function update() {
		updateWeather();

		if (gameState === 'playing') {
			elapsedFrames++;
			const curSpeed = speed + (boosting ? 3.2 : 0);
			roadOffset += curSpeed;
			score += curSpeed * 0.045 * (boosting ? 1.4 : 1);
			updateEngineSound(curSpeed);

			fuel -= 0.062 + (boosting ? 0.05 : 0);
			if (fuel <= 0) {
				fuel = 0;
				endGame('fuel');
			}

			speed = 4.2 + elapsedFrames / 900;
			carSpawnEvery = Math.max(26, 70 - elapsedFrames / 60);

			carSpawnTimer++;
			if (carSpawnTimer >= carSpawnEvery) {
				carSpawnTimer = 0;
				spawnCar();
			}
			barrierSpawnTimer++;
			if (barrierSpawnTimer >= barrierSpawnEvery) {
				barrierSpawnTimer = 0;
				spawnBarrier();
			}
			coinSpawnTimer++;
			if (coinSpawnTimer >= coinSpawnEvery) {
				coinSpawnTimer = 0;
				spawnCoin();
			}
			fuelSpawnTimer++;
			if (fuelSpawnTimer >= fuelSpawnEvery) {
				fuelSpawnTimer = 0;
				spawnFuel();
			}

			laneChangeT = Math.min(1, laneChangeT + 0.22);

			for (const en of entities) {
				en.y += curSpeed * 1.05;
				if (en.type === 'coin') en.spin += 0.15;
			}
			entities = entities.filter((en) => en.y < H + ENEMY_H && !en.collected);

			const px = laneToX(player.lane);
			const py = player.y;
			for (const en of entities) {
				if (gameState !== 'playing') break;
				const ex = laneToX(en.lane);
				const ey = en.y;
				const isPickup = en.type === 'coin' || en.type === 'fuel';
				const hitW = isPickup ? ENEMY_W * 0.55 : ENEMY_W;
				const hitH = isPickup ? ENEMY_H * 0.55 : ENEMY_H;
				const overlapX = Math.abs(px - ex) < (PLAYER_W + hitW) / 2 - (isPickup ? 2 : 8);
				const overlapY = Math.abs(py - ey) < (PLAYER_H + hitH) / 2 - (isPickup ? 2 : 10);
				if (overlapX && overlapY) {
					if (en.type === 'coin') {
						en.collected = true;
						coinsCollected++;
						score += 25;
						playCoin();
					} else if (en.type === 'fuel') {
						en.collected = true;
						fuel = Math.min(FUEL_MAX, fuel + 35);
						playFuel();
					} else {
						endGame('crash');
						break;
					}
				}
			}
		}

		draw();
		rafId = requestAnimationFrame(update);
	}

	function draw() {
		drawScenery();
		drawWeatherBack();
		drawRoad();

		for (const en of entities) {
			const x = laneToX(en.lane);
			if (en.type === 'car') drawCar(x, en.y, ENEMY_W, ENEMY_H, en.color, false);
			else if (en.type === 'barrier') drawBarrier(x, en.y);
			else if (en.type === 'coin') drawCoin(x, en.y, en.spin);
			else if (en.type === 'fuel') drawFuelCan(x, en.y);
		}

		const fromX = laneToX(lastLane);
		const toX = laneToX(player.lane);
		const px = fromX + (toX - fromX) * easeOut(laneChangeT);
		drawCar(px, player.y, PLAYER_W, PLAYER_H, '#e8a33d', true);

		drawWeatherFront(px, player.y);
	}

	function easeOut(t) {
		return 1 - Math.pow(1 - t, 3);
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		initWeatherEntities();
		try {
			highScore = Number(localStorage.getItem('otobusOyunuHighScore') || 0);
			const savedLang = localStorage.getItem('otobusOyunuLang');
			if (savedLang === 'tr' || savedLang === 'en') lang = savedLang;
			muted = localStorage.getItem('otobusOyunuMuted') === '1';
		} catch (e) {}
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		rafId = requestAnimationFrame(update);
	});

	onDestroy(() => {
		if (rafId) cancelAnimationFrame(rafId);
		stopEngineSound();
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
		}
	});
</script>

<svelte:head>
	<title>{t.title}</title>
</svelte:head>

<div class="page">
	<header class="topbar">
		<h1>🚌 {t.title}</h1>
		<div class="hdr-right">
			<div class="scores">
				<span>{t.score}: {Math.floor(score)}</span>
				<span>{t.highscore}: {Math.floor(highScore)}</span>
				<span>🪙 {coinsCollected}</span>
				<span>{WEATHER_ICON[weather]}</span>
			</div>
			<div class="hdr-buttons">
				<button class="mini-btn" on:click={toggleMute} aria-label="Ses">
					{muted ? '🔇' : '🔊'}
				</button>
				<button class="mini-btn lang" on:click={toggleLang} aria-label="Dil">
					{lang === 'tr' ? 'TR' : 'EN'}
				</button>
			</div>
		</div>
	</header>

	<div class="fuelbar-wrap" class:low={fuelLow && gameState === 'playing'}>
		<span class="fuel-label">⛽ {t.fuel}</span>
		<div class="fuelbar">
			<div class="fuelbar-fill" style="width:{fuelPct}%; background:{fuelColor}"></div>
		</div>
	</div>

	<div class="stage">
		<canvas bind:this={canvas} width={W} height={H}></canvas>

		{#if gameState === 'menu'}
			<div class="overlay">
				<h2>{t.title}</h2>
				<p>{t.menuDesc}</p>
				<button on:click={startGame}>{t.start}</button>
				<p class="hint">{t.hint}</p>
			</div>
		{:else if gameState === 'over'}
			<div class="overlay">
				<h2>{gameOverReason === 'fuel' ? t.outOfFuel : t.crashed}</h2>
				<p>{t.score}: {Math.floor(score)}</p>
				<p>{t.highscore}: {Math.floor(highScore)}</p>
				<p>🪙 {t.coins}: {coinsCollected}</p>
				<button on:click={startGame}>{t.restart}</button>
			</div>
		{/if}
	</div>

	<div class="controls">
		<button class="ctrl left" on:pointerdown={() => moveLane(-1)} aria-label="Sola geç">◀</button>
		<button
			class="ctrl boost"
			on:pointerdown={() => setBoost(true)}
			on:pointerup={() => setBoost(false)}
			on:pointerleave={() => setBoost(false)}
			aria-label="Hızlan"
		>⚡</button>
		<button class="ctrl right" on:pointerdown={() => moveLane(1)} aria-label="Sağa geç">▶</button>
	</div>
</div>

<style>
	:global(html, body) {
		margin: 0;
		height: 100%;
		background: #0e3b39;
		font-family: 'Segoe UI', system-ui, sans-serif;
		overscroll-behavior: none;
	}
	.page {
		min-height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 14px 10px 24px;
		color: #f3ecd9;
		box-sizing: border-box;
	}
	.topbar {
		width: 100%;
		max-width: 480px;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 6px;
	}
	.topbar h1 {
		font-size: 1.15rem;
		margin: 0;
	}
	.hdr-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}
	.scores {
		display: flex;
		gap: 10px;
		font-size: 0.82rem;
		opacity: 0.9;
		flex-wrap: wrap;
		justify-content: flex-end;
	}
	.hdr-buttons {
		display: flex;
		gap: 6px;
	}
	.mini-btn {
		background: #16504d;
		color: #f3ecd9;
		border: none;
		border-radius: 8px;
		padding: 4px 10px;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.mini-btn.lang {
		font-weight: 700;
		letter-spacing: 0.5px;
	}
	.fuelbar-wrap {
		width: 100%;
		max-width: 480px;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.fuel-label {
		font-size: 0.78rem;
		white-space: nowrap;
		opacity: 0.9;
	}
	.fuelbar {
		flex: 1;
		height: 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.15);
		overflow: hidden;
	}
	.fuelbar-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.2s linear, background 0.3s linear;
	}
	.fuelbar-wrap.low .fuel-label {
		animation: blinkWarn 0.8s infinite;
	}
	@keyframes blinkWarn {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}
	.stage {
		position: relative;
		width: 100%;
		max-width: 480px;
		aspect-ratio: 480 / 720;
		border-radius: 14px;
		overflow: hidden;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
		touch-action: none;
	}
	canvas {
		width: 100%;
		height: 100%;
		display: block;
	}
	.overlay {
		position: absolute;
		inset: 0;
		background: rgba(14, 30, 29, 0.72);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		text-align: center;
		padding: 20px;
	}
	.overlay h2 {
		margin: 0 0 4px;
	}
	.overlay p {
		margin: 0;
		font-size: 0.95rem;
	}
	.overlay button {
		margin-top: 8px;
		background: #e8a33d;
		color: #1a1a1a;
		border: none;
		padding: 10px 26px;
		font-size: 1rem;
		font-weight: 700;
		border-radius: 999px;
		cursor: pointer;
	}
	.hint {
		font-size: 0.8rem;
		opacity: 0.75;
		margin-top: 6px !important;
	}
	.controls {
		width: 100%;
		max-width: 480px;
		display: flex;
		gap: 10px;
		margin-top: 4px;
	}
	.ctrl {
		flex: 1;
		padding: 16px 0;
		font-size: 1.3rem;
		border-radius: 12px;
		border: none;
		background: #16504d;
		color: #f3ecd9;
		touch-action: manipulation;
		user-select: none;
	}
	.ctrl.boost {
		background: #c1451b;
		flex: 0.8;
	}

	@media (min-width: 640px) {
		.stage,
		.controls,
		.topbar {
			max-width: 420px;
		}
	}
	@media (min-height: 900px) and (min-width: 640px) {
		.stage,
		.controls,
		.topbar {
			max-width: 460px;
		}
	}
</style>
