import mooncatparser from "./mooncatparser";

function generateMoonCatImage(catId, size) {
    size = size || 10;
    let canvas = document.createElement("canvas");
    try {
        const data = mooncatparser(catId);
        canvas.width = size * data.length;
        canvas.height = size * data[1].length;
        let ctx = canvas.getContext("2d");

        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < data[i].length; j++) {
                const color = data[i][j];
                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(i * size, j * size, size, size);
                }
            }
        }
    } catch (e) {
        console.log("ERROR: Problem parsing moon cat ID", e.toString())
    }
    return canvas.toDataURL();
}

function IdentiCat(props) {
    const size = props.size ? props.size : 10
    return (
        <div className="cat-thumb"><img src={generateMoonCatImage(props.catId, size)} className="identicat" alt="identicat" /></div>
    )
}

export default IdentiCat
