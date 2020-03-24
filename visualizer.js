let canvas = undefined;
let ctx = undefined;
let particles = new Array;
let UNINFECTED = 0;
let INFECTED = 1;
let RECOVERED = 2;
let DECEASED = 3;
let states = ["uninfected", "infected", "recovered", "deceased"];
let infectionRadius = 25.0;
let minimalDistance = 35.0;
let population = 1500;
let maxSickCycles = 2000;
let maxX = .125;
let maxY = .125;
let damping = .75;
let friction = .85;
let gui = undefined;

function limit (value, threshold)
{
	if (Math.abs (value) > Math.abs (threshold)) {
		return Math.sign(value)*threshold;
	} else {
		return value;
	}
}

function Particle (position, velocity, acceleration, state)
{
	this.x = position[0];
	this.y = position[1];
	this.vx = velocity[0];
	this.vy = velocity[1];
	this.ax = acceleration[0];
	this.ay = acceleration[1];
	this.state = state
	this.color = "white";
	this.sickCycles = 0;
	this.radius = 1.0;
}

Particle.prototype.update = function() {
	// health state
	if (this.state == states[UNINFECTED]) {
		this.color = "white";
	} else if (this.state == states[INFECTED]) {
		this.color = "red";
	} else if (this.state == states[RECOVERED]) {
		this.color = "green";
	} else if (this.state == states[DECEASED]) {
		this.color = "black";
	}

	// movement
	if (this.x < 0) {
		this.x = 0;
		this.ax = -this.ax;
		this.vx = -this.vx;
	}
	if (this.x > canvas.width) {
		this.x = canvas.width;
		this.ax = -this.ax;
		this.vx = -this.vx;
	}

	if (this.y < 0) {
		this.y = 0;
		this.ay = -this.ay;
		this.vy = -this.vy;
	}
	if (this.y > canvas.height) {
		this.y = canvas.height;
		this.ay = -this.ay;
		this.vy = -this.vy;
	}

	this.ax *= damping;
	this.ay *= damping;
	this.vx += this.ax;
	this.vy += this.ay;
	this.vx = limit (this.vx, maxX);
	this.vy = limit (this.vy, maxY);
	this.x += this.vx;
	this.y += this.vy;
	this.ax = .0;
	this.ay = .0;
};

Particle.prototype.draw = function() {
	ctx.fillStyle = this.color;
	ctx.beginPath ();
	ctx.arc (this.x, this.y, this.radius, 0, Math.PI * 2, true);
	ctx.fill ();
	ctx.closePath();
};

function random (min, max)
{
	return Math.random () * (max - min) + min;
}

function dist (position1, position2)
{
	let xDelta = position1.x - position2.x;
	let yDelta = position1.y - position2.y;
	return Math.sqrt (xDelta*xDelta + yDelta*yDelta);
}

function simulationStep ()
{
	// infection step
	for (let i = 0; i <= particles.length - 1; ++i) {
		for (let j = 0; j <= particles.length - 1; ++j) {
			if (i != j) {
				let d = dist (particles[i], particles[j]);
				if (d <= infectionRadius) {
					if (particles[i].state == states[INFECTED] &&
						particles[j].state == states[UNINFECTED] ) {
						particles[j].state = states[INFECTED];
						++stats.infectedAbsolute;
						--stats.uninfectedAbsolute;
					} else if (particles[j].state == states[INFECTED] &&
						       particles[i].state == states[UNINFECTED] ) {
						particles[i].state = states[INFECTED];
						++stats.infectedAbsolute;
						--stats.uninfectedAbsolute;
					}
				}
			}
		}
	}

	// death/recovery check
	for (let i = 0; i <= particles.length - 1; ++i) {
		if (particles[i].state == states[INFECTED]) {
			++particles[i].sickCycles;
			let mortalityRate = .005;
			let recoveryRate = .01;
			let chance = 100.0*random (0.0, 1.0);
			if (chance <= mortalityRate) {
				particles[i].state = states[DECEASED];
				++stats.deceasedAbsolute;
			} else if (chance > mortalityRate &&
					   chance <= recoveryRate) {
				particles[i].state = states[RECOVERED];
				++stats.recoveredAbsolute;
			} else if (particles[i].sickCycles > maxSickCycles) {
				particles[i].state = states[DECEASED];
				++stats.deceasedAbsolute;
			} else {
				// particle stays sick
			}
		}
	}
}


function reset ()
{
	particles = [];
	let position = [.0, .0];
	let velocity = [.0, .0];
	let acceleration = [.0, .0];
	for (let count = 0; count < population; ++count) {
		position = [random (0.0, canvas.width), random(0.0, canvas.height)];
		acceleration = [random (-.25, .25), random(-.25, .25)];
		let i = Math.floor (random(0.0, 3.9));
		particles.push (new Particle (position,
									  velocity,
									  acceleration,
									  states[UNINFECTED]));
	}
}

let Statistics = function() {
	this.socialDistancing = false;
	this.uninfectedAbsolute = population;
	this.infectedAbsolute = .0;
	this.deceasedAbsolute = .0;
	this.recoveredAbsolute = .0;
	this.uninfected = 100.;
	this.infected = .0;
	this.deceased = .0;
	this.recovered = .0;
	this.resetSimulation = function() {
		reset();
	};
};

function init()
{
	canvas = document.getElementById ("canvas");
	ctx = canvas.getContext ("2d");
	canvas.width = 0;
	canvas.height = 0;
	resize ();
	window.addEventListener ("resize", resize, false);
	window.addEventListener ("click", infect, false);

	stats = new Statistics;
	gui = new dat.GUI ();
	gui.add (stats, "socialDistancing", false);
	gui.add (stats, "uninfected", .0, 100.).listen();
	gui.add (stats, "infected", .0, 100.).listen();
	gui.add (stats, "deceased", .0, 100.).listen();
	gui.add (stats, "recovered", .0, 100.).listen();
	gui.add (stats, "resetSimulation");

	reset ();
}

function resize ()
{
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

function infect (event)
{
	event.preventDefault ();
	let clickPosition = {};
	clickPosition.x = event.clientX;
	clickPosition.y = event.clientY;
	let threshold = 10.0;
	for (let i = 0; i <= particles.length - 1; ++i) {
		let d = dist (particles[i], clickPosition);
		if (d <= threshold) {
			particles[i].state = states[INFECTED];
			break;
		}
	}
}

function enforceDistance ()
{
	for (let i = 0; i < particles.length - 1; ++i) {
		let amountInVicinity = 0;
		for (let j = 0; j < particles.length - 1; ++j) {
			if (i != j && particles[j].state != states[DECEASED]) {
				let d = dist (particles[i], particles[j]);
				if (d <= minimalDistance) {
					++amountInVicinity;
					let deltaX = particles[i].x - particles[j].x;
					let deltaY = particles[i].y - particles[j].y;
					let factor = .02;
					particles[i].ax += factor*deltaX;
					particles[i].ay += factor*deltaY;
				}
			}
		}
	}
}

function gatherStatistics ()
{
	stats.uninfected = stats.uninfectedAbsolute/population*100;
	stats.infected = stats.infectedAbsolute/population*100;
	stats.recovered = stats.recoveredAbsolute/population*100;
	stats.deceased = stats.deceasedAbsolute/population*100;
}

function drawGraphPlot ()
{
	// background
	ctx.fillStyle = "rgba(255, 255, 255, .65)";
	let w = 500;
	let h = 200;
	let gap = 10;
	let x = gap;
	let y = canvas.height - h - gap;
	ctx.fillRect (x, y, 500, 200);

	// graph - infected
	ctx.strokeStyle = "rgb(220, 16, 16)";
	ctx.beginPath ();
	let originX = x + gap;
	let originY = y + h - gap;
	let t = new Date();
	value = 125.*(.5 + .5*Math.cos (t.getTime()/1000.));
	ctx.moveTo (originX, originY);
	for (let i = 1; i < 65; ++i) {
		value = 125.*(.5 + .5*Math.cos (i/8. + t.getTime()/1000.));
		value += 45.*(.5 + .5*Math.cos (i/1.2 + t.getTime()/1000.));
		ctx.lineTo (originX + 75./10.*i, originY - value);
	}
	ctx.stroke ();

	// graph - recovered
	ctx.strokeStyle = "rgb(16, 220, 16)";
	ctx.beginPath ();
	value = 100.*(.5 + .5*Math.sin (t.getTime()/1000.));
	ctx.moveTo (originX, originY - value);
	for (let i = 1; i < 65; ++i) {
		value = 100.*(.5 + .5*Math.sin (i/5. + t.getTime()/1000.));
		value += 24.*(.5 + .5*Math.cos (i/2. + t.getTime()/1000.));
		ctx.lineTo (originX + 75./10.*i, originY - value);
	}
	ctx.stroke ();

	// graph - deceased
	ctx.strokeStyle = "rgb(16, 16, 16)";
	ctx.beginPath ();
	value = 70.*(.5 + .5*Math.cos (t.getTime()/1000.));
	ctx.moveTo (originX, originY - value);
	for (let i = 1; i < 65; ++i) {
		value = 70.*(.5 + .5*Math.cos (i/7.4 + t.getTime()/1000.));
		value += 32.*(.5 + .5*Math.sin (i/3.2 + t.getTime()/1000.));
		ctx.lineTo (originX + 75./10.*i, originY - value);
	}
	ctx.stroke ();
}

function draw()
{
	requestAnimationFrame (draw);

	ctx.clearRect (0, 0, canvas.width, canvas.height);
	if (stats.socialDistancing) {
		enforceDistance ();
	}
	simulationStep ();
	gatherStatistics ();
	for (let i = 0; i <= particles.length - 1; ++i) {
		particles[i].update ();
		particles[i].draw ();
	}

	drawGraphPlot ();
}

init ();
draw ();