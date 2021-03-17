import mooncatparser from "./mooncatparser";

function IdentiCat(props) {
    const size = props.size ? props.size : 10

    const generateMoonCatImage = (catId, size) => {
        size = size || 10;
        var data = mooncatparser(catId);
        var canvas = document.createElement("canvas");
        canvas.width = size * data.length;
        canvas.height = size * data[1].length;
        var ctx = canvas.getContext("2d");

        for(var i = 0; i < data.length; i++){
            for(var j = 0; j < data[i].length; j++){
                var color = data[i][j];
                if(color){
                    ctx.fillStyle = color;
                    ctx.fillRect(i * size, j * size, size, size);
                }
            }
        }
        return canvas.toDataURL();
    }

    return (
        <img src={generateMoonCatImage(props.catId, size)} className="identicat" alt="identicat" />
    )
}

export default IdentiCat
