export async function pointCouldFromCSV(path) {
    const response = await fetch(path);
    const text = await response.text();
    const positions = []
    for (let line of text.split("\n").slice(1)) {
        const cols = line.split(",");
        positions.push(parseFloat(cols[0]), parseFloat(cols[1]), parseFloat(cols[2]));
    }
    return {
        positions: positions
    };
}