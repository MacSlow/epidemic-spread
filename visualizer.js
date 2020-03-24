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
let maxSickCycles = 3000;
let maxX = .125;
let maxY = .125;
let damping = .75;
let friction = .85;
let gui = undefined;
let infectionValues = new Array;
let recoveryValues = new Array;
let deceasedValues = new Array;
let stateUpdaterId = undefined;

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
					let chanceOfInfection = 25.;
					if (particles[i].state == states[INFECTED] &&
						particles[j].state == states[UNINFECTED] ) {
						if (chanceOfInfection > random (.0, 100.)) {
							particles[j].state = states[INFECTED];
							++stats.infectedAbsolute;
							--stats.uninfectedAbsolute;
						}
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
			let recoveryRate = .05;
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
	infectionValues = [];
	recoveryValues = [];
	deceasedValues = [];
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
	this.showInfo = true;
	this.socialDistancing = false;
	this.uninfectedAbsolute = population;
	this.infectedAbsolute = .0;
	this.deceasedAbsolute = .0;
	this.recoveredAbsolute = .0;
	this.resetSimulation = function() {
		reset();
	};
};

function stateUpdater ()
{
	let maxValues = 480;

	if (infectionValues.length < maxValues) {
		infectionValues.push (stats.infected);
	} else {
		infectionValues = infectionValues.splice (0, 1);
		infectionValues.push (stats.infected);
	}

	if (recoveryValues.length < maxValues) {
		recoveryValues.push (stats.recovered);
	} else {
		recoveryValues = recoveryValues.splice (0, 1);
		recoveryValues.push (stats.recovered);
	}

	if (deceasedValues.length < maxValues) {
		deceasedValues.push (stats.deceased);
	} else {
		deceasedValues = deceasedValues.splice (0, 1);
		deceasedValues.push (stats.deceased);
	}
}

function init()
{
	canvas = document.getElementById ("canvas");
	ctx = canvas.getContext ("2d");
	canvas.width = 0;
	canvas.height = 0;
	resize ();
	window.addEventListener ("resize", resize, false);
	window.addEventListener ("click", infect, false);
	stateUpdaterId = window.setInterval (stateUpdater, 500);

	stats = new Statistics;
	gui = new dat.GUI ();
	gui.add (stats, "showInfo", true).onChange (function (showInfo) {
		if (showInfo) {
			document.getElementById("legende").style.visibility = "visible";
		} else {
			document.getElementById("legende").style.visibility = "hidden";;
		}
	});
	gui.add (stats, "socialDistancing", false);
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
	ctx.moveTo (originX, originY);
	for (let i = 0; i < infectionValues.length; ++i) {
		value = infectionValues[i] * (h - 2.*gap)*.01;
		ctx.lineTo (originX + i, originY - value);
	}
	ctx.stroke ();

	// graph - recovered
	ctx.strokeStyle = "rgb(16, 220, 16)";
	ctx.beginPath ();
	ctx.moveTo (originX, originY);
	for (let i = 0; i < recoveryValues.length; ++i) {
		value = recoveryValues[i] * (h - 2.*gap)*.01;
		ctx.lineTo (originX + i, originY - value);
	}
	ctx.stroke ();

	// graph - deceased
	ctx.strokeStyle = "rgb(16, 16, 16)";
	ctx.beginPath ();
	ctx.moveTo (originX, originY);
	for (let i = 0; i < deceasedValues.length; ++i) {
		value = deceasedValues[i] * (h - 2.*gap)*.01;
		ctx.lineTo (originX + i, originY - value);
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

	if (stats.showInfo) {
		drawGraphPlot ();
	}
}

init ();
draw ();