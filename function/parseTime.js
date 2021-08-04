export default function parseTime(time) {
    return time.toString().split(".").map((e, i) => {
        if (i == 0) return ("0"+e).slice(-2);
        return ("0"+Math.round(e * 60 / 100)).slice(-2)
    }).join(":")
}