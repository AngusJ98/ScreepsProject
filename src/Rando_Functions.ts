export function maxBy<T>(objects: T[], iteratee: ((obj: T) => number | false)): T | undefined {
	let maxObj: T | undefined;
	let maxVal = -Infinity;
	let val: number | false;
	for (const i in objects) {
		val = iteratee(objects[i]);
		if (val !== false && val > maxVal) {
			maxVal = val;
			maxObj = objects[i];
		}
	}
	return maxObj;
}

export function minBy<T>(objects: T[], iteratee: ((obj: T) => number | false)): T | undefined {
	let minObj: T | undefined;
	let minVal = Infinity;
	let val: number | false;
	for (const i in objects) {
		val = iteratee(objects[i]);
		if (val !== false && val < minVal) {
			minVal = val;
			minObj = objects[i];
		}
	}
	return minObj;
}
