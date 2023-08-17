import chalk from 'chalk';
import gradient from 'gradient-string';

const log = console.log;
let currentAnimation = null;

const consoleFunctions = {
	log: log.bind(console),
	info: console.info.bind(console),
	warn: console.warn.bind(console),
	error: console.error.bind(console)
};

// eslint-disable-next-line guard-for-in
for (const k in consoleFunctions) {
	console[k] = function () {
		stopLastAnimation();
		consoleFunctions[k].apply(console, arguments);
	};
}

function hexToRgb(hex) {
	if (hex.substring(0, 1) === '#') {
		hex = hex.substring(1);
	}

	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);
	return {r, g, b};
}

const glitchChars = 'x*0987654321[]0-~@#(____!!!!\\|?????....0000\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t';
const longHsv = {interpolation: 'hsv', hsvSpin: 'long'};

const effects = {
	rainbow(str, frame) {
		const hue = 5 * frame;
		const leftColor = {h: hue % 360, s: 1, v: 1};
		const rightColor = {h: (hue + 1) % 360, s: 1, v: 1};
		return gradient(leftColor, rightColor)(str, longHsv);
	},
	pulse(str, frame, colorPrimary = '#ff1010', colorSecondary = '#e6e6e6') {
		frame = (frame % 120) + 1;
		const transition = 6;
		const duration = 10;
		const on = colorSecondary;
		const off = colorPrimary;

		if (frame >= (2 * transition) + duration) {
			return chalk.hex(off)(str); // All white
		}
		if (frame >= transition && frame <= transition + duration) {
			return chalk.hex(on)(str); // All red
		}

		frame = frame >= transition + duration ? (2 * transition) + duration - frame : frame; // Revert animation

		const g = frame <= transition / 2 ?
			gradient([
				{color: off, pos: 0.5 - (frame / transition)},
				{color: on, pos: 0.5},
				{color: off, pos: 0.5 + (frame / transition)}
			]) :
			gradient([
				{color: off, pos: 0},
				{color: on, pos: 1 - (frame / transition)},
				{color: on, pos: frame / transition},
				{color: off, pos: 1}
			]);

		return g(str);
	},
	glitch(str, frame, colorPrimary = '#ffffff', colorSecondary = '#ffffff') {
		if ((frame % 2) + (frame % 3) + (frame % 11) + (frame % 29) + (frame % 37) > 52) {
			return str.replace(/[^\r\n]/g, ' ');
		}

		chalk.hex(colorPrimary)(str);

		const chunkSize = Math.max(3, Math.round(str.length * 0.02));
		const chunks = [];

		for (let i = 0, length = str.length; i < length; i++) {
			const skip = Math.round(Math.max(0, (Math.random() - 0.8) * chunkSize));
			chunks.push(chalk.hex(colorSecondary)(str.substring(i, i + skip).replace(/[^\r\n]/g, ' ')));
			i += skip;
			if (str[i]) {
				if (str[i] !== '\n' && str[i] !== '\r' && Math.random() > 0.995) {
					chunks.push(glitchChars[Math.floor(Math.random() * glitchChars.length)]);
				} else if (Math.random() > 0.005) {
					chunks.push(str[i]);
				}
			}
		}

		let result = chunks.join('');
		if (Math.random() > 0.99) {
			result = result.toUpperCase();
		} else if (Math.random() < 0.01) {
			result = result.toLowerCase();
		}

		return result;
	},
	radar(str, frame, colorPrimary = '#ffffff', colorSecondary = '#000000', visivelPercentageOfWord = 0.2) {
		const depth = Math.floor(Math.min(str.length, str.length * visivelPercentageOfWord));
		const color = hexToRgb(colorPrimary);

		hexToRgb(colorSecondary);

		// TODO: Mess with the config to reproduce full
		// gradiente between white and black for shaded
		const step = Math.floor(255 / depth);

		const globalPos = frame % (str.length + depth);

		const chars = [];
		for (let i = 0, length = str.length; i < length; i++) {
			const pos = -(i - globalPos);
			if (pos > 0 && pos <= depth - 1) {
				const shade = (((depth - pos) * step) / 255).toFixed(2);

				chars.push(chalk.rgb(Math.floor(color.r * shade), Math.floor(color.g * shade), Math.floor(color.b * shade))(str[i]));
			} else {
				chars.push(' ');
			}
		}

		return chars.join('');
	},
	neon(str, frame, colorPrimary = '#585055', colorSecondary = '#D546F2') {
		const color = (frame % 2 === 0) ? chalk.dim.hex(colorPrimary) : chalk.bold.hex(colorSecondary);
		return color(str);
	},
	karaoke(str, frame, colorPrimary = '#ffffff', colorSecondary = '#FFBB00') {
		const chars = (frame % (str.length + 20)) - 10;
		if (chars < 0) {
			return chalk.hex(colorPrimary)(str);
		}
		return chalk.hex(colorSecondary).bold(str.substr(0, chars)) + chalk.white(str.substr(chars));
	}
};

function animateString(str, effect, delay, speed, colorPrimary, colorSecondary, visivelPercentageOfWord) {
	stopLastAnimation();

	speed = speed === undefined ? 1 : parseFloat(speed);
	if (!speed || speed <= 0) {
		throw new Error('Expected `speed` to be an number greater than 0');
	}

	currentAnimation = {
		text: str.split(/\r\n|\r|\n/),
		lines: str.split(/\r\n|\r|\n/).length,
		stopped: false,
		init: false,
		f: 0,
		render() {
			const self = this;
			if (!this.init) {
				log('\n'.repeat(this.lines - 1));
				this.init = true;
			}
			log(this.frame());
			setTimeout(() => {
				if (!self.stopped) {
					self.render();
				}
			}, delay / speed);
		},
		frame() {
			this.f++;
			return '\u001B[' + this.lines + 'F\u001B[G\u001B[2K' + this.text.map(str => effect(str, this.f, colorPrimary, colorSecondary, visivelPercentageOfWord)).join('\n');
		},
		replace(str) {
			this.text = str.split(/\r\n|\r|\n/);
			this.lines = str.split(/\r\n|\r|\n/).length;
			return this;
		},
		stop() {
			this.stopped = true;
			return this;
		},
		start() {
			this.stopped = false;
			this.render();
			return this;
		}
	};
	setTimeout(() => {
		if (!currentAnimation.stopped) {
			currentAnimation.start();
		}
	}, delay / speed);
	return currentAnimation;
}

function stopLastAnimation() {
	if (currentAnimation) {
		currentAnimation.stop();
	}
}

const chalkAnimation = {
	rainbow: (str, speed) => animateString(str, effects.rainbow, 15, speed),
	pulse: (str, speed, colorPrimary, colorSecondary) => animateString(str, effects.pulse, 16, speed, colorPrimary, colorSecondary),
	glitch: (str, speed, colorPrimary, colorSecondary) => animateString(str, effects.glitch, 55, speed, colorPrimary, colorSecondary),
	radar: (str, speed, colorPrimary, visivelPercentageOfWord) => animateString(str, effects.radar, 50, speed, colorPrimary, '', visivelPercentageOfWord),
	neon: (str, speed, colorPrimary, colorSecondary) => animateString(str, effects.neon, 500, speed, colorPrimary, colorSecondary),
	karaoke: (str, speed, colorPrimary, colorSecondary) => animateString(str, effects.karaoke, 50, speed, colorPrimary, colorSecondary)
};

export default chalkAnimation;
