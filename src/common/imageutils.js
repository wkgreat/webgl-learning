export async function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => {
            console.error("loadImage ERROR: ", err);
            reject(err);
        }
        img.crossOrigin = "anonymous";
        img.src = url;
    });
}